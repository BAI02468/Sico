import type { AxiosInstance } from "axios";

import { rbacKeys } from "./query-keys";
import { type ProjectRoleCode, type UserRole } from "./schemas/user-role";
import { fetchUserRoles } from "./services/user-role";

// The project role a user holds — the two project-scoped `ProjectRoleCode`s, or `null`
// for no project role (or a still-unknown role). Derived from `ProjectRoleCode` so a
// new project role in the zod enum flows here rather than drifting.
export type ProjectRole = ProjectRoleCode;

// Per-capability booleans the UI gates on — one flag per distinct action group
// from the RBAC design's permission keys. Consumers gate on a specific
// capability (plus a per-row `.own` email check where noted) instead of a
// blanket `isAdmin`, so a member keeps the actions they're actually entitled to.
export type ProjectCapabilities = {
  /** project.manage — edit/delete project, change member role, invite/remove
   * Operators + Admins, configure sandbox. Admin only. */
  canManageProject: boolean;
  /** dw.manage — reassign / dismiss ANY digital worker. Admin only. */
  canManageDw: boolean;
  /** dw.manage.own — invite a digital worker (member gets their own). */
  canInviteDw: boolean;
  /** asset.manage — delete ANY asset. Admin only. */
  canManageAsset: boolean;
  /** asset.manage.own — create an asset, delete OWN. Admin + member. */
  canManageAssetOwn: boolean;
  /** dw.use — run a DW + view results. Admin + member. */
  canUseDw: boolean;
};

const NONE: ProjectCapabilities = {
  canManageProject: false,
  canManageDw: false,
  canInviteDw: false,
  canManageAsset: false,
  canManageAssetOwn: false,
  canUseDw: false,
};

/**
 * The single role → capability map (RBAC design's Role-Permission Mapping,
 * project scope only). This is the ONLY place role logic lives — if the backend
 * later returns a real permission list, replace this function's body and every
 * consumer stays unchanged.
 *
 * - `project_admin` → every capability (admin's `*` supersets the `.own` ones).
 * - `project_member` → invite own DW, manage own assets, use DWs.
 * - `null` (no project role) → nothing.
 */
export function deriveCapabilities(
  role: ProjectRole | null,
): ProjectCapabilities {
  if (role === "project_admin") {
    return {
      canManageProject: true,
      canManageDw: true,
      canInviteDw: true,
      canManageAsset: true,
      canManageAssetOwn: true,
      canUseDw: true,
    };
  }
  if (role === "project_member") {
    return {
      ...NONE,
      canInviteDw: true,
      canManageAssetOwn: true,
      canUseDw: true,
    };
  }
  return NONE;
}

// The user-roles query key + fn, shared so the suspense and non-suspense hooks
// hit ONE cache entry. Keyed on the user id (the roles are user-scoped, not
// project-scoped — a single fetch answers every project's role). A `null` id
// (user atom not hydrated) keys separately and resolves to no roles rather than
// fetching a phantom "user 0".
export function userRolesQueryOptions(
  apiClient: AxiosInstance,
  userId: number | null,
): {
  queryKey: ReturnType<typeof rbacKeys.userRoles>;
  queryFn: () => Promise<UserRole[]>;
} {
  return {
    queryKey: rbacKeys.userRoles(userId),
    queryFn: (): Promise<UserRole[]> =>
      userId === null ? Promise.resolve([]) : fetchUserRoles(apiClient, userId),
  };
}
