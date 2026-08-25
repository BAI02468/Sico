import { type QueryClient, type QueryKey } from "@tanstack/react-query";

import { logger } from "../../../utils/logger";

function logInvalidationFailure(): void {
  logger.error("chat: history invalidation failed");
}

export function markHistoryQueryStale(
  queryClient: QueryClient,
  queryKey: QueryKey,
): void {
  void queryClient
    .invalidateQueries({ queryKey, exact: true, refetchType: "none" })
    .catch(logInvalidationFailure);
}

export function invalidateHistoryQuery(
  queryClient: QueryClient,
  queryKey: QueryKey,
): void {
  const filters = { queryKey, exact: true } as const;
  // Mark stale before the asynchronous cancellation chain so a pagination
  // started by an await-send continuation can preserve the dirty state.
  markHistoryQueryStale(queryClient, queryKey);
  const query = queryClient.getQueryCache().find(filters);
  const paginationPromise =
    query?.state.fetchStatus !== "idle" &&
    query?.state.fetchMeta?.fetchMore?.direction === "forward"
      ? query.promise
      : undefined;

  if (paginationPromise !== undefined) {
    const markStale = (): void => markHistoryQueryStale(queryClient, queryKey);
    // Keep the user's older-page load alive and re-mark after it settles because
    // query success clears staleness for the whole infinite query.
    void paginationPromise.then(markStale, markStale);
    return;
  }

  const cancellation = queryClient.cancelQueries(filters, { silent: true });
  // TanStack reverts query state synchronously inside cancelQueries, including
  // the dirty bit. Restore it before callers can start a later pagination.
  markHistoryQueryStale(queryClient, queryKey);
  void cancellation
    .then(() => {
      const canceledQuery = queryClient.getQueryCache().find(filters);
      const refetchType =
        canceledQuery?.isActive() === true &&
        canceledQuery.state.data === undefined
          ? "active"
          : "none";
      return queryClient.invalidateQueries({ ...filters, refetchType });
    })
    .catch(logInvalidationFailure);
}
