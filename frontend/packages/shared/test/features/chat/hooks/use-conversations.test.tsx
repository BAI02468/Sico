import {
  type InfiniteData,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import axios, { type AxiosInstance } from "axios";
import type { ReactElement, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  conversationListQueryOptions,
  selectConversationsRefetchInterval,
  useConversations,
} from "@/features/chat/hooks/use-conversations";
import type { ConversationSummary } from "@/features/chat/schemas/conversation";
import type { ConversationListPage } from "@/features/chat/services/conversation";
import * as service from "@/features/chat/services/conversation";
import { ConversationRunStatusSchema } from "@/schemas/conversation-run-status";
import { ApiClientProvider } from "@/services/api-client-context";

vi.mock("@/features/chat/services/conversation");

function conv(id: number): ConversationSummary {
  return { id, title: `C${id}`, createdAt: id, agentInstanceId: 7 };
}

function makeWrapper(): (props: { children: ReactNode }) => ReactElement {
  const apiClient = {} as AxiosInstance;
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }): ReactElement {
    return (
      <QueryClientProvider client={queryClient}>
        <ApiClientProvider client={apiClient}>{children}</ApiClientProvider>
      </QueryClientProvider>
    );
  };
}

beforeEach(() => {
  vi.mocked(service.listConversations).mockReset();
});

describe("useConversations", () => {
  it("fetches the first page for the given agentInstanceId (page 1)", async () => {
    vi.mocked(service.listConversations).mockResolvedValue({
      items: [],
      hasNext: false,
    });
    const { result } = renderHook(() => useConversations(7), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.items).toBeDefined());
    // agentInstanceId + page 1 flow through to the service.
    expect(service.listConversations).toHaveBeenCalledWith(
      expect.anything(),
      7,
      { page: 1 },
    );
  });

  it("flattens the fetched page into items and exposes hasNextPage", async () => {
    vi.mocked(service.listConversations).mockResolvedValue({
      items: [conv(1)],
      hasNext: true,
    });
    const { result } = renderHook(() => useConversations(7), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.items).toHaveLength(1));
    expect(result.current.items[0]?.title).toBe("C1");
    expect(result.current.hasNextPage).toBe(true);
  });

  it("appends the next page's items on fetchNextPage, requesting page 2", async () => {
    vi.mocked(service.listConversations)
      .mockResolvedValueOnce({ items: [conv(1)], hasNext: true })
      .mockResolvedValueOnce({ items: [conv(2)], hasNext: false });
    const { result } = renderHook(() => useConversations(7), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.items).toHaveLength(1));

    await act(async () => {
      result.current.fetchNextPage();
    });

    await waitFor(() => expect(result.current.items).toHaveLength(2));
    // Newest-first pages append in fetch order: page 1 then page 2.
    expect(result.current.items.map((c) => c.id)).toEqual([1, 2]);
    expect(result.current.hasNextPage).toBe(false);
    expect(service.listConversations).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      7,
      { page: 2 },
    );
  });

  it("does not advance past the last page (hasNextPage false stops fetching)", async () => {
    vi.mocked(service.listConversations).mockResolvedValue({
      items: [conv(1)],
      hasNext: false,
    });
    const { result } = renderHook(() => useConversations(7), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.items).toHaveLength(1));
    expect(result.current.hasNextPage).toBe(false);
  });
});

describe("conversationListQueryOptions — query policy", () => {
  it("selects a 2-second interval when any loaded conversation is running", () => {
    const data: InfiniteData<ConversationListPage, number> = {
      pages: [
        {
          items: [
            {
              ...conv(1),
              conversationStatus: ConversationRunStatusSchema.enum.IDLE,
            },
          ],
          hasNext: true,
        },
        {
          items: [
            {
              ...conv(2),
              conversationStatus: ConversationRunStatusSchema.enum.RUNNING,
            },
          ],
          hasNext: false,
        },
      ],
      pageParams: [1, 2],
    };

    expect(selectConversationsRefetchInterval(data)).toBe(2_000);
  });

  it("selects a 30-second interval before data loads", () => {
    expect(selectConversationsRefetchInterval(undefined)).toBe(30_000);
  });

  it("selects a 30-second interval for empty pages", () => {
    expect(
      selectConversationsRefetchInterval({
        pages: [{ items: [], hasNext: false }],
        pageParams: [1],
      }),
    ).toBe(30_000);
  });

  it("selects a 30-second interval when no conversation is running", () => {
    const data: InfiniteData<ConversationListPage, number> = {
      pages: [
        {
          items: [
            {
              ...conv(1),
              conversationStatus: ConversationRunStatusSchema.enum.IDLE,
            },
            {
              ...conv(2),
              conversationStatus: ConversationRunStatusSchema.enum.UNKNOWN,
            },
            conv(3),
          ],
          hasNext: false,
        },
      ],
      pageParams: [1],
    };

    expect(selectConversationsRefetchInterval(data)).toBe(30_000);
  });

  it("preserves existing options and leaves background polling disabled", () => {
    const options = conversationListQueryOptions(7, axios.create());

    expect(options.queryKey).toEqual([
      "conversations",
      "list",
      { agentInstanceId: 7 },
    ]);
    expect(options.initialPageParam).toBe(1);
    expect(options.staleTime).toBe(30_000);
    expect(options.refetchOnWindowFocus).toBe(false);
    expect(options.gcTime).toBe(5 * 60_000);
    expect(options.refetchInterval).toEqual(expect.any(Function));
    expect(options.refetchIntervalInBackground).toBeUndefined();
  });
});
