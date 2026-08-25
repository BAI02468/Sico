import { useLingui } from "@lingui/react/macro";
import { toast } from "@sico/ui";
import { useState } from "react";

import { useChangeRoleMutation } from "./use-change-role-mutation";
import { useRemoveMemberMutation } from "./use-remove-member-mutation";
import { apiErrorMessage } from "../../../utils/api-error-message";
import { type ProjectMember } from "../../membership";
import { type ProjectRoleCode } from "../../rbac/schemas/user-role";

export type MemberRowActions = {
  /** Remove-confirm dialog visibility (opened from the Remove menu item). */
  confirmRemove: boolean;
  setConfirmRemove: (open: boolean) => void;
  /** Changes the member's role; no-ops when the role is unchanged. */
  onChangeRole: (next: ProjectRoleCode) => void;
  /** Fires the remove mutation; toasts + closes the dialog on success. */
  onRemove: () => void;
  removePending: boolean;
};

function useMemberRowCopy(): {
  roleUpdated: string;
  roleUpdateFailed: string;
  memberRemoved: string;
  memberRemoveFailed: string;
} {
  const { t } = useLingui();
  return {
    roleUpdated: t({
      id: "team.humanRow.changeRole.success",
      message: "Role updated.",
    }),
    roleUpdateFailed: t({
      id: "team.humanRow.changeRole.error",
      message: "We couldn't change the role.",
    }),
    memberRemoved: t({
      id: "team.humanRow.removeMember.success",
      message: "Member removed.",
    }),
    memberRemoveFailed: t({
      id: "team.humanRow.removeMember.error",
      message: "We couldn't remove the member.",
    }),
  };
}

// The role-change + remove flows for one Humans-table row: owns the confirm
// dialog state and both mutations, so `HumanRow` stays presentational and the
// table file holds no per-row hook logic.
export function useMemberRowActions(
  projectId: number,
  member: ProjectMember,
): MemberRowActions {
  const copy = useMemberRowCopy();
  const changeRole = useChangeRoleMutation(projectId);
  const removeMember = useRemoveMemberMutation(projectId);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const onChangeRole = (next: ProjectRoleCode): void => {
    if (next === member.roleCode) {
      return;
    }
    changeRole.mutate(
      { userId: member.id, toRoleCode: next },
      {
        onSuccess: () => toast.success(copy.roleUpdated, { invert: true }),
        onError: (error) =>
          toast.error(apiErrorMessage(error, copy.roleUpdateFailed)),
      },
    );
  };

  const onRemove = (): void => {
    removeMember.mutate(
      { userId: member.id, roleCode: member.roleCode },
      {
        onSuccess: () => {
          toast.success(copy.memberRemoved, { invert: true });
          setConfirmRemove(false);
        },
        onError: (error) =>
          toast.error(apiErrorMessage(error, copy.memberRemoveFailed)),
      },
    );
  };

  return {
    confirmRemove,
    setConfirmRemove,
    onChangeRole,
    onRemove,
    removePending: removeMember.isPending,
  };
}
