import axios, {
  AxiosHeaders,
  type AxiosInstance,
  type AxiosResponse,
} from "axios";
import { describe, expect, it, type MockInstance, vi } from "vitest";

import {
  changeProjectMemberRole,
  fetchProjectMembers,
  grantProjectMembership,
  inviteProjectMember,
  ProjectMemberInviteError,
  ProjectUserNotFoundError,
  removeProjectMember,
} from "../../../../src/features/membership/services/project-membership";
import { makeOkEnvelope } from "../../../../src/schemas/api";

// Each GET (one per role) resolves the next queued envelope in call order:
// call 1 → project_admin users, call 2 → project_member users.
function makeClient(responses: unknown[]): {
  client: AxiosInstance;
  get: MockInstance<AxiosInstance["get"]>;
} {
  const client = axios.create();
  const get = vi.spyOn(client, "get");
  for (const response of responses) {
    get.mockResolvedValueOnce(axiosResponse(response));
  }
  return { client, get };
}

const usersPayload = (
  users: { id: number; email: string; alias?: string }[],
): unknown => makeOkEnvelope({ users, total: users.length, hasNext: false });

function axiosResponse<T>(data: T): AxiosResponse<T> {
  return {
    data,
    status: 200,
    statusText: "OK",
    headers: new AxiosHeaders(),
    config: { headers: new AxiosHeaders() },
  };
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
  get: ReturnType<typeof mutationClient>["get"],
  email = "person@example.com",
): void {
  get.mockResolvedValue(axiosResponse(usersPayload([{ id: 7, email }])));
}

describe("fetchProjectMembers", () => {
  it("queries role_users for both roles scoped to the project", async () => {
    const { client, get } = makeClient([usersPayload([]), usersPayload([])]);
    await fetchProjectMembers(client, 7);
    expect(get).toHaveBeenNthCalledWith(1, "/rbac/role_users", {
      params: {
        roleCode: "project_admin",
        scopeType: "project",
        scopeId: "7",
        page: 1,
        pageSize: 100,
      },
    });
    expect(get).toHaveBeenNthCalledWith(2, "/rbac/role_users", {
      params: {
        roleCode: "project_member",
        scopeType: "project",
        scopeId: "7",
        page: 1,
        pageSize: 100,
      },
    });
  });

  it("tags each user with its role code", async () => {
    const { client } = makeClient([
      usersPayload([{ id: 1, email: "a@b.com" }]),
      usersPayload([{ id: 2, email: "c@d.com" }]),
    ]);
    const members = await fetchProjectMembers(client, 7);
    expect(members).toEqual([
      { id: 1, email: "a@b.com", roleCode: "project_admin" },
      { id: 2, email: "c@d.com", roleCode: "project_member" },
    ]);
  });

  it("dedupes a user in both roles as admin", async () => {
    const { client } = makeClient([
      usersPayload([{ id: 1, email: "a@b.com" }]),
      usersPayload([{ id: 1, email: "a@b.com" }]),
    ]);
    const members = await fetchProjectMembers(client, 7);
    expect(members).toHaveLength(1);
    expect(members[0]?.roleCode).toBe("project_admin");
  });

  it("returns an empty list when the project has no members", async () => {
    const { client } = makeClient([usersPayload([]), usersPayload([])]);
    expect(await fetchProjectMembers(client, 7)).toEqual([]);
  });

  it("rejects a non-OK envelope", async () => {
    const { client } = makeClient([{ code: 500, msg: "boom" }]);
    await expect(fetchProjectMembers(client, 7)).rejects.toThrow();
  });
});

