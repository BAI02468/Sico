import axios, { type AxiosInstance } from "axios";
import { describe, expect, it, type MockInstance, vi } from "vitest";

import { createTestApiClient } from "@/testing/create-test-api-client";

import {
  AgentRoleCodeSchema,
  userRoleSchema,
} from "../../../../src/features/rbac/schemas/user-role";
import {
  assignUserRole,
  fetchUserRoles,
  findUserByEmail,
  listUsersByRole,
  listUsersByRolePage,
  removeUserRole,
} from "../../../../src/features/rbac/services/user-role";
import { makeOkEnvelope } from "../../../../src/schemas/api";

function makeGetClient(response: unknown): {
  client: AxiosInstance;
  get: MockInstance<AxiosInstance["get"]>;
} {
  const client = axios.create();
  const get = vi.spyOn(client, "get").mockResolvedValue({ data: response });
  return { client, get };
}

describe("fetchUserRoles", () => {
  it("GETs the roles for a user with paging params and returns the roles array", async () => {
    const roles = [
      {
        roleCode: "project_admin",
        scopeType: "project",
        scopeId: 5,
        userId: 42,
        user: { id: 42, email: "a@b.com", alias: "Ann" },
      },
    ];
    const { client, get } = makeGetClient(
      makeOkEnvelope({ roles, total: 1, hasNext: false }),
    );
    const result = await fetchUserRoles(client, 42);
    expect(get).toHaveBeenCalledWith("/rbac/user_roles", {
      params: { userId: 42, page: 1, pageSize: 100 },
    });
    expect(result).toHaveLength(1);
    expect(result[0]?.roleCode).toBe("project_admin");
  });

  it("rejects a role grant for a different user", async () => {
    const { client } = makeGetClient(
      makeOkEnvelope({
        roles: [
          {
            roleCode: "org_admin",
            scopeType: "org",
            scopeId: 9,
            userId: 7,
          },
        ],
        total: 1,
        hasNext: false,
      }),
    );

    await expect(fetchUserRoles(client, 42)).rejects.toThrow(
      "User role outside requested user scope",
    );
  });

  it("collects every role page", async () => {
    const get = vi
      .fn()
      .mockImplementation(
        (_url: string, config: { params: { page: number } }) =>
          Promise.resolve({
            data: makeOkEnvelope(
              config.params.page === 1
                ? {
                    roles: [
                      {
                        roleCode: "org_member",
                        scopeType: "org",
                        scopeId: 9,
                        userId: 42,
                      },
                    ],
                    total: 2,
                    hasNext: true,
                  }
                : {
                    roles: [
                      {
                        roleCode: "developer",
                        scopeType: "org",
                        scopeId: 9,
                        userId: 42,
                      },
                    ],
                    total: 2,
                    hasNext: false,
                  },
            ),
          }),
      );
    const client = axios.create();
    vi.spyOn(client, "get").mockImplementation(get);

    await expect(fetchUserRoles(client, 42)).resolves.toHaveLength(2);
    expect(get).toHaveBeenNthCalledWith(2, "/rbac/user_roles", {
      params: { userId: 42, page: 2, pageSize: 100 },
    });
  });

  it("continues when total is missing but hasNext is true", async () => {
    const get = vi
      .fn()
      .mockImplementation(
        (_url: string, config: { params: { page: number } }) =>
          Promise.resolve({
            data: makeOkEnvelope(
              config.params.page === 1
                ? {
                    roles: [
                      {
                        roleCode: "org_member",
                        scopeType: "org",
                        scopeId: 9,
                        userId: 42,
                      },
                    ],
                    hasNext: true,
                  }
                : { roles: [], hasNext: false },
            ),
          }),
      );
    const client = axios.create();
    vi.spyOn(client, "get").mockImplementation(get);

    await fetchUserRoles(client, 42);

    expect(get).toHaveBeenCalledTimes(2);
  });

  it("stops when an empty page incorrectly reports hasNext", async () => {
    const { client, get } = makeGetClient(
      makeOkEnvelope({ roles: [], total: 5, hasNext: true }),
    );

    await expect(fetchUserRoles(client, 42)).resolves.toEqual([]);
    expect(get).toHaveBeenCalledOnce();
  });

  it("returns an empty array when the user has no roles", async () => {
    const { client } = makeGetClient(
      makeOkEnvelope({ roles: [], total: 0, hasNext: false }),
    );
    const result = await fetchUserRoles(client, 42);
    expect(result).toEqual([]);
  });

  it("coerces a null roles list to an empty array", async () => {
    // Backend sends `roles: null` (not `[]`) for a user with no roles in scope.
    const { client } = makeGetClient(
      makeOkEnvelope({ roles: null, total: 0, hasNext: false }),
    );
    const result = await fetchUserRoles(client, 42);
    expect(result).toEqual([]);
  });

  it("tolerates non-project roleCodes and a null embedded user", async () => {
    // A real user_roles listing spans every scope: platform/org roles and an
    // empty placeholder grant with `user: null` sit alongside project ones.
    // The schema must accept them (roleCode is a bare string), or the whole
    // Person tab errors out. Regression from live dwp data.
    const roles = [
      { roleCode: "", scopeType: "", scopeId: 0, userId: 14, user: null },
      {
        roleCode: "platform_admin",
        scopeType: "platform",
        scopeId: 0,
        userId: 14,
      },
      { roleCode: "org_admin", scopeType: "org", scopeId: 4, userId: 14 },
      {
        roleCode: "project_admin",
        scopeType: "project",
        scopeId: 80,
        userId: 14,
      },
    ];
    const { client } = makeGetClient(
      makeOkEnvelope({ roles, total: 4, hasNext: false }),
    );
    const result = await fetchUserRoles(client, 14);
    expect(result).toHaveLength(4);
    expect(result.map((r) => r.roleCode)).toContain("platform_admin");
  });

  it("coerces a string scopeId from the wire into a number", async () => {
    // Live dwp sends `scopeId` as a STRING ("80"), but `projectRoleFor`
    // compares it against a numeric `projectId` with `===`. A plain
    // `z.number()` rejected the string and `.catch(0)` silently zeroed EVERY
    // grant — so `0 === 80` never matched and the user lost all project
    // permissions. `z.coerce.number()` must turn "80" into 80.
    const roles = [
      {
        roleCode: "project_admin",
        scopeType: "project",
        scopeId: "80",
        userId: 6,
      },
    ];
    const { client } = makeGetClient(
      makeOkEnvelope({ roles, total: 1, hasNext: false }),
    );
    const result = await fetchUserRoles(client, 6);
    expect(result[0]!.scopeId).toBe(80);
  });

  it("preserves a UUID agent scope ID from the wire", async () => {
    const roles = [
      {
        roleCode: "agent_editor",
        scopeType: "agent",
        scopeId: "a3c0bc10-6d1c-4b33-a866-f3e1b2b91cde",
        userId: 6,
      },
    ];
    const { client } = makeGetClient(
      makeOkEnvelope({ roles, total: 1, hasNext: false }),
    );

    const result = await fetchUserRoles(client, 6);

    expect(result[0]!.scopeId).toBe("a3c0bc10-6d1c-4b33-a866-f3e1b2b91cde");
  });

  it("defaults an unsafe numeric scope ID to zero", () => {
    const result = userRoleSchema.parse({
      roleCode: "project_admin",
      scopeType: "project",
      scopeId: "9007199254740992",
      userId: 6,
    });

    expect(result.scopeId).toBe(0);
  });

  it("defaults a boolean scope ID to zero", () => {
    const result = userRoleSchema.parse({
      roleCode: "project_admin",
      scopeType: "project",
      scopeId: true,
      userId: 6,
    });

    expect(result.scopeId).toBe(0);
  });

  it("accepts the agent editor role code", () => {
    expect(AgentRoleCodeSchema.parse("agent_editor")).toBe("agent_editor");
  });

  it("tolerates a grant that omits scopeId / scopeType", async () => {
    // A non-project grant that drops scopeId/scopeType must NOT reject the whole
    // list — the same resilience the bare-string roleCode provides. Missing
    // fields default to 0 / "".
    const roles = [
      { roleCode: "platform_admin", userId: 14 },
      {
        roleCode: "project_admin",
        scopeType: "project",
        scopeId: 80,
        userId: 14,
      },
    ];
    const { client } = makeGetClient(
      makeOkEnvelope({ roles, total: 2, hasNext: false }),
    );
    const result = await fetchUserRoles(client, 14);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ scopeId: 0, scopeType: "" });
  });
});

