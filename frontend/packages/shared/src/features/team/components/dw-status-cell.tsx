import { useLingui } from "@lingui/react/macro";
import type * as React from "react";

import { DwStatusIndicator } from "../../digital-worker/components/dw-status-indicator";
import { type Agent } from "../../digital-worker/schemas/agent";
import { isActiveStatus } from "../utils/is-active-status";

export type DwStatusCellProps = {
  status: Agent["status"];
};

/** The DW status column: a live worker (ACTIVE/NEW) reads as an "Active"
 * indicator; anything else collapses to a muted "Inactive". Uses the same subtle
 * dot+label as the Digital Workers list (`DwStatusIndicator`) so the two align. */
export function DwStatusCell({ status }: DwStatusCellProps): React.JSX.Element {
  const { t } = useLingui();
  return isActiveStatus(status) ? (
    <DwStatusIndicator
      tone="success"
      label={t({ id: "team.table.status.active", message: "Active" })}
    />
  ) : (
    <DwStatusIndicator
      tone="muted"
      label={t({ id: "team.table.status.inactive", message: "Inactive" })}
    />
  );
}
