import { describe, expect, it } from "vitest";

import {
  conversationListSchema,
  conversationSummarySchema,
  createConversationRequestSchema,
} from "../../../../src/features/chat/schemas/conversation";

describe("conversationSummarySchema", () => {
  it("parses a full conversation and flattens agentInstanceId", () => {
    const parsed = conversationSummarySchema.parse({
      id: 55,
      title: "First chat",
      createdAt: 1_700_000_000,
      agentInstanceInfo: { instanceId: 7 },
    });
    expect(parsed).toEqual({
      id: 55,
      title: "First chat",
      createdAt: 1_700_000_000,
      agentInstanceId: 7,
    });
  });

  it("defaults a missing title to an empty string", () => {
    const parsed = conversationSummarySchema.parse({ id: 1 });
    expect(parsed.title).toBe("");
  });

  it("leaves agentInstanceId undefined when agentInstanceInfo is null", () => {
    const parsed = conversationSummarySchema.parse({
      id: 1,
      agentInstanceInfo: null,
    });
    expect(parsed.agentInstanceId).toBeUndefined();
  });

  it("ignores unmodeled fields rather than rejecting", () => {
    const parsed = conversationSummarySchema.parse({
      id: 1,
      status: 3,
      metaData: { anything: true },
      creatorUsername: "me",
    });
    expect(parsed).not.toHaveProperty("status");
  });

  it("preserves a parsed conversationStatus", () => {
    const parsed = conversationSummarySchema.parse({
      id: 1,
      conversationStatus: 1,
    });
    expect(parsed.conversationStatus).toBe(1);
  });

  it("preserves valid scheduled task provenance atomically", () => {
    const parsed = conversationSummarySchema.parse({
      id: 1,
      extraInfo: { scheduledTaskId: 7, scheduledTaskRunId: 11 },
    });
    expect(parsed.scheduledTaskProvenance).toEqual({
      scheduledTaskId: 7,
      scheduledTaskRunId: 11,
    });
  });

  it.each([
    ["absent", undefined],
    ["null", null],
    ["empty", {}],
    ["task-only", { scheduledTaskId: 7 }],
    ["run-only", { scheduledTaskRunId: 11 }],
    ["zero", { scheduledTaskId: 0, scheduledTaskRunId: 11 }],
    ["negative", { scheduledTaskId: 7, scheduledTaskRunId: -11 }],
    ["non-integer", { scheduledTaskId: 7.5, scheduledTaskRunId: 11 }],
    [
      "unsafe integer",
      { scheduledTaskId: Number.MAX_SAFE_INTEGER + 1, scheduledTaskRunId: 11 },
    ],
    ["non-number", { scheduledTaskId: "7", scheduledTaskRunId: 11 }],
    ["malformed", "not-an-object"],
  ])("normalizes %s scheduled task metadata to absent", (_, extraInfo) => {
    const parsed = conversationSummarySchema.parse({ id: 1, extraInfo });
    expect(parsed).not.toHaveProperty("scheduledTaskProvenance");
  });

  it("rejects a conversation with no id", () => {
    expect(() => conversationSummarySchema.parse({ title: "x" })).toThrow();
  });
});

describe("conversationListSchema", () => {
  it("parses the page array + hasMore flag", () => {
    const parsed = conversationListSchema.parse({
      conversations: [{ id: 1 }, { id: 2 }],
      hasMore: true,
    });
    expect(parsed.conversations).toHaveLength(2);
    expect(parsed.hasMore).toBe(true);
  });
});

describe("createConversationRequestSchema", () => {
  it("requires agentInstanceId and allows an optional title", () => {
    expect(
      createConversationRequestSchema.parse({ agentInstanceId: 7 }),
    ).toEqual({ agentInstanceId: 7 });
    expect(
      createConversationRequestSchema.parse({
        agentInstanceId: 7,
        title: "Hi",
      }),
    ).toEqual({ agentInstanceId: 7, title: "Hi" });
  });

  it("rejects a request with no agentInstanceId", () => {
    expect(() =>
      createConversationRequestSchema.parse({ title: "Hi" }),
    ).toThrow();
  });
});
