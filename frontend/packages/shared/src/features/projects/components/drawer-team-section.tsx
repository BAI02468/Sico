import { useLingui } from "@lingui/react/macro";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@sico/ui";
import { UserRoundPlus } from "lucide-react";
import type * as React from "react";

import { TeamPreview } from "./team-preview";
import { SECTION_TITLE_CLASS } from "../constants";
import { type ProjectDetail } from "../schemas/project";

// The member-section invite callbacks — the two invite items raise back to the
// parent, which owns the dialogs. (The roster preview is a plain navigation
// link, not a callback.)
export type MemberActions = {
  onInviteHuman: () => void;
  onInviteDw: () => void;
};

export type DrawerTeamSectionProps = {
  project: ProjectDetail;
  /** project.manage — gates the Invite→Operator item + the menu. */
  canManageProject: boolean;
  /** dw.manage.own — gates the Invite→Digital worker item. */
  canInviteDw: boolean;
  actions: MemberActions;
};

/**
 * Team section for the project drawer. Reads the roster from `project`
 * (`projectMembers`, inline) and gates the Invite dropdown on capabilities the
 * workspace resolves once and passes down — no per-section fetch, so it appears
 * with the page-level skeleton.
 */
export function DrawerTeamSection({
  project,
  canManageProject,
  canInviteDw,
  actions,
}: DrawerTeamSectionProps): React.JSX.Element {
  const { t } = useLingui();
  return (
    <div className="flex flex-col gap-3">
      <p className={SECTION_TITLE_CLASS}>
        {t({ id: "projects.drawerTeam.title", message: "Team" })}
      </p>
      <div className="flex items-center justify-between gap-4">
        <TeamPreview project={project} />
        {canManageProject || canInviteDw ? (
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="subtle" />}>
              <UserRoundPlus aria-hidden="true" />
              {t({ id: "projects.drawerTeam.invite", message: "Invite" })}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-44">
              {canManageProject ? (
                <DropdownMenuItem onClick={actions.onInviteHuman}>
                  {t({
                    id: "projects.drawerTeam.inviteHuman",
                    message: "Human Operator",
                  })}
                </DropdownMenuItem>
              ) : null}
              {canInviteDw ? (
                <DropdownMenuItem onClick={actions.onInviteDw}>
                  {t({
                    id: "projects.drawerTeam.inviteWorker",
                    message: "Digital Worker",
                  })}
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
    </div>
  );
}
