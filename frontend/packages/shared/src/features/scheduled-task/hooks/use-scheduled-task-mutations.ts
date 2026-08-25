import { useLingui } from "@lingui/react/macro";
import { toast } from "@sico/ui";
import {
  type InfiniteData,
  type QueryClient,
  useMutation,
  type UseMutationResult,
  useQueryClient,
} from "@tanstack/react-query";

import type { Paged } from "../../../schemas/paginated";
import { useApiClient } from "../../../services/api-client-context";
import { scheduledTaskKeys } from "../query-keys";
import {
  type ScheduledTask,
  type ScheduledTaskCreateInput,
  type ScheduledTaskUpdateInput,
  scheduledTaskUpdateInputFromTask,
} from "../schemas/scheduled-task";
import {
  createScheduledTask,
  deleteScheduledTask,
  updateScheduledTask,
} from "../services/scheduled-tasks";

type ToggleVariables = { task: ScheduledTask; enabled: boolean };
type ToggleOperation = {
  enabled: boolean;
  failed: boolean;
  settled: boolean;
};
type ToggleState = { baseEnabled: boolean; operations: ToggleOperation[] };
type ToggleContext = { operation: ToggleOperation };

const toggleStates = new WeakMap<QueryClient, Map<number, ToggleState>>();

function invalidateTask(queryClient: QueryClient, id: number): Promise<void[]> {
  return Promise.all([
    queryClient.invalidateQueries({
      queryKey: scheduledTaskKeys.detail(id),
      exact: true,
    }),
    queryClient.invalidateQueries({ queryKey: scheduledTaskKeys.lists() }),
  ]);
}

function patchCachedTask(
  queryClient: QueryClient,
  id: number,
  enabled: boolean,
): void {
  queryClient.setQueryData<ScheduledTask>(scheduledTaskKeys.detail(id), (old) =>
    old ? { ...old, enabled } : old,
  );
  queryClient.setQueriesData<InfiniteData<Paged<ScheduledTask>>>(
    { queryKey: scheduledTaskKeys.lists() },
    (old) =>
      old && {
        ...old,
        pages: old.pages.map((page) => ({
          ...page,
          items: page.items.map((task) =>
            task.id === id ? { ...task, enabled } : task,
          ),
        })),
      },
  );
}

function beginToggle(
  queryClient: QueryClient,
  variables: ToggleVariables,
): ToggleContext {
  const states =
    toggleStates.get(queryClient) ?? new Map<number, ToggleState>();
  toggleStates.set(queryClient, states);
  const state = states.get(variables.task.id) ?? {
    baseEnabled: variables.task.enabled,
    operations: [],
  };
  states.set(variables.task.id, state);
  const operation = {
    enabled: variables.enabled,
    failed: false,
    settled: false,
  };
  state.operations.push(operation);
  patchCachedTask(queryClient, variables.task.id, variables.enabled);
  return { operation };
}

function rollbackToggle(
  queryClient: QueryClient,
  variables: ToggleVariables,
  context: ToggleContext | undefined,
): void {
  const state = toggleStates.get(queryClient)?.get(variables.task.id);
  if (!state || !context) {
    return;
  }
  const { operation } = context;
  operation.failed = true;
  const enabled =
    [...state.operations].reverse().find((candidate) => !candidate.failed)
      ?.enabled ?? state.baseEnabled;
  patchCachedTask(queryClient, variables.task.id, enabled);
}

function settleToggle(
  queryClient: QueryClient,
  id: number,
  context: ToggleContext | undefined,
): void {
  const states = toggleStates.get(queryClient);
  const state = states?.get(id);
  if (!states || !state || !context) {
    return;
  }
  const { operation } = context;
  operation.settled = true;
  if (state.operations.some((candidate) => !candidate.settled)) {
    return;
  }
  states.delete(id);
  if (states.size === 0) {
    toggleStates.delete(queryClient);
  }
}

export function useCreateScheduledTaskMutation(): UseMutationResult<
  ScheduledTask,
  Error,
  ScheduledTaskCreateInput
> {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input) => createScheduledTask(apiClient, input),
    onSuccess: () =>
      queryClient.resetQueries({ queryKey: scheduledTaskKeys.lists() }),
  });
}

export function useUpdateScheduledTaskMutation(): UseMutationResult<
  ScheduledTask,
  Error,
  ScheduledTaskUpdateInput
> {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input) => updateScheduledTask(apiClient, input),
    onSettled: (_data, _error, variables) =>
      invalidateTask(queryClient, variables.id),
  });
}

export function useDeleteScheduledTaskMutation(): UseMutationResult<
  void,
  Error,
  number
> {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => deleteScheduledTask(apiClient, id),
    onSuccess: (_data, id) => {
      queryClient.removeQueries({
        queryKey: scheduledTaskKeys.detail(id),
        exact: true,
      });
      return queryClient.resetQueries({ queryKey: scheduledTaskKeys.lists() });
    },
  });
}

export function useToggleScheduledTaskMutation(): UseMutationResult<
  ScheduledTask,
  Error,
  ToggleVariables,
  ToggleContext
> {
  const { t } = useLingui();
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ task, enabled }) =>
      updateScheduledTask(
        apiClient,
        scheduledTaskUpdateInputFromTask(task, { enabled }),
      ),
    onMutate: async (variables) => {
      await Promise.all([
        queryClient.cancelQueries({
          queryKey: scheduledTaskKeys.detail(variables.task.id),
          exact: true,
        }),
        queryClient.cancelQueries({ queryKey: scheduledTaskKeys.lists() }),
      ]);
      return beginToggle(queryClient, variables);
    },
    onError: (_error, variables, context) => {
      rollbackToggle(queryClient, variables, context);
      toast.error(
        t({
          id: "scheduledTask.mutations.toggleFailed",
          message: "Failed to update scheduled task.",
        }),
      );
    },
    onSettled: (_data, _error, variables, context) => {
      settleToggle(queryClient, variables.task.id, context);
      return invalidateTask(queryClient, variables.task.id);
    },
  });
}
