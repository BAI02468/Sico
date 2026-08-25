import { useLingui } from "@lingui/react/macro";
import {
  Button,
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@sico/ui";
import { UserRoundPlus } from "lucide-react";
import { useState } from "react";
import type * as React from "react";

import { InviteMemberDialog } from "./invite-org-member-dialog";
import { OrgEmpty } from "./org-empty";
import { OrgMemberRow } from "./org-member-row";
import { type OrganizationMember } from "../../membership";

export type OrganizationMembersSectionProps = {
  organizationId: number;
  orgName: string;
  members: OrganizationMember[];
  canManage: boolean;
  currentUserId: number | null;
  ownerUsername?: string;
  currentUserIsOwner?: boolean;
};

function ownerMemberId(
  members: OrganizationMember[],
  ownerUsername: string,
  currentUserId: number | null,
  currentUserIsOwner: boolean,
): number | null {
  const normalizedOwner = ownerUsername.trim().toLowerCase();
  const matched = normalizedOwner
    ? members.find((member) =>
        [member.username, member.email].some(
          (identity) => identity?.trim().toLowerCase() === normalizedOwner,
        ),
      )
    : undefined;
  return matched?.id ?? (currentUserIsOwner ? currentUserId : null);
}

function memberPresentation(
  members: OrganizationMember[],
  ownerUsername: string,
  currentUserId: number | null,
  currentUserIsOwner: boolean,
): {
  ownerId: number | null;
  orderedMembers: OrganizationMember[];
} {
  const ownerId = ownerMemberId(
    members,
    ownerUsername,
    currentUserId,
    currentUserIsOwner,
  );
  return {
    ownerId,
    orderedMembers: ownerId
      ? [...members].sort(
          (a, b) => Number(b.id === ownerId) - Number(a.id === ownerId),
        )
      : members,
  };
}

function renderMemberRows({
  members,
  organizationId,
  ownerId,
  canManage,
  currentUserId,
}: {
  members: OrganizationMember[];
  organizationId: number;
  ownerId: number | null;
  canManage: boolean;
  currentUserId: number | null;
}): React.JSX.Element[] {
  return members.map((member) => (
    <OrgMemberRow
      key={member.id}
      organizationId={organizationId}
      member={member}
      isOwner={member.id === ownerId}
      isCurrentUser={member.id === currentUserId}
      canEdit={
        canManage && member.id !== ownerId && member.id !== currentUserId
      }
    />
  ));
}

export function OrganizationMembersSection({
  organizationId,
  orgName,
  members,
  canManage,
  currentUserId,
  ownerUsername = "",
  currentUserIsOwner = false,
}: OrganizationMembersSectionProps): React.JSX.Element {
  const { t } = useLingui();
  const [invite, setInvite] = useState(false);
  const { ownerId, orderedMembers } = memberPresentation(
    members,
    ownerUsername,
    currentUserId,
    currentUserIsOwner,
  );
  const headers = {
    account: t({ id: "organization.members.header.account", message: "Name" }),
    role: t({ id: "organization.members.header.role", message: "Role" }),
    joined: t({ id: "organization.members.header.joined", message: "Joined" }),
    actions: t({
      id: "organization.members.header.actions",
      message: "Action",
    }),
  };

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-3.5">
      <div className="flex h-8 items-center justify-between">
        <h2 className="text-foreground-primary flex h-8 items-center text-sm font-medium">
          {t({ id: "organization.members.title", message: "Members" })}
        </h2>
        {canManage ? (
          <Button
            variant="subtle"
            className="mr-2"
            onClick={() => setInvite(true)}
          >
            <UserRoundPlus aria-hidden="true" />
            {t({ id: "organization.members.invite", message: "Invite" })}
          </Button>
        ) : null}
      </div>
      <div className="bg-surface-basic shadow-m min-h-0 flex-1 overflow-hidden rounded-2xl">
        <div className="scrollbar h-full overflow-y-auto">
          {members.length === 0 ? (
            <OrgEmpty
              illustration="people"
              heading={t({
                id: "organization.members.empty.heading",
                message: "No members yet",
              })}
              body={t({
                id: "organization.members.empty.body",
                message: "Invite your first teammate to start collaborating.",
              })}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-surface-basic sticky top-0 z-30 h-13 hover:bg-transparent">
                  <TableHead className="h-13 px-6 text-sm">
                    {headers.account}
                  </TableHead>
                  <TableHead className="h-13 px-6 text-sm">
                    {headers.role}
                  </TableHead>
                  <TableHead className="h-13 px-6 text-sm">
                    {headers.joined}
                  </TableHead>
                  <TableHead className="h-13 px-6 text-end text-sm">
                    {headers.actions}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {renderMemberRows({
                  members: orderedMembers,
                  organizationId,
                  ownerId,
                  canManage,
                  currentUserId,
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
      {canManage ? (
        <InviteMemberDialog
          organizationId={organizationId}
          orgName={orgName}
          open={invite}
          onOpenChange={setInvite}
        />
      ) : null}
    </section>
  );
}
