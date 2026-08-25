import { i18n } from "@lingui/core";
import { afterEach, describe, expect, it } from "vitest";

import { formatScheduledTaskSchedule } from "@/features/scheduled-task/utils/format-schedule";

afterEach(() => {
  i18n.loadAndActivate({ locale: "en", messages: {} });
});

describe("formatScheduledTaskSchedule", () => {
  it("formats a daily wall-clock schedule in 12-hour English", () => {
    expect(
      formatScheduledTaskSchedule({
        frequency: "daily",
        hour: 23,
        minute: 30,
      }),
    ).toBe("Every day · 11:30 PM");
  });

  it("formats a weekly Sunday schedule without shifting its stored time", () => {
    expect(
      formatScheduledTaskSchedule({
        frequency: "weekly",
        hour: 0,
        minute: 0,
        weekday: 0,
      }),
    ).toBe("Every Sunday · 12:00 AM");
  });

  it("formats a custom schedule", () => {
    expect(
      formatScheduledTaskSchedule({
        cronExpression: "0/1 * * * *",
        frequency: "custom",
      }),
    ).toBe("Custom schedule");
  });

  it("uses the active locale for recurring copy, weekday labels, and time", () => {
    i18n.loadAndActivate({
      locale: "es",
      messages: {
        "scheduledTask.schedule.weekly": "Cada {weekday} a las {time}",
        "scheduledTask.weekday.sunday": "domingo",
      },
    });

    expect(
      formatScheduledTaskSchedule({
        frequency: "weekly",
        hour: 23,
        minute: 30,
        weekday: 0,
      }),
    ).toBe("Cada domingo a las 23:30");
  });
});
