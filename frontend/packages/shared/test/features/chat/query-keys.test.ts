import { describe, expect, it } from "vitest";

import { chatKeys } from "@/features/chat/query-keys";

describe("chatKeys", () => {
  it("uses the literal conversation lists prefix tuple", () => {
    expect(chatKeys.conversationLists()).toEqual(["conversations", "list"]);
  });

  it("uses the literal conversation list tuple", () => {
    expect(chatKeys.conversationList(7)).toEqual([
      "conversations",
      "list",
      { agentInstanceId: 7 },
    ]);
  });

  it("uses the literal conversation details prefix tuple", () => {
    expect(chatKeys.conversationDetails()).toEqual(["conversations", "detail"]);
  });

  it("uses the literal conversation detail tuple", () => {
    expect(chatKeys.conversationDetail(11)).toEqual([
      "conversations",
      "detail",
      11,
    ]);
  });

  it("uses the literal histories prefix tuple", () => {
    expect(chatKeys.histories()).toEqual(["history", "messages"]);
  });

  it("uses the literal history tuple", () => {
    expect(chatKeys.history(7, 11)).toEqual([
      "history",
      "messages",
      { agentInstanceId: 7, conversationId: 11 },
    ]);
  });

  it("retains an own undefined conversationId property in the history tuple", () => {
    const key = chatKeys.history(7, undefined);

    expect(key).toEqual([
      "history",
      "messages",
      { agentInstanceId: 7, conversationId: undefined },
    ]);
    expect(Object.hasOwn(key[2], "conversationId")).toBe(true);
  });

  it("uses the literal recommendation tasks tuple", () => {
    expect(chatKeys.recommendationTasks(7)).toEqual([
      "recommendation-tasks",
      { agentInstanceId: 7 },
    ]);
  });
});
