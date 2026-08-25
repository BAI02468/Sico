import { describe, expect, it } from "vitest";

import {
  type AgentPermissionIdentity,
  deriveAgentPermission,
} from "@/features/rbac/hooks/use-agent-permission";
import { normalizePermissionSnapshot } from "@/features/rbac/permission-snapshot";
import { type UserRole } from "@/features/rbac/schemas/user-role";

const agentId = "a3c0bc10-6d1c-4b33-a866-f3e1b2b91cde";
const otherAgentId = "c1d2e3f4-6d1c-4b33-a866-f3e1b2b91cde";

function grant(
  roleCode: string,
  scopeType: string,
  scopeId: UserRole["scopeId"],
): UserRole {
  return { roleCode, scopeType, scopeId, userId: 1 };
}

function user(
  overrides: Partial<AgentPermissionIdentity> = {},
): AgentPermissionIdentity {
  return { email: "member@example.com", ...overrides };
}

function derive(
  grants: readonly UserRole[],
  target: { agentId: string | null; creatorUsername: string | null },
  identity: AgentPermissionIdentity | null,
): ReturnType<typeof deriveAgentPermission> {
  return deriveAgentPermission(
    normalizePermissionSnapshot(grants),
    target,
    identity,
  );
}

const readOnlyCapabilities = {
  isOwner: false,
  isEditor: false,
  canEdit: false,
  canPublish: false,
  canManageEditors: false,
  canDelete: false,
};

describe("agent permissions", () => {
  it("lets Create mode edit before an agent ID exists", () => {
    expect(derive([], { agentId: null, creatorUsername: null }, null)).toEqual({
      ...readOnlyCapabilities,
      canEdit: true,
    });
  });

  it("grants every existing-agent capability to a case-insensitive username owner", () => {
    expect(
      derive(
        [],
        { agentId, creatorUsername: "Owner@Example.com" },
        user({ username: "owner@example.com", email: "different@example.com" }),
      ),
    ).toEqual({
      isOwner: true,
      isEditor: false,
      canEdit: true,
      canPublish: true,
      canManageEditors: true,
      canDelete: true,
    });
  });

  it("uses email as the owner identity when username is absent", () => {
    expect(
      derive(
        [],
        { agentId, creatorUsername: "OWNER@example.com" },
        user({ username: undefined, email: "owner@example.com" }),
      ),
    ).toMatchObject({
      isOwner: true,
      canEdit: true,
      canManageEditors: true,
    });
  });

  it("grants editing and publishing to an exact agent editor", () => {
    expect(
      derive(
        [grant("agent_editor", "agent", agentId)],
        { agentId, creatorUsername: "owner@example.com" },
        user(),
      ),
    ).toEqual({
      isOwner: false,
      isEditor: true,
      canEdit: true,
      canPublish: true,
      canManageEditors: false,
      canDelete: false,
    });
  });

  it("leaves a non-owner without an agent grant read-only", () => {
    expect(
      derive([], { agentId, creatorUsername: "owner@example.com" }, user()),
    ).toEqual(readOnlyCapabilities);
  });

  it("ignores an agent editor grant for another agent UUID", () => {
    expect(
      derive(
        [grant("agent_editor", "agent", otherAgentId)],
        { agentId, creatorUsername: "owner@example.com" },
        user(),
      ),
    ).toEqual(readOnlyCapabilities);
  });

  it("ignores organization grants for an existing agent", () => {
    expect(
      derive(
        [grant("developer", "org", 9)],
        { agentId, creatorUsername: "owner@example.com" },
        user(),
      ),
    ).toEqual(readOnlyCapabilities);
  });

  it("does not infer ownership when creator metadata is missing", () => {
    expect(derive([], { agentId, creatorUsername: null }, user())).toEqual(
      readOnlyCapabilities,
    );
  });

  it("fails closed when authenticated identity is missing", () => {
    expect(
      derive(
        [grant("agent_editor", "agent", agentId)],
        { agentId, creatorUsername: "owner@example.com" },
        null,
      ),
    ).toEqual(readOnlyCapabilities);
  });

  it("keeps a legacy opaque agent ID read-only", () => {
    expect(
      derive(
        [grant("agent_editor", "agent", agentId)],
        { agentId: "Max1.0", creatorUsername: "owner@example.com" },
        user(),
      ),
    ).toEqual(readOnlyCapabilities);
  });
});
