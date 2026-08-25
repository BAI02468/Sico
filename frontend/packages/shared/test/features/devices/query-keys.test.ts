import { describe, expect, it } from "vitest";

import { deviceKeys } from "@/features/devices";

describe("deviceKeys", () => {
  it("builds the canonical project tuple", () => {
    expect(deviceKeys.project(7)).toEqual(["sandbox-devices", "list", 7]);
  });

  it("builds the canonical organization tuple", () => {
    expect(deviceKeys.organization(9)).toEqual(["organization", 9, "devices"]);
  });
});
