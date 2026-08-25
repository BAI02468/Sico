import { describe, expect, it } from "vitest";

import { isIanaTimezone } from "@/features/scheduled-task/schemas/iana-timezone";

describe("isIanaTimezone", () => {
  it("accepts valid IANA timezone names", () => {
    expect(isIanaTimezone("America/New_York")).toBe(true);
  });

  it("rejects unknown timezone names", () => {
    expect(isIanaTimezone("Mars/Olympus")).toBe(false);
  });
});
