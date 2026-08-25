import { describe, expect, it, vi } from "vitest";

import { type StudioAgentsPayload } from "@/features/studio/schemas/studio-agent";
import {
  fetchStudioAgents,
  type StudioAgentsScope,
} from "@/features/studio/services/single-agents";
import { makeOkEnvelope } from "@/schemas/api";
import { createTestApiClient } from "@/testing/create-test-api-client";

function makeStudioAgentsPayload(): StudioAgentsPayload {
  return {
    agents: [
      {
        agentId: "Max1.0",
        creatorUsername: "alice",
        name: "Atlas",
        role: "Researcher",
        desc: "Finds information",
        organizationId: 42,
        publishStatus: 1,
      },
    ],
    total: 1,
    hasNext: false,
  };
}

describe("fetchStudioAgents", () => {
  it("omits organizationId for the platform-scoped list", async () => {
    const get = vi.fn().mockResolvedValue({
      data: makeOkEnvelope(makeStudioAgentsPayload()),
    });
    const apiClient = createTestApiClient({ get });
    const scope: StudioAgentsScope = { type: "platform" };

    await fetchStudioAgents(apiClient, scope);

    expect(get).toHaveBeenCalledWith("/agent/single_agents", {
      params: {
        publishStatusList: "0,1",
        intent: 0,
      },
    });
  });

  it("requests the organization-scoped published and draft list", async () => {
    const get = vi.fn().mockResolvedValue({
      data: makeOkEnvelope(makeStudioAgentsPayload()),
    });
    const apiClient = createTestApiClient({ get });

    await fetchStudioAgents(apiClient, {
      type: "organization",
      organizationId: 42,
    });

    expect(get).toHaveBeenCalledWith("/agent/single_agents", {
      params: {
        organizationId: 42,
        publishStatusList: "0,1",
        intent: 0,
      },
    });
  });

  it("returns the unwrapped full list payload", async () => {
    const payload = makeStudioAgentsPayload();
    const get = vi.fn().mockResolvedValue({ data: makeOkEnvelope(payload) });
    const apiClient = createTestApiClient({ get });

    await expect(
      fetchStudioAgents(apiClient, {
        type: "organization",
        organizationId: 42,
      }),
    ).resolves.toEqual(payload);
  });

  it("rejects a nonpositive organization scope without making a request", async () => {
    const get = vi.fn();
    const apiClient = createTestApiClient({ get });

    await expect(
      fetchStudioAgents(apiClient, { type: "organization", organizationId: 0 }),
    ).rejects.toThrow();

    expect(get).not.toHaveBeenCalled();
  });

  it("rejects an agent returned from another organization", async () => {
    const payload = makeStudioAgentsPayload();
    const agent = payload.agents[0];
    if (!agent) {
      throw new Error("Expected Studio agent fixture");
    }
    payload.agents[0] = { ...agent, organizationId: 99 };
    const get = vi.fn().mockResolvedValue({ data: makeOkEnvelope(payload) });
    const apiClient = createTestApiClient({ get });

    await expect(
      fetchStudioAgents(apiClient, {
        type: "organization",
        organizationId: 42,
      }),
    ).rejects.toThrow();
  });

  it("rejects a list response with an empty agent ID", async () => {
    const payload = makeStudioAgentsPayload();
    const agent = payload.agents[0];
    if (!agent) {
      throw new Error("Expected Studio agent fixture");
    }
    payload.agents[0] = { ...agent, agentId: "" };
    const get = vi.fn().mockResolvedValue({ data: makeOkEnvelope(payload) });
    const apiClient = createTestApiClient({ get });

    await expect(
      fetchStudioAgents(apiClient, { type: "platform" }),
    ).rejects.toThrow();
  });

  it("rejects a malformed list payload", async () => {
    const get = vi.fn().mockResolvedValue({
      data: makeOkEnvelope({ agents: [], total: "one", hasNext: false }),
    });
    const apiClient = createTestApiClient({ get });

    await expect(
      fetchStudioAgents(apiClient, {
        type: "organization",
        organizationId: 42,
      }),
    ).rejects.toThrow();
  });
});
