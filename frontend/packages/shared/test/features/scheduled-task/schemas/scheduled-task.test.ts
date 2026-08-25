import { describe, expect, expectTypeOf, it } from "vitest";

import {
  type ScheduledTask,
  type ScheduledTaskCreateInput,
  scheduledTaskCreateInputSchema,
  scheduledTaskSchema,
  type ScheduledTaskUpdateInput,
  scheduledTaskUpdateInputFromTask,
  scheduledTaskUpdateInputSchema,
} from "@/features/scheduled-task/schemas/scheduled-task";
import type { CommonAttachment } from "@/schemas/common-attachment";

const task = {
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
};

describe("scheduledTaskSchema", () => {
  it("accepts a task whose lastRunAt is zero", () => {
    expect(scheduledTaskSchema.safeParse(task).success).toBe(true);
  });

  it("rejects an unsafe task id", () => {
    expect(
      scheduledTaskSchema.safeParse({
        ...task,
        id: Number.MAX_SAFE_INTEGER + 1,
      }).success,
    ).toBe(false);
  });

  it("rejects a negative timestamp", () => {
    expect(
      scheduledTaskSchema.safeParse({ ...task, nextRunAt: -1 }).success,
    ).toBe(false);
  });

  it("normalizes null response attachments to an empty array", () => {
    expect(
      scheduledTaskSchema.parse({ ...task, attachments: null }).attachments,
    ).toEqual([]);
  });

  it("normalizes missing response attachments to an empty array", () => {
    const taskWithoutAttachments: Partial<typeof task> = { ...task };
    delete taskWithoutAttachments.attachments;
    expect(
      scheduledTaskSchema.parse(taskWithoutAttachments).attachments,
    ).toEqual([]);
  });

  it("rejects malformed non-null response attachments", () => {
    expect(
      scheduledTaskSchema.safeParse({ ...task, attachments: [{}] }).success,
    ).toBe(false);
  });

  it.each([true, false])(
    "preserves an explicit sendEmailOnComplete value of %s",
    (sendEmailOnComplete) => {
      expect(
        scheduledTaskSchema.parse({
          ...task,
          extraInfo: { sendEmailOnComplete },
        }).extraInfo,
      ).toEqual({ sendEmailOnComplete });
    },
  );

  it("preserves an absent extraInfo field", () => {
    expect("extraInfo" in scheduledTaskSchema.parse(task)).toBe(false);
  });

  it.each([null, {}, { sendEmailOnComplete: "true" }])(
    "rejects malformed response extraInfo %#",
    (extraInfo) => {
      expect(
        scheduledTaskSchema.safeParse({ ...task, extraInfo }).success,
      ).toBe(false);
    },
  );

  it("rejects unknown response extraInfo fields", () => {
    expect(
      scheduledTaskSchema.safeParse({
        ...task,
        extraInfo: {
          sendEmailOnComplete: true,
          recipient: "other@example.com",
        },
      }).success,
    ).toBe(false);
  });

  it("types response attachments as a non-null array", () => {
    expectTypeOf<ScheduledTask["attachments"]>().toEqualTypeOf<
      CommonAttachment[]
    >();
  });

  it("types response extraInfo as optional", () => {
    expectTypeOf<ScheduledTask["extraInfo"]>().toEqualTypeOf<
      { sendEmailOnComplete: boolean } | undefined
    >();
  });
});

