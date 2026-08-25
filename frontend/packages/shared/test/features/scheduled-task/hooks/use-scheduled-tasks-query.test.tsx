import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import axios, { type AxiosInstance } from "axios";
import type { ReactElement, ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import {
  scheduledTaskDetailQueryOptions,
  scheduledTasksInfiniteQueryOptions,
  selectDedupedScheduledTasks,
  useScheduledTasksInfiniteQuery,
} from "@/features/scheduled-task/hooks/use-scheduled-tasks-query";
import { scheduledTaskKeys } from "@/features/scheduled-task/query-keys";
import type { ScheduledTask } from "@/features/scheduled-task/schemas/scheduled-task";
import { makeOkEnvelope } from "@/schemas/api";
import { ApiClientProvider } from "@/services/api-client-context";

function task(id: number, updatedAt = id): ScheduledTask {
  return {
    id,
    name: `Task ${id}`,
    enabled: true,
    agentInstanceId: 2,
    message: "Run it",
    attachments: [],
    cronExpression: "0 9 * * *",
    timezone: "UTC",
    creatorUsername: "alex",
    nextRunAt: 1,
    lastRunAt: 0,
    createdAt: 0,
    updatedAt,
  };
}

function makeWrapper(apiClient: AxiosInstance): {
  Wrapper: (props: { children: ReactNode }) => ReactElement;
  queryClient: QueryClient;
} {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  function Wrapper({ children }: { children: ReactNode }): ReactElement {
    return (
      <QueryClientProvider client={queryClient}>
        <ApiClientProvider client={apiClient}>{children}</ApiClientProvider>
      </QueryClientProvider>
    );
  }

  return { Wrapper, queryClient };
}

describe("useScheduledTasksInfiniteQuery", () => {
  it("loads page one with the default page size", async () => {
    const apiClient = axios.create();
    const get = vi.spyOn(apiClient, "get").mockResolvedValue({
      data: makeOkEnvelope({ tasks: [task(1)], total: 1, hasNext: false }),
    });
    const { Wrapper } = makeWrapper(apiClient);
    const { result } = renderHook(() => useScheduledTasksInfiniteQuery(), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(get).toHaveBeenCalledWith("/scheduled-tasks/list", {
      params: { page: 1, pageSize: 10 },
    });
  });

  it("fetches page two when the first page has a next page", async () => {
    const apiClient = axios.create();
    const get = vi
      .spyOn(apiClient, "get")
      .mockResolvedValueOnce({
        data: makeOkEnvelope({ tasks: [task(1)], total: 2, hasNext: true }),
      })
      .mockResolvedValueOnce({
        data: makeOkEnvelope({ tasks: [task(2)], total: 2, hasNext: false }),
      });
    const { Wrapper } = makeWrapper(apiClient);
    const { result } = renderHook(() => useScheduledTasksInfiniteQuery(), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    await waitFor(() => expect(result.current.hasNextPage).toBe(true));
    await act(async () => {
      await result.current.fetchNextPage();
    });
    await waitFor(() => expect(result.current.data?.pages).toHaveLength(2));

    expect(result.current.data?.pages.map((page) => page.items[0]?.id)).toEqual(
      [1, 2],
    );
    expect(get).toHaveBeenLastCalledWith("/scheduled-tasks/list", {
      params: { page: 2, pageSize: 10 },
    });
  });

  it("stops fetching when the last page has no next page", async () => {
    const apiClient = axios.create();
    vi.spyOn(apiClient, "get").mockResolvedValue({
      data: makeOkEnvelope({ tasks: [task(1)], total: 1, hasNext: false }),
    });
    const { Wrapper } = makeWrapper(apiClient);
    const { result } = renderHook(() => useScheduledTasksInfiniteQuery(), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.hasNextPage).toBe(false);
  });

  it("stops fetching when a page is empty despite hasNext", async () => {
    const apiClient = axios.create();
    vi.spyOn(apiClient, "get").mockResolvedValue({
      data: makeOkEnvelope({ tasks: [], total: 1, hasNext: true }),
    });
    const { Wrapper } = makeWrapper(apiClient);
    const { result } = renderHook(() => useScheduledTasksInfiniteQuery(), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.hasNextPage).toBe(false);
  });

  it("preserves loaded pages when the next page fails", async () => {
    const apiClient = axios.create();
    vi.spyOn(apiClient, "get")
      .mockResolvedValueOnce({
        data: makeOkEnvelope({ tasks: [task(1)], total: 2, hasNext: true }),
      })
      .mockRejectedValueOnce(new Error("failed page two"));
    const { Wrapper } = makeWrapper(apiClient);
    const { result } = renderHook(() => useScheduledTasksInfiniteQuery(), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    await act(async () => {
      await result.current.fetchNextPage();
    });

    expect(result.current.data?.pages).toHaveLength(1);
    expect(result.current.data?.pages[0]?.items[0]?.id).toBe(1);
  });

  it("surfaces list schema errors", async () => {
    const apiClient = axios.create();
    vi.spyOn(apiClient, "get").mockResolvedValue({
      data: makeOkEnvelope({
        tasks: [{ id: "invalid" }],
        total: 1,
        hasNext: false,
      }),
    });
    const { Wrapper } = makeWrapper(apiClient);
    const { result } = renderHook(() => useScheduledTasksInfiniteQuery(), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeInstanceOf(Error);
  });
});

describe("scheduled task query options", () => {
  it("uses stable keys and the scheduled task cache policy", () => {
    const apiClient = axios.create();
    const list = scheduledTasksInfiniteQueryOptions(apiClient, 20);
    const detail = scheduledTaskDetailQueryOptions(7, apiClient);

    expect(scheduledTaskKeys.all).toEqual(["scheduled-tasks"]);
    expect(scheduledTaskKeys.lists()).toEqual(["scheduled-tasks", "list"]);
    expect(scheduledTaskKeys.details()).toEqual(["scheduled-tasks", "detail"]);
    expect(list.queryKey).toEqual([
      "scheduled-tasks",
      "list",
      { pageSize: 20 },
    ]);
    expect(detail.queryKey).toEqual(["scheduled-tasks", "detail", 7]);
    expect(list.initialPageParam).toBe(1);
    expect(list.staleTime).toBe(30_000);
    expect(list.gcTime).toBe(300_000);
    expect(list.refetchOnWindowFocus).toBe(false);
  });

  it("keeps first-seen order while retaining the newest duplicate", () => {
    expect(
      selectDedupedScheduledTasks([
        { items: [task(1, 1), task(2, 1)], total: 3, hasNext: true },
        { items: [task(1, 2), task(3, 1)], total: 3, hasNext: false },
      ]),
    ).toEqual([task(1, 2), task(2, 1), task(3, 1)]);
  });
});
