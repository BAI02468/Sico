import type { OrganizationRoleCode, ProjectRoleCode, RbacUser } from "../rbac";

export type OrganizationMember = RbacUser & {
  role: OrganizationRoleCode;
  roleCodes: OrganizationRoleCode[];
};

export type GrantProjectMembershipInput = {
  userId: number;
  roleCode: ProjectRoleCode;
};

export type InviteProjectMemberInput = {
  email: string;
  roleCode: ProjectRoleCode;
};

export type ChangeProjectMemberRoleInput = {
  userId: number;
  toRoleCode: ProjectRoleCode;
};

export type RemoveProjectMemberInput = {
  userId: number;
  roleCode: ProjectRoleCode;
};

export type InviteOrganizationMemberInput = {
  email: string;
  role: OrganizationRoleCode;
};

export type ChangeOrganizationRoleInput = {
  userId: number;
  roleCodes: readonly OrganizationRoleCode[];
  toRole: OrganizationRoleCode;
};

export type RemoveOrganizationMemberInput = {
  userId: number;
  roleCodes: readonly OrganizationRoleCode[];
};
