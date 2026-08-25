import { describe, expect, it } from "vitest";

import {
  canonicalOrganizationRoleCodes,
  organizationDisplayRole,
  organizationRoleCodesFor,
} from "@/features/membership/utils/organization-role-policy";

describe("organization role policy", () => {
  it("canonicalizes grants in base, developer, admin order", () => {
    expect(
      canonicalOrganizationRoleCodes([
        "org_admin",
        "developer",
        "org_member",
        "org_admin",
      ]),
    ).toEqual(["org_member", "developer", "org_admin"]);
  });

  it.each([
    [["org_member"], "org_member"],
    [["org_member", "developer"], "developer"],
    [["developer", "org_admin"], "org_admin"],
  ] as const)("selects the highest display role", (roleCodes, expected) => {
    expect(organizationDisplayRole(roleCodes)).toBe(expected);
  });

  it.each([
    ["org_member", ["org_member"]],
    ["developer", ["org_member", "developer"]],
    ["org_admin", ["org_member", "org_admin"]],
  ] as const)("projects %s to mutually exclusive grants", (role, expected) => {
    expect(organizationRoleCodesFor(role)).toEqual(expected);
  });
});
