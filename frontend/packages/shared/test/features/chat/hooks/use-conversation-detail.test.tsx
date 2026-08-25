import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import axios, { type AxiosInstance } from "axios";
import type { ReactElement, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  conversationDetailQueryKey,
  conversationDetailQueryOptions,
  useConversationDetail,
} from "@/features/chat/hooks/use-conversation-detail";
import { chatKeys } from "@/features/chat/query-keys";
import type { ConversationSummary } from "@/features/chat/schemas/conversation";
import * as service from "@/features/chat/services/conversation";
import { ApiClientProvider } from "@/services/api-client-context";

vi.mock("@/features/chat/services/conversation");

function conversation(id = 7): ConversationSummary {
  return {
    id,
    title: "Weekly report",
    createdAt: 1,
    agentInstanceId: 3,
  };
}

function freshClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
}

function makeWrapper(
  queryClient: QueryClient,
  apiClient: AxiosInstance,
): (props: { children: ReactNode }) => ReactElement {
  return function Wrapper({ children }: { children: ReactNode }): ReactElement {
    return (
      <QueryClientProvider client={queryClient}>
        <ApiClientProvider client={apiClient}>{children}</ApiClientProvider>
      </QueryClientProvider>
    );
  };
}

beforeEach(() => {
  vi.mocked(service.getConversation).mockReset();
});

describe("conversationDetailQueryKey", () => {
  it("delegates to the canonical chat key factory", () => {
    const factory = vi.spyOn(chatKeys, "conversationDetail");

    expect(conversationDetailQueryKey(7)).toEqual([
      "conversations",
      "detail",
      7,
    ]);
    expect(factory).toHaveBeenCalledWith(7);
  });
});

describe("conversationDetailQueryOptions", () => {
  it("loads the requested conversation through the conversation service", async () => {
    const apiClient = axios.create();
    vi.mocked(service.getConversation).mockResolvedValue(conversation());

    await freshClient().fetchQuery(
      conversationDetailQueryOptions(7, apiClient),
    );

    expect(service.getConversation).toHaveBeenCalledWith(apiClient, 7);
  });

  it("uses the shared detail cache policy without polling", () => {
    const options = conversationDetailQueryOptions(7, axios.create());

    expect(options.staleTime).toBe(30_000);
    expect(options.gcTime).toBe(5 * 60_000);
    expect(options.retry).toBe(false);
    expect(options.refetchOnWindowFocus).toBe(false);
    expect(options.refetchInterval).toBeUndefined();
  });
});

describe("useConversationDetail", () => {
  it("does not request detail when disabled", () => {
    const queryClient = freshClient();

    const { result } = renderHook(() => useConversationDetail(0, false), {
      wrapper: makeWrapper(queryClient, axios.create()),
    });

    expect(result.current.fetchStatus).toBe("idle");
    expect(service.getConversation).not.toHaveBeenCalled();
  });

  it("exposes a pending state without suspending", () => {
    vi.mocked(service.getConversation).mockReturnValue(
      new Promise(() => {
        // Keep the request pending to observe the hook's initial state.
      }),
    );
    const queryClient = freshClient();

    const { result } = renderHook(() => useConversationDetail(7), {
      wrapper: makeWrapper(queryClient, axios.create()),
    });

    expect(result.current.isPending).toBe(true);
    expect(result.current.data).toBeUndefined();
  });

  it("exposes loaded conversation data", async () => {
    vi.mocked(service.getConversation).mockResolvedValue(conversation());
    const queryClient = freshClient();

    const { result } = renderHook(() => useConversationDetail(7), {
      wrapper: makeWrapper(queryClient, axios.create()),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(conversation());
  });

  it("exposes service errors without throwing", async () => {
    const error = new Error("detail failed");
    vi.mocked(service.getConversation).mockRejectedValue(error);
    const queryClient = freshClient();

    const { result } = renderHook(() => useConversationDetail(7), {
      wrapper: makeWrapper(queryClient, axios.create()),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBe(error);
  });
});