describe("findUserByEmail", () => {
  it("GETs users by email and returns the first match", async () => {
    const { client, get } = makeGetClient(
      makeOkEnvelope({
        users: [{ id: 7, email: "a@b.com", alias: "Ann", iconUri: "" }],
        total: 1,
        hasNext: false,
      }),
    );
    const result = await findUserByEmail(client, "a@b.com");
    expect(get).toHaveBeenCalledWith("/rbac/users", {
      params: { email: "a@b.com", page: 1, pageSize: 10 },
    });
    expect(result?.id).toBe(7);
  });

  it("returns only an exact normalized email match", async () => {
    const { client } = makeGetClient(
      makeOkEnvelope({
        users: [
          { id: 7, email: "other@b.com" },
          { id: 8, email: "A@B.COM" },
        ],
        total: 2,
        hasNext: false,
      }),
    );

    const result = await findUserByEmail(client, " a@b.com ");

    expect(result?.id).toBe(8);
  });

  it("returns null when no user matches", async () => {
    const { client } = makeGetClient(
      makeOkEnvelope({ users: [], total: 0, hasNext: false }),
    );
    const result = await findUserByEmail(client, "none@b.com");
    expect(result).toBeNull();
  });
});

describe("assignUserRole", () => {
  it("POSTs the role assignment body", async () => {
    const post = vi.fn().mockResolvedValue({ data: makeOkEnvelope({}) });
    const client = createTestApiClient({ post });
    await assignUserRole(client, {
      userId: 7,
      roleCode: "project_member",
      scopeId: 5,
      scopeType: "project",
    });
    expect(post).toHaveBeenCalledWith("/rbac/user_role", {
      userId: 7,
      roleCode: "project_member",
      scopeId: "5",
      scopeType: "project",
    });
  });

  it("rejects a non-OK envelope code", async () => {
    const post = vi
      .fn()
      .mockResolvedValue({ data: { code: 101008, msg: "denied" } });
    const client = createTestApiClient({ post });
    await expect(
      assignUserRole(client, {
        userId: 7,
        roleCode: "project_member",
        scopeId: 5,
        scopeType: "project",
      }),
    ).rejects.toThrow(/rejected \(code 101008\)/);
  });
});

