import { useNavigate } from "@tanstack/react-router";
import { type JSX, useCallback, useState } from "react";

import { StudioDeleteAgentDialog } from "./studio-delete-agent-dialog";
import { StudioManageEditorsDialog } from "./studio-manage-editors-dialog";
import { StudioPublishDialog } from "./studio-publish-dialog";
import { StudioSetupEditor } from "./studio-setup-editor";
import { useAgentPermission } from "../../rbac";
import {
  SETUP_SKILLS_PAGE_SIZE,
  useRolesSuspenseQuery,
  useSkillsSuspenseInfiniteQuery,
} from "../../skill";
import { useUpdateSingleAgentMutation } from "../hooks/use-single-agent-mutations";
import { useSingleAgentSuspenseQuery } from "../hooks/use-single-agent-query";
import { useStudioPublishHandoff } from "../hooks/use-studio-publish-handoff";

export function AgentSetupBody({ agentId }: { agentId: string }): JSX.Element {
  const agent = useSingleAgentSuspenseQuery(agentId);
  const roles = useRolesSuspenseQuery();
  const navigate = useNavigate();
  const [manageEditorsOpen, setManageEditorsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  useSkillsSuspenseInfiniteQuery({ agentId, pageSize: SETUP_SKILLS_PAGE_SIZE });
  const { mutateAsync: updateAgent } = useUpdateSingleAgentMutation();
  const permission = useAgentPermission({
    agentId,
    creatorUsername: agent.data.creatorUsername ?? null,
  });
  const handoff = useStudioPublishHandoff({
    agentId,
    canPublish: permission.canPublish,
    isPermissionError: permission.isError,
    isPermissionLoading: permission.isLoading,
  });
  const saveBasic = useCallback(
    async (next: { name: string; role: string }) => {
      await updateAgent({
        agentId,
        name: next.name,
        role: next.role,
        desc: agent.data.desc ?? "",
      });
    },
    [agent.data.desc, agentId, updateAgent],
  );

  return (
    <>
      <StudioSetupEditor
        agentId={agentId}
        name={agent.data.name ?? ""}
        role={agent.data.role ?? ""}
        creatorUsername={agent.data.creatorUsername}
        roleOptions={roles.data}
        editable={permission.canEdit}
        canPublish={permission.canPublish}
        canManageEditors={permission.canManageEditors}
        canDelete={permission.canDelete}
        initialStagedDrafts={handoff.drafts}
        onBasicSave={saveBasic}
        onInitialDraftsConsumed={handoff.onDraftsConsumed}
        onPublish={() => handoff.onOpenChange(true)}
        onManageEditors={() => setManageEditorsOpen(true)}
        onDelete={() => setDeleteOpen(true)}
      />
      {manageEditorsOpen ? (
        <StudioManageEditorsDialog
          agentId={agentId}
          creatorUsername={agent.data.creatorUsername ?? ""}
          open={manageEditorsOpen}
          onOpenChange={setManageEditorsOpen}
        />
      ) : null}
      {deleteOpen ? (
        <StudioDeleteAgentDialog
          agentId={agentId}
          agentName={agent.data.name ?? ""}
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          onDeleted={() => {
            void navigate({ to: "/studio/all", ignoreBlocker: true });
          }}
        />
      ) : null}
      <StudioPublishDialog
        agentId={agentId}
        open={handoff.open}
        onOpenChange={handoff.onOpenChange}
      />
    </>
  );
}
