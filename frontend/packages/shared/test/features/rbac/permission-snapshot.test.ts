import { describe, expect, it } from "vitest";

import {
  deriveOrganizationCapabilities,
  deriveProjectCapabilities,
  deriveStudioPermission,
  normalizePermissionSnapshot,
} from "@/features/rbac/permission-snapshot";
import {
  type UserRole,
  userRoleSchema,
} from "@/features/rbac/schemas/user-role";

function grant(roleCode: string, scopeType: string, scopeId: number): UserRole {
  return { roleCode, scopeType, scopeId, userId: 1 };
}

const agentId = "a3c0bc10-6d1c-4b33-a866-f3e1b2b91cde";

describe("permission snapshot", () => {
  it("normalizes grants by platform, organization, and project scope", () => {
    const snapshot = normalizePermissionSnapshot([
      grant("platform_admin", "platform", 0),
      grant("developer", "org", 9),
      grant("project_admin", "project", 7),
      grant("ignored", "unknown", 1),
    ]);

    expect(snapshot.platformRoles.has("platform_admin")).toBe(true);
    expect(snapshot.organizationRoles.get(9)?.has("developer")).toBe(true);
    expect(snapshot.projectRoles.get(7)?.has("project_admin")).toBe(true);
    expect(snapshot.organizationRoles.has(1)).toBe(false);
  });

  it("keeps agent UUID grants in a separately keyed role map", () => {
    const snapshot = normalizePermissionSnapshot([
      userRoleSchema.parse({
        roleCode: "agent_editor",
        scopeType: "agent",
        scopeId: agentId,
        userId: 1,
      }),
    ]);

    expect(snapshot).toMatchObject({
      agentRoles: new Map([[agentId, new Set(["agent_editor"])]]),
    });
  });

  it("does not coerce a numeric agent scope ID into the UUID role map", () => {
    const snapshot = normalizePermissionSnapshot([
      userRoleSchema.parse({
        roleCode: "agent_editor",
        scopeType: "agent",
        scopeId: 7,
        userId: 1,
      }),
    ]);

    expect(snapshot).toMatchObject({ agentRoles: new Map() });
  });

  it("skips malformed agent UUIDs from unvalidated grants", () => {
    const malformedAgentGrant: UserRole = {
      roleCode: "agent_editor",
      scopeType: "agent",
      scopeId: "not-a-uuid",
      userId: 1,
    };

    const snapshot = normalizePermissionSnapshot([malformedAgentGrant]);

    expect(snapshot.agentRoles).toEqual(new Map());
  });

  it("denies organization capabilities at fallback scope ID zero", () => {
    const snapshot = normalizePermissionSnapshot([
      grant("org_admin", "org", 0),
    ]);

    expect(
      deriveOrganizationCapabilities(snapshot, 0).canManageOrganizationMembers,
    ).toBe(false);
  });

  it("denies project capabilities at fallback scope ID zero", () => {
    const snapshot = normalizePermissionSnapshot([
      grant("project_admin", "project", 0),
    ]);

    expect(deriveProjectCapabilities(snapshot, 0).canManageProject).toBe(false);
  });

  it("denies a boolean organization scope ID", () => {
    const snapshot = normalizePermissionSnapshot([
      userRoleSchema.parse({
        roleCode: "org_admin",
        scopeType: "org",
        scopeId: true,
        userId: 1,
      }),
    ]);

    expect(
      deriveOrganizationCapabilities(snapshot, 1).canManageOrganizationMembers,
    ).toBe(false);
  });

  it("grants every project capability to project_admin", () => {
    const snapshot = normalizePermissionSnapshot([
      grant("project_member", "project", 7),
      grant("project_admin", "project", 7),
    ]);

    expect(deriveProjectCapabilities(snapshot, 7)).toEqual({
      canManageProject: true,
      canManageDw: true,
      canInviteDw: true,
      canManageAsset: true,
      canManageAssetOwn: true,
      canUseDw: true,
    });
  });

  it("grants organization actions only to matching org_admin", () => {
    const admin = normalizePermissionSnapshot([grant("org_admin", "org", 9)]);
    const platform = normalizePermissionSnapshot([
      grant("platform_admin", "platform", 0),
    ]);
    const developer = normalizePermissionSnapshot([
      grant("developer", "org", 9),
    ]);
    const otherOrg = normalizePermissionSnapshot([
      grant("org_admin", "org", 10),
    ]);

    expect(deriveOrganizationCapabilities(admin, 9)).toEqual({
      canRenameOrganization: true,
      canManageOrganizationMembers: true,
      canManageOrganizationDevices: true,
    });
    for (const snapshot of [platform, developer, otherOrg]) {
      expect(deriveOrganizationCapabilities(snapshot, 9)).toEqual({
        canRenameOrganization: false,
        canManageOrganizationMembers: false,
        canManageOrganizationDevices: false,
      });
    }
  });

  it.each(["org_admin", "developer"])(
    "grants Studio access to %s",
    (roleCode) => {
      const snapshot = normalizePermissionSnapshot([grant(roleCode, "org", 9)]);

      expect(deriveStudioPermission(snapshot, 9)).toBe(true);
    },
  );

  it.each([
    ["org_member", "org"],
    ["platform_admin", "platform"],
    ["project_admin", "project"],
  ])("does not grant Studio access to %s", (roleCode, scopeType) => {
    const snapshot = normalizePermissionSnapshot([
      grant(roleCode, scopeType, 9),
    ]);

    expect(deriveStudioPermission(snapshot, 9)).toBe(false);
  });

  it.each(["org_admin", "developer"])(
    "ignores %s grants outside the bound organization",
    (roleCode) => {
      const snapshot = normalizePermissionSnapshot([
        grant(roleCode, "org", 10),
      ]);

      expect(deriveStudioPermission(snapshot, 9)).toBe(false);
    },
  );

  it("denies organization and Studio capabilities without a bound organization", () => {
    const snapshot = normalizePermissionSnapshot([
      grant("org_admin", "org", 9),
    ]);

    expect(deriveOrganizationCapabilities(snapshot, null)).toEqual({
      canRenameOrganization: false,
      canManageOrganizationMembers: false,
      canManageOrganizationDevices: false,
    });
    expect(deriveStudioPermission(snapshot, null)).toBe(false);
  });
});
