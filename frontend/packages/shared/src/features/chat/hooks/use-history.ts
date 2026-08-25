// Studio-mode history hook. TanStack Query owns fetch/cache/dedup ONLY; the
// jotai `conversationsAtom` is the sole render source-of-truth — this hook
// fetches newest-first pages and HYDRATES the atom, never rendering from
// `query.data`. NON-suspense (`useInfiniteQuery`): it never suspends or throws,
// so the message list (which reads the store) stays mounted across loading /
// error — a history-fetch failure surfaces as a toast + log, NOT a panel-
// replacing error screen that would hide the user's just-sent message.
import { t } from "@lingui/core/macro";
import { toast } from "@sico/ui";
import {
  type InfiniteData,
  type QueryClient,
  useInfiniteQuery,
  type UseInfiniteQueryOptions,
  useQueryClient,
} from "@tanstack/react-query";
import type { AxiosInstance } from "axios";
import { produce } from "immer";
import { type createStore, useStore } from "jotai";
import { useCallback, useEffect, useRef } from "react";

import { useApiClient } from "../../../services/api-client-context";
import { makeId } from "../../../utils/id";
import { logger } from "../../../utils/logger";
import {
  activeConversationIdAtom,
  type Conversation,
  conversationsAtom,
  createFirstConversationIdsAtom,
  type Message,
  plansAtom,
} from "../atoms/chat-atom";
import { chatKeys } from "../query-keys";
import { type Plan } from "../schemas/plan";
import { fetchHistory, type HistoryPage } from "../services/history";
import { groupTurns } from "../utils/group-turns";
import {
  invalidateHistoryQuery,
  markHistoryQueryStale,
} from "../utils/invalidate-history-query";

type Store = ReturnType<typeof createStore>;

// Typed for the NON-suspense `useInfiniteQuery` this hook actually calls (the
// base options type), not the suspense variant — the two share one cache entry,
// but using the base type keeps the option set honest (e.g. a future `enabled`
// gate would type-check here).
type Options = UseInfiniteQueryOptions<
  HistoryPage,
  Error,
  InfiniteData<HistoryPage>,
  ReturnType<typeof chatKeys.history>,
  number
>;

export type UseHistory = {
  // True while the FIRST page is loading and nothing is cached yet — the loading
  // gate shows a skeleton only when this is true AND the store is empty.
  isPending: boolean;
  hasMore: boolean;
  fetchOlder: () => void;
  isFetchingOlder: boolean;
};

export function historyQueryOptions(
  agentInstanceId: number,
  apiClient: AxiosInstance,
  conversationId?: number,
): Options {
  return {
    queryKey: chatKeys.history(agentInstanceId, conversationId),
    queryFn: ({ pageParam, signal }): Promise<HistoryPage> =>
      fetchHistory(
        apiClient,
        {
          agentInstanceId,
          conversationId,
          page: pageParam,
        },
        signal,
      ),
    initialPageParam: 1,
    getNextPageParam: (lastPage, _allPages, lastPageParam) =>
      lastPage.hasNext ? lastPageParam + 1 : undefined,
    staleTime: 30_000,
    // Focus refetch drops already-loaded pages — bad UX for infinite scroll.
    refetchOnWindowFocus: false,
    gcTime: 5 * 60_000,
  };
}

// Prime the history cache with an empty first page for a brand-new conversation
// so `MessageHistory`'s non-suspense `useInfiniteQuery` reports `isPending=false`
// on mount (cached data present). The create-first home flow calls this before
// navigating into the chat: with `isPending` already false, the `isPending &&
// isEmpty` skeleton gate is skipped and the parked message is drained + rendered
// by ONE `MessageList` instance (no skeleton → real-list swap, so no flash).
// Builds the key via `chatKeys.history`, the same builder the read uses, so seed
// and read can't drift.
//
// Seeded as immediately STALE (`updatedAt: 0`), NOT fresh: the seed's only job
// is to skip the FIRST-mount skeleton flash. Messages sent after seeding are
// written to the jotai store only (never back into this history cache), and
// Collaboration's mount resets that store — so a later remount (navigate to
// another conversation and back) must REFETCH real server history instead of
// re-serving this empty page. A fresh seed (default `updatedAt: now`) would stay
// fresh for `staleTime` (30s) and, with `refetchOnMount` skipping the refetch,
// render the just-used conversation empty. `updatedAt: 0` makes it stale so
// `refetchOnMount` (default true) refetches on the next mount, while the first
// mount still reads the cached page synchronously (no flash).
export function seedEmptyHistory(
  queryClient: QueryClient,
  agentInstanceId: number,
  conversationId: number,
): void {
  const key = chatKeys.history(agentInstanceId, conversationId);
  // Only seed when nothing is cached — never clobber real fetched history.
  if (queryClient.getQueryData(key) !== undefined) {
    return;
  }
  const seed: InfiniteData<HistoryPage, number> = {
    pages: [{ items: [], hasNext: false }],
    pageParams: [1],
  };
  queryClient.setQueryData(key, seed, { updatedAt: 0 });
}

