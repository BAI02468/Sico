import type { AxiosInstance } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ScheduledTask } from "@/features/scheduled-task/schemas/scheduled-task";
import {
  createScheduledTask,
  deleteScheduledTask,
  fetchScheduledTask,
  fetchScheduledTasks,
  updateScheduledTask,
} from "@/features/scheduled-task/services/scheduled-tasks";
import { makeOkEnvelope } from "@/schemas/api";

function makeTask(sendEmailOnComplete?: boolean): ScheduledTask {
  return {
    id: 1,
    name: "Daily report",
    enabled: true,
    agentInstanceId: 2,
    creatorUsername: "alice",
    message: "Create the report",
    attachments: [],
    cronExpression: "0 9 * * 1-5",
    timezone: "America/New_York",
    nextRunAt: 1_700_000_000,
    lastRunAt: 0,
    createdAt: 1_699_000_000,
    updatedAt: 1_699_000_001,
    ...(sendEmailOnComplete === undefined
      ? {}
      : { extraInfo: { sendEmailOnComplete } }),
  };
}

const get = vi.fn();
const post = vi.fn();
const put = vi.fn();
const del = vi.fn();
const apiClient = {
  get,
  post,
  put,
  delete: del,
} satisfies Pick<AxiosInstance, "get" | "post" | "put" | "delete">;

beforeEach(() => {
  get.mockReset();
  post.mockReset();
  put.mockReset();
  del.mockReset();
});

describe("fetchScheduledTasks", () => {
  it("GETs the scheduled task list and normalizes it to Paged", async () => {
    get.mockResolvedValue({
      data: makeOkEnvelope({
        tasks: [makeTask(true)],
        total: 1,
        hasNext: false,
      }),
    });

    const result = await fetchScheduledTasks(apiClient, {
      page: 1,
      pageSize: 20,
    });

    expect(get).toHaveBeenCalledWith("/scheduled-tasks/list", {
      params: { page: 1, pageSize: 20 },
    });
    expect(result).toMatchObject({ total: 1, hasNext: false });
    expect(result.items[0]).toMatchObject({
      id: 1,
      lastRunAt: 0,
      extraInfo: { sendEmailOnComplete: true },
    });
  });

  it("loads a list task whose response attachments are null", async () => {
    get.mockResolvedValue({
      data: makeOkEnvelope({
        tasks: [{ ...makeTask(), attachments: null }],
        total: 1,
        hasNext: false,
      }),
    });

    const result = await fetchScheduledTasks(apiClient, {
      page: 1,
      pageSize: 10,
    });

    expect(result.items[0]?.attachments).toEqual([]);
  });
});

describe("fetchScheduledTask", () => {
  it("GETs the direct task response by id", async () => {
    get.mockResolvedValue({ data: makeOkEnvelope(makeTask(false)) });

    const result = await fetchScheduledTask(apiClient, 1);

    expect(get).toHaveBeenCalledWith("/scheduled-tasks", { params: { id: 1 } });
    expect(result).toMatchObject({
      id: 1,
      name: "Daily report",
      extraInfo: { sendEmailOnComplete: false },
    });
  });
});

describe("createScheduledTask", () => {
  it("returns the created task from the successful envelope", async () => {
    post.mockResolvedValue({ data: makeOkEnvelope(makeTask(true)) });

    const result = await createScheduledTask(apiClient, {
      name: " Daily report ",
      enabled: true,
      agentInstanceId: 2,
      message: " Create the report ",
      attachments: [],
      cronExpression: " 0 9 * * 1-5 ",
      timezone: " America/New_York ",
      extraInfo: { sendEmailOnComplete: true },
    });

    expect(post).toHaveBeenCalledWith("/scheduled-tasks", {
      name: "Daily report",
      enabled: true,
      agentInstanceId: 2,
      message: "Create the report",
      attachments: [],
      cronExpression: "0 9 * * 1-5",
      timezone: "America/New_York",
      extraInfo: { sendEmailOnComplete: true },
    });
    expect(result).toMatchObject({
      id: 1,
      extraInfo: { sendEmailOnComplete: true },
    });
  });

  it("rejects a forbidden create envelope", async () => {
    post.mockResolvedValue({ data: { code: 100003, msg: "forbidden" } });

    await expect(
      createScheduledTask(apiClient, {
        name: "Daily report",
        enabled: true,
        agentInstanceId: 2,
        message: "Create the report",
        attachments: [],
        cronExpression: "0 9 * * *",
        timezone: "UTC",
      }),
    ).rejects.toThrow(/rejected \(code 100003\)/);
  });
});

describe("updateScheduledTask", () => {
  it("returns the updated task from the successful envelope", async () => {
    put.mockResolvedValue({ data: makeOkEnvelope(makeTask(false)) });
    const input = {
      id: 1,
      name: "Daily report",
      enabled: true,
      agentInstanceId: 2,
      message: "Create the report",
      attachments: [],
      cronExpression: "0 9 * * 1-5",
      timezone: "America/New_York",
      extraInfo: { sendEmailOnComplete: false },
    };

    const result = await updateScheduledTask(apiClient, input);

    expect(put).toHaveBeenCalledWith("/scheduled-tasks", input);
    expect(result).toMatchObject({
      id: 1,
      extraInfo: { sendEmailOnComplete: false },
    });
  });
});

describe("deleteScheduledTask", () => {
  it("DELETEs with the task id in Axios request data", async () => {
    del.mockResolvedValue({ data: { code: 0, msg: "success" } });

    await deleteScheduledTask(apiClient, 1);

    expect(del).toHaveBeenCalledWith("/scheduled-tasks", { data: { id: 1 } });
  });

  it("rejects non-OK delete envelopes", async () => {
    del.mockResolvedValue({ data: { code: 101008, msg: "denied" } });

    await expect(deleteScheduledTask(apiClient, 1)).rejects.toThrow(
      /rejected \(code 101008\)/,
    );
  });
});
