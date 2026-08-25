import { toast } from "@sico/ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import axios from "axios";
import type { ReactElement, ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import {
  useCreateScheduledTaskMutation,
  useDeleteScheduledTaskMutation,
  useToggleScheduledTaskMutation,
  useUpdateScheduledTaskMutation,
} from "@/features/scheduled-task/hooks/use-scheduled-task-mutations";
import { scheduledTaskKeys } from "@/features/scheduled-task/query-keys";
import type {
  ScheduledTask,
  ScheduledTaskCreateInput,
} from "@/features/scheduled-task/schemas/scheduled-task";
import * as service from "@/features/scheduled-task/services/scheduled-tasks";
import { ApiClientProvider } from "@/services/api-client-context";

vi.mock("@/features/scheduled-task/services/scheduled-tasks");

function task(
  id: number,
  enabled = true,
  sendEmailOnComplete?: boolean,
): ScheduledTask {
  return {
    id,
    name: `Task ${id}`,
    enabled,
    agentInstanceId: 2,
    message: "Run it",
    attachments: [],
    cronExpression: "0 9 * * *",
    timezone: "UTC",
    creatorUsername: "alex",
    nextRunAt: 1,
    lastRunAt: 0,
    createdAt: 0,
    updatedAt: id,
    ...(sendEmailOnComplete === undefined
      ? {}
      : { extraInfo: { sendEmailOnComplete } }),
  };
}

function createInput(): ScheduledTaskCreateInput {
  const scheduledTask = task(1);
  return {
    name: scheduledTask.name,
    enabled: scheduledTask.enabled,
    agentInstanceId: scheduledTask.agentInstanceId,
    message: scheduledTask.message,
    attachments: scheduledTask.attachments,
    cronExpression: scheduledTask.cronExpression,
    timezone: scheduledTask.timezone,
  };
}

function makeWrapper(): {
  Wrapper: (props: { children: ReactNode }) => ReactElement;
  queryClient: QueryClient;
} {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  function Wrapper({ children }: { children: ReactNode }): ReactElement {
    return (
      <QueryClientProvider client={queryClient}>
        <ApiClientProvider client={axios.create()}>
          {children}
        </ApiClientProvider>
      </QueryClientProvider>
    );
  }

  return { Wrapper, queryClient };
}

describe("scheduled task mutations", () => {
  it("resets every list variant after create so stale empty data cannot flash", async () => {
    vi.mocked(service.createScheduledTask).mockResolvedValue(task(1, false));
    const { Wrapper, queryClient } = makeWrapper();
    const reset = vi.spyOn(queryClient, "resetQueries");
    const { result } = renderHook(() => useCreateScheduledTaskMutation(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      await result.current.mutateAsync(createInput());
    });

    expect(reset).toHaveBeenCalledWith({
      queryKey: scheduledTaskKeys.lists(),
    });
  });

  it("invalidates the exact detail and all lists after update", async () => {
    vi.mocked(service.updateScheduledTask).mockResolvedValue(task(1, false));
    const { Wrapper, queryClient } = makeWrapper();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useUpdateScheduledTaskMutation(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      await result.current.mutateAsync({ id: 1, ...createInput() });
    });

    expect(invalidate).toHaveBeenCalledWith({
      queryKey: scheduledTaskKeys.detail(1),
      exact: true,
    });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: scheduledTaskKeys.lists(),
    });
  });

  it("resets lists after delete so stale cards cannot flash", async () => {
    vi.mocked(service.deleteScheduledTask).mockResolvedValue(undefined);
    const { Wrapper, queryClient } = makeWrapper();
    const remove = vi.spyOn(queryClient, "removeQueries");
    const reset = vi.spyOn(queryClient, "resetQueries");
    const { result } = renderHook(() => useDeleteScheduledTaskMutation(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      await result.current.mutateAsync(1);
    });

    expect(remove).toHaveBeenCalledWith({
      queryKey: scheduledTaskKeys.detail(1),
      exact: true,
    });
    expect(reset).toHaveBeenCalledWith({
      queryKey: scheduledTaskKeys.lists(),
    });
  });

  it("optimistically updates the task detail and every cached list", async () => {
    let resolveUpdate: (value: ScheduledTask) => void = () => {};
    vi.mocked(service.updateScheduledTask).mockReturnValue(
      new Promise((resolve) => {
        resolveUpdate = resolve;
      }),
    );
    const { Wrapper, queryClient } = makeWrapper();
    const emailTask = task(1, true, true);
    queryClient.setQueryData(scheduledTaskKeys.detail(1), emailTask);
    queryClient.setQueryData(scheduledTaskKeys.list(10), {
      pages: [{ items: [emailTask], total: 1, hasNext: false }],
      pageParams: [1],
    });
    queryClient.setQueryData(scheduledTaskKeys.list(20), {
      pages: [{ items: [emailTask], total: 1, hasNext: false }],
      pageParams: [1],
    });
    const { result } = renderHook(() => useToggleScheduledTaskMutation(), {
      wrapper: Wrapper,
    });

    act(() => result.current.mutate({ task: emailTask, enabled: false }));

    await waitFor(() =>
      expect(
        queryClient.getQueryData<ScheduledTask>(scheduledTaskKeys.detail(1))
          ?.enabled,
      ).toBe(false),
    );
    expect(service.updateScheduledTask).toHaveBeenCalledWith(
      expect.anything(),
      {
        id: 1,
        ...createInput(),
        enabled: false,
        extraInfo: { sendEmailOnComplete: true },
      },
    );
    expect(
      queryClient.getQueryData<{ pages: { items: ScheduledTask[] }[] }>(
        scheduledTaskKeys.list(10),
      )?.pages[0]?.items[0]?.enabled,
    ).toBe(false);
    expect(
      queryClient.getQueryData<{ pages: { items: ScheduledTask[] }[] }>(
        scheduledTaskKeys.list(20),
      )?.pages[0]?.items[0]?.enabled,
    ).toBe(false);

    act(() => resolveUpdate(task(1, false, true)));
  });

  it("restores exact detail and list snapshots when toggle fails", async () => {
    vi.mocked(service.updateScheduledTask).mockRejectedValue(
      new Error("failed"),
    );
    const toastError = vi.spyOn(toast, "error");
    const { Wrapper, queryClient } = makeWrapper();
    const detail = task(1);
    const list10 = {
      pages: [{ items: [task(1)], total: 1, hasNext: false }],
      pageParams: [1],
    };
    const list20 = {
      pages: [{ items: [task(1)], total: 1, hasNext: false }],
      pageParams: [1],
    };
    queryClient.setQueryData(scheduledTaskKeys.detail(1), detail);
    queryClient.setQueryData(scheduledTaskKeys.list(10), list10);
    queryClient.setQueryData(scheduledTaskKeys.list(20), list20);
    const { result } = renderHook(() => useToggleScheduledTaskMutation(), {
      wrapper: Wrapper,
    });

    act(() => result.current.mutate({ task: detail, enabled: false }));

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(queryClient.getQueryData(scheduledTaskKeys.detail(1))).toEqual(
      detail,
    );
    expect(queryClient.getQueryData(scheduledTaskKeys.list(10))).toEqual(
      list10,
    );
    expect(queryClient.getQueryData(scheduledTaskKeys.list(20))).toEqual(
      list20,
    );
    expect(toastError).toHaveBeenCalledWith("Failed to update scheduled task.");
  });

  it("keeps a different task's optimistic toggle when another fails", async () => {
    let rejectFirst: (error: Error) => void = () => {};
    let rejectSecond: (error: Error) => void = () => {};
    vi.mocked(service.updateScheduledTask)
      .mockReturnValueOnce(
        new Promise((_resolve, reject) => {
          rejectFirst = reject;
        }),
      )
      .mockReturnValueOnce(
        new Promise((_resolve, reject) => {
          rejectSecond = reject;
        }),
      );
    const { Wrapper, queryClient } = makeWrapper();
    queryClient.setQueryData(scheduledTaskKeys.detail(1), task(1));
    queryClient.setQueryData(scheduledTaskKeys.detail(2), task(2));
    queryClient.setQueryData(scheduledTaskKeys.list(10), {
      pages: [{ items: [task(1), task(2)], total: 2, hasNext: false }],
      pageParams: [1],
    });
    const { result } = renderHook(() => useToggleScheduledTaskMutation(), {
      wrapper: Wrapper,
    });

    act(() => result.current.mutate({ task: task(1), enabled: false }));
    await waitFor(() =>
      expect(
        queryClient.getQueryData<ScheduledTask>(scheduledTaskKeys.detail(1))
          ?.enabled,
      ).toBe(false),
    );
    act(() => result.current.mutate({ task: task(2), enabled: false }));
    await waitFor(() =>
      expect(
        queryClient.getQueryData<ScheduledTask>(scheduledTaskKeys.detail(2))
          ?.enabled,
      ).toBe(false),
    );
    act(() => rejectFirst(new Error("first failed")));
    await waitFor(() =>
      expect(
        queryClient.getQueryData<ScheduledTask>(scheduledTaskKeys.detail(1))
          ?.enabled,
      ).toBe(true),
    );
    expect(
      queryClient.getQueryData<ScheduledTask>(scheduledTaskKeys.detail(2))
        ?.enabled,
    ).toBe(false);
    act(() => rejectSecond(new Error("second failed")));
    await waitFor(() =>
      expect(
        queryClient.getQueryData<ScheduledTask>(scheduledTaskKeys.detail(2))
          ?.enabled,
      ).toBe(true),
    );
  });

  it("does not reinstate stale same-task toggles after out-of-order failures", async () => {
    let rejectFirst: (error: Error) => void = () => {};
    let rejectSecond: (error: Error) => void = () => {};
    vi.mocked(service.updateScheduledTask)
      .mockReturnValueOnce(
        new Promise((_resolve, reject) => {
          rejectFirst = reject;
        }),
      )
      .mockReturnValueOnce(
        new Promise((_resolve, reject) => {
          rejectSecond = reject;
        }),
      );
    const { Wrapper, queryClient } = makeWrapper();
    queryClient.setQueryData(scheduledTaskKeys.detail(1), task(1));
    queryClient.setQueryData(scheduledTaskKeys.list(10), {
      pages: [{ items: [task(1)], total: 1, hasNext: false }],
      pageParams: [1],
    });
    const { result } = renderHook(() => useToggleScheduledTaskMutation(), {
      wrapper: Wrapper,
    });

    act(() => result.current.mutate({ task: task(1), enabled: false }));
    await waitFor(() =>
      expect(
        queryClient.getQueryData<ScheduledTask>(scheduledTaskKeys.detail(1))
          ?.enabled,
      ).toBe(false),
    );
    act(() => result.current.mutate({ task: task(1, false), enabled: true }));
    await waitFor(() =>
      expect(
        queryClient.getQueryData<ScheduledTask>(scheduledTaskKeys.detail(1))
          ?.enabled,
      ).toBe(true),
    );
    act(() => rejectFirst(new Error("first failed")));
    expect(
      queryClient.getQueryData<ScheduledTask>(scheduledTaskKeys.detail(1))
        ?.enabled,
    ).toBe(true);
    act(() => rejectSecond(new Error("second failed")));
    await waitFor(() =>
      expect(
        queryClient.getQueryData<ScheduledTask>(scheduledTaskKeys.detail(1))
          ?.enabled,
      ).toBe(true),
    );
  });

  it("restores the current authoritative caches after a settled toggle fails later", async () => {
    vi.mocked(service.updateScheduledTask)
      .mockResolvedValueOnce(task(1, false))
      .mockRejectedValueOnce(new Error("failed"));
    const { Wrapper, queryClient } = makeWrapper();
    queryClient.setQueryData(scheduledTaskKeys.detail(1), task(1));
    queryClient.setQueryData(scheduledTaskKeys.list(10), {
      pages: [{ items: [task(1)], total: 1, hasNext: false }],
      pageParams: [1],
    });
    queryClient.setQueryData(scheduledTaskKeys.list(20), {
      pages: [{ items: [task(1)], total: 1, hasNext: false }],
      pageParams: [1],
    });
    const { result } = renderHook(() => useToggleScheduledTaskMutation(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      await result.current.mutateAsync({ task: task(1), enabled: false });
    });

    const authoritativeTask = task(1);
    const authoritativeList = {
      pages: [{ items: [authoritativeTask], total: 1, hasNext: false }],
      pageParams: [1],
    };
    queryClient.setQueryData(scheduledTaskKeys.detail(1), authoritativeTask);
    queryClient.setQueryData(scheduledTaskKeys.list(10), authoritativeList);
    queryClient.setQueryData(scheduledTaskKeys.list(20), authoritativeList);

    act(() =>
      result.current.mutate({ task: authoritativeTask, enabled: false }),
    );

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(queryClient.getQueryData(scheduledTaskKeys.detail(1))).toEqual(
      authoritativeTask,
    );
    expect(queryClient.getQueryData(scheduledTaskKeys.list(10))).toEqual(
      authoritativeList,
    );
    expect(queryClient.getQueryData(scheduledTaskKeys.list(20))).toEqual(
      authoritativeList,
    );
  });

  it("invalidates the exact detail and lists after toggle settles", async () => {
    vi.mocked(service.updateScheduledTask).mockResolvedValue(task(1, false));
    const { Wrapper, queryClient } = makeWrapper();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useToggleScheduledTaskMutation(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      await result.current.mutateAsync({ task: task(1), enabled: false });
    });

    expect(invalidate).toHaveBeenCalledWith({
      queryKey: scheduledTaskKeys.detail(1),
      exact: true,
    });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: scheduledTaskKeys.lists(),
    });
  });
});