// Invalidate a conversation's history cache on every send-orchestration exit.
// Cancel a first-page/background request so it cannot complete afterward and
// make stale data fresh again. An older-page pagination request is preserved
// and re-invalidated after it settles so the user's scroll is not stranded.
// Durable exits also need the next mount to read the newly persisted turn
// instead of the create-first empty seed.
//
// `refetchType: "none"` normally marks the key stale WITHOUT refetching the
// live observer: the goal is only that the NEXT mount refetches the persisted
// turn. The exception is an active observer with no data after cancellation —
// without a replacement request its mounted view stays blank indefinitely.
// Inspect after cancellation so a route unmount or completed fetch wins before
// choosing whether to refetch. Uses the same `chatKeys.history` builder as the
// seed + read, so it can't target the wrong slot.
export function invalidateHistory(
  queryClient: QueryClient,
  agentInstanceId: number,
  conversationId?: number,
): void {
  invalidateHistoryQuery(
    queryClient,
    chatKeys.history(agentInstanceId, conversationId),
  );
}

// Flatten newest-first pages, dedup by id keeping the FIRST occurrence (newest
// wins on overlap), then reverse to oldest→newest for render order.
function toOldestFirst(pages: HistoryPage[]): Message[] {
  const seen = new Set<string>();
  const deduped: Message[] = [];
  for (const page of pages) {
    for (const item of page.items) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        deduped.push(item);
      }
    }
  }
  deduped.reverse();
  return deduped;
}

// Merge historical messages into the conversation, preserving references (immer
// structural sharing) so unchanged rows keep object identity, and keep the live
// tail at the bottom. Dedup by BOTH id AND turnId: a turn that was streaming
// when the page reloaded gets persisted with a backend numeric id, while the
// resumed live copy still carries a client UUID — same turn, different id. So a
// live row whose turnId already appears in `historical` is the SAME message and
// must be dropped (historical is the authoritative persisted version), else it
// renders twice. A live row with NO turnId (a fresh send not yet acknowledged)
// is always kept — it hasn't claimed a turn yet. (Mirrors legacy's
// `new Set(turnId)` grouping in ConversationSectionAdapter.)
function mergeHistory(draft: Conversation, historical: Message[]): void {
  const existingById = new Map(
    draft.history.map((m): [string, Message] => [m.id, m]),
  );
  const histIds = new Set(historical.map((m) => m.id));
  const histTurnIds = new Set(
    historical
      .map((m) => m.turnId)
      .filter((turnId): turnId is number => turnId !== undefined),
  );
  const mergedHistorical = historical.map((m) => existingById.get(m.id) ?? m);
  const live = draft.history.filter(
    (m) =>
      !histIds.has(m.id) &&
      (m.turnId === undefined || !histTurnIds.has(m.turnId)),
  );
  draft.history = [...mergedHistorical, ...live];
}

// Seed `plansAtom` from the inline plans carried on hydrated history messages.
// Seed-IF-ABSENT: a live poll (use-plan) is the authoritative writer, so a plan
// already in the Map is never overwritten by a (possibly older) history seed.
// Returns the same Map ref when nothing was added, so the store write is skipped.
function seedPlans(
  prev: Map<string, Plan>,
  messages: Message[],
): Map<string, Plan> {
  let next: Map<string, Plan> | undefined;
  for (const msg of messages) {
    if (msg.seedPlan !== undefined && !prev.has(msg.seedPlan.planId)) {
      next ??= new Map(prev);
      next.set(msg.seedPlan.planId, msg.seedPlan);
    }
  }
  return next ?? prev;
}

// Reuse the active conversation or mint one and make it active. When a server
// `conversationId` is known (dwp multi-conversation), the client id IS
// `String(conversationId)` — a stable, addressable key shared with the route,
// send path, and sidebar list — find-or-create under it. Without one (sico v1),
// fall back to the active slot or a minted UUID (single implicit conversation).
function ensureConversationForServerId(
  store: Store,
  conversationId: number | undefined,
): string {
  if (conversationId !== undefined) {
    const id = String(conversationId);
    const existing = store.get(conversationsAtom).get(id);
    if (existing === undefined) {
      store.set(
        conversationsAtom,
        produce(store.get(conversationsAtom), (map) => {
          map.set(id, { clientId: id, conversationId, history: [] });
        }),
      );
    }
    store.set(activeConversationIdAtom, id);
    return id;
  }
  const active = store.get(activeConversationIdAtom);
  if (active !== null) {
    return active;
  }
  const id = makeId();
  store.set(
    conversationsAtom,
    produce(store.get(conversationsAtom), (map) => {
      map.set(id, { clientId: id, history: [] });
    }),
  );
  store.set(activeConversationIdAtom, id);
  return id;
}

