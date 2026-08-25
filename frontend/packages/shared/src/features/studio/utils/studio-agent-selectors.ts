import { sameIdentity } from "../../projects/utils/same-identity";
import { type PermissionSnapshot } from "../../rbac/permission-snapshot";
import { type StudioAgent } from "../schemas/studio-agent";

export type StudioTab = "all" | "created" | "editable";

type SelectStudioAgentsInput = {
  activeTab: StudioTab;
  agents: readonly StudioAgent[];
  currentUsername: string | null;
  currentEmail: string | null;
  permissions: PermissionSnapshot;
};

export function selectStudioAgents({
  activeTab,
  agents,
  currentUsername,
  currentEmail,
  permissions,
}: SelectStudioAgentsInput): readonly StudioAgent[] {
  if (activeTab === "all") {
    return agents;
  }

  // oxlint-disable-next-line typescript-eslint/prefer-nullish-coalescing -- a blank username falls back to email
  const identity = currentUsername || currentEmail;
  if (activeTab === "created") {
    return agents.filter((agent) =>
      sameIdentity(agent.creatorUsername, identity),
    );
  }

  return agents.filter(
    (agent) =>
      sameIdentity(agent.creatorUsername, identity) ||
      permissions.agentRoles.get(agent.agentId)?.has("agent_editor") === true,
  );
}
