import { useLingui } from "@lingui/react/macro";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Tabs,
  TabsList,
  TabsTrigger,
} from "@sico/ui";
import { Link } from "@tanstack/react-router";
import { UserRoundPlus } from "lucide-react";
import { useState } from "react";
import type * as React from "react";

import { InviteDwDialog } from "./invite-dw-dialog";
import { InviteMemberDialog } from "./invite-member-dialog";
import { MEMBERS_TABS, type MembersTab } from "./members-page";
import { MembersTabBody } from "./members-tab-body";
import { ProjectPageHeader } from "../../projects/components/project-page-header";
import { useProjectDetailQuery } from "../../projects/hooks/use-project-query";
import { useProjectPermission } from "../../rbac/hooks/use-project-permission";

export type MembersPageContentProps = {
  projectId: number;
  activeTab: MembersTab;
  onBack: () => void;
};

/** Members-route body (under the page-level suspense/error boundary): the header,
 * the path-driven tabs, the permission-gated Invite menu, and the active tab's
 * table. Owns the two invite-dialog open states. */
export function MembersPageContent({
  projectId,
  activeTab,
  onBack,
}: MembersPageContentProps): React.JSX.Element {
  const { t } = useLingui();
  const project = useProjectDetailQuery(projectId).data;
  const { canManageProject, canInviteDw, isLoading } =
    useProjectPermission(projectId);
  const settled = !isLoading;
  const [inviteHuman, setInviteHuman] = useState(false);
  const [inviteDw, setInviteDw] = useState(false);

  return (
    <>
      <ProjectPageHeader
        label={project.name}
        current={t({ id: "team.page.title", message: "Team" })}
        onBack={onBack}
      />
      <div className="flex min-h-0 flex-1 flex-col gap-6 px-5 pt-11 pb-10 lg:px-16">
        <h1
          tabIndex={-1}
          className="text-foreground-primary text-3xl leading-tight font-medium outline-none"
        >
          {t({ id: "team.page.title", message: "Team" })}
        </h1>
        <div className="flex min-h-0 flex-1 flex-col gap-6">
          <div className="flex items-center justify-between gap-4">
            {renderMembersTabs(projectId, activeTab, {
              humans: t({
                id: "team.page.tabs.humans",
                message: "Human Operators",
              }),
              workers: t({
                id: "team.page.tabs.workers",
                message: "Digital Workers",
              }),
            })}
            {settled && (canManageProject || canInviteDw)
              ? renderInviteMenu({
                  canManageProject,
                  canInviteDw,
                  inviteLabel: t({
                    id: "team.page.invite",
                    message: "Invite",
                  }),
                  inviteHumanLabel: t({
                    id: "team.page.inviteHuman",
                    message: "Human Operator",
                  }),
                  inviteWorkerLabel: t({
                    id: "team.page.inviteWorker",
                    message: "Digital Worker",
                  }),
                  onInviteHuman: () => setInviteHuman(true),
                  onInviteDw: () => setInviteDw(true),
                })
              : null}
          </div>
          <div className="bg-surface-basic shadow-m min-h-0 flex-1 overflow-hidden rounded-2xl">
            <div className="scrollbar h-full overflow-y-auto">
              <MembersTabBody projectId={projectId} activeTab={activeTab} />
            </div>
          </div>
        </div>
      </div>
      <InviteMemberDialog
        projectId={projectId}
        projectName={project.name}
        open={inviteHuman}
        onOpenChange={setInviteHuman}
      />
      <InviteDwDialog
        projectId={projectId}
        open={inviteDw}
        onOpenChange={setInviteDw}
      />
    </>
  );
}

// The Humans / Digital workers pill tabs — each trigger is a router <Link> so
// switching tabs is a real route change. The active tab derives from the URL
// (`activeTab`), not Tabs local state.
function renderMembersTabs(
  projectId: number,
  activeTab: MembersTab,
  labels: { humans: string; workers: string },
): React.JSX.Element {
  return (
    <Tabs value={activeTab}>
      <TabsList variant="pill">
        {MEMBERS_TABS.map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            nativeButton={false}
            render={
              <Link to={tab.to} params={{ projectId: String(projectId) }} />
            }
          >
            {tab.value === "humans" ? labels.humans : labels.workers}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

function renderInviteMenu({
  canManageProject,
  canInviteDw,
  inviteLabel,
  inviteHumanLabel,
  inviteWorkerLabel,
  onInviteHuman,
  onInviteDw,
}: {
  canManageProject: boolean;
  canInviteDw: boolean;
  inviteLabel: string;
  inviteHumanLabel: string;
  inviteWorkerLabel: string;
  onInviteHuman: () => void;
  onInviteDw: () => void;
}): React.JSX.Element {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="secondary" size="default" aria-label={inviteLabel} />
        }
      >
        <UserRoundPlus />
        {inviteLabel}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        {canManageProject ? (
          <DropdownMenuItem onClick={onInviteHuman}>
            {inviteHumanLabel}
          </DropdownMenuItem>
        ) : null}
        {canInviteDw ? (
          <DropdownMenuItem onClick={onInviteDw}>
            {inviteWorkerLabel}
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
