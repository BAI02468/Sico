import type { AxiosInstance } from "axios";
import { z } from "zod";

import { SCHEDULED_TASK_ENDPOINTS } from "../../../constants/endpoints";
import { apiResponseSchema, assertOk, unwrapData } from "../../../schemas/api";
import { type Paged } from "../../../schemas/paginated";
import {
  type ScheduledTask,
  type ScheduledTaskCreateInput,
  scheduledTaskCreateInputSchema,
  scheduledTaskIdSchema,
  scheduledTaskSchema,
  type ScheduledTaskUpdateInput,
  scheduledTaskUpdateInputSchema,
} from "../schemas/scheduled-task";

type ScheduledTasksApiClient = Pick<
  AxiosInstance,
  "get" | "post" | "put" | "delete"
>;

const taskEnvelope = apiResponseSchema(scheduledTaskSchema);
const listEnvelope = apiResponseSchema(
  z
    .object({
      tasks: z.array(scheduledTaskSchema),
      total: z.number().int().nonnegative(),
      hasNext: z.boolean(),
    })
    .transform(
      ({ tasks, total, hasNext }): Paged<ScheduledTask> => ({
        items: tasks,
        total,
        hasNext,
      }),
    ),
);
const emptyEnvelope = apiResponseSchema(z.unknown());

export type ScheduledTaskListParams = {
  page: number;
  pageSize: number;
};

export async function fetchScheduledTasks(
  apiClient: ScheduledTasksApiClient,
  params: ScheduledTaskListParams,
): Promise<Paged<ScheduledTask>> {
  const response = await apiClient.get<unknown>(SCHEDULED_TASK_ENDPOINTS.list, {
    params,
  });
  return unwrapData(listEnvelope.parse(response.data), "fetchScheduledTasks");
}

export async function fetchScheduledTask(
  apiClient: ScheduledTasksApiClient,
  id: number,
): Promise<ScheduledTask> {
  const response = await apiClient.get<unknown>(SCHEDULED_TASK_ENDPOINTS.root, {
    params: { id: scheduledTaskIdSchema.parse(id) },
  });
  return unwrapData(taskEnvelope.parse(response.data), "fetchScheduledTask");
}

export async function createScheduledTask(
  apiClient: ScheduledTasksApiClient,
  input: ScheduledTaskCreateInput,
): Promise<ScheduledTask> {
  const body = scheduledTaskCreateInputSchema.parse(input);
  const response = await apiClient.post<unknown>(
    SCHEDULED_TASK_ENDPOINTS.root,
    body,
  );
  return unwrapData(taskEnvelope.parse(response.data), "createScheduledTask");
}

export async function updateScheduledTask(
  apiClient: ScheduledTasksApiClient,
  input: ScheduledTaskUpdateInput,
): Promise<ScheduledTask> {
  const body = scheduledTaskUpdateInputSchema.parse(input);
  const response = await apiClient.put<unknown>(
    SCHEDULED_TASK_ENDPOINTS.root,
    body,
  );
  return unwrapData(taskEnvelope.parse(response.data), "updateScheduledTask");
}

export async function deleteScheduledTask(
  apiClient: ScheduledTasksApiClient,
  id: number,
): Promise<void> {
  const response = await apiClient.delete<unknown>(
    SCHEDULED_TASK_ENDPOINTS.root,
    {
      data: { id: scheduledTaskIdSchema.parse(id) },
    },
  );
  assertOk(emptyEnvelope.parse(response.data), "deleteScheduledTask");
}
