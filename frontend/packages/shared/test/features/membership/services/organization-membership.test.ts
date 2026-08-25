import axios, {
  AxiosHeaders,
  type AxiosInstance,
  type AxiosResponse,
} from "axios";
import { describe, expect, it, type MockInstance, vi } from "vitest";

import {
  changeOrganizationMemberRole,
  fetchOrganizationMembers,
  inviteOrganizationMember,
  OrganizationUserNotFoundError,
  removeOrganizationMember,
} from "../../../../src/features/membership/services/organization-membership";
import { makeOkEnvelope } from "../../../../src/schemas/api";

const user = (
  id: number,
  email: string,
): { id: number; email: string; alias: string } => ({
  id,
  email,
  alias: email,
});

function axiosResponse<T>(data: T): AxiosResponse<T> {
  return {
    data,
    status: 200,
    statusText: "OK",
    headers: new AxiosHeaders(),
    config: { headers: new AxiosHeaders() },
  };
}

function roleQueryFrom(value: unknown): { roleCode: string; page: number } {
  if (
    typeof value === "object" &&
    value !== null &&
    "roleCode" in value &&
    typeof value.roleCode === "string" &&
    "page" in value &&
    typeof value.page === "number"
  ) {
    return { roleCode: value.roleCode, page: value.page };
  }
  throw new Error("Missing role query");
}

function roleCodeFrom(value: unknown): string {
  if (
    typeof value === "object" &&
    value !== null &&
    "roleCode" in value &&
    typeof value.roleCode === "string"
  ) {
    return value.roleCode;
  }
  throw new Error("Missing roleCode");
}

function makeRosterClient(
  responses: Record<
    string,
    { users: unknown[]; total: number; hasNext: boolean }
  >,
): {
  client: AxiosInstance;
  get: MockInstance<AxiosInstance["get"]>;
} {
  const client = axios.create();
  const get = vi.spyOn(client, "get").mockImplementation((_url, config) => {
    const params = roleQueryFrom(config?.params);
    const response = responses[`${params.roleCode}:${params.page}`];
    if (!response) {
      throw new Error(`missing ${params.roleCode}:${params.page}`);
    }
    return Promise.resolve(axiosResponse(makeOkEnvelope(response)));
  });
  return { client, get };
}

type MutationClient = {
  client: AxiosInstance;
  operations: string[];
  get: MockInstance<AxiosInstance["get"]>;
  post: MockInstance<AxiosInstance["post"]>;
  del: MockInstance<AxiosInstance["delete"]>;
};

function mutationClient(): MutationClient {
  const client = axios.create();
  const operations: string[] = [];
  const get = vi.spyOn(client, "get");
  const post = vi.spyOn(client, "post").mockImplementation((_url, body) => {
    operations.push(`POST ${roleCodeFrom(body)}`);
    return Promise.resolve(axiosResponse(makeOkEnvelope({})));
  });
  const del = vi.spyOn(client, "delete").mockImplementation((_url, config) => {
    operations.push(`DELETE ${roleCodeFrom(config?.data)}`);
    return Promise.resolve(axiosResponse(makeOkEnvelope({})));
  });
  return { client, operations, get, post, del };
}

function mockExactUser(
  get: MutationClient["get"],
  email = "person@example.com",
): void {
  get.mockResolvedValue(
    axiosResponse(
      makeOkEnvelope({
        users: [user(7, email)],
        total: 1,
        hasNext: false,
      }),
    ),
  );
}

