import {
  type InfiniteData,
  useInfiniteQuery,
  type UseInfiniteQueryOptions,
  type UseInfiniteQueryResult,
  useQuery,
  type UseQueryOptions,
  type UseQueryResult,
} from "@tanstack/react-query";
import type { AxiosInstance } from "axios";

import type { Paged } from "../../../schemas/paginated";
import { useApiClient } from "../../../services/api-client-context";
import { DEFAULT_SCHEDULED_TASKS_PAGE_SIZE } from "../constants";
import { scheduledTaskKeys } from "../query-keys";
import type { ScheduledTask } from "../schemas/scheduled-task";
import {
  fetchScheduledTask,
  fetchScheduledTasks,
} from "../services/scheduled-tasks";

type ScheduledTasksQueryKey = ReturnType<typeof scheduledTaskKeys.list>;
type ScheduledTaskDetailQueryKey = ReturnType<typeof scheduledTaskKeys.detail>;

type ScheduledTasksOptions = UseInfiniteQueryOptions<
  Paged<ScheduledTask>,
  Error,
  InfiniteData<Paged<ScheduledTask>>,
  ScheduledTasksQueryKey,
  number
>;

export function scheduledTasksInfiniteQueryOptions(
  apiClient: AxiosInstance,
  pageSize = DEFAULT_SCHEDULED_TASKS_PAGE_SIZE,
): ScheduledTasksOptions {
  return {
    queryKey: scheduledTaskKeys.list(pageSize),
    queryFn: ({ pageParam }) =>
      fetchScheduledTasks(apiClient, { page: pageParam, pageSize }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, _pages, lastPageParam) =>
      lastPage.hasNext && lastPage.items.length > 0
        ? lastPageParam + 1
        : undefined,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  };
}

export function useScheduledTasksInfiniteQuery(
  pageSize = DEFAULT_SCHEDULED_TASKS_PAGE_SIZE,
): UseInfiniteQueryResult<InfiniteData<Paged<ScheduledTask>>> {
  const apiClient = useApiClient();
  return useInfiniteQuery(
    scheduledTasksInfiniteQueryOptions(apiClient, pageSize),
  );
}

export function scheduledTaskDetailQueryOptions(
  id: number,
  apiClient: AxiosInstance,
): UseQueryOptions<
  ScheduledTask,
  Error,
  ScheduledTask,
  ScheduledTaskDetailQueryKey
> {
  return {
    queryKey: scheduledTaskKeys.detail(id),
    queryFn: () => fetchScheduledTask(apiClient, id),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  };
}

export function useScheduledTaskQuery(
  id: number,
): UseQueryResult<ScheduledTask> {
  const apiClient = useApiClient();
  return useQuery(scheduledTaskDetailQueryOptions(id, apiClient));
}

export function selectDedupedScheduledTasks(
  pages: Paged<ScheduledTask>[],
): ScheduledTask[] {
  const byId = new Map<number, ScheduledTask>();
  for (const page of pages) {
    for (const task of page.items) {
      const existing = byId.get(task.id);
      if (!existing || task.updatedAt >= existing.updatedAt) {
        byId.set(task.id, task);
      }
    }
  }
  return Array.from(byId.values());
}
