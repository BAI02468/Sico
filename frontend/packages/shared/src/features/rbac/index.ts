export {
  deriveOrganizationCapabilities,
  deriveProjectCapabilities,
  deriveStudioPermission,
  EMPTY_PERMISSION_SNAPSHOT,
  normalizePermissionSnapshot,
  type OrganizationCapabilities,
  type PermissionSnapshot,
} from "./permission-snapshot";
export { rbacKeys } from "./query-keys";
export {
  type AgentRoleCode,
  AgentRoleCodeSchema,
  type OrganizationRoleCode,
  OrganizationRoleCodeSchema,
  type ProjectRoleCode,
  ProjectRoleCodeSchema,
  type RbacUser,
  rbacUserSchema,
  type ScopedRoleCode,
  type UserRole,
  userRoleSchema,
} from "./schemas/user-role";
export {
  assignUserRole,
  fetchUserRoles,
  findUserByEmail,
  type ListUsersByRolePageParams,
  type ListUsersByRoleParams,
  listUsersByRole,
  listUsersByRolePage,
  removeUserRole,
  type UserRoleMutation,
} from "./services/user-role";
export {
  type ProjectCapabilities,
  type ProjectRole,
  deriveCapabilities,
} from "./capabilities";
export {
  usePermissionSnapshotQuery,
  usePermissionSnapshotSuspenseQuery,
} from "./hooks/use-permission-snapshot";
export {
  type OrganizationPermission,
  type OrganizationPermissionCapabilities,
  useOrganizationPermission,
  useOrganizationPermissionSuspense,
} from "./hooks/use-organization-permission";
export {
  type ProjectPermission,
  useProjectPermission,
} from "./hooks/use-project-permission";
export {
  type ProjectPermissionSuspense,
  useProjectPermissionSuspense,
} from "./hooks/use-project-permission-suspense";
export {
  type AgentPermission,
  type AgentPermissionCapabilities,
  type AgentPermissionIdentity,
  type AgentPermissionTarget,
  deriveAgentPermission,
  useAgentPermission,
} from "./hooks/use-agent-permission";
