import { Trans, useLingui } from "@lingui/react/macro";
import { Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { type JSX, useRef } from "react";

import { DwConversationRow } from "./dw-conversation-row";
import { DwConversationRowsSkeleton } from "./dw-conversation-rows-skeleton";
import { DwNewSessionButton } from "./dw-new-session-button";
import { useInfiniteScrollSentinel } from "../../../hooks/use-infinite-scroll-sentinel";
import { useConversations } from "../../chat/hooks/use-conversations";
import { usePendingConversationTitles } from "../../chat/hooks/use-pending-conversation-titles";
import { useActiveNav } from "../hooks/use-active-nav";

type Props = {
  readonly agentInstanceId: number;
  readonly readOnly?: boolean;
};

// The sidebar's "conversation mode" (Figma 20454-59481): shown in place of the
// Digital Workers list while inside a DW. A "New session" row sits above the
// DW's conversation list; clicking it starts a new session (the DW home). The
// conversation list is a SUSPENSE read — the parent
// (`ConversationModeMenu`) wraps this in a local <Suspense> (skeleton) +
// <ErrorBoundary fallback={null}>, so a slow fetch shows the skeleton and a
// failed one degrades to nothing (logged) without touching the rest of the
// sidebar. Older pages load on demand as the list scrolls to a bottom sentinel.
export function DwConversationNav({
  agentInstanceId,
  readOnly = false,
}: Props): JSX.Element {
  const { items, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useConversations(agentInstanceId);
  const { conversationId: activeConversationId } = useActiveNav();
  const { t } = useLingui();

  // Pending ids drive title polling; settled ids are removed so legitimate
  // "New Session" titles are never polled repeatedly.
  usePendingConversationTitles();

  // The overflow list, not the viewport, is the sentinel's root.
  const listRef = useRef<HTMLUListElement | null>(null);
  const sentinelRef = useRef<HTMLLIElement | null>(null);
  useInfiniteScrollSentinel(
    sentinelRef,
    { hasNextPage, isFetchingNextPage, fetchNextPage },
    { rootRef: listRef, fillOnComplete: true },
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-1">
      {/* The full header row returns to the Digital Workers list. */}
      <Link
        to="/digital-worker"
        aria-label={t({
          id: "sidebar.dwConversationNav.backAriaLabel",
          message: "Back to Digital Workers",
        })}
        className="group text-foreground-tertiary hover:bg-surface-muted hover:text-foreground-primary flex h-9 items-center gap-1 rounded-lg px-1"
      >
        <ChevronLeft aria-hidden="true" className="size-4 shrink-0" />
        <span className="truncate text-xs font-medium tracking-wider uppercase">
          <Trans id="sidebar.dwConversationNav.back">Back</Trans>
        </span>
      </Link>
      {/* Base UI renders the button chrome on a router link; `nativeButton`
          keeps the resulting anchor semantics explicit. */}
      <div className="p-2">
        <DwNewSessionButton
          agentInstanceId={agentInstanceId}
          disabled={readOnly}
        />
      </div>
      {/* Keep the list and sentinel mounted while empty so its one-shot observer
          also handles the empty-to-first-conversation transition. */}
      <ul
        ref={listRef}
        className="scrollbar flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto"
      >
        {items.length === 0 ? (
          <li className="text-foreground-tertiary px-2 py-1.5 text-sm">
            <Trans id="sidebar.dwConversationNav.empty">
              No conversations yet
            </Trans>
          </li>
        ) : (
          items.map((conversation) => (
            <DwConversationRow
              key={conversation.id}
              agentInstanceId={agentInstanceId}
              conversation={conversation}
              isActive={activeConversationId === String(conversation.id)}
            />
          ))
        )}
        {/* Loading-more rows: a batch of skeleton rows (shared with the first-
            load skeleton so they can't drift), shown at the bottom while the
            next page fetches. Wrapped in a testid-carrying <li> for querying. */}
        {isFetchingNextPage && (
          <li data-testid="conversation-loading-more">
            <DwConversationRowsSkeleton />
          </li>
        )}
        {/* Bottom sentinel: scrolling it into the list's 200px prefetch band
            pulls the next page. Mounted unconditionally (see the list comment)
            — the hook's own `hasNextPage` guard makes it a no-op when nothing's
            left. */}
        <li
          ref={sentinelRef}
          data-testid="conversation-list-sentinel"
          aria-hidden="true"
        />
      </ul>
    </div>
  );
}
