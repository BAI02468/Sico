import { describe, expect, it } from "vitest";

import { type ScheduledTask } from "@/features/scheduled-task/schemas/scheduled-task";
import { type ScheduledTaskFormValues } from "@/features/scheduled-task/schemas/scheduled-task-form";
import { detectedTimeZone } from "@/features/scheduled-task/utils/cron-schedule";
import {
  createScheduledTaskDefaults,
  editScheduledTaskDefaults,
  scheduledTaskFormToCreateInput,
  scheduledTaskFormToUpdateInput,
} from "@/features/scheduled-task/utils/scheduled-task-form-values";

function task(overrides: Partial<ScheduledTask> = {}): ScheduledTask {
  return {
    agentInstanceId: 2,
    attachments: [],
    createdAt: 1_699_000_000,
    creatorUsername: "alice",
    cronExpression: "0 9 * * *",
    enabled: true,
    id: 1,
    lastRunAt: 0,
    message: "Create the report",
    name: "Daily report",
    nextRunAt: 1_700_000_000,
    timezone: "America/New_York",
    updatedAt: 1_699_000_001,
    ...overrides,
  };
}

type DailyFormValues = Extract<ScheduledTaskFormValues, { frequency: "daily" }>;

function formValues(overrides: Partial<DailyFormValues> = {}): DailyFormValues {
  return {
    agentInstanceId: 2,
    attachments: [],
    enabled: true,
    frequency: "daily",
    message: "Create the report",
    name: "Daily report",
    sendEmailOnComplete: false,
    time: "09:30",
    timezone: "America/New_York",
    ...overrides,
  };
}

describe("createScheduledTaskDefaults", () => {
  it("uses the next future half hour and detected timezone", () => {
    expect(
      createScheduledTaskDefaults(new Date("2026-08-14T10:30:00")),
    ).toEqual({
      agentInstanceId: 0,
      attachments: [],
      enabled: true,
      frequency: "daily",
      message: "",
      name: "",
      sendEmailOnComplete: false,
      time: "11:00",
      timezone: detectedTimeZone(),
    });
  });
});

describe("editScheduledTaskDefaults", () => {
  it("maps a Daily task and preserves its timezone", () => {
    expect(editScheduledTaskDefaults(task())).toEqual({
      agentInstanceId: 2,
      attachments: [],
      enabled: true,
      frequency: "daily",
      message: "Create the report",
      name: "Daily report",
      sendEmailOnComplete: false,
      time: "09:00",
      timezone: "America/New_York",
    });
  });

  it("projects an enabled email completion preference", () => {
    expect(
      editScheduledTaskDefaults(
        task({ extraInfo: { sendEmailOnComplete: true } }),
      ).sendEmailOnComplete,
    ).toBe(true);
  });

  it("preserves Sunday zero for a Weekly task", () => {
    expect(
      editScheduledTaskDefaults(
        task({
          cronExpression: "30 23 * * 0",
          extraInfo: { sendEmailOnComplete: false },
        }),
      ),
    ).toMatchObject({
      frequency: "weekly",
      sendEmailOnComplete: false,
      time: "23:30",
      weekday: 0,
    });
  });

  it("preserves a Custom expression byte-for-byte", () => {
    expect(
      editScheduledTaskDefaults(
        task({
          cronExpression: " 0/1 * * * * ",
          extraInfo: { sendEmailOnComplete: true },
        }),
      ),
    ).toMatchObject({
      frequency: "custom",
      originalCronExpression: " 0/1 * * * * ",
      sendEmailOnComplete: true,
      time: "",
      timezone: "America/New_York",
    });
  });
});

describe("scheduledTaskFormToCreateInput", () => {
  it("trims text and maps a Daily schedule to a create input", () => {
    expect(
      scheduledTaskFormToCreateInput(
        formValues({
          message: " Create the report ",
          name: " Daily report ",
        }),
      ),
    ).toEqual({
      agentInstanceId: 2,
      attachments: [],
      cronExpression: "30 9 * * *",
      enabled: true,
      extraInfo: { sendEmailOnComplete: false },
      message: "Create the report",
      name: "Daily report",
      timezone: "America/New_York",
    });
  });

  it("maps an enabled email completion preference", () => {
    expect(
      scheduledTaskFormToCreateInput(formValues({ sendEmailOnComplete: true }))
        .extraInfo,
    ).toEqual({ sendEmailOnComplete: true });
  });

  it("includes validated attachment references", () => {
    const attachments = [
      {
        name: "report.pdf",
        size: 1,
        type: "application/pdf",
        uri: "asset://report.pdf",
      },
    ];

    expect(
      scheduledTaskFormToCreateInput(formValues({ attachments })).attachments,
    ).toEqual(attachments);
  });
});

describe("scheduledTaskFormToUpdateInput", () => {
  it("maps a Weekly Sunday schedule to an exact update payload", () => {
    expect(
      scheduledTaskFormToUpdateInput(7, {
        ...formValues(),
        frequency: "weekly",
        time: "23:30",
        weekday: 0,
      }),
    ).toEqual({
      agentInstanceId: 2,
      attachments: [],
      cronExpression: "30 23 * * 0",
      enabled: true,
      extraInfo: { sendEmailOnComplete: false },
      id: 7,
      message: "Create the report",
      name: "Daily report",
      timezone: "America/New_York",
    });
  });

  it("round-trips an enabled email completion preference on edit", () => {
    const values = editScheduledTaskDefaults(
      task({ extraInfo: { sendEmailOnComplete: true } }),
    );

    expect(scheduledTaskFormToUpdateInput(7, values).extraInfo).toEqual({
      sendEmailOnComplete: true,
    });
  });

  it("retains a Custom expression on edit", () => {
    const values = editScheduledTaskDefaults(
      task({ cronExpression: " 0/1 * * * * " }),
    );

    expect(scheduledTaskFormToUpdateInput(1, values).cronExpression).toBe(
      " 0/1 * * * * ",
    );
  });

  it("replaces Custom with an explicit Daily schedule", () => {
    const custom = editScheduledTaskDefaults(
      task({ cronExpression: " 0/1 * * * * " }),
    );

    expect(
      scheduledTaskFormToUpdateInput(1, {
        ...custom,
        frequency: "daily",
        time: "10:30",
      }).cronExpression,
    ).toBe("30 10 * * *");
  });

  it("replaces Custom with an explicit Weekly schedule", () => {
    const custom = editScheduledTaskDefaults(
      task({ cronExpression: " 0/1 * * * * " }),
    );

    expect(
      scheduledTaskFormToUpdateInput(1, {
        ...custom,
        frequency: "weekly",
        time: "10:30",
        weekday: 0,
      }).cronExpression,
    ).toBe("30 10 * * 0");
  });
});
