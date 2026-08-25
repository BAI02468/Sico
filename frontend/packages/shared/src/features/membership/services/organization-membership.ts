import type { AxiosInstance } from "axios";

import {
  assignUserRole,
  findUserByEmail,
  listUsersByRole,
  type OrganizationRoleCode,
  type RbacUser,
  removeUserRole,
  type UserRoleMutation,
} from "../../rbac";
import type {
  ChangeOrganizationRoleInput,
  OrganizationMember,
  RemoveOrganizationMemberInput,
} from "../types";
import {
  canonicalOrganizationRoleCodes,
  desiredOrganizationOverlay,
  ORGANIZATION_BASE_ROLE,
  ORGANIZATION_OVERLAY_ORDER,
  organizationDisplayRole,
  organizationRolePriority,
} from "../utils/organization-role-policy";

const ORGANIZATION_SCOPE = "org";

type MemberAccumulator = {
  user: RbacUser;
  sourceRole: OrganizationRoleCode;
  roleCodes: Set<OrganizationRoleCode>;
};

function addRoleUsers(
  byId: Map<number, MemberAccumulator>,
  users: RbacUser[],
  roleCode: OrganizationRoleCode,
): void {
  for (const user of users) {
    const current = byId.get(user.id);
    if (!current) {
      byId.set(user.id, {
        user,
        sourceRole: roleCode,
        roleCodes: new Set([roleCode]),
      });
      continue;
    }
    current.roleCodes.add(roleCode);
    if (
      organizationRolePriority(roleCode) >
      organizationRolePriority(current.sourceRole)
    ) {
      current.user = user;
      current.sourceRole = roleCode;
    }
  }
}

export async function fetchOrganizationMembers(
  apiClient: AxiosInstance,
  organizationId: number,
): Promise<OrganizationMember[]> {
  const [admins, members, developers] = await Promise.all([
    listUsersByRole(apiClient, {
      roleCode: "org_admin",
      scopeType: ORGANIZATION_SCOPE,
      scopeId: organizationId,
    }),
    listUsersByRole(apiClient, {
      roleCode: ORGANIZATION_BASE_ROLE,
      scopeType: ORGANIZATION_SCOPE,
      scopeId: organizationId,
    }),
    listUsersByRole(apiClient, {
      roleCode: "developer",
      scopeType: ORGANIZATION_SCOPE,
      scopeId: organizationId,
    }),
  ]);
  const byId = new Map<number, MemberAccumulator>();
  addRoleUsers(byId, admins, "org_admin");
  addRoleUsers(byId, members, ORGANIZATION_BASE_ROLE);
  addRoleUsers(byId, developers, "developer");
  return Array.from(byId.values(), ({ user, roleCodes }) => {
    const canonical = canonicalOrganizationRoleCodes(roleCodes);
    return {
      ...user,
      role: organizationDisplayRole(canonical),
      roleCodes: canonical,
    };
  });
}

export class OrganizationUserNotFoundError extends Error {
  constructor() {
    super("Organization user not found");
    this.name = "OrganizationUserNotFoundError";
  }
}

function roleGrant(
  organizationId: number,
  userId: number,
  roleCode: OrganizationRoleCode,
): UserRoleMutation {
  return {
    userId,
    roleCode,
    scopeId: organizationId,
    scopeType: ORGANIZATION_SCOPE,
  };
}

export async function inviteOrganizationMember(
  apiClient: AxiosInstance,
  organizationId: number,
  email: string,
  role: OrganizationRoleCode,
): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await findUserByEmail(apiClient, normalizedEmail);
  if (!user || user.email.trim().toLowerCase() !== normalizedEmail) {
    throw new OrganizationUserNotFoundError();
  }
  await assignUserRole(
    apiClient,
    roleGrant(organizationId, user.id, ORGANIZATION_BASE_ROLE),
  );
  if (role !== ORGANIZATION_BASE_ROLE) {
    await assignUserRole(apiClient, roleGrant(organizationId, user.id, role));
  }
}

type RemoveUndesiredOverlaysInput = {
  apiClient: AxiosInstance;
  organizationId: number;
  userId: number;
  currentRoles: Set<OrganizationRoleCode>;
  desired: OrganizationRoleCode | null;
};

async function removeUndesiredOverlays({
  apiClient,
  organizationId,
  userId,
  currentRoles,
  desired,
}: RemoveUndesiredOverlaysInput): Promise<void> {
  for (const role of ORGANIZATION_OVERLAY_ORDER) {
    if (role !== desired && currentRoles.has(role)) {
      await removeUserRole(apiClient, roleGrant(organizationId, userId, role));
    }
  }
}

export async function changeOrganizationMemberRole(
  apiClient: AxiosInstance,
  organizationId: number,
  { userId, roleCodes, toRole }: ChangeOrganizationRoleInput,
): Promise<void> {
  const currentRoles = new Set(roleCodes);
  if (!currentRoles.has(ORGANIZATION_BASE_ROLE)) {
    await assignUserRole(
      apiClient,
      roleGrant(organizationId, userId, ORGANIZATION_BASE_ROLE),
    );
  }
  const desired = desiredOrganizationOverlay(toRole);
  await removeUndesiredOverlays({
    apiClient,
    organizationId,
    userId,
    currentRoles,
    desired,
  });
  if (desired && !currentRoles.has(desired)) {
    await assignUserRole(apiClient, roleGrant(organizationId, userId, desired));
  }
}

export async function removeOrganizationMember(
  apiClient: AxiosInstance,
  organizationId: number,
  { userId, roleCodes }: RemoveOrganizationMemberInput,
): Promise<void> {
  const currentRoles = new Set(roleCodes);
  for (const role of [...ORGANIZATION_OVERLAY_ORDER, ORGANIZATION_BASE_ROLE]) {
    if (currentRoles.has(role)) {
      await removeUserRole(apiClient, roleGrant(organizationId, userId, role));
    }
  }
}
