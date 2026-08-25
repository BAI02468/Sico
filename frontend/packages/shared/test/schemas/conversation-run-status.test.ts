import { describe, expect, it } from "vitest";

import {
  ConversationRunStatusSchema,
  conversationRunStatusSchema,
} from "../../src";

describe("ConversationRunStatusSchema", () => {
  it("maps backend execution status symbols to wire integers", () => {
    expect(ConversationRunStatusSchema.enum).toEqual({
      UNKNOWN: 0,
      RUNNING: 1,
      IDLE: 2,
    });
  });

  it.each([
    [0, ConversationRunStatusSchema.enum.UNKNOWN],
    [1, ConversationRunStatusSchema.enum.RUNNING],
    [2, ConversationRunStatusSchema.enum.IDLE],
  ] as const)("parses wire value %i to its named member", (wire, member) => {
    expect(conversationRunStatusSchema.parse(wire)).toBe(member);
  });
});

describe("conversationRunStatusSchema", () => {
  it("normalizes an absent value to undefined", () => {
    expect(conversationRunStatusSchema.parse(undefined)).toBeUndefined();
  });

  it("normalizes null to undefined", () => {
    expect(conversationRunStatusSchema.parse(null)).toBeUndefined();
  });

  it("normalizes a future integer to undefined", () => {
    expect(conversationRunStatusSchema.parse(3)).toBeUndefined();
  });
});