describe("fetchOrganizationMembers", () => {
  it("collects every role page and retains canonical grants", async () => {
    const adminOne = user(1, "admin-1@example.com");
    const developer = user(4, "dev@example.com");
    const { client, get } = makeRosterClient({
      "org_admin:1": { users: [adminOne], total: 2, hasNext: true },
      "org_admin:2": {
        users: [user(2, "admin-2@example.com")],
        total: 2,
        hasNext: false,
      },
      "org_member:1": {
        users: [adminOne, user(3, "member@example.com"), developer],
        total: 3,
        hasNext: false,
      },
      "developer:1": { users: [developer], total: 1, hasNext: false },
    });

    await expect(fetchOrganizationMembers(client, 9)).resolves.toEqual([
      expect.objectContaining({
        id: 1,
        role: "org_admin",
        roleCodes: ["org_member", "org_admin"],
      }),
      expect.objectContaining({
        id: 2,
        role: "org_admin",
        roleCodes: ["org_admin"],
      }),
      expect.objectContaining({
        id: 3,
        role: "org_member",
        roleCodes: ["org_member"],
      }),
      expect.objectContaining({
        id: 4,
        role: "developer",
        roleCodes: ["org_member", "developer"],
      }),
    ]);
    expect(get).toHaveBeenCalledTimes(4);
  });

  it("retains both overlays and displays Admin for an anomalous member", async () => {
    const duplicate = user(1, "same@example.com");
    const { client } = makeRosterClient({
      "org_admin:1": { users: [duplicate], total: 1, hasNext: false },
      "org_member:1": { users: [duplicate], total: 1, hasNext: false },
      "developer:1": { users: [duplicate], total: 1, hasNext: false },
    });

    await expect(fetchOrganizationMembers(client, 9)).resolves.toEqual([
      expect.objectContaining({
        id: 1,
        role: "org_admin",
        roleCodes: ["org_member", "developer", "org_admin"],
      }),
    ]);
  });

  it("keeps legacy overlay-only users without inventing a base grant", async () => {
    const { client } = makeRosterClient({
      "org_admin:1": {
        users: [user(1, "admin@example.com")],
        total: 1,
        hasNext: false,
      },
      "org_member:1": { users: [], total: 0, hasNext: false },
      "developer:1": {
        users: [user(2, "developer@example.com")],
        total: 1,
        hasNext: false,
      },
    });

    await expect(fetchOrganizationMembers(client, 9)).resolves.toEqual([
      expect.objectContaining({
        id: 1,
        role: "org_admin",
        roleCodes: ["org_admin"],
      }),
      expect.objectContaining({
        id: 2,
        role: "developer",
        roleCodes: ["developer"],
      }),
    ]);
  });

  it("stops when an empty page incorrectly reports hasNext", async () => {
    const { client, get } = makeRosterClient({
      "org_admin:1": { users: [], total: 5, hasNext: true },
      "org_member:1": { users: [], total: 0, hasNext: false },
      "developer:1": { users: [], total: 0, hasNext: false },
    });

    await expect(fetchOrganizationMembers(client, 9)).resolves.toEqual([]);
    expect(get).toHaveBeenCalledTimes(3);
  });

  it("rejects instead of returning a partial list when a later page fails", async () => {
    const { client } = makeRosterClient({
      "org_admin:1": {
        users: [user(1, "admin@example.com")],
        total: 2,
        hasNext: true,
      },
      "org_member:1": { users: [], total: 0, hasNext: false },
      "developer:1": { users: [], total: 0, hasNext: false },
    });

    await expect(fetchOrganizationMembers(client, 9)).rejects.toThrow(
      "missing org_admin:2",
    );
  });
});

describe("inviteOrganizationMember", () => {
  it.each([
    ["org_member", ["org_member"]],
    ["developer", ["org_member", "developer"]],
    ["org_admin", ["org_member", "org_admin"]],
  ] as const)("invites %s with base-first grants", async (role, expected) => {
    const { client, operations, get } = mutationClient();
    mockExactUser(get);

    await inviteOrganizationMember(client, 9, " Person@Example.com ", role);

    expect(operations).toEqual(expected.map((code) => `POST ${code}`));
    expect(get).toHaveBeenCalledWith("/rbac/users", {
      params: { email: "person@example.com", page: 1, pageSize: 10 },
    });
  });

  it("stops when assigning the base grant fails", async () => {
    const { client, operations, get, post } = mutationClient();
    mockExactUser(get);
    post.mockImplementationOnce((_url, body) => {
      operations.push(`POST ${roleCodeFrom(body)}`);
      return Promise.reject(new Error("base failed"));
    });

    await expect(
      inviteOrganizationMember(client, 9, "person@example.com", "developer"),
    ).rejects.toThrow("base failed");
    expect(operations).toEqual(["POST org_member"]);
  });

  it("leaves the base grant when assigning the overlay fails", async () => {
    const { client, operations, get, post, del } = mutationClient();
    mockExactUser(get);
    post.mockImplementationOnce((_url, body) => {
      operations.push(`POST ${roleCodeFrom(body)}`);
      return Promise.resolve({ data: makeOkEnvelope({}) });
    });
    post.mockImplementationOnce((_url, body) => {
      operations.push(`POST ${roleCodeFrom(body)}`);
      return Promise.reject(new Error("overlay failed"));
    });

    await expect(
      inviteOrganizationMember(client, 9, "person@example.com", "developer"),
    ).rejects.toThrow("overlay failed");
    expect(operations).toEqual(["POST org_member", "POST developer"]);
    expect(del).not.toHaveBeenCalled();
  });

  it("rejects a non-exact email search result without assigning grants", async () => {
    const { client, get, post } = mutationClient();
    mockExactUser(get, "other@example.com");

    await expect(
      inviteOrganizationMember(client, 9, "person@example.com", "developer"),
    ).rejects.toBeInstanceOf(OrganizationUserNotFoundError);
    expect(post).not.toHaveBeenCalled();
  });
});

