import { describe, expect, it } from "vitest";

import { rbacKeys } from "@/features/rbac/query-keys";

describe("rbacKeys", () => {
  it("keys user roles by authenticated user", () => {
    expect(rbacKeys.userRoles(7)).toEqual(["rbac", "user-roles", 7]);
    expect(rbacKeys.userRoles(null)).toEqual(["rbac", "user-roles", null]);
  });
});
