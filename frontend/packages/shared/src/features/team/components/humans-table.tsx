import { useLingui } from "@lingui/react/macro";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@sico/ui";
import type * as React from "react";

import { HumanRow } from "./human-row";
import { type ProjectMember } from "../../membership";
import { sameIdentity } from "../../projects/utils/same-identity";

const HUMAN_HEADER_KEYS = ["name", "role", "lastActive"] as const;

export type HumansTableProps = {
  projectId: number;
  members: ProjectMember[];
  /** The project owner's identity (email). The owner row is pinned to the top,
   * shows a read-only "Owner" role, and carries no role/remove actions. */
  ownerUsername: string;
  canManage: boolean;
};

/** Humans table: one row per real project member. Admins get an editable role
 * dropdown + a remove action; non-admins see plain role text. The project owner
 * is pinned to the top and is immutable (no role change, no remove) for anyone. */
export function HumansTable({
  projectId,
  members,
  ownerUsername,
  canManage,
}: HumansTableProps): React.JSX.Element {
  const { t } = useLingui();
  const headers = {
    name: t({ id: "team.table.header.name", message: "NAME" }),
    role: t({ id: "team.table.header.role", message: "ROLE" }),
    lastActive: t({
      id: "team.table.header.lastActive",
      message: "LAST ACTIVE",
    }),
    actions: t({ id: "team.table.header.actions", message: "ACTIONS" }),
  };
  // Pin the owner to the top; the rest keep their backend order. `sameIdentity`
  // matches case-insensitively (username/email are distinct backend fields).
  const sorted = [...members].sort((a, b) => {
    const aOwner = sameIdentity(a.email, ownerUsername) ? 0 : 1;
    const bOwner = sameIdentity(b.email, ownerUsername) ? 0 : 1;
    return aOwner - bOwner;
  });
  return (
    <Table>
      <TableHeader>
        <TableRow className="h-13 hover:bg-transparent">
          {HUMAN_HEADER_KEYS.map((key) => (
            <TableHead key={key} className="h-13 px-6 text-sm">
              {headers[key]}
            </TableHead>
          ))}
          <TableHead className="h-13 px-6 text-right text-sm">
            {headers.actions}
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((member) => (
          <HumanRow
            key={member.id}
            projectId={projectId}
            member={member}
            isOwner={sameIdentity(member.email, ownerUsername)}
            canManage={canManage}
          />
        ))}
      </TableBody>
    </Table>
  );
}
