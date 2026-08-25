import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  toast,
} from "@sico/ui";
import { Ellipsis, Trash2 } from "lucide-react";
import { useState } from "react";
import type * as React from "react";

import { ConfirmDialog } from "../../../components/confirm-dialog";
import { type OrganizationMember } from "../../membership";
import { GatedMenuItem } from "../../projects/components/gated-menu-item";
import { useRemoveOrganizationMember } from "../hooks/use-remove-organization-member";

const SELF_REMOVE_DENIED = msg({
  id: "organization.members.selfRemoveDenied",
  message: "You can't remove yourself from the organization.",
});
const REMOVE_DENIED = msg({
  id: "organization.members.removeDenied",
  message: "Available to Owners and Admins only.",
});

export function OrgMemberActions({
  organizationId,
  member,
  canRemove,
  isCurrentUser,
}: {
  organizationId: number;
  member: OrganizationMember;
  canRemove: boolean;
  isCurrentUser: boolean;
}): React.JSX.Element {
  const { t } = useLingui();
  const [confirmRemove, setConfirmRemove] = useState(false);
  const removeMember = useRemoveOrganizationMember(organizationId);
  const normalizedAlias = member.alias?.trim();
  const display =
    normalizedAlias === undefined || normalizedAlias === ""
      ? member.email
      : normalizedAlias;
  const deniedTooltip = t(isCurrentUser ? SELF_REMOVE_DENIED : REMOVE_DENIED);
  const onRemove = (): void => {
    removeMember.mutate(
      { userId: member.id, roleCodes: member.roleCodes },
      {
        onSuccess: () => {
          toast.success(
            t({
              id: "organization.members.removed",
              message: "Member removed.",
            }),
            { invert: true },
          );
          setConfirmRemove(false);
        },
        onError: () =>
          toast.error(
            t({
              id: "organization.members.removeFailed",
              message: "Couldn't remove this member.",
            }),
          ),
      },
    );
  };
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="subtle"
              size="icon-xs"
              aria-label={t({
                id: "organization.members.actions",
                message: "Member actions",
              })}
            />
          }
        >
          <Ellipsis aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="!w-32">
          <GatedMenuItem
            allowed={canRemove}
            deniedTooltip={deniedTooltip}
            variant="destructive"
            onSelect={() => setConfirmRemove(true)}
          >
            <Trash2 className="size-4" aria-hidden="true" />
            {t({ id: "common.action.delete", message: "Delete" })}
          </GatedMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ConfirmDialog
        open={confirmRemove}
        onOpenChange={setConfirmRemove}
        title={t({
          id: "organization.members.deleteTitle",
          message: "Delete member",
        })}
        body={t({
          id: "organization.members.deleteBody",
          message: `Delete "${display}" from this organization. This can't be undone.`,
        })}
        onConfirm={onRemove}
        pending={removeMember.isPending}
        pendingLabel={t({
          id: "organization.members.deleting",
          message: "Deleting…",
        })}
        confirmLabel={t({ id: "common.action.delete", message: "Delete" })}
      />
    </>
  );
}
