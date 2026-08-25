import { useLingui } from "@lingui/react/macro";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@sico/ui";
import { useMemo } from "react";
import type * as React from "react";

import { DwTableRow } from "./dw-table-row";
import { renderMembersSkeletonCells } from "./members-table-skeleton";
import { type Agent } from "../../digital-worker/schemas/agent";
import { sameIdentity } from "../../projects/utils/same-identity";
import { isActiveStatus } from "../utils/is-active-status";

const WORKER_HEADER_KEYS = [
  "name",
  "operator",
  "status",
  "lastActive",
] as const;

// How many "loading more" skeleton rows to append while draining later pages.
const LOADING_MORE_ROW_COUNT = 3;

// Active workers first, inactive last; within each group the backend order is
// preserved (stable sort). Kept in the table layer — `selectDedupedAgents` is
// shared with the sidebar/dashboard and must keep the raw paginated order.
function sortByActive(agents: Agent[]): Agent[] {
  return [...agents].sort(
    (a, b) =>
      Number(isActiveStatus(b.status)) - Number(isActiveStatus(a.status)),
  );
}

export type DigitalWorkersTableProps = {
  agents: Agent[];
  /** dw.manage — may reassign / dismiss ANY worker (admin). */
  canManageDw: boolean;
  /** dw.manage.own — may dismiss a worker they invited (member). */
  canInviteDw: boolean;
  /** Current user's email, for the per-row `.own` dismiss check. */
  userEmail: string | null;
  onReassign: (agentId: number) => void;
  /** While draining later pages, append placeholder rows at the tail instead of
   * swapping the whole table for a skeleton — so the rendered rows (and any open
   * Reassign dialog) stay mounted. */
  isFetchingNextPage?: boolean;
};

/** Digital Workers table: one row per real project DW. Admins get reassign +
 * dismiss on every row; a member gets dismiss only on the workers THEY invited
 * (`employerUsername === userEmail`) and never reassign. */
export function DigitalWorkersTable({
  agents,
  canManageDw,
  canInviteDw,
  userEmail,
  onReassign,
  isFetchingNextPage = false,
}: DigitalWorkersTableProps): React.JSX.Element {
  const { t } = useLingui();
  const headers = {
    name: t({ id: "team.table.header.name", message: "NAME" }),
    operator: t({ id: "team.table.header.operator", message: "OPERATOR" }),
    status: t({ id: "team.table.header.status", message: "STATUS" }),
    lastActive: t({
      id: "team.table.header.lastActive",
      message: "LAST ACTIVE",
    }),
    actions: t({ id: "team.table.header.actions", message: "ACTIONS" }),
  };
  // Memoised so an unrelated parent re-render (e.g. the page-drain skeleton
  // toggling) doesn't re-sort + re-copy the roster; keyed on `agents` identity,
  // which react-query keeps stable until the list actually changes.
  const sorted = useMemo(() => sortByActive(agents), [agents]);
  return (
    <Table>
      <TableHeader>
        <TableRow className="h-13 hover:bg-transparent">
          {WORKER_HEADER_KEYS.map((key) => (
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
        {sorted.map((agent) => (
          <DwTableRow
            key={agent.id}
            agent={agent}
            canReassign={canManageDw}
            canDismiss={
              canManageDw ||
              (canInviteDw && sameIdentity(agent.employerUsername, userEmail))
            }
            // Dismiss doesn't apply to an inactive worker — drop it, leaving
            // Reassign as the only action.
            showDismiss={isActiveStatus(agent.status)}
            onReassign={() => onReassign(agent.id)}
          />
        ))}
        {isFetchingNextPage
          ? Array.from({ length: LOADING_MORE_ROW_COUNT }, (_, idx) =>
              renderLoadingMoreRow(idx),
            )
          : null}
      </TableBody>
    </Table>
  );
}

// Tail placeholder row shown while draining later pages — reuses the members
// skeleton cells so it reads as part of the same table.
function renderLoadingMoreRow(key: number): React.JSX.Element {
  return (
    <TableRow
      key={`loading-more-${key}`}
      aria-hidden="true"
      className="h-14 hover:bg-transparent"
      data-testid="dw-table-loading-more-row"
    >
      {renderMembersSkeletonCells(WORKER_HEADER_KEYS.length)}
    </TableRow>
  );
}
