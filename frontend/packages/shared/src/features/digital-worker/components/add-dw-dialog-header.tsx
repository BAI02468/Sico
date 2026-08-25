import { Trans } from "@lingui/react/macro";
import { DialogDescription, DialogHeader, DialogTitle } from "@sico/ui";
import type * as React from "react";

/** Header for the Add DW dialogs: title + the human-operator note. Shared by
 * `AddDwDialog` and `InviteDwDialog`. */
export function AddDwDialogHeader(): React.JSX.Element {
  return (
    <DialogHeader className="gap-1">
      <DialogTitle>
        <Trans id="digitalWorker.addDialog.title">Add Digital Worker</Trans>
      </DialogTitle>
      <DialogDescription className="text-sm">
        <Trans id="digitalWorker.addDialog.operatorNote">
          You&apos;ll be the Human Operator for this Digital Worker.
        </Trans>
      </DialogDescription>
    </DialogHeader>
  );
}