describe("scheduled task input schemas", () => {
  it("trims required create fields", () => {
    const result = scheduledTaskCreateInputSchema.parse({
      name: " Daily report ",
      enabled: true,
      agentInstanceId: 2,
      message: " Create the report ",
      attachments: [],
      cronExpression: " 0 9 * * 1-5 ",
      timezone: " America/New_York ",
    });
    expect(result).toMatchObject({
      name: "Daily report",
      message: "Create the report",
      cronExpression: "0 9 * * 1-5",
      timezone: "America/New_York",
    });
  });

  it("rejects blank writable strings", () => {
    expect(
      scheduledTaskCreateInputSchema.safeParse({
        name: " ",
        enabled: true,
        agentInstanceId: 2,
        message: "Create the report",
        attachments: [],
        cronExpression: "0 9 * * 1-5",
        timezone: "America/New_York",
      }).success,
    ).toBe(false);
  });

  it("rejects null create attachments", () => {
    expect(
      scheduledTaskCreateInputSchema.safeParse({
        name: "Daily report",
        enabled: true,
        agentInstanceId: 2,
        message: "Create the report",
        attachments: null,
        cronExpression: "0 9 * * 1-5",
        timezone: "America/New_York",
      }).success,
    ).toBe(false);
  });

  it("rejects missing update attachments", () => {
    expect(
      scheduledTaskUpdateInputSchema.safeParse({
        id: 1,
        name: "Daily report",
        enabled: true,
        agentInstanceId: 2,
        message: "Create the report",
        cronExpression: "0 9 * * 1-5",
        timezone: "America/New_York",
      }).success,
    ).toBe(false);
  });

  it.each([true, false])(
    "accepts create extraInfo with sendEmailOnComplete %s",
    (sendEmailOnComplete) => {
      const result = scheduledTaskCreateInputSchema.parse({
        name: "Daily report",
        enabled: true,
        agentInstanceId: 2,
        message: "Create the report",
        attachments: [],
        cronExpression: "0 9 * * 1-5",
        timezone: "America/New_York",
        extraInfo: { sendEmailOnComplete },
      });

      expect(result.extraInfo).toEqual({ sendEmailOnComplete });
    },
  );

  it.each([{}, { sendEmailOnComplete: 1 }])(
    "rejects malformed create extraInfo %#",
    (extraInfo) => {
      expect(
        scheduledTaskCreateInputSchema.safeParse({
          name: "Daily report",
          enabled: true,
          agentInstanceId: 2,
          message: "Create the report",
          attachments: [],
          cronExpression: "0 9 * * 1-5",
          timezone: "America/New_York",
          extraInfo,
        }).success,
      ).toBe(false);
    },
  );

  it("accepts update extraInfo", () => {
    const result = scheduledTaskUpdateInputSchema.parse({
      id: 1,
      name: "Daily report",
      enabled: true,
      agentInstanceId: 2,
      message: "Create the report",
      attachments: [],
      cronExpression: "0 9 * * 1-5",
      timezone: "America/New_York",
      extraInfo: { sendEmailOnComplete: false },
    });

    expect(result.extraInfo).toEqual({ sendEmailOnComplete: false });
  });

  it.each([{}, { sendEmailOnComplete: "false" }])(
    "rejects malformed update extraInfo %#",
    (extraInfo) => {
      expect(
        scheduledTaskUpdateInputSchema.safeParse({
          id: 1,
          name: "Daily report",
          enabled: true,
          agentInstanceId: 2,
          message: "Create the report",
          attachments: [],
          cronExpression: "0 9 * * 1-5",
          timezone: "America/New_York",
          extraInfo,
        }).success,
      ).toBe(false);
    },
  );

  it("types create and update attachments as non-null arrays", () => {
    expectTypeOf<ScheduledTaskCreateInput["attachments"]>().toEqualTypeOf<
      CommonAttachment[]
    >();
    expectTypeOf<ScheduledTaskUpdateInput["attachments"]>().toEqualTypeOf<
      CommonAttachment[]
    >();
  });

  it("types create and update extraInfo as optional", () => {
    expectTypeOf<ScheduledTaskCreateInput["extraInfo"]>().toEqualTypeOf<
      { sendEmailOnComplete: boolean } | undefined
    >();
    expectTypeOf<ScheduledTaskUpdateInput["extraInfo"]>().toEqualTypeOf<
      { sendEmailOnComplete: boolean } | undefined
    >();
  });

  it("rejects an unknown timezone", () => {
    expect(
      scheduledTaskCreateInputSchema.safeParse({
        name: "Daily report",
        enabled: true,
        agentInstanceId: 2,
        message: "Create the report",
        attachments: [],
        cronExpression: "0 9 * * 1-5",
        timezone: "Mars/Olympus",
      }).success,
    ).toBe(false);
  });

  it("omits readonly fields when creating update input from a task", () => {
    const input = scheduledTaskUpdateInputFromTask(task, {
      name: "Updated report",
    });
    expect(input).toEqual({
      id: 1,
      name: "Updated report",
      enabled: true,
      agentInstanceId: 2,
      message: "Create the report",
      attachments: [],
      cronExpression: "0 9 * * 1-5",
      timezone: "America/New_York",
    });
    expect(scheduledTaskUpdateInputSchema.safeParse(input).success).toBe(true);
  });

  it.each([true, false])(
    "preserves task extraInfo with sendEmailOnComplete %s",
    (sendEmailOnComplete) => {
      const input = scheduledTaskUpdateInputFromTask(
        scheduledTaskSchema.parse({
          ...task,
          extraInfo: { sendEmailOnComplete },
        }),
        { enabled: false },
      );

      expect(input.extraInfo).toEqual({ sendEmailOnComplete });
    },
  );

  it("preserves extraInfo absence for a legacy task", () => {
    const input = scheduledTaskUpdateInputFromTask(
      scheduledTaskSchema.parse(task),
      { enabled: false },
    );

    expect("extraInfo" in input).toBe(false);
  });

  it("allows overrides to replace task extraInfo", () => {
    const input = scheduledTaskUpdateInputFromTask(
      scheduledTaskSchema.parse({
        ...task,
        extraInfo: { sendEmailOnComplete: true },
      }),
      { extraInfo: { sendEmailOnComplete: false } },
    );

    expect(input.extraInfo).toEqual({ sendEmailOnComplete: false });
  });
});
