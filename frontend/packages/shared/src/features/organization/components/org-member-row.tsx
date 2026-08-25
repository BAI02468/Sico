import { useLingui } from "@lingui/react/macro";
import { TableCell, TableRow, toast } from "@sico/ui";
import type * as React from "react";

import { OrgMemberActions } from "./org-member-actions";
import { OrgRoleCell } from "./org-role-cell";
import { UserAvatar } from "../../../components/user-avatar";
import { normalizeEpochMilliseconds } from "../../../utils/normalize-epoch-milliseconds";
import { type OrganizationMember } from "../../membership";
import { useChangeOrganizationRole } from "../hooks/use-change-organization-role";
import { useOrganizationRoleLabels } from "../hooks/use-organization-role-labels";

export function OrgMemberRow({
  organizationId,
  member,
  canEdit,
  isOwner = false,
  isCurrentUser = false,
}: {
  organizationId: number;
  member: OrganizationMember;
  canEdit: boolean;
  isOwner?: boolean;
  isCurrentUser?: boolean;
}): React.JSX.Element {
  const { t, i18n } = useLingui();
  const labels = useOrganizationRoleLabels();
  const changeRole = useChangeOrganizationRole(organizationId);
  const display = member.alias ?? member.email;
  let roleContent: React.ReactNode = (
    <span className="text-foreground-secondary text-sm">
      {labels[member.role]}
    </span>
  );
  if (canEdit) {
    roleContent = (
      <OrgRoleCell
        role={member.role}
        disabled={changeRole.isPending}
        onChangeRole={(toRole) =>
          changeRole.mutate(
            { userId: member.id, roleCodes: member.roleCodes, toRole },
            {
              onError: () =>
                toast.error(
                  t({
                    id: "organization.members.roleChangeFailed",
                    message: "Couldn't change this member's role.",
                  }),
                ),
            },
          )
        }
      />
    );
  }
  if (isOwner) {
    roleContent = (
      <span className="text-foreground-secondary text-sm">
        {t({ id: "organization.role.owner", message: "Owner" })}
      </span>
    );
  }
  return (
    <TableRow className="h-14">
      <TableCell className="text-foreground-primary px-6">
        <span className="flex min-w-0 items-center gap-2">
          <UserAvatar
            user={{ email: member.email, iconUri: member.iconUri }}
            decorative
            size="xs"
          />
          <span className="flex min-w-0 flex-col">
            <span className="truncate">{display}</span>
            <span className="text-foreground-tertiary truncate text-xs">
              {member.email}
            </span>
          </span>
        </span>
      </TableCell>
      <TableCell className="px-6">{roleContent}</TableCell>
      <TableCell className="text-foreground-secondary px-6 text-sm">
        {member.createdAt
          ? i18n.date(normalizeEpochMilliseconds(member.createdAt))
          : "—"}
      </TableCell>
      <TableCell className="px-6 text-end">
        {isOwner ? null : (
          <OrgMemberActions
            organizationId={organizationId}
            member={member}
            canRemove={canEdit}
            isCurrentUser={isCurrentUser}
          />
        )}
      </TableCell>
    </TableRow>
  );
}
