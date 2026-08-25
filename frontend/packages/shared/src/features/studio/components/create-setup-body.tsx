import { useNavigate } from "@tanstack/react-router";
import { useSetAtom } from "jotai";
import { type JSX, useCallback } from "react";

import { StudioSetupEditor } from "./studio-setup-editor";
import { useBoundOrganizationSuspenseQuery } from "../../../hooks/use-bound-organization";
import { useRolesSuspenseQuery } from "../../skill";
import type { StagedSkillDraft } from "../../skill/hooks/use-staged-skill-drafts";
import { studioSetupHandoffAtom } from "../atoms/studio-setup-handoff-atom";
import { useCreateSingleAgentMutation } from "../hooks/use-single-agent-mutations";

function useRequiredOrganizationId(): number {
  const { data: organization } = useBoundOrganizationSuspenseQuery();
  if (organization === null) {
    throw new Error("Studio requires a bound organization");
  }
  return organization.id;
}

export function CreateSetupBody(): JSX.Element {
  const roles = useRolesSuspenseQuery();
  const organizationId = useRequiredOrganizationId();
  const navigate = useNavigate();
  const setHandoffs = useSetAtom(studioSetupHandoffAtom);
  const { mutateAsync: createAgent } = useCreateSingleAgentMutation();

  const saveBasic = useCallback(
    async ({ name, role }: { name: string; role: string }) => {
      const { agentId } = await createAgent({ name, role, organizationId });
      return agentId;
    },
    [createAgent, organizationId],
  );
  const transitionToEdit = useCallback(
    async (
      agentId: string,
      drafts: StagedSkillDraft[],
      openPublishAfterTransition: boolean,
    ) => {
      setHandoffs((current) => {
        const next = new Map(current);
        next.set(agentId, { drafts, openPublishAfterTransition });
        return next;
      });
      await navigate({
        to: "/studio/$agentId/setup",
        params: { agentId },
        replace: true,
      });
    },
    [navigate, setHandoffs],
  );

  const initial = { name: "", role: "" };
  return (
    <StudioSetupEditor
      name={initial.name}
      role={initial.role}
      roleOptions={roles.data}
      editable
      onBasicSave={saveBasic}
      onCreated={transitionToEdit}
    />
  );
}
