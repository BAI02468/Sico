import { describe, expect, it } from "vitest";

import { ConversationRunStatusSchema } from "@/schemas/conversation-run-status";
import { conversationStatusRefetchInterval } from "@/utils/conversation-status-refetch-interval";

describe("conversationStatusRefetchInterval", () => {
  it("returns 2 seconds when any conversation is running", () => {
    expect(
      conversationStatusRefetchInterval([
        { conversationStatus: ConversationRunStatusSchema.enum.IDLE },
        { conversationStatus: ConversationRunStatusSchema.enum.RUNNING },
      ]),
    ).toBe(2_000);
  });

  it("returns 30 seconds for idle conversations", () => {
    expect(
      conversationStatusRefetchInterval([
        { conversationStatus: ConversationRunStatusSchema.enum.IDLE },
      ]),
    ).toBe(30_000);
  });

  it("returns 30 seconds for unknown conversations", () => {
    expect(
      conversationStatusRefetchInterval([
        { conversationStatus: ConversationRunStatusSchema.enum.UNKNOWN },
      ]),
    ).toBe(30_000);
  });

  it("returns 30 seconds for missing conversation statuses", () => {
    expect(conversationStatusRefetchInterval([{}])).toBe(30_000);
  });

  it("returns 30 seconds for an empty collection", () => {
    expect(conversationStatusRefetchInterval([])).toBe(30_000);
  });
});