describe("removeUserRole", () => {
  it("DELETEs the role with the body under the axios data option", async () => {
    const del = vi.fn().mockResolvedValue({ data: makeOkEnvelope({}) });
    const client = createTestApiClient({ delete: del });
    await removeUserRole(client, {
      userId: 7,
      roleCode: "project_admin",
      scopeId: 5,
      scopeType: "project",
    });
    expect(del).toHaveBeenCalledWith("/rbac/user_role", {
      data: {
        userId: 7,
        roleCode: "project_admin",
        scopeId: "5",
        scopeType: "project",
      },
    });
  });

  it("rejects a non-OK envelope code", async () => {
    const del = vi
      .fn()
      .mockResolvedValue({ data: { code: 101008, msg: "denied" } });
    const client = createTestApiClient({ delete: del });
    await expect(
      removeUserRole(client, {
        userId: 7,
        roleCode: "project_admin",
        scopeId: 5,
        scopeType: "project",
      }),
    ).rejects.toThrow(/rejected \(code 101008\)/);
  });
});

describe("listUsersByRolePage", () => {
  it("queries an agent role with its UUID scope ID", async () => {
    const { client, get } = makeGetClient(
      makeOkEnvelope({ users: [], total: 0, hasNext: false }),
    );

    await listUsersByRolePage(client, {
      roleCode: "agent_editor",
      scopeType: "agent",
      scopeId: "a3c0bc10-6d1c-4b33-a866-f3e1b2b91cde",
      page: 1,
      pageSize: 50,
    });

    expect(get).toHaveBeenCalledWith("/rbac/role_users", {
      params: {
        roleCode: "agent_editor",
        scopeType: "agent",
        scopeId: "a3c0bc10-6d1c-4b33-a866-f3e1b2b91cde",
        page: 1,
        pageSize: 50,
      },
    });
  });

  it("returns an organization role page with pagination metadata", async () => {
    const { client, get } = makeGetClient(
      makeOkEnvelope({
        users: [{ id: 7, email: "a@b.com", alias: "Ann", iconUri: "" }],
        total: 51,
        hasNext: true,
      }),
    );

    const result = await listUsersByRolePage(client, {
      roleCode: "org_admin",
      scopeType: "org",
      scopeId: 9,
      page: 2,
      pageSize: 50,
    });

    expect(get).toHaveBeenCalledWith("/rbac/role_users", {
      params: {
        roleCode: "org_admin",
        scopeType: "org",
        scopeId: "9",
        page: 2,
        pageSize: 50,
      },
    });
    expect(result).toEqual({
      items: [{ id: 7, email: "a@b.com", alias: "Ann", iconUri: "" }],
      total: 51,
      hasNext: true,
    });
  });
});

