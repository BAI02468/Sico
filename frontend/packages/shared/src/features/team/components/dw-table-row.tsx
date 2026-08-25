import { TableCell, TableRow } from "@sico/ui";
import type * as React from "react";

import { DwActionsCell } from "./dw-actions-cell";
import { DwStatusCell } from "./dw-status-cell";
import { DwAvatar } from "../../../components/dw-avatar/dw-avatar";
import { type Agent } from "../../digital-worker/schemas/agent";
import { formatLastActive } from "../../projects/utils/format-last-active";

export type DwTableRowProps = {
  agent: Agent;
  canReassign: boolean;
  canDismiss: boolean;
  showDismiss: boolean;
  onReassign: () => void;
};

/** One DW table row. The per-row hook logic lives in `DwActionsCell`. */
export function DwTableRow({
  agent,
  canReassign,
  canDismiss,
  showDismiss,
  onReassign,
}: DwTableRowProps): React.JSX.Element {
  // The worker's own last-active time; blank when the backend omits it.
  const lastActive =
    agent.updatedAt === undefined ? "" : formatLastActive(agent.updatedAt);
  return (
    <TableRow className="h-14">
      <TableCell className="text-foreground-primary px-6">
        <span className="flex min-w-0 items-center gap-2">
          <DwAvatar agent={{ iconUri: agent.iconUri }} decorative size="xs" />
          <span className="truncate">{agent.name}</span>
        </span>
      </TableCell>
      <TableCell className="text-foreground-primary max-w-64 truncate px-6 text-sm">
        {agent.operatorUsername ?? "—"}
      </TableCell>
      <TableCell className="px-6 whitespace-nowrap">
        <DwStatusCell status={agent.status} />
      </TableCell>
      <TableCell className="text-foreground-secondary px-6 text-sm whitespace-nowrap">
        {lastActive}
      </TableCell>
      <TableCell className="px-6 text-right">
        <DwActionsCell
          agent={agent}
          canReassign={canReassign}
          canDismiss={canDismiss}
          showDismiss={showDismiss}
          onReassign={onReassign}
        />
      </TableCell>
    </TableRow>
  );
}