describe("grantProjectMembership", () => {
  it("grants the member base before the admin overlay", async () => {
    const { client, operations } = mutationClient();

    await grantProjectMembership(client, 9, {
      userId: 7,
      roleCode: "project_admin",
    });

    expect(operations).toEqual(["POST project_member", "POST project_admin"]);
  });

  it("reports the resolved user when a grant fails", async () => {
    const { client, operations, post } = mutationClient();
    const failure = new Error("base failed");
    post.mockImplementationOnce((_url, body) => {
      operations.push(`POST ${roleCodeFrom(body)}`);
      return Promise.reject(failure);
    });

    const grant = grantProjectMembership(client, 9, {
      userId: 7,
      roleCode: "project_admin",
    });

    await expect(grant).rejects.toBeInstanceOf(ProjectMemberInviteError);
    await expect(grant).rejects.toMatchObject({
      targetUserId: 7,
      cause: failure,
    });
    expect(operations).toEqual(["POST project_member"]);
  });
});

describe("inviteProjectMember", () => {
  it("normalizes the lookup email", async () => {
    const { client, get } = mutationClient();
    mockExactUser(get);

    await inviteProjectMember(client, 9, {
      email: " Person@Example.com ",
      roleCode: "project_member",
    });

    expect(get).toHaveBeenCalledWith("/rbac/users", {
      params: { email: "person@example.com", page: 1, pageSize: 10 },
    });
  });

  it("returns the resolved user id", async () => {
    const { client, get } = mutationClient();
    mockExactUser(get);

    await expect(
      inviteProjectMember(client, 9, {
        email: "person@example.com",
        roleCode: "project_member",
      }),
    ).resolves.toBe(7);
  });

  it("rejects an empty normalized email without looking up a user", async () => {
    const { client, get, post } = mutationClient();

    await expect(
      inviteProjectMember(client, 9, {
        email: "   ",
        roleCode: "project_member",
      }),
    ).rejects.toBeInstanceOf(ProjectUserNotFoundError);

    expect(get).not.toHaveBeenCalled();
    expect(post).not.toHaveBeenCalled();
  });

  it("rejects an inexact lookup result", async () => {
    const { client, get, post } = mutationClient();
    mockExactUser(get, "other@example.com");

    await expect(
      inviteProjectMember(client, 9, {
        email: "person@example.com",
        roleCode: "project_member",
      }),
    ).rejects.toBeInstanceOf(ProjectUserNotFoundError);

    expect(post).not.toHaveBeenCalled();
  });

  it("accepts an exact normalized lookup result", async () => {
    const { client, get, operations } = mutationClient();
    mockExactUser(get, "Person@Example.com");

    await inviteProjectMember(client, 9, {
      email: "person@example.com",
      roleCode: "project_member",
    });

    expect(operations).toEqual(["POST project_member"]);
  });

  it("assigns only the base grant for a member", async () => {
    const { client, get, operations } = mutationClient();
    mockExactUser(get);

    await inviteProjectMember(client, 9, {
      email: "person@example.com",
      roleCode: "project_member",
    });

    expect(operations).toEqual(["POST project_member"]);
  });

  it("assigns the member base before the admin overlay", async () => {
    const { client, get, operations } = mutationClient();
    mockExactUser(get);

    await inviteProjectMember(client, 9, {
      email: "person@example.com",
      roleCode: "project_admin",
    });

    expect(operations).toEqual(["POST project_member", "POST project_admin"]);
  });

  it("stops when assigning the member base fails", async () => {
    const { client, get, operations, post } = mutationClient();
    mockExactUser(get);
    post.mockImplementationOnce((_url, body) => {
      operations.push(`POST ${roleCodeFrom(body)}`);
      return Promise.reject(new Error("base failed"));
    });

    const invite = inviteProjectMember(client, 9, {
      email: "person@example.com",
      roleCode: "project_admin",
    });

    await expect(invite).rejects.toThrow("base failed");
    await expect(invite).rejects.toMatchObject({ targetUserId: 7 });
    expect(operations).toEqual(["POST project_member"]);
  });

  it("does not compensate when assigning the admin overlay fails", async () => {
    const { client, get, operations, post, del } = mutationClient();
    mockExactUser(get);
    post.mockImplementationOnce((_url, body) => {
      operations.push(`POST ${roleCodeFrom(body)}`);
      return Promise.resolve(axiosResponse(makeOkEnvelope({})));
    });
    post.mockImplementationOnce((_url, body) => {
      operations.push(`POST ${roleCodeFrom(body)}`);
      return Promise.reject(new Error("overlay failed"));
    });

    await expect(
      inviteProjectMember(client, 9, {
        email: "person@example.com",
        roleCode: "project_admin",
      }),
    ).rejects.toThrow("overlay failed");

    expect(operations).toEqual(["POST project_member", "POST project_admin"]);
    expect(del).not.toHaveBeenCalled();
  });

  it("reports the resolved user when a grant fails", async () => {
    const { client, get, post } = mutationClient();
    const failure = new Error("overlay failed");
    mockExactUser(get);
    post.mockResolvedValueOnce(axiosResponse(makeOkEnvelope({})));
    post.mockRejectedValueOnce(failure);

    const invite = inviteProjectMember(client, 9, {
      email: "person@example.com",
      roleCode: "project_admin",
    });

    await expect(invite).rejects.toBeInstanceOf(ProjectMemberInviteError);
    await expect(invite).rejects.toMatchObject({
      targetUserId: 7,
      cause: failure,
    });
  });
});

