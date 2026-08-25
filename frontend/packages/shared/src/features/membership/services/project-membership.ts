import type { AxiosInstance } from "axios";

import {
  assignUserRole,
  findUserByEmail,
  listUsersByRole,
  type ProjectRoleCode,
  ProjectRoleCodeSchema,
  removeUserRole,
  type UserRoleMutation,
} from "../../rbac";
import { type ProjectMember } from "../schemas/project-member";
import type {
  ChangeProjectMemberRoleInput,
  GrantProjectMembershipInput,
  InviteProjectMemberInput,
  RemoveProjectMemberInput,
} from "../types";

const SCOPE_TYPE = "project";

export async function fetchProjectMembers(
  client: AxiosInstance,
  projectId: number,
): Promise<ProjectMember[]> {
  const [admins, members] = await Promise.all([
    listUsersByRole(client, {
      roleCode: ProjectRoleCodeSchema.enum.project_admin,
      scopeType: SCOPE_TYPE,
      scopeId: projectId,
    }),
    listUsersByRole(client, {
      roleCode: ProjectRoleCodeSchema.enum.project_member,
      scopeType: SCOPE_TYPE,
      scopeId: projectId,
    }),
  ]);

  const byId = new Map<number, ProjectMember>();
  for (const user of admins) {
    byId.set(user.id, {
      ...user,
      roleCode: ProjectRoleCodeSchema.enum.project_admin,
    });
  }
  for (const user of members) {
    if (!byId.has(user.id)) {
      byId.set(user.id, {
        ...user,
        roleCode: ProjectRoleCodeSchema.enum.project_member,
      });
    }
  }
  return Array.from(byId.values());
}

export class ProjectUserNotFoundError extends Error {
  constructor() {
    super("Project user not found");
    this.name = "ProjectUserNotFoundError";
  }
}

export class ProjectMemberInviteError extends Error {
  readonly targetUserId: number;
  readonly cause: unknown;

  constructor(targetUserId: number, cause: unknown) {
    super(
      cause instanceof Error ? cause.message : "Project member invite failed",
    );
    this.name = "ProjectMemberInviteError";
    this.targetUserId = targetUserId;
    this.cause = cause;
  }
}

function roleGrant(
  projectId: number,
  userId: number,
  roleCode: ProjectRoleCode,
): UserRoleMutation {
  return {
    userId,
    roleCode,
    scopeId: projectId,
    scopeType: SCOPE_TYPE,
  };
}

export async function grantProjectMembership(
  client: AxiosInstance,
  projectId: number,
  { userId, roleCode }: GrantProjectMembershipInput,
): Promise<void> {
  try {
    await assignUserRole(
      client,
      roleGrant(projectId, userId, ProjectRoleCodeSchema.enum.project_member),
    );
    if (roleCode === ProjectRoleCodeSchema.enum.project_admin) {
      await assignUserRole(client, roleGrant(projectId, userId, roleCode));
    }
  } catch (error) {
    throw new ProjectMemberInviteError(userId, error);
  }
}

export async function inviteProjectMember(
  client: AxiosInstance,
  projectId: number,
  { email, roleCode }: InviteProjectMemberInput,
): Promise<number> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) {
    throw new ProjectUserNotFoundError();
  }
  const user = await findUserByEmail(client, normalizedEmail);
  if (!user || user.email.trim().toLowerCase() !== normalizedEmail) {
    throw new ProjectUserNotFoundError();
  }
  await grantProjectMembership(client, projectId, {
    userId: user.id,
    roleCode,
  });
  return user.id;
}

export function changeProjectMemberRole(
  client: AxiosInstance,
  projectId: number,
  { userId, toRoleCode }: ChangeProjectMemberRoleInput,
): Promise<void> {
  const adminGrant = roleGrant(
    projectId,
    userId,
    ProjectRoleCodeSchema.enum.project_admin,
  );
  return toRoleCode === ProjectRoleCodeSchema.enum.project_admin
    ? assignUserRole(client, adminGrant)
    : removeUserRole(client, adminGrant);
}

export async function removeProjectMember(
  client: AxiosInstance,
  projectId: number,
  { userId, roleCode }: RemoveProjectMemberInput,
): Promise<void> {
  if (roleCode === ProjectRoleCodeSchema.enum.project_admin) {
    await removeUserRole(client, roleGrant(projectId, userId, roleCode));
  }
  await removeUserRole(
    client,
    roleGrant(projectId, userId, ProjectRoleCodeSchema.enum.project_member),
  );
}
