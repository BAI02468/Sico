import axios, { type AxiosInstance } from "axios";
import { describe, expect, it, type MockInstance, vi } from "vitest";

import {
  assignDevice,
  assignProjectDevices,
  fetchDevices,
  unassignProjectDevices,
} from "@/features/devices";
import { makeOkEnvelope } from "@/schemas/api";

function wireDevice(overrides: Record<string, unknown> = {}): unknown {
  return {
    sandbox_id: "sandbox-1",
    display_name: "Pixel 7",
    type: "emulator",
    status: "available",
    allocatable: true,
    organization_id: 9,
    project_id: 7,
    instance_id: "",
    instance_name: "",
    vnc_url: "",
    ...overrides,
  };
}

function getClient(response: unknown): AxiosInstance {
  const client = axios.create();
  vi.spyOn(client, "get").mockResolvedValue({ data: response });
  return client;
}

function postClient(response: unknown): {
  client: AxiosInstance;
  post: MockInstance<AxiosInstance["post"]>;
} {
  const client = axios.create();
  const post = vi.spyOn(client, "post").mockResolvedValue({ data: response });
  return { client, post };
}

describe("fetchDevices", () => {
  it("requests project-scoped devices", async () => {
    const client = getClient(makeOkEnvelope({}));

    await fetchDevices(client, { projectId: 7 });

    expect(client.get).toHaveBeenCalledWith("/sandbox/list", {
      params: { projectId: 7 },
    });
  });

  it("returns devices assigned to the requested project", async () => {
    const client = getClient(
      makeOkEnvelope({ emulator: [wireDevice({ project_id: 7 })] }),
    );

    await expect(fetchDevices(client, { projectId: 7 })).resolves.toMatchObject(
      [{ sandboxId: "sandbox-1", projectId: 7 }],
    );
  });

  it.each([0, 8])(
    "rejects a project-scoped device assigned to project %i",
    async (projectId) => {
      const client = getClient(
        makeOkEnvelope({ emulator: [wireDevice({ project_id: projectId })] }),
      );

      await expect(fetchDevices(client, { projectId: 7 })).rejects.toThrow(
        "Sandbox outside requested project scope",
      );
    },
  );

  it("requests organization-scoped devices", async () => {
    const client = getClient(makeOkEnvelope({}));

    await fetchDevices(client, { organizationId: 9 });

    expect(client.get).toHaveBeenCalledWith("/sandbox/list", {
      params: { organizationId: 9 },
    });
  });

  it("rejects malformed allocation identifiers", async () => {
    const client = getClient(
      makeOkEnvelope({
        emulator: [wireDevice({ project_id: "bad" })],
      }),
    );

    await expect(fetchDevices(client, { organizationId: 9 })).rejects.toThrow();
  });

  it("rejects a device outside the organization scope", async () => {
    const client = getClient(
      makeOkEnvelope({
        emulator: [wireDevice({ organization_id: 10 })],
      }),
    );

    await expect(fetchDevices(client, { organizationId: 9 })).rejects.toThrow(
      "Sandbox outside organization scope",
    );
  });

  it("rejects a non-OK list response", async () => {
    const client = getClient({ code: 101008, msg: "denied" });

    await expect(fetchDevices(client, { projectId: 7 })).rejects.toThrow(
      /rejected \(code 101008\)/,
    );
  });
});

describe("assignDevice", () => {
  it("sends the wire assignment body", async () => {
    const { client, post } = postClient(makeOkEnvelope({}));

    await assignDevice(client, { instanceId: "instance-1", sandboxId: "sb-1" });

    expect(post).toHaveBeenCalledWith("/sandbox/assign", {
      instance_id: "instance-1",
      sandbox_id: "sb-1",
    });
  });

  it("rejects a non-OK assignment response", async () => {
    const { client } = postClient({ code: 101008, msg: "denied" });

    await expect(
      assignDevice(client, { instanceId: "instance-1", sandboxId: "sb-1" }),
    ).rejects.toThrow(/rejected \(code 101008\)/);
  });
});

describe("project device requests", () => {
  it("deduplicates assigned sandbox IDs in first-seen order", async () => {
    const { client, post } = postClient(makeOkEnvelope({}));

    await assignProjectDevices(client, 7, ["sb-2", "sb-1", "sb-2"]);

    expect(post).toHaveBeenCalledWith("/sandbox/project/assign", {
      project_id: 7,
      sandbox_ids: ["sb-2", "sb-1"],
    });
  });

  it("deduplicates unassigned sandbox IDs in first-seen order", async () => {
    const { client, post } = postClient(makeOkEnvelope({}));

    await unassignProjectDevices(client, 7, ["sb-1", "sb-1"]);

    expect(post).toHaveBeenCalledWith("/sandbox/project/unassign", {
      project_id: 7,
      sandbox_ids: ["sb-1"],
    });
  });

  it("does not request an empty project update", async () => {
    const { client, post } = postClient(makeOkEnvelope({}));

    await assignProjectDevices(client, 7, []);

    expect(post).not.toHaveBeenCalled();
  });

  it("rejects a non-OK project update", async () => {
    const { client } = postClient({ code: 112013, msg: "already assigned" });

    await expect(assignProjectDevices(client, 7, ["sb-1"])).rejects.toThrow(
      /rejected \(code 112013\)/,
    );
  });
});