describe("changeProjectMemberRole", () => {
  it("promotes a member by assigning only the admin overlay", async () => {
    const { client, operations } = mutationClient();

    await changeProjectMemberRole(client, 9, {
      userId: 7,
      toRoleCode: "project_admin",
    });

    expect(operations).toEqual(["POST project_admin"]);
  });

  it("demotes an admin by removing only the admin overlay", async () => {
    const { client, operations } = mutationClient();

    await changeProjectMemberRole(client, 9, {
      userId: 7,
      toRoleCode: "project_member",
    });

    expect(operations).toEqual(["DELETE project_admin"]);
  });
});

describe("removeProjectMember", () => {
  it("removes a member by deleting the base grant", async () => {
    const { client, operations } = mutationClient();

    await removeProjectMember(client, 9, {
      userId: 7,
      roleCode: "project_member",
    });

    expect(operations).toEqual(["DELETE project_member"]);
  });

  it("removes an admin overlay before the member base", async () => {
    const { client, operations } = mutationClient();

    await removeProjectMember(client, 9, {
      userId: 7,
      roleCode: "project_admin",
    });

    expect(operations).toEqual([
      "DELETE project_admin",
      "DELETE project_member",
    ]);
  });

  it("stops removing an admin after the first failure", async () => {
    const { client, operations, del } = mutationClient();
    del.mockImplementationOnce((_url, config) => {
      operations.push(`DELETE ${roleCodeFrom(config?.data)}`);
      return Promise.reject(new Error("overlay failed"));
    });

    await expect(
      removeProjectMember(client, 9, {
        userId: 7,
        roleCode: "project_admin",
      }),
    ).rejects.toThrow("overlay failed");

    expect(operations).toEqual(["DELETE project_admin"]);
  });

  it("does not compensate when removing the member base fails", async () => {
    const { client, operations, del, post } = mutationClient();
    del.mockImplementationOnce((_url, config) => {
      operations.push(`DELETE ${roleCodeFrom(config?.data)}`);
      return Promise.resolve(axiosResponse(makeOkEnvelope({})));
    });
    del.mockImplementationOnce((_url, config) => {
      operations.push(`DELETE ${roleCodeFrom(config?.data)}`);
      return Promise.reject(new Error("base failed"));
    });

    await expect(
      removeProjectMember(client, 9, {
        userId: 7,
        roleCode: "project_admin",
      }),
    ).rejects.toThrow("base failed");

    expect(operations).toEqual([
      "DELETE project_admin",
      "DELETE project_member",
    ]);
    expect(del).toHaveBeenCalledTimes(2);
    expect(post).not.toHaveBeenCalled();
  });
});
