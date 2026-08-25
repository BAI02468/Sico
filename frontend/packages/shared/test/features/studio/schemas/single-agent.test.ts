import { describe, expect, it } from "vitest";

import { singleAgentPayloadSchema } from "@/features/studio/schemas/single-agent";

describe("singleAgentPayloadSchema", () => {
  it("accepts and preserves an opaque Studio agent ID", () => {
    expect(
      singleAgentPayloadSchema.parse({
        agent: { agentId: "Max1.0" },
      }),
    ).toEqual({ agentId: "Max1.0" });
  });

  it("rejects an empty Studio agent ID", () => {
    expect(
      singleAgentPayloadSchema.safeParse({
        agent: { agentId: "" },
      }).success,
    ).toBe(false);
  });

  it("preserves the draft creator for permission checks", () => {
    const result = singleAgentPayloadSchema.parse({
      agent: {
        agentId: "a3c0bc10-6d1c-4b33-a866-f3e1b2b91cde",
        name: "Visual Bot",
        role: "tester",
        creatorUsername: "owner@example.com",
      },
    });

    expect(result.creatorUsername).toBe("owner@example.com");
  });
});
