import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { relativeTime } from "@/features/notifications/utils/relative-time";

// "now" pinned so bucket math is deterministic. Inputs are `NOW - offset`.
const NOW = new Date("2024-06-15T12:00:00").getTime();
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

// setup.ts activates the `en` locale with an empty catalog, so `i18n._`
// falls back to each descriptor's source `message` — assertions are the
// English strings.
describe("relativeTime", () => {
  it("returns empty string for a falsy epoch (0 / missing)", () => {
    expect(relativeTime(0)).toBe("");
  });

  it("reads 'just now' under a minute", () => {
    expect(relativeTime(NOW - 30_000)).toBe("just now");
  });

  it("reads minutes under an hour", () => {
    expect(relativeTime(NOW - 5 * MIN)).toBe("5 min ago");
    expect(relativeTime(NOW - 59 * MIN)).toBe("59 min ago");
  });

  it("reads hours under a day", () => {
    expect(relativeTime(NOW - HOUR)).toBe("1h ago");
    expect(relativeTime(NOW - 23 * HOUR)).toBe("23h ago");
  });

  it("reads days under a week", () => {
    expect(relativeTime(NOW - DAY)).toBe("1d ago");
    expect(relativeTime(NOW - 6 * DAY)).toBe("6d ago");
  });

  it("reads weeks from 7 days up to (but not including) 5 weeks", () => {
    expect(relativeTime(NOW - 7 * DAY)).toBe("1w ago");
    expect(relativeTime(NOW - 34 * DAY)).toBe("4w ago");
  });

  it("reads months from 5 weeks up to a year", () => {
    // Day 35 is the week→month boundary: bucketed on day (not week=5), so
    // month=floor(35/30)=1 → "1mo ago".
    expect(relativeTime(NOW - 35 * DAY)).toBe("1mo ago");
    expect(relativeTime(NOW - 200 * DAY)).toBe("6mo ago");
  });

  it("reads years past a year", () => {
    expect(relativeTime(NOW - 400 * DAY)).toBe("1y ago");
  });

  // Regression: days 360–364 must stay in the month bucket (day < 365), not
  // fall through to year=floor(day/365)=0 → the old "0y ago" bug.
  it("keeps the 360–364 day gap in the month bucket, not '0y ago'", () => {
    expect(relativeTime(NOW - 360 * DAY)).toBe("12mo ago");
    expect(relativeTime(NOW - 364 * DAY)).toBe("12mo ago");
  });
});
