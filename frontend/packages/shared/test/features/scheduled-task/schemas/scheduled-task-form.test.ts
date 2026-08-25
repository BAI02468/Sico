import { i18n } from "@lingui/core";
import { describe, expect, expectTypeOf, it } from "vitest";

import {
  scheduledTaskFormSchema,
  type ScheduledTaskFormValues,
} from "@/features/scheduled-task/schemas/scheduled-task-form";

type DailyFormValues = Extract<ScheduledTaskFormValues, { frequency: "daily" }>;

function validDailyValues(): DailyFormValues {
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
  };
}

describe("scheduledTaskFormSchema", () => {
  it("requires a boolean email completion preference in form values", () => {
    expectTypeOf<ScheduledTaskFormValues>().toMatchTypeOf<{
      sendEmailOnComplete: boolean;
    }>();
  });

  it("trims required text and accepts Daily without a weekday", () => {
    const result = scheduledTaskFormSchema.parse({
      ...validDailyValues(),
      message: " Create the report ",
      name: " Daily report ",
    });

    expect(result).toMatchObject({
      message: "Create the report",
      name: "Daily report",
      sendEmailOnComplete: false,
    });
    expect(result).not.toHaveProperty("weekday");
  });

  it("preserves an enabled email completion preference", () => {
    const result = scheduledTaskFormSchema.parse({
      ...validDailyValues(),
      sendEmailOnComplete: true,
    });

    expect(result.sendEmailOnComplete).toBe(true);
  });

  it("requires an email completion preference", () => {
    const values = validDailyValues();
    Reflect.deleteProperty(values, "sendEmailOnComplete");

    expect(scheduledTaskFormSchema.safeParse(values).success).toBe(false);
  });

  it("rejects a non-boolean email completion preference", () => {
    expect(
      scheduledTaskFormSchema.safeParse({
        ...validDailyValues(),
        sendEmailOnComplete: "true",
      }).success,
    ).toBe(false);
  });

  it("rejects a blank task name with localized source copy", () => {
    const result = scheduledTaskFormSchema.safeParse({
      ...validDailyValues(),
      name: " ",
    });

    expect(result.error?.issues[0]?.message).toBe("Enter a task name");
  });

  it("rejects a blank instruction with localized source copy", () => {
    const result = scheduledTaskFormSchema.safeParse({
      ...validDailyValues(),
      message: " ",
    });

    expect(result.error?.issues[0]?.message).toBe("Enter task instructions");
  });

  it("rejects an invalid IANA timezone with localized source copy", () => {
    const result = scheduledTaskFormSchema.safeParse({
      ...validDailyValues(),
      timezone: "Not/A/Timezone",
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("Select a valid timezone");
  });

  it("resolves invalid timezone errors using the active locale", () => {
    i18n.load("de", {
      "scheduledTask.form.validation.timezone.invalid":
        "Wähle eine gültige Zeitzone",
    });

    try {
      i18n.activate("de");
      const result = scheduledTaskFormSchema.safeParse({
        ...validDailyValues(),
        timezone: "Not/A/Timezone",
      });

      expect(result.error?.issues[0]?.message).toBe(
        "Wähle eine gültige Zeitzone",
      );
    } finally {
      i18n.activate("en");
    }
  });

  it("requires a deployed Digital Worker", () => {
    const result = scheduledTaskFormSchema.safeParse({
      ...validDailyValues(),
      agentInstanceId: 0,
    });

    expect(result.error?.issues[0]?.message).toBe("Select a Digital Worker");
  });

  it("rejects an unsafe Digital Worker id", () => {
    expect(
      scheduledTaskFormSchema.safeParse({
        ...validDailyValues(),
        agentInstanceId: Number.MAX_SAFE_INTEGER + 1,
      }).success,
    ).toBe(false);
  });

  it("accepts Sunday zero for a Weekly schedule", () => {
    expect(
      scheduledTaskFormSchema.safeParse({
        ...validDailyValues(),
        frequency: "weekly",
        weekday: 0,
      }).success,
    ).toBe(true);
  });

  it("requires a weekday for a Weekly schedule", () => {
    const result = scheduledTaskFormSchema.safeParse({
      ...validDailyValues(),
      frequency: "weekly",
    });

    expect(result.error?.issues[0]?.message).toBe("Select a day of the week");
  });

  it("rejects times outside the half-hour options", () => {
    expect(
      scheduledTaskFormSchema.safeParse({
        ...validDailyValues(),
        time: "09:15",
      }).success,
    ).toBe(false);
  });

  it("validates attachment values", () => {
    expect(
      scheduledTaskFormSchema.safeParse({
        ...validDailyValues(),
        attachments: [
          {
            name: "report.pdf",
            size: 1,
            type: "application/pdf",
            uri: "asset://report.pdf",
          },
        ],
      }).success,
    ).toBe(true);
    expect(
      scheduledTaskFormSchema.safeParse({
        ...validDailyValues(),
        attachments: [{ name: "report.pdf" }],
      }).success,
    ).toBe(false);
  });

  it("requires the original expression for a Custom schedule", () => {
    const result = scheduledTaskFormSchema.safeParse({
      ...validDailyValues(),
      frequency: "custom",
      time: "",
    });

    expect(result.error?.issues[0]?.message).toBe(
      "The original custom schedule is unavailable",
    );
  });
});
