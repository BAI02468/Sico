import { describe, expect, it } from "vitest";

import { type PermissionSnapshot } from "@/features/rbac/permission-snapshot";
import {
  SingleAgentPublishStatusSchema,
  type StudioAgent,
} from "@/features/studio/schemas/studio-agent";
import { selectStudioAgents } from "@/features/studio/utils/studio-agent-selectors";

function makeAgent(partial: Partial<StudioAgent> = {}): StudioAgent {
  return {
    agentId: "00000000-0000-4000-8000-000000000001",
    name: "Researcher",
    role: "Researcher",
    desc: "Researches",
    creatorUsername: "creator@sico.dev",
    organizationId: 7,
    publishStatus: SingleAgentPublishStatusSchema.enum.DRAFT,
    ...partial,
  };
}

function makePermissions(agentIds: readonly string[] = []): PermissionSnapshot {
  return {
    platformRoles: new Set(),
    organizationRoles: new Map(),
    projectRoles: new Map(),
    agentRoles: new Map(
      agentIds.map((agentId) => [agentId, new Set(["agent_editor"])]),
    ),
  };
}

function selected(input: Parameters<typeof selectStudioAgents>[0]): string[] {
  return selectStudioAgents(input).map((agent) => agent.agentId);
}

describe("selectStudioAgents", () => {
  it("keeps every agent in original order on the All tab", () => {
    const agents = [
      makeAgent({ agentId: "00000000-0000-4000-8000-000000000001" }),
      makeAgent({ agentId: "00000000-0000-4000-8000-000000000002" }),
    ];

    expect(
      selected({
        activeTab: "all",
        agents,
        currentUsername: "me",
        currentEmail: "me@sico.dev",
        permissions: makePermissions(),
      }),
    ).toEqual(agents.map((agent) => agent.agentId));
  });

  it("matches Created agents against the username", () => {
    const created = makeAgent({
      agentId: "00000000-0000-4000-8000-000000000001",
      creatorUsername: "me",
    });
    const other = makeAgent({
      agentId: "00000000-0000-4000-8000-000000000002",
      creatorUsername: "other",
    });

    expect(
      selected({
        activeTab: "created",
        agents: [created, other],
        currentUsername: "me",
        currentEmail: "me@sico.dev",
        permissions: makePermissions(),
      }),
    ).toEqual([created.agentId]);
  });

  it("uses the email when the current user has no username", () => {
    const created = makeAgent({ creatorUsername: "me@sico.dev" });

    expect(
      selected({
        activeTab: "created",
        agents: [created],
        currentUsername: null,
        currentEmail: "me@sico.dev",
        permissions: makePermissions(),
      }),
    ).toEqual([created.agentId]);
  });

  it("matches Created agents case-insensitively", () => {
    const created = makeAgent({ creatorUsername: "ME@SICO.DEV" });

    expect(
      selected({
        activeTab: "created",
        agents: [created],
        currentUsername: "me@sico.dev",
        currentEmail: "me@sico.dev",
        permissions: makePermissions(),
      }),
    ).toEqual([created.agentId]);
  });

  it("uses email ownership for Editable when username is blank", () => {
    const owned = makeAgent({ creatorUsername: "me@sico.dev" });

    expect(
      selected({
        activeTab: "editable",
        agents: [owned],
        currentUsername: "",
        currentEmail: "me@sico.dev",
        permissions: makePermissions(),
      }),
    ).toEqual([owned.agentId]);
  });

  it("keeps editable agents in source order and removes owned-editor duplicates", () => {
    const owned = makeAgent({
      agentId: "00000000-0000-4000-8000-000000000001",
      creatorUsername: "me",
    });
    const editable = makeAgent({
      agentId: "00000000-0000-4000-8000-000000000002",
      creatorUsername: "other",
    });
    const other = makeAgent({
      agentId: "00000000-0000-4000-8000-000000000003",
      creatorUsername: "other",
    });

    expect(
      selected({
        activeTab: "editable",
        agents: [owned, editable, other],
        currentUsername: "me",
        currentEmail: "me@sico.dev",
        permissions: makePermissions([owned.agentId, editable.agentId]),
      }),
    ).toEqual([owned.agentId, editable.agentId]);
  });

  it("does not accept a malformed agent grant key", () => {
    const agent = makeAgent();
    const permissions = makePermissions();
    const agentRoles = new Map(permissions.agentRoles);
    agentRoles.set("not-a-uuid", new Set(["agent_editor"]));

    expect(
      selected({
        activeTab: "editable",
        agents: [agent],
        currentUsername: "other",
        currentEmail: "other@sico.dev",
        permissions: { ...permissions, agentRoles },
      }),
    ).toEqual([]);
  });
});
