import { describe, expect, it } from "vitest";

import {
  detectedTimeZone,
  nextHalfHour,
  parseScheduledTaskCron,
  serializeScheduledTaskCron,
} from "@/features/scheduled-task/utils/cron-schedule";

describe("parseScheduledTaskCron", () => {
  it("parses a daily schedule at 10:00", () => {
    expect(parseScheduledTaskCron("0 10 * * *")).toEqual({
      frequency: "daily",
      hour: 10,
      minute: 0,
    });
  });

  it("parses a daily schedule at 11:30 PM", () => {
    expect(parseScheduledTaskCron("30 23 * * *")).toEqual({
      frequency: "daily",
      hour: 23,
      minute: 30,
    });
  });

  it.each([
    ["0 9 * * 0", 0],
    ["0 9 * * 1", 1],
    ["0 9 * * 2", 2],
    ["0 9 * * 3", 3],
    ["0 9 * * 4", 4],
    ["0 9 * * 5", 5],
    ["0 9 * * 6", 6],
  ])(
    "parses weekday %i without remapping Sunday",
    (cronExpression, weekday) => {
      expect(parseScheduledTaskCron(cronExpression)).toEqual({
        frequency: "weekly",
        hour: 9,
        minute: 0,
        weekday,
      });
    },
  );

  it.each([
    "0/1 * * * *",
    "0 9 * * * *",
    "0 9 * * 1-5",
    "0 9 * * 1,3,5",
    "0 9 * * MON",
    "15 9 * * *",
    "",
  ])("preserves unsupported cron expressions as custom", (cronExpression) => {
    expect(parseScheduledTaskCron(cronExpression)).toEqual({
      cronExpression,
      frequency: "custom",
    });
  });
});

describe("serializeScheduledTaskCron", () => {
  it("serializes a daily schedule as five cron fields", () => {
    expect(
      serializeScheduledTaskCron({ frequency: "daily", hour: 10, minute: 0 }),
    ).toBe("0 10 * * *");
  });

  it("serializes a weekly Sunday schedule with zero", () => {
    expect(
      serializeScheduledTaskCron({
        frequency: "weekly",
        hour: 9,
        minute: 30,
        weekday: 0,
      }),
    ).toBe("30 9 * * 0");
  });

  it("returns custom cron expressions byte-for-byte", () => {
    expect(
      serializeScheduledTaskCron({
        cronExpression: " 0/1 * * * * ",
        frequency: "custom",
      }),
    ).toBe(" 0/1 * * * * ");
  });
});

describe("nextHalfHour", () => {
  it.each([
    ["2026-08-14T10:01:00", "2026-08-14T10:30:00"],
    ["2026-08-14T10:30:00", "2026-08-14T11:00:00"],
    ["2026-08-14T23:45:00", "2026-08-15T00:00:00"],
  ])("returns the next strictly future half hour after %s", (now, expected) => {
    expect(nextHalfHour(new Date(now))).toEqual(new Date(expected));
  });
});

describe("detectedTimeZone", () => {
  it("returns the runtime resolved timezone", () => {
    expect(detectedTimeZone()).toBe(
      Intl.DateTimeFormat().resolvedOptions().timeZone,
    );
  });
});
