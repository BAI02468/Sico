import { describe, expect, it } from "vitest";

import { membershipKeys } from "@/features/membership/query-keys";

describe("membershipKeys", () => {
  it("uses the literal Project roster tuple", () => {
    expect(membershipKeys.project(7)).toEqual(["project-members", 7]);
  });

  it("uses the literal Organization roster tuple", () => {
    expect(membershipKeys.organization(9)).toEqual([
      "organization",
      9,
      "members",
    ]);
  });
});
