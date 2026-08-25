import { describe, expect, it } from "vitest";

import {
  deriveCapabilities,
  type ProjectCapabilities,
} from "@/features/rbac/capabilities";

const ALL_KEYS: (keyof ProjectCapabilities)[] = [
  "canManageProject",
  "canManageDw",
  "canInviteDw",
  "canManageAsset",
  "canManageAssetOwn",
  "canUseDw",
];

describe("deriveCapabilities", () => {
  it("grants every capability to a project_admin", () => {
    const caps = deriveCapabilities("project_admin");
    for (const key of ALL_KEYS) {
      expect(caps[key]).toBe(true);
    }
  });

  it("grants a project_member only invite-dw / own-asset / use-dw", () => {
    expect(deriveCapabilities("project_member")).toEqual({
      canManageProject: false,
      canManageDw: false,
      canInviteDw: true,
      canManageAsset: false,
      canManageAssetOwn: true,
      canUseDw: true,
    });
  });

  it("grants nothing for a null role", () => {
    const caps = deriveCapabilities(null);
    for (const key of ALL_KEYS) {
      expect(caps[key]).toBe(false);
    }
  });
});
