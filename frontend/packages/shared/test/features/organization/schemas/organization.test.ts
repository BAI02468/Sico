import { describe, expect, it } from "vitest";

import {
  OrganizationRoleCodeSchema,
  ProjectRoleCodeSchema,
} from "../../../../src/features/rbac/schemas/user-role";

describe("ProjectRoleCodeSchema", () => {
  it.each(["project_admin", "project_member"])(
    "accepts the project role %s",
    (roleCode) => {
      expect(ProjectRoleCodeSchema.parse(roleCode)).toBe(roleCode);
    },
  );

  it.each(["org_admin", "developer"])(
    "rejects the organization role %s",
    (roleCode) => {
      expect(ProjectRoleCodeSchema.safeParse(roleCode).success).toBe(false);
    },
  );
});

describe("OrganizationRoleCodeSchema", () => {
  it.each(["org_admin", "developer"])(
    "accepts the organization role %s",
    (roleCode) => {
      expect(OrganizationRoleCodeSchema.parse(roleCode)).toBe(roleCode);
    },
  );

  it.each(["owner", "operator", "project_admin", "openai"])(
    "rejects the unsupported role %s",
    (roleCode) => {
      expect(OrganizationRoleCodeSchema.safeParse(roleCode).success).toBe(
        false,
      );
    },
  );
});
