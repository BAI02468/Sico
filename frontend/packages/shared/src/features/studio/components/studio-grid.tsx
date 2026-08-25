import { useAtomValue } from "jotai";
import { type ReactElement } from "react";

import { StudioCard } from "./studio-card";
import { StudioEmpty } from "./studio-empty";
import { userAtom } from "../../../atoms/auth-atom";
import { CardGrid } from "../../../components/card-grid";
import { useBoundOrganizationSuspenseQuery } from "../../../hooks/use-bound-organization";
import { usePermissionSnapshotSuspenseQuery } from "../../rbac/hooks/use-permission-snapshot";
import { useStudioAgentsSuspenseQuery } from "../hooks/use-studio-agents-query";
import { type StudioAgentsScope } from "../services/single-agents";
import {
  selectStudioAgents,
  type StudioTab,
} from "../utils/studio-agent-selectors";

export type StudioGridProps = {
  activeTab: StudioTab;
};

export function StudioGrid({ activeTab }: StudioGridProps): ReactElement {
  const { data: organization } = useBoundOrganizationSuspenseQuery();
  const { data: permissions } = usePermissionSnapshotSuspenseQuery();
  let scope: StudioAgentsScope;
  if (permissions.platformRoles.has("platform_admin")) {
    scope = { type: "platform" };
  } else {
    if (!organization) {
      throw new Error("A bound organization is required");
    }
    scope = { type: "organization", organizationId: organization.id };
  }
  const { data } = useStudioAgentsSuspenseQuery(scope);
  const user = useAtomValue(userAtom);
  const agents = selectStudioAgents({
    activeTab,
    agents: data.agents,
    currentUsername: user?.username ?? null,
    currentEmail: user?.email ?? null,
    permissions,
  });

  if (agents.length === 0) {
    return <StudioEmpty />;
  }

  return (
    <CardGrid>
      {agents.map((agent) => (
        <StudioCard key={agent.agentId} agent={agent} />
      ))}
    </CardGrid>
  );
}
