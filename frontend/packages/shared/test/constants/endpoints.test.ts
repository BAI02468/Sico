import { describe, expect, it } from "vitest";

import {
  CHAT_STREAM_ENDPOINTS,
  ORGANIZATION_ENDPOINTS,
  PROJECT_ENDPOINTS,
  SANDBOX_ENDPOINTS,
  SCHEDULED_TASK_ENDPOINTS,
} from "@/constants/endpoints";

describe("resource endpoint registries", () => {
  it("registers Organization list and detail routes", () => {
    expect(ORGANIZATION_ENDPOINTS.list).toBe(
      "/organization/user_organizations",
    );
    expect(ORGANIZATION_ENDPOINTS.root).toBe("/organization");
  });

  it("registers the Organization Project list route", () => {
    expect(PROJECT_ENDPOINTS.list).toBe("/project/list");
  });

  it("registers Project sandbox allocation routes", () => {
    expect(SANDBOX_ENDPOINTS.projectAssign).toBe("/sandbox/project/assign");
    expect(SANDBOX_ENDPOINTS.projectUnassign).toBe("/sandbox/project/unassign");
  });

  it("registers scheduled task detail and list routes", () => {
    expect(SCHEDULED_TASK_ENDPOINTS.root).toBe("/scheduled-tasks");
    expect(SCHEDULED_TASK_ENDPOINTS.list).toBe("/scheduled-tasks/list");
  });
});

describe("CHAT_STREAM_ENDPOINTS", () => {
  // The SSE URLs embed the /api/sico prefix (they bypass the axios baseURL),
  // unlike the axios-relative paths in the rest of the registry.
  it("carries the /api/sico prefix on the chat + reconnect streams", () => {
    expect(CHAT_STREAM_ENDPOINTS.chat).toBe("/api/sico/conversation/chat");
    expect(CHAT_STREAM_ENDPOINTS.reconnect).toBe(
      "/api/sico/conversation/chat/reconnect",
    );
  });
});