describe("changeOrganizationMemberRole", () => {
  it.each([
    {
      name: "Operator to Developer",
      roleCodes: ["org_member"],
      toRole: "developer",
      expected: ["POST developer"],
    },
    {
      name: "Operator to Admin",
      roleCodes: ["org_member"],
      toRole: "org_admin",
      expected: ["POST org_admin"],
    },
    {
      name: "Developer to Operator",
      roleCodes: ["org_member", "developer"],
      toRole: "org_member",
      expected: ["DELETE developer"],
    },
    {
      name: "Admin to Operator",
      roleCodes: ["org_member", "org_admin"],
      toRole: "org_member",
      expected: ["DELETE org_admin"],
    },
    {
      name: "Developer to Admin",
      roleCodes: ["org_member", "developer"],
      toRole: "org_admin",
      expected: ["DELETE developer", "POST org_admin"],
    },
    {
      name: "Admin to Developer",
      roleCodes: ["org_member", "org_admin"],
      toRole: "developer",
      expected: ["DELETE org_admin", "POST developer"],
    },
  ] as const)(
    "applies $name in order",
    async ({ roleCodes, toRole, expected }) => {
      const { client, operations, get } = mutationClient();

      await changeOrganizationMemberRole(client, 9, {
        userId: 7,
        roleCodes: [...roleCodes],
        toRole,
      });

      expect(operations).toEqual(expected);
      expect(get).not.toHaveBeenCalled();
    },
  );

  it.each([
    ["org_member", ["org_member"]],
    ["developer", ["org_member", "developer"]],
    ["org_admin", ["org_member", "org_admin"]],
  ] as const)(
    "does nothing for a clean %s selection",
    async (toRole, roleCodes) => {
      const { client, operations } = mutationClient();

      await changeOrganizationMemberRole(client, 9, {
        userId: 7,
        roleCodes: [...roleCodes],
        toRole,
      });

      expect(operations).toEqual([]);
    },
  );

  it("repairs a legacy base before switching overlays", async () => {
    const { client, operations } = mutationClient();

    await changeOrganizationMemberRole(client, 9, {
      userId: 7,
      roleCodes: ["developer"],
      toRole: "org_admin",
    });

    expect(operations).toEqual([
      "POST org_member",
      "DELETE developer",
      "POST org_admin",
    ]);
  });

  it("repairs a legacy base without rewriting the selected overlay", async () => {
    const { client, operations } = mutationClient();

    await changeOrganizationMemberRole(client, 9, {
      userId: 7,
      roleCodes: ["developer"],
      toRole: "developer",
    });

    expect(operations).toEqual(["POST org_member"]);
  });

  it.each([
    ["org_member", ["DELETE developer", "DELETE org_admin"]],
    ["developer", ["DELETE org_admin"]],
    ["org_admin", ["DELETE developer"]],
  ] as const)(
    "normalizes both overlays when selecting %s",
    async (toRole, expected) => {
      const { client, operations } = mutationClient();

      await changeOrganizationMemberRole(client, 9, {
        userId: 7,
        roleCodes: ["org_member", "developer", "org_admin"],
        toRole,
      });

      expect(operations).toEqual(expected);
    },
  );

  it("stops when repairing the legacy base fails", async () => {
    const { client, operations, post, del } = mutationClient();
    post.mockImplementationOnce((_url, body) => {
      operations.push(`POST ${roleCodeFrom(body)}`);
      return Promise.reject(new Error("base failed"));
    });

    await expect(
      changeOrganizationMemberRole(client, 9, {
        userId: 7,
        roleCodes: ["developer"],
        toRole: "org_admin",
      }),
    ).rejects.toThrow("base failed");
    expect(operations).toEqual(["POST org_member"]);
    expect(del).not.toHaveBeenCalled();
  });

  it("does not restore the old overlay when the new overlay fails", async () => {
    const { client, operations, post } = mutationClient();
    post.mockImplementationOnce((_url, body) => {
      operations.push(`POST ${roleCodeFrom(body)}`);
      return Promise.reject(new Error("target failed"));
    });

    await expect(
      changeOrganizationMemberRole(client, 9, {
        userId: 7,
        roleCodes: ["org_member", "developer"],
        toRole: "org_admin",
      }),
    ).rejects.toThrow("target failed");
    expect(operations).toEqual(["DELETE developer", "POST org_admin"]);
  });
});

describe("removeOrganizationMember", () => {
  it.each([
    [["org_member"], ["DELETE org_member"]],
    [
      ["org_member", "developer"],
      ["DELETE developer", "DELETE org_member"],
    ],
    [
      ["org_member", "org_admin"],
      ["DELETE org_admin", "DELETE org_member"],
    ],
    [
      ["org_member", "developer", "org_admin"],
      ["DELETE developer", "DELETE org_admin", "DELETE org_member"],
    ],
    [["developer"], ["DELETE developer"]],
    [["org_admin"], ["DELETE org_admin"]],
  ] as const)(
    "deletes only observed grants in order",
    async (roleCodes, expected) => {
      const { client, operations, get } = mutationClient();

      await removeOrganizationMember(client, 9, {
        userId: 7,
        roleCodes: [...roleCodes],
      });

      expect(operations).toEqual(expected);
      expect(get).not.toHaveBeenCalled();
    },
  );

  it("stops deleting grants after the first failure", async () => {
    const { client, operations, del } = mutationClient();
    del.mockImplementationOnce((_url, config) => {
      operations.push(`DELETE ${roleCodeFrom(config?.data)}`);
      return Promise.reject(new Error("developer failed"));
    });

    await expect(
      removeOrganizationMember(client, 9, {
        userId: 7,
        roleCodes: ["org_member", "developer", "org_admin"],
      }),
    ).rejects.toThrow("developer failed");
    expect(operations).toEqual(["DELETE developer"]);
  });
});
