import { useLingui } from "@lingui/react/macro";
import { type JSX } from "react";

import { ConfirmDialog } from "../../../components/confirm-dialog/confirm-dialog";
import type { ScheduledTask } from "../schemas/scheduled-task";

type ScheduledTasksDialogConfirmationsProps = {
  discardOpen: boolean;
  deletePending: boolean;
  deleteTask?: ScheduledTask;
  onCancelDiscard: () => void;
  onConfirmDiscard: () => void;
  onConfirmDelete: () => void;
  onDeleteOpenChange: (nextOpen: boolean) => void;
};

export function ScheduledTasksDialogConfirmations({
  discardOpen,
  deletePending,
  deleteTask,
  onCancelDiscard,
  onConfirmDiscard,
  onConfirmDelete,
  onDeleteOpenChange,
}: ScheduledTasksDialogConfirmationsProps): JSX.Element {
  const { t } = useLingui();
  return (
    <>
      <ConfirmDialog
        open={discardOpen}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            onCancelDiscard();
          }
        }}
        title={t({
          id: "scheduledTask.dialog.discard.title",
          message: "Discard changes?",
        })}
        body={t({
          id: "scheduledTask.dialog.discard.body",
          message: "Your unsaved changes will be lost.",
        })}
        confirmLabel={t({
          id: "scheduledTask.dialog.discard.confirm",
          message: "Discard changes",
        })}
        onConfirm={onConfirmDiscard}
      />
      <ConfirmDialog
        open={deleteTask !== undefined}
        onOpenChange={onDeleteOpenChange}
        title={t({
          id: "scheduledTask.dialog.delete.title",
          message: "Delete scheduled task?",
        })}
        body={t({
          id: "scheduledTask.dialog.delete.body",
          message: "This action can't be undone.",
        })}
        confirmLabel={t({
          id: "scheduledTask.dialog.delete.confirm",
          message: "Delete scheduled task",
        })}
        pendingLabel={t({
          id: "scheduledTask.dialog.delete.pending",
          message: "Deleting…",
        })}
        pending={deletePending}
        disableCancel={deletePending}
        onConfirm={onConfirmDelete}
      />
    </>
  );
}
