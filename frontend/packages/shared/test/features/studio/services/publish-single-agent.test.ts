import { describe, expect, it, vi } from "vitest";

import { publishSingleAgent } from "@/features/studio/services/publish-single-agent";
import { makeOkEnvelope } from "@/schemas/api";
import { createTestApiClient } from "@/testing/create-test-api-client";

describe("publishSingleAgent", () => {
  it("maps My organization to the published backend status", async () => {
    const post = vi.fn().mockResolvedValue({ data: makeOkEnvelope({}) });
    const apiClient = createTestApiClient({ post });

    await publishSingleAgent(apiClient, {
      agentId: "Max1.0",
      access: "organization",
    });

    expect(post).toHaveBeenCalledWith("/agent/single_agent/publish", {
      agentId: "Max1.0",
      publishStatus: 1,
    });
  });

  it("maps Only me to the draft backend status", async () => {
    const post = vi.fn().mockResolvedValue({ data: makeOkEnvelope({}) });
    const apiClient = createTestApiClient({ post });

    await publishSingleAgent(apiClient, {
      agentId: "Max1.0",
      access: "only_me",
    });

    expect(post).toHaveBeenCalledWith("/agent/single_agent/publish", {
      agentId: "Max1.0",
      publishStatus: 0,
    });
  });

  it("rejects an empty agent ID before posting", async () => {
    const post = vi.fn();
    const apiClient = createTestApiClient({ post });

    await expect(
      publishSingleAgent(apiClient, {
        agentId: "",
        access: "organization",
      }),
    ).rejects.toThrow();

    expect(post).not.toHaveBeenCalled();
  });

  it("rejects a successful envelope with an invalid publish body", async () => {
    const post = vi.fn();
    const apiClient = createTestApiClient({ post });

    await expect(
      publishSingleAgent(apiClient, {
        agentId: "Max1.0",
        access: "outside_organization",
      }),
    ).rejects.toThrow();

    expect(post).not.toHaveBeenCalled();
  });
});
