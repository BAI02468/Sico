import { useLingui } from "@lingui/react/macro";
import { TableCell, TableRow } from "@sico/ui";
import type * as React from "react";

import { HumanActionsMenu } from "./human-actions-menu";
import { HumanRoleCell } from "./human-role-cell";
import { ConfirmDialog } from "../../../components/confirm-dialog";
import { UserAvatar } from "../../../components/user-avatar";
import { type ProjectMember } from "../../membership";
import { formatLastActive } from "../../projects/utils/format-last-active";
import { useMemberRowActions } from "../hooks/use-member-row-actions";

export type HumanRowProps = {
  projectId: number;
  member: ProjectMember;
  /** The project owner's row: read-only "Owner" role, no actions, for anyone. */
  isOwner: boolean;
  canManage: boolean;
};

/** One Humans-table row. An admin gets an editable role dropdown + a gated
 * Remove; a non-admin sees plain role text and a greyed Remove. The owner row is
 * immutable — no role change, no remove. Row state lives in
 * {@link useMemberRowActions}, so this stays presentational. */
export function HumanRow({
  projectId,
  member,
  isOwner,
  canManage,
}: HumanRowProps): React.JSX.Element {
  const { t } = useLingui();
  const {
    confirmRemove,
    setConfirmRemove,
    onChangeRole,
    onRemove,
    removePending,
  } = useMemberRowActions(projectId, member);
  const display = member.alias ?? member.email;
  // The member's own last-active time; blank when the backend omits it.
  const lastActive =
    member.updatedAt === undefined ? "" : formatLastActive(member.updatedAt);

  return (
    <TableRow className="h-14">
      <TableCell className="text-foreground-primary px-6">
        <span className="flex min-w-0 items-center gap-2">
          <UserAvatar user={member} decorative size="xs" />
          <span className="flex min-w-0 flex-col">
            <span className="truncate">{display}</span>
            {member.alias ? (
              <span className="text-foreground-tertiary truncate text-xs">
                {member.email}
              </span>
            ) : null}
          </span>
        </span>
      </TableCell>
      <TableCell className="px-6">
        <HumanRoleCell
          isOwner={isOwner}
          canManage={canManage}
          member={member}
          onChangeRole={onChangeRole}
        />
      </TableCell>
      <TableCell className="text-foreground-secondary px-6 text-sm">
        {lastActive}
      </TableCell>
      <TableCell className="px-6 text-right">
        {/* The owner can't be removed or role-changed by anyone → no actions. */}
        {isOwner ? null : (
          <>
            <HumanActionsMenu
              canRemove={canManage}
              onRemove={() => setConfirmRemove(true)}
            />
            {canManage ? (
              <ConfirmDialog
                open={confirmRemove}
                onOpenChange={setConfirmRemove}
                title={t({
                  id: "team.humanRow.removeMember.title",
                  message: "Remove member",
                })}
                body={t({
                  id: "team.humanRow.removeMember.body",
                  message: `Remove "${display}" from this project. This can't be undone.`,
                })}
                onConfirm={onRemove}
                pending={removePending}
                confirmLabel={t({
                  id: "team.humanRow.removeMember.confirm",
                  message: "Remove",
                })}
                pendingLabel={t({
                  id: "team.humanRow.removeMember.pending",
                  message: "Removing…",
                })}
              />
            ) : null}
          </>
        )}
      </TableCell>
    </TableRow>
  );
}
