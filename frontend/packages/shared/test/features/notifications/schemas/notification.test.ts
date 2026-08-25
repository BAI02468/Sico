import { describe, expect, it } from "vitest";

import { notificationSchema } from "@/features/notifications/schemas/notification";

// A role-changed (type 12) wire row exactly as the backend sends it — note
// `action` is a NUMBER (1 = assigned, 2 = removed). Captured from the live
// /notifications response.
const wireRoleChange = {
  id: 1624,
  senderUsername: "admin@ms.com",
  receiverUsername: "me@ms.com",
  type: 12,
  status: 2,
  content: "",
  extraInfo: {
    roleChange: {
      project: { id: 79, name: "BingCJ" },
      roleCode: "project_admin",
      action: 1,
    },
  },
  createdAt: 1784628244423,
  updatedAt: 1784628244423,
  projectId: 79,
};

describe("notificationSchema scheduled-task parsing", () => {
  it("preserves the scheduled task completion payload", () => {
    const parsed = notificationSchema.parse({
      id: 1700,
      senderUsername: "SYSTEM",
      receiverUsername: "owner@microsoft.com",
      type: 15,
      status: 2,
      content: "Daily report",
      extraInfo: {
        scheduledTaskFinished: {
          task: { id: 7, title: "Daily report" },
          status: 3,
          scheduledTaskRunId: 8,
          conversationId: 91,
          agentInstance: {
            id: 24,
            agentName: "Reporter",
            agentIconUrl: "default_space/reporter.png",
            operatorUsername: "owner@microsoft.com",
          },
          scheduledFor: 1_787_000_000_000,
        },
      },
      createdAt: 1_787_000_100_000,
      updatedAt: 1_787_000_100_000,
      projectId: 0,
    });

    expect(parsed.type).toBe(15);
    expect(parsed.extraInfo?.scheduledTaskFinished).toEqual({
      task: { id: 7, title: "Daily report" },
      status: 3,
      scheduledTaskRunId: 8,
      conversationId: 91,
      agentInstance: {
        id: 24,
        agentName: "Reporter",
        agentIconUrl: "default_space/reporter.png",
        operatorUsername: "owner@microsoft.com",
      },
      scheduledFor: 1_787_000_000_000,
    });
  });

  it("normalizes a future plan status to undefined", () => {
    const parsed = notificationSchema.parse({
      id: 1701,
      type: 15,
      status: 2,
      content: "Daily report",
      extraInfo: {
        scheduledTaskFinished: {
          task: { id: 7, title: "Daily report" },
          status: 99,
          scheduledTaskRunId: 8,
          scheduledFor: 1_787_000_000_000,
        },
      },
      createdAt: 1_787_000_100_000,
      updatedAt: 1_787_000_100_000,
    });

    expect(parsed.extraInfo?.scheduledTaskFinished?.status).toBeUndefined();
  });
});

describe("notificationSchema role-change parsing", () => {
  it("keeps roleChange intact when the wire `action` is numeric", () => {
    // Regression: `action: z.string()` rejected the numeric wire value, which
    // collapsed roleChange — and via `extraInfo.catch(undefined)`, all of
    // extraInfo — to undefined. An invite-as-admin then lost its roleCode and
    // mis-rendered as "your role ... changed to Member" over "a project".
    const parsed = notificationSchema.parse(wireRoleChange);
    expect(parsed.extraInfo?.roleChange?.roleCode).toBe("project_admin");
    expect(parsed.extraInfo?.roleChange?.project?.name).toBe("BingCJ");
  });
});
