import { z } from "zod";

import { deriveCapabilities, type ProjectCapabilities } from "./capabilities";
import { type UserRole } from "./schemas/user-role";

const agentScopeIdSchema = z.string().uuid();

export type PermissionSnapshot = {
  readonly platformRoles: ReadonlySet<string>;
  readonly organizationRoles: ReadonlyMap<number, ReadonlySet<string>>;
  readonly projectRoles: ReadonlyMap<number, ReadonlySet<string>>;
  readonly agentRoles: ReadonlyMap<string, ReadonlySet<string>>;
};

export type OrganizationCapabilities = {
  canRenameOrganization: boolean;
  canManageOrganizationMembers: boolean;
  canManageOrganizationDevices: boolean;
};

export const EMPTY_PERMISSION_SNAPSHOT: PermissionSnapshot = {
  platformRoles: new Set(),
  organizationRoles: new Map(),
  projectRoles: new Map(),
  agentRoles: new Map(),
};

function addScopedRole<T extends string | number>(
  roles: Map<T, Set<string>>,
  scopeId: T,
  roleCode: string,
): void {
  const scoped = roles.get(scopeId) ?? new Set<string>();
  scoped.add(roleCode);
  roles.set(scopeId, scoped);
}

export function normalizePermissionSnapshot(
  grants: readonly UserRole[],
): PermissionSnapshot {
  const platformRoles = new Set<string>();
  const organizationRoles = new Map<number, Set<string>>();
  const projectRoles = new Map<number, Set<string>>();
  const agentRoles = new Map<string, Set<string>>();
  for (const grant of grants) {
    if (grant.scopeType === "platform") {
      platformRoles.add(grant.roleCode);
    } else if (
      grant.scopeType === "org" &&
      typeof grant.scopeId === "number" &&
      Number.isSafeInteger(grant.scopeId) &&
      grant.scopeId > 0
    ) {
      addScopedRole(organizationRoles, grant.scopeId, grant.roleCode);
    } else if (
      grant.scopeType === "project" &&
      typeof grant.scopeId === "number" &&
      Number.isSafeInteger(grant.scopeId) &&
      grant.scopeId > 0
    ) {
      addScopedRole(projectRoles, grant.scopeId, grant.roleCode);
    } else if (
      grant.scopeType === "agent" &&
      typeof grant.scopeId === "string" &&
      agentScopeIdSchema.safeParse(grant.scopeId).success
    ) {
      addScopedRole(agentRoles, grant.scopeId, grant.roleCode);
    }
  }
  return { platformRoles, organizationRoles, projectRoles, agentRoles };
}

export function deriveProjectCapabilities(
  snapshot: PermissionSnapshot,
  projectId: number,
): ProjectCapabilities {
  const roles = snapshot.projectRoles.get(projectId);
  if (roles?.has("project_admin")) {
    return deriveCapabilities("project_admin");
  }
  return deriveCapabilities(
    roles?.has("project_member") ? "project_member" : null,
  );
}

export function deriveOrganizationCapabilities(
  snapshot: PermissionSnapshot,
  organizationId: number | null,
): OrganizationCapabilities {
  const canManage =
    organizationId !== null &&
    (snapshot.organizationRoles.get(organizationId)?.has("org_admin") ?? false);
  return {
    canRenameOrganization: canManage,
    canManageOrganizationMembers: canManage,
    canManageOrganizationDevices: canManage,
  };
}

export function deriveStudioPermission(
  snapshot: PermissionSnapshot,
  organizationId: number | null,
): boolean {
  if (organizationId === null) {
    return false;
  }
  const roles = snapshot.organizationRoles.get(organizationId);
  return roles?.has("org_admin") === true || roles?.has("developer") === true;
}
