import { describe, expect, it, vi } from "vitest";

import { createSingleAgent } from "@/features/studio/services/single-agent-mutations";
import { makeOkEnvelope } from "@/schemas/api";
import { createTestApiClient } from "@/testing/create-test-api-client";

describe("createSingleAgent", () => {
  it("accepts an opaque ID while sending the organization ID", async () => {
    const post = vi.fn().mockResolvedValue({
      data: makeOkEnvelope({ agentId: "Max1.0" }),
    });
    const apiClient = createTestApiClient({ post });

    await expect(
      createSingleAgent(apiClient, {
        name: "Atlas",
        role: "Researcher",
        desc: "Finds information",
        organizationId: 42,
      }),
    ).resolves.toEqual({ agentId: "Max1.0" });

    expect(post).toHaveBeenCalledWith("/agent/single_agent", {
      name: "Atlas",
      role: "Researcher",
      desc: "Finds information",
      organizationId: 42,
    });
  });

  it("rejects an empty agent ID response", async () => {
    const post = vi.fn().mockResolvedValue({
      data: makeOkEnvelope({ agentId: "" }),
    });
    const apiClient = createTestApiClient({ post });

    await expect(
      createSingleAgent(apiClient, {
        name: "Atlas",
        role: "Researcher",
        organizationId: 42,
      }),
    ).rejects.toThrow();
  });
});
