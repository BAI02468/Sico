import {
  type OrganizationRoleCode,
  OrganizationRoleCodeSchema,
} from "../../rbac";

export const ORGANIZATION_BASE_ROLE =
  OrganizationRoleCodeSchema.enum.org_member;

const ROLE_ORDER: readonly OrganizationRoleCode[] = [
  ORGANIZATION_BASE_ROLE,
  OrganizationRoleCodeSchema.enum.developer,
  OrganizationRoleCodeSchema.enum.org_admin,
];

export const ORGANIZATION_OVERLAY_ORDER: readonly OrganizationRoleCode[] = [
  OrganizationRoleCodeSchema.enum.developer,
  OrganizationRoleCodeSchema.enum.org_admin,
];

export function organizationRolePriority(role: OrganizationRoleCode): number {
  if (role === OrganizationRoleCodeSchema.enum.org_admin) {
    return 3;
  }
  return role === OrganizationRoleCodeSchema.enum.developer ? 2 : 1;
}

export function canonicalOrganizationRoleCodes(
  roleCodes: Iterable<OrganizationRoleCode>,
): OrganizationRoleCode[] {
  const values = new Set(roleCodes);
  return ROLE_ORDER.filter((role) => values.has(role));
}

export function organizationDisplayRole(
  roleCodes: readonly OrganizationRoleCode[],
): OrganizationRoleCode {
  if (roleCodes.includes(OrganizationRoleCodeSchema.enum.org_admin)) {
    return OrganizationRoleCodeSchema.enum.org_admin;
  }
  return roleCodes.includes(OrganizationRoleCodeSchema.enum.developer)
    ? OrganizationRoleCodeSchema.enum.developer
    : ORGANIZATION_BASE_ROLE;
}

export function organizationRoleCodesFor(
  role: OrganizationRoleCode,
): OrganizationRoleCode[] {
  return role === ORGANIZATION_BASE_ROLE
    ? [ORGANIZATION_BASE_ROLE]
    : [ORGANIZATION_BASE_ROLE, role];
}

export function desiredOrganizationOverlay(
  role: OrganizationRoleCode,
): OrganizationRoleCode | null {
  return role === ORGANIZATION_BASE_ROLE ? null : role;
}
