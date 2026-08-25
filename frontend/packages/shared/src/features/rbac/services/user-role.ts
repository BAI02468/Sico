import type { AxiosInstance } from "axios";
import { z } from "zod";

import { RBAC_ENDPOINTS } from "../../../constants/endpoints";
import { apiResponseSchema, assertOk, unwrapData } from "../../../schemas/api";
import { type Paged } from "../../../schemas/paginated";
import {
  type AgentRoleCode,
  type OrganizationRoleCode,
  type ProjectRoleCode,
  type RbacUser,
  rbacUserSchema,
  type UserRole,
  userRoleSchema,
} from "../schemas/user-role";

const ROLE_PAGE_SIZE = 100;

type RolePage<T> = Paged<T>;

function shouldFetchNextPage<T>(page: RolePage<T>, loaded: number): boolean {
  return (
    page.hasNext &&
    page.items.length > 0 &&
    (page.total === 0 || loaded < page.total)
  );
}

async function collectPages<T>(
  fetchPage: (page: number) => Promise<RolePage<T>>,
): Promise<T[]> {
  const items: T[] = [];
  let pageNumber = 1;
  let hasNext = true;
  while (hasNext) {
    const page = await fetchPage(pageNumber);
    items.push(...page.items);
    hasNext = shouldFetchNextPage(page, items.length);
    pageNumber += 1;
  }
  return items;
}

// --- fetchUserRoles: GET /rbac/user_roles?userId ---------------------------

const rolesEnvelope = apiResponseSchema(
  z.object({
    // Coerce a null/missing role list to `[]` (backend sends `null` for a user
    // with no roles in scope) rather than rejecting the response.
    roles: z
      .array(userRoleSchema)
      .nullish()
      .transform((roles) => roles ?? []),
    // Pagination fields are display-only here; tolerate omissions so a
    // contract wobble can't reject the whole roles response.
    total: z.number().int().nonnegative().catch(0),
    hasNext: z.boolean().catch(false),
  }),
);

async function fetchUserRolesPage(
  client: AxiosInstance,
  userId: number,
  page: number,
): Promise<Paged<UserRole>> {
  const res = await client.get<unknown>(RBAC_ENDPOINTS.userRoles, {
    params: { userId, page, pageSize: ROLE_PAGE_SIZE },
  });
  const data = unwrapData(rolesEnvelope.parse(res.data), "fetchUserRoles");
  if (data.roles.some((role) => role.userId !== userId)) {
    throw new Error("User role outside requested user scope");
  }
  return { items: data.roles, total: data.total, hasNext: data.hasNext };
}

export function fetchUserRoles(
  client: AxiosInstance,
  userId: number,
): Promise<UserRole[]> {
  return collectPages((page) => fetchUserRolesPage(client, userId, page));
}

// --- findUserByEmail: GET /rbac/users?email --------------------------------

const usersEnvelope = apiResponseSchema(
  z.object({
    // The backend returns `users: null` (not `[]`) for a role with zero users,
    // so coerce a missing/null list to an empty array rather than rejecting the
    // whole response.
    users: z
      .array(rbacUserSchema)
      .nullish()
      .transform((users) => users ?? []),
    total: z.number().int().nonnegative().catch(0),
    hasNext: z.boolean().catch(false),
  }),
);

export async function findUserByEmail(
  client: AxiosInstance,
  email: string,
): Promise<RbacUser | null> {
  const normalizedEmail = email.trim().toLowerCase();
  const res = await client.get<unknown>(RBAC_ENDPOINTS.users, {
    params: { email: normalizedEmail, page: 1, pageSize: 10 },
  });
  const { users } = unwrapData(
    usersEnvelope.parse(res.data),
    "findUserByEmail",
  );
  return (
    users.find((user) => user.email.trim().toLowerCase() === normalizedEmail) ??
    null
  );
}

// --- assign / remove: POST | DELETE /rbac/user_role ------------------------

type ScopedRole =
  | {
      roleCode: AgentRoleCode;
      scopeType: "agent";
      scopeId: string;
    }
  | {
      roleCode: OrganizationRoleCode;
      scopeType: "org";
      scopeId: number;
    }
  | {
      roleCode: ProjectRoleCode;
      scopeType: "project";
      scopeId: number;
    };

export type UserRoleMutation = ScopedRole & {
  userId: number;
};

// A non-OK `code` inside an HTTP-200 envelope (e.g. permission denial) must
// reject — axios resolves the 200, so assert on the envelope code itself.
// The backend's `scopeId` is a STRING on the wire (it rejects a number:
// "cannot unmarshal number into ... scopeId of type string"), so serialize
// the numeric project id before sending. Callers keep passing a number.
export async function assignUserRole(
  client: AxiosInstance,
  { scopeId, ...body }: UserRoleMutation,
): Promise<void> {
  const res = await client.post<unknown>(RBAC_ENDPOINTS.userRole, {
    ...body,
    scopeId: String(scopeId),
  });
  assertOk(apiResponseSchema(z.unknown()).parse(res.data), "assignUserRole");
}

// DELETE carries a request body — axios only sends it via the `data` option.
export async function removeUserRole(
  client: AxiosInstance,
  { scopeId, ...body }: UserRoleMutation,
): Promise<void> {
  const res = await client.delete<unknown>(RBAC_ENDPOINTS.userRole, {
    data: { ...body, scopeId: String(scopeId) },
  });
  assertOk(apiResponseSchema(z.unknown()).parse(res.data), "removeUserRole");
}

// --- listUsersByRole: GET /rbac/role_users ---------------------------------

export type ListUsersByRoleParams = ScopedRole;

export type ListUsersByRolePageParams = ListUsersByRoleParams & {
  page: number;
  pageSize: number;
};

export async function listUsersByRolePage(
  client: AxiosInstance,
  { roleCode, scopeType, scopeId, page, pageSize }: ListUsersByRolePageParams,
): Promise<Paged<RbacUser>> {
  const res = await client.get<unknown>(RBAC_ENDPOINTS.roleUsers, {
    params: {
      roleCode,
      scopeType,
      scopeId: String(scopeId),
      page,
      pageSize,
    },
  });
  const data = unwrapData(usersEnvelope.parse(res.data), "listUsersByRolePage");
  return { items: data.users, total: data.total, hasNext: data.hasNext };
}

export function listUsersByRole(
  client: AxiosInstance,
  params: ListUsersByRoleParams,
): Promise<RbacUser[]> {
  return collectPages((page) =>
    listUsersByRolePage(client, {
      ...params,
      page,
      pageSize: ROLE_PAGE_SIZE,
    }),
  );
}
