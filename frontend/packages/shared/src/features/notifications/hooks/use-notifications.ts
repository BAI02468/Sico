import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AxiosInstance } from "axios";

import { useApiClient } from "../../../services/api-client-context";
import {
  type Notification,
  notificationSchema,
  NotificationStatusSchema,
  REMOVED_NOTIFICATION_TYPES,
} from "../schemas/notification";

const NOTIFICATIONS_QUERY_KEY = ["notifications"] as const;
// Legacy fetches the first 50 (`pageSize: 50`); match it so the popover shows
// the same depth of history.
const PAGE_SIZE = 50;
// Legacy polled every 5s via setInterval; react-query's refetchInterval is the
// native equivalent (and pauses when the tab is hidden / window blurred).
const POLL_MS = 5000;

// Drop the wire types dwp no longer surfaces (my-team / onboarding / training
// notifications) at the RAW layer, before parse collapses an unknown `type` to
// undefined. Reads `type` off the untrusted row defensively (it may be missing
// or non-numeric); only a genuine int in the removed set is filtered. The set
// and the meaning of each int (1/2/5/6) live in `schema.ts`
// (`REMOVED_NOTIFICATION_TYPES`).
function isRemovedRow(row: unknown): boolean {
  if (typeof row !== "object" || row === null) {
    return false;
  }
  const type = (row as { type?: unknown }).type;
  return typeof type === "number" && REMOVED_NOTIFICATION_TYPES.has(type);
}

async function fetchNotifications(api: AxiosInstance): Promise<Notification[]> {
  const res = await api.get<unknown>("/notifications", {
    params: { page: 1, pageSize: PAGE_SIZE },
  });
  // Drop removed types at the RAW layer, before parse — a removed row would
  // otherwise parse to `type: undefined` (enum key gone) and be indistinguishable
  // from a genuinely-new wire type, so the filter must see the raw int.
  const rawList = extractRawNotifications(res.data).filter(
    (row) => !isRemovedRow(row),
  );
  // Parse per-row and drop only the rows that fail — a single off-contract row
  // (e.g. a missing/non-int `id`, which has no field-level `.catch`) must not
  // collapse the entire list. A whole-array `.catch([])` would do exactly that.
  const list = rawList.flatMap((row) => {
    const parsed = notificationSchema.safeParse(row);
    return parsed.success ? [parsed.data] : [];
  });
  // Newest first (legacy sorts desc by updatedAt).
  return [...list].sort((a, b) => b.updatedAt - a.updatedAt);
}

// Pull the untrusted notifications array out of the wire envelope without
// asserting the full shape — the per-row parse below owns validation.
function extractRawNotifications(data: unknown): unknown[] {
  if (typeof data !== "object" || data === null) {
    return [];
  }
  const inner = (data as { data?: unknown }).data;
  if (typeof inner !== "object" || inner === null) {
    return [];
  }
  const list = (inner as { notifications?: unknown }).notifications;
  return Array.isArray(list) ? list : [];
}

// Optimistic cache patch: flip one row to READ; the 5s poll reconciles.
function markReadInCache(
  prev: Notification[] | undefined,
  id: number,
): Notification[] | undefined {
  return prev?.map((n) =>
    n.id === id ? { ...n, status: NotificationStatusSchema.enum.READ } : n,
  );
}

// Optimistic cache patch: flip EVERY unread row to READ; the 5s poll reconciles.
function markAllReadInCache(
  prev: Notification[] | undefined,
): Notification[] | undefined {
  return prev?.map((n) =>
    n.status === NotificationStatusSchema.enum.UNREAD
      ? { ...n, status: NotificationStatusSchema.enum.READ }
      : n,
  );
}

// eslint-disable-next-line max-lines-per-function -- one react-query hook: query + two optimistic mutations (each needs onMutate/onError) + the returned facade. Splitting would scatter tightly-coupled cache logic. Pre-existing; tracked for refactor.
export function useNotifications(): {
  notifications: Notification[];
  unreadCount: number;
  markRead: (id: number) => void;
  markAllRead: () => void;
  isPending: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => void;
} {
  const api = useApiClient();
  const queryClient = useQueryClient();

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: NOTIFICATIONS_QUERY_KEY,
    queryFn: () => fetchNotifications(api),
    refetchInterval: POLL_MS,
    refetchOnWindowFocus: true,
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: number): Promise<void> => {
      await api.put("/notification/status", {
        id,
        status: NotificationStatusSchema.enum.READ,
      });
    },
    // Cancel any in-flight poll first — otherwise a refetch already on the wire
    // can resolve after our patch and clobber it back to UNREAD. Snapshot the
    // previous cache so `onError` can restore it if the PUT fails.
    onMutate: async (id: number) => {
      await queryClient.cancelQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
      const previous = queryClient.getQueryData<Notification[]>(
        NOTIFICATIONS_QUERY_KEY,
      );
      queryClient.setQueryData<Notification[]>(
        NOTIFICATIONS_QUERY_KEY,
        (prev) => markReadInCache(prev, id),
      );
      return { previous };
    },
    onError: (_error, _id, context) => {
      queryClient.setQueryData(NOTIFICATIONS_QUERY_KEY, context?.previous);
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async (): Promise<void> => {
      await api.put("/notification/read-all");
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
      const previous = queryClient.getQueryData<Notification[]>(
        NOTIFICATIONS_QUERY_KEY,
      );
      queryClient.setQueryData<Notification[]>(
        NOTIFICATIONS_QUERY_KEY,
        (prev) => markAllReadInCache(prev),
      );
      return { previous };
    },
    onError: (_error, _vars, context) => {
      queryClient.setQueryData(NOTIFICATIONS_QUERY_KEY, context?.previous);
    },
  });

  const notifications = data ?? [];
  const unreadCount = notifications.filter(
    (n) => n.status === NotificationStatusSchema.enum.UNREAD,
  ).length;

  return {
    notifications,
    unreadCount,
    markRead: (id: number) => markReadMutation.mutate(id),
    markAllRead: () => markAllReadMutation.mutate(),
    // `isPending` is true ONLY on the first load with no cache — background
    // polls (refetch) keep it false while `data` stays put, so the skeleton
    // never flashes on a 5s tick. `isError` likewise pairs with "no data yet".
    isPending,
    isError,
    error,
    refetch: () => {
      void refetch();
    },
  };
}