describe("listUsersByRole", () => {
  it("GETs role_users with the role scope params and returns the users array", async () => {
    const { client, get } = makeGetClient(
      makeOkEnvelope({
        users: [{ id: 7, email: "a@b.com", alias: "Ann", iconUri: "" }],
        total: 1,
        hasNext: false,
      }),
    );
    const result = await listUsersByRole(client, {
      roleCode: "project_admin",
      scopeType: "project",
      scopeId: 5,
    });
    expect(get).toHaveBeenCalledWith("/rbac/role_users", {
      params: {
        roleCode: "project_admin",
        scopeType: "project",
        scopeId: "5",
        page: 1,
        pageSize: 100,
      },
    });
    expect(result).toHaveLength(1);
    expect(result[0]?.email).toBe("a@b.com");
  });

  it("collects every role-user page", async () => {
    const get = vi
      .fn()
      .mockImplementation(
        (_url: string, config: { params: { page: number } }) =>
          Promise.resolve({
            data: makeOkEnvelope(
              config.params.page === 1
                ? {
                    users: [{ id: 7, email: "a@b.com" }],
                    total: 2,
                    hasNext: true,
                  }
                : {
                    users: [{ id: 8, email: "c@d.com" }],
                    total: 2,
                    hasNext: false,
                  },
            ),
          }),
      );
    const client = axios.create();
    vi.spyOn(client, "get").mockImplementation(get);

    await expect(
      listUsersByRole(client, {
        roleCode: "project_member",
        scopeType: "project",
        scopeId: 5,
      }),
    ).resolves.toHaveLength(2);
    expect(get).toHaveBeenNthCalledWith(2, "/rbac/role_users", {
      params: {
        roleCode: "project_member",
        scopeType: "project",
        scopeId: "5",
        page: 2,
        pageSize: 100,
      },
    });
  });

  it("returns an empty array when no users hold the role", async () => {
    const { client } = makeGetClient(
      makeOkEnvelope({ users: [], total: 0, hasNext: false }),
    );
    const result = await listUsersByRole(client, {
      roleCode: "project_admin",
      scopeType: "project",
      scopeId: 5,
    });
    expect(result).toEqual([]);
  });

  it("coerces a null users list to an empty array", async () => {
    // The backend returns `users: null` (not `[]`) for a role with zero users;
    // the schema must tolerate it, or the whole Person tab errors out.
    // Regression from live dwp data.
    const { client } = makeGetClient(
      makeOkEnvelope({ users: null, total: 0, hasNext: false }),
    );
    const result = await listUsersByRole(client, {
      roleCode: "project_member",
      scopeType: "project",
      scopeId: 5,
    });
    expect(result).toEqual([]);
  });
});
