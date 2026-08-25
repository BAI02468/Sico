import { describe, expect, it } from "vitest";

import { normalizeEpochMilliseconds } from "@/utils/normalize-epoch-milliseconds";

describe("normalizeEpochMilliseconds", () => {
  it("converts values below one trillion from seconds to milliseconds", () => {
    expect(normalizeEpochMilliseconds(999_999_999_999)).toBe(
      999_999_999_999_000,
    );
  });

  it("leaves the one-trillion boundary unchanged", () => {
    expect(normalizeEpochMilliseconds(1_000_000_000_000)).toBe(
      1_000_000_000_000,
    );
  });

  it("leaves values above one trillion unchanged", () => {
    expect(normalizeEpochMilliseconds(1_700_000_000_000)).toBe(
      1_700_000_000_000,
    );
  });
});
