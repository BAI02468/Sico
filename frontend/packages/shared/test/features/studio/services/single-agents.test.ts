import { describe, expect, it, vi } from "vitest";

import {
  fetchAgentInfos,
  fetchSingleAgent,
  PLATFORM_AGENT_INFOS_INTENT,
} from "@/features/studio/services/single-agents";
import { makeOkEnvelope } from "@/schemas/api";
import { createTestApiClient } from "@/testing/create-test-api-client";

describe("fetchAgentInfos", () => {
  it("returns the unwrapped agent card array", async () => {
    const get = vi.fn().mockResolvedValue({
      data: makeOkEnvelope({
        agentInfos: [
          {
            agentId: "1",
            name: "Atlas",
            role: "Researcher",
            creatorUsername: "alice",
          },
        ],
      }),
    });
    const apiClient = createTestApiClient({ get });
    const agents = await fetchAgentInfos(apiClient);
    expect(agents).toEqual([
      {
        agentId: "1",
        name: "Atlas",
        role: "Researcher",
        creatorUsername: "alice",
      },
    ]);
    expect(get).toHaveBeenCalledWith("/agent/single_agent_infos", undefined);
  });

  it("requests agent infos for the provided intent", async () => {
    const get = vi.fn().mockResolvedValue({
      data: makeOkEnvelope({ agentInfos: [] }),
    });
    const apiClient = createTestApiClient({ get });

    await fetchAgentInfos(apiClient, PLATFORM_AGENT_INFOS_INTENT);

    expect(get).toHaveBeenCalledWith("/agent/single_agent_infos", {
      params: { intent: 1 },
    });
  });
});

describe("fetchSingleAgent", () => {
  it("accepts and preserves an opaque agent ID", async () => {
    const get = vi.fn().mockResolvedValue({
      data: makeOkEnvelope({ agent: { agentId: "Max1.0" } }),
    });
    const apiClient = createTestApiClient({ get });

    await expect(fetchSingleAgent(apiClient, "Max1.0")).resolves.toEqual({
      agentId: "Max1.0",
    });
    expect(get).toHaveBeenCalledWith("/agent/single_agent", {
      params: { agentId: "Max1.0" },
    });
  });

  it("rejects an empty agent ID response", async () => {
    const get = vi.fn().mockResolvedValue({
      data: makeOkEnvelope({ agent: { agentId: "" } }),
    });
    const apiClient = createTestApiClient({ get });

    await expect(fetchSingleAgent(apiClient, "Max1.0")).rejects.toThrow();
  });
});
