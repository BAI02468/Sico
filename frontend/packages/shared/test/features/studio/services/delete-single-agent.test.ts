import { describe, expect, it, vi } from "vitest";

import { deleteSingleAgent } from "@/features/studio/services/single-agent-mutations";
import { makeOkEnvelope } from "@/schemas/api";
import { createTestApiClient } from "@/testing/create-test-api-client";

const agentId = "a3c0bc10-6d1c-4b33-a866-f3e1b2b91cde";

describe("deleteSingleAgent", () => {
  it("DELETEs the agent ID as a query parameter", async () => {
    const del = vi.fn().mockResolvedValue({ data: makeOkEnvelope({}) });
    const apiClient = createTestApiClient({ delete: del });

    await deleteSingleAgent(apiClient, agentId);

    expect(del).toHaveBeenCalledWith("/agent/single_agent", {
      params: { agentId },
    });
  });

  it("rejects a non-OK response envelope", async () => {
    const del = vi
      .fn()
      .mockResolvedValue({ data: { code: 101008, msg: "denied" } });
    const apiClient = createTestApiClient({ delete: del });

    await expect(deleteSingleAgent(apiClient, agentId)).rejects.toThrow(
      /deleteSingleAgent: rejected \(code 101008\)/,
    );
  });
});
