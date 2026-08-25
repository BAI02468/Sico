import { describe, expect, it } from "vitest";

import {
  SingleAgentPublishStatusSchema,
  type StudioAgent,
  studioAgentsPayloadSchema,
} from "@/features/studio/schemas/studio-agent";

function makeStudioAgent(): StudioAgent {
  return {
    agentId: "Max2.0",
    creatorUsername: "alice",
    name: "Atlas",
    role: "Researcher",
    desc: "Finds information",
    organizationId: 42,
    publishStatus: 1,
  };
}

describe("SingleAgentPublishStatusSchema", () => {
  it("accepts the backend publish statuses", () => {
    expect(SingleAgentPublishStatusSchema.parse(0)).toBe(0);
    expect(SingleAgentPublishStatusSchema.parse(1)).toBe(1);
    expect(SingleAgentPublishStatusSchema.parse(2)).toBe(2);
  });

  it("rejects an unknown backend publish status", () => {
    expect(() => SingleAgentPublishStatusSchema.parse(3)).toThrow();
  });
});

describe("studioAgentsPayloadSchema", () => {
  it("parses the complete Studio agent list payload", () => {
    expect(
      studioAgentsPayloadSchema.parse({
        agents: [makeStudioAgent()],
        total: 1,
        hasNext: false,
      }),
    ).toEqual({
      agents: [makeStudioAgent()],
      total: 1,
      hasNext: false,
    });
  });

  it("rejects a list agent with an empty ID", () => {
    expect(() =>
      studioAgentsPayloadSchema.parse({
        agents: [{ ...makeStudioAgent(), agentId: "" }],
        total: 1,
        hasNext: false,
      }),
    ).toThrow();
  });

  it("rejects a list agent missing a required field", () => {
    const agentWithoutName = {
      agentId: "a3c0bc10-6d1c-4b33-a866-f3e1b2b91cde",
      creatorUsername: "alice",
      role: "Researcher",
      desc: "Finds information",
      organizationId: 42,
      publishStatus: 1,
    };

    expect(() =>
      studioAgentsPayloadSchema.parse({
        agents: [agentWithoutName],
        total: 1,
        hasNext: false,
      }),
    ).toThrow();
  });
});
