import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

import { chatKeys } from "@/features/chat/query-keys";
import { refreshConversationStatus } from "@/features/chat/utils/refresh-conversation-status";
import { AGENTS_QUERY_KEY_PREFIX } from "@/features/digital-worker/hooks/use-agents-query";

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
};

type StatusData = {
  pages: [{ items: [{ id: number; status: string }]; hasNext: false }];
  pageParams: [number];
};

function deferred<T>(): Deferred<T> {
  let resolvePromise: ((value: T) => void) | null = null;
  const promise = new Promise<T>((promiseResolve) => {
    resolvePromise = promiseResolve;
  });
  return {
    promise,
    resolve: (value) => {
      if (!resolvePromise) {
        throw new Error("deferred promise was not initialized");
      }
      resolvePromise(value);
    },
  };
}

function statusData(id: number, status: string): StatusData {
  return {
    pages: [{ items: [{ id, status }], hasNext: false }],
    pageParams: [1],
  };
}

describe("refreshConversationStatus", () => {
  const conversationKey = chatKeys.conversationList(7);
  const agentsKey = [
    ...AGENTS_QUERY_KEY_PREFIX,
    {
      operatorUsername: null,
      pageSize: 30,
      projectId: null,
      showInactive: false,
    },
  ] as const;

  it("invalidates both status lists when the conversation and agent are already first", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(conversationKey, statusData(42, "running"));
    queryClient.setQueryData(agentsKey, statusData(7, "running"));
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

    refreshConversationStatus(queryClient, 7);

    expect(invalidateQueries).toHaveBeenCalledTimes(2);
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: conversationKey,
      exact: true,
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: AGENTS_QUERY_KEY_PREFIX,
    });
  });

  it("settlement replaces pending open-generation requests and keeps terminal data", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(conversationKey, statusData(42, "idle"));
    queryClient.setQueryData(agentsKey, statusData(7, "idle"));
    const conversationRequests = [
      deferred<StatusData>(),
      deferred<StatusData>(),
    ] as const;
    const agentRequests = [
      deferred<StatusData>(),
      deferred<StatusData>(),
    ] as const;
    const fetchConversations = vi.fn(() => {
      const request =
        conversationRequests[fetchConversations.mock.calls.length - 1];
      if (!request) {
        throw new Error("unexpected conversation status request");
      }
      return request.promise;
    });
    const fetchAgents = vi.fn(() => {
      const request = agentRequests[fetchAgents.mock.calls.length - 1];
      if (!request) {
        throw new Error("unexpected agent status request");
      }
      return request.promise;
    });
    const conversationObserver = new QueryObserver(queryClient, {
      queryKey: conversationKey,
      queryFn: fetchConversations,
      staleTime: Number.POSITIVE_INFINITY,
    });
    const agentsObserver = new QueryObserver(queryClient, {
      queryKey: agentsKey,
      queryFn: fetchAgents,
      staleTime: Number.POSITIVE_INFINITY,
    });
    const unsubscribeConversation = conversationObserver.subscribe(vi.fn());
    const unsubscribeAgents = agentsObserver.subscribe(vi.fn());

    // Stream accepted: start-generation status fetch.
    refreshConversationStatus(queryClient, 7);
    await vi.waitFor(() => expect(fetchConversations).toHaveBeenCalledOnce());
    await vi.waitFor(() => expect(fetchAgents).toHaveBeenCalledOnce());

    // Terminal frame: settlement replaces the still-pending start generation.
    refreshConversationStatus(queryClient, 7);
    await vi.waitFor(() => expect(fetchConversations).toHaveBeenCalledTimes(2));
    await vi.waitFor(() => expect(fetchAgents).toHaveBeenCalledTimes(2));

    conversationRequests[1].resolve(statusData(42, "terminal"));
    agentRequests[1].resolve(statusData(7, "terminal"));
    await vi.waitFor(() =>
      expect(queryClient.getQueryData(conversationKey)).toEqual(
        statusData(42, "terminal"),
      ),
    );
    await vi.waitFor(() =>
      expect(queryClient.getQueryData(agentsKey)).toEqual(
        statusData(7, "terminal"),
      ),
    );

    conversationRequests[0].resolve(statusData(42, "running"));
    agentRequests[0].resolve(statusData(7, "running"));
    await Promise.all([
      conversationRequests[0].promise,
      agentRequests[0].promise,
    ]);

    expect(queryClient.getQueryData(conversationKey)).toEqual(
      statusData(42, "terminal"),
    );
    expect(queryClient.getQueryData(agentsKey)).toEqual(
      statusData(7, "terminal"),
    );
    expect(fetchConversations).toHaveBeenCalledTimes(2);
    expect(fetchAgents).toHaveBeenCalledTimes(2);
    expect(queryClient.getQueryState(conversationKey)?.isInvalidated).toBe(
      false,
    );
    expect(queryClient.getQueryState(agentsKey)?.isInvalidated).toBe(false);
    unsubscribeConversation();
    unsubscribeAgents();
  });
});