// Hydrate the store from cached pages. Keyed on `data` (react-query keeps a
// stable ref when unchanged) so this runs only when a page is added. `data` is
// `undefined` before the first page resolves (non-suspense), so guard it.
function useHydrateHistory(
  store: Store,
  data: InfiniteData<HistoryPage> | undefined,
  conversationId: number | undefined,
): void {
  useEffect(() => {
    if (data === undefined) {
      return;
    }
    const activeId = ensureConversationForServerId(store, conversationId);
    // In-flight gate (create-first, page 1 only): a create-first send (DW home →
    // first message) seeds an immediately-stale EMPTY history page, so the chat
    // page's mount refetches page 1 — which the backend has already persisted the
    // just-sent human turn into (numeric id + turnId). Merging that back mid-send
    // races the optimistic row (still turnId-less until the first stream frame
    // stamps it), so neither the id nor the turnId dedup catches the twin and the
    // turn renders twice. Page 1 is the ONLY page that can carry the twin (it's
    // the newest), so skipping just page 1 kills the dup while leaving the
    // user-driven `fetchOlder` pages (2+) free to merge. Gated on BOTH an
    // in-flight send AND the create-first marker: an EXISTING conversation's page
    // 1 holds real history (not a twin), so it is never skipped — else a send
    // fired during its first-load skeleton would strand that history until
    // remount. Revisit / reconnect / settled all merge the whole set as before.
    const conversation = store.get(conversationsAtom).get(activeId);
    const isCreateFirst =
      conversationId !== undefined &&
      store.get(createFirstConversationIdsAtom).has(conversationId);
    const skipPageOne = isCreateFirst && conversation?.sendHandle !== undefined;
    const pages = skipPageOne ? data.pages.slice(1) : data.pages;
    // Group AFTER flattening every page so a turn split across a page boundary
    // still folds into one rendered message.
    const historical = groupTurns(toOldestFirst(pages));
    // Seed inline plans before writing history so a PlanCard mounting from this
    // hydration reads its tree from plansAtom on first render (no empty flash).
    const prevPlans = store.get(plansAtom);
    const nextPlans = seedPlans(prevPlans, historical);
    if (nextPlans !== prevPlans) {
      store.set(plansAtom, nextPlans);
    }
    store.set(
      conversationsAtom,
      produce(store.get(conversationsAtom), (map) => {
        const conv = map.get(activeId);
        if (conv) {
          mergeHistory(conv, historical);
        }
      }),
    );
  }, [data, store, conversationId]);
}

// A history-fetch failure is NON-fatal: the message list keeps rendering the
// store (optimistic + streamed messages stay visible). Surface it as a log +
// toast, deduped by error identity so a re-render can't re-fire the toast for
// the same failure.
//
// `isLoadingError` gates the TOAST to a FIRST-load failure only (errored with no
// cached pages → the panel is genuinely blank, so the user needs the signal). A
// background-refetch blip (`isRefetchError`: cached pages still render, and after
// a settle the store shows the just-sent turn) is logged but NOT toasted — a
// "Couldn't load messages." over a visibly-populated conversation is misleading.
function useHistoryErrorToast(
  error: Error | null,
  isLoadingError: boolean,
  agentInstanceId: number,
  conversationId: number | undefined,
): void {
  const toastedErrorRef = useRef<unknown>(null);
  useEffect(() => {
    if (error === null || toastedErrorRef.current === error) {
      return;
    }
    toastedErrorRef.current = error;
    logger.error("chat: history load failed", {
      agentInstanceId,
      conversationId,
      isLoadingError,
      error,
    });
    // Only the first-load failure blanks the panel; a background-refetch failure
    // leaves the cached/store-backed messages on screen, so toasting there would
    // contradict what the user sees.
    if (isLoadingError) {
      toast.error(
        t({
          id: "chat.history.error.loadMessages",
          message: "Couldn't load messages.",
        }),
      );
    }
  }, [error, isLoadingError, agentInstanceId, conversationId]);
}

export function useHistory(
  agentInstanceId: number,
  conversationId?: number,
): UseHistory {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  const store = useStore();
  // Non-suspense: never throws to the ErrorBoundary. Shares one cache entry
  // with any suspense reader of the same key (same pattern as `use-assets-query`).
  const query = useInfiniteQuery(
    historyQueryOptions(agentInstanceId, apiClient, conversationId),
  );
  const { fetchNextPage } = query;

  useHydrateHistory(store, query.data, conversationId);
  useHistoryErrorToast(
    query.error,
    query.isLoadingError,
    agentInstanceId,
    conversationId,
  );

  const fetchOlder = useCallback((): void => {
    const queryKey = chatKeys.history(agentInstanceId, conversationId);
    // A page-2 success freshens the whole infinite query while page 1 can still
    // predate the settled turn. Carry dirty state across every older-page load.
    const preserveStale =
      queryClient.getQueryState(queryKey)?.isInvalidated === true;
    const request = fetchNextPage();
    if (preserveStale) {
      const markStale = (): void =>
        markHistoryQueryStale(queryClient, queryKey);
      void request.then(markStale, markStale);
    }
  }, [fetchNextPage, queryClient, agentInstanceId, conversationId]);

  return {
    isPending: query.isPending,
    hasMore: query.hasNextPage,
    fetchOlder,
    isFetchingOlder: query.isFetchingNextPage,
  };
}
