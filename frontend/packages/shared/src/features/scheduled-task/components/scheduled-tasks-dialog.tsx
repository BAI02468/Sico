import { useLingui } from "@lingui/react/macro";
import { Dialog, DialogContent, toast } from "@sico/ui";
import { type JSX, useCallback, useRef, useState } from "react";

import { ScheduledTasksDialogConfirmations } from "./scheduled-tasks-dialog-confirmations";
import { ScheduledTasksDialogHeader } from "./scheduled-tasks-dialog-header";
import { ScheduledTasksDialogView } from "./scheduled-tasks-dialog-view";
import { useControlledDialogVisibility } from "../hooks/use-controlled-dialog-visibility";
import { useFormGeneration } from "../hooks/use-form-generation";
import { useDeleteScheduledTaskMutation } from "../hooks/use-scheduled-task-mutations";
import type { ScheduledTask } from "../schemas/scheduled-task";

type ManagementView =
  | { kind: "list" }
  | { kind: "create" }
  | { kind: "edit"; task: ScheduledTask };
type PendingDestination = "list" | "close";
type DeleteCallbacks = { onError: () => void; onSuccess: () => void };
type DialogState = {
  deletePending: boolean;
  formGeneration: number;
  deleteTask?: ScheduledTask;
  cancelDiscard: () => void;
  resolveDestination: () => void;
  resolveFormSuccess: (generation: number) => void;
  deleteScheduledTask: () => void;
  handleDeleteOpenChange: (nextOpen: boolean) => void;
  hasTasks: boolean;
  requestDestination: (destination: PendingDestination) => void;
  setDeleteTask: (task: ScheduledTask | undefined) => void;
  setHasTasks: (hasTasks: boolean) => void;
  setIsDirty: (isDirty: boolean) => void;
  startCreate: () => void;
  startEdit: (task: ScheduledTask) => void;
  view: ManagementView;
  isVisible: boolean;
  pendingDestination?: PendingDestination;
};

export type ScheduledTasksDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type DeletionState = Pick<
  DialogState,
  | "deletePending"
  | "deleteScheduledTask"
  | "deleteTask"
  | "handleDeleteOpenChange"
  | "setDeleteTask"
>;

function useScheduledTaskDeletion(
  deleteCallbacks: DeleteCallbacks,
  onDeleted: () => void,
): DeletionState {
  const [deleteTask, setDeleteTask] = useState<ScheduledTask>();
  const deleteMutation = useDeleteScheduledTaskMutation();
  const deleteScheduledTask = (): void => {
    if (!deleteTask) {
      return;
    }
    deleteMutation.mutate(deleteTask.id, {
      onSuccess: () => {
        deleteCallbacks.onSuccess();
        setDeleteTask(undefined);
        onDeleted();
      },
      onError: () => {
        deleteCallbacks.onError();
        setDeleteTask(undefined);
      },
    });
  };
  const handleDeleteOpenChange = (nextOpen: boolean): void => {
    if (!nextOpen && !deleteMutation.isPending) {
      setDeleteTask(undefined);
    }
  };
  return {
    deletePending: deleteMutation.isPending,
    deleteScheduledTask,
    deleteTask,
    handleDeleteOpenChange,
    setDeleteTask,
  };
}

function useScheduledTasksDialogState(
  open: boolean,
  onOpenChange: (open: boolean) => void,
  deleteCallbacks: DeleteCallbacks,
): DialogState {
  const [view, setView] = useState<ManagementView>({ kind: "list" });
  const [hasTasks, setHasTasks] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [pendingDestination, setPendingDestination] =
    useState<PendingDestination>();
  const formGeneration = useFormGeneration();
  const pendingDestinationRef = useRef<PendingDestination | undefined>(
    undefined,
  );
  const deletion = useScheduledTaskDeletion(deleteCallbacks, () => {
    setIsDirty(false);
    setView({ kind: "list" });
  });
  const { setDeleteTask } = deletion;
  const reset = useCallback(() => {
    setView({ kind: "list" });
    setHasTasks(false);
    setIsDirty(false);
    pendingDestinationRef.current = undefined;
    setPendingDestination(undefined);
    setDeleteTask(undefined);
  }, [setDeleteTask]);
  const requestDiscardForClose = useCallback(() => {
    pendingDestinationRef.current = "close";
    setPendingDestination("close");
  }, []);
  const visibility = useControlledDialogVisibility({
    closeBlocked: deletion.deletePending,
    isDirty,
    onDirtyClose: requestDiscardForClose,
    onOpenChange,
    open,
    reset,
  });
  const requestDestination = (destination: PendingDestination): void => {
    if (isDirty) {
      pendingDestinationRef.current = destination;
      setPendingDestination(destination);
    } else if (destination === "close") {
      visibility.close();
    } else {
      setView({ kind: "list" });
      setIsDirty(false);
    }
  };
  const cancelDiscard = (): void => {
    pendingDestinationRef.current = undefined;
    setPendingDestination(undefined);
    visibility.cancelParentClose();
  };
  const resolveDestination = (): void => {
    if (pendingDestinationRef.current === "close") {
      visibility.close();
    } else {
      setView({ kind: "list" });
      setIsDirty(false);
      setPendingDestination(undefined);
    }
  };
  const startCreate = (): void => {
    formGeneration.start();
    setView({ kind: "create" });
  };
  const startEdit = (task: ScheduledTask): void => {
    formGeneration.start();
    setView({ kind: "edit", task });
  };
  const resolveFormSuccess = (generation: number): void => {
    if (formGeneration.isCurrent(generation)) {
      resolveDestination();
    }
  };

  return {
    cancelDiscard,
    formGeneration: formGeneration.generation,
    resolveDestination,
    resolveFormSuccess,
    startCreate,
    startEdit,
    deletePending: deletion.deletePending,
    deleteScheduledTask: deletion.deleteScheduledTask,
    deleteTask: deletion.deleteTask,
    handleDeleteOpenChange: deletion.handleDeleteOpenChange,
    hasTasks,
    isVisible: visibility.isVisible,
    pendingDestination,
    requestDestination,
    setDeleteTask,
    setHasTasks,
    setIsDirty,
    view,
  };
}

export function ScheduledTasksDialog({
  open,
  onOpenChange,
}: ScheduledTasksDialogProps): JSX.Element {
  const { t } = useLingui();
  const state = useScheduledTasksDialogState(open, onOpenChange, {
    onSuccess: () =>
      toast.success(
        t({
          id: "scheduledTask.dialog.deleteSuccess",
          message: "Scheduled task deleted.",
        }),
      ),
    onError: () =>
      toast.error(
        t({
          id: "scheduledTask.dialog.deleteFailed",
          message: "Couldn't delete scheduled task.",
        }),
      ),
  });
  const title = t({
    id: "scheduledTask.dialog.title",
    message: "Scheduled task",
  });
  const actionsLabel = t({
    id: "scheduledTask.dialog.actions",
    message: "Scheduled task actions",
  });
  const deleteLabel = t({ id: "common.action.delete", message: "Delete" });
  const createLabel =
    state.view.kind === "list" && state.hasTasks
      ? t({ id: "scheduledTask.list.create", message: "Create new" })
      : undefined;
  const deleteTask = state.view.kind === "edit" ? state.view.task : undefined;

  return (
    <>
      <Dialog
        open={state.isVisible}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            state.requestDestination("close");
          }
        }}
      >
        <DialogContent
          variant="content"
          className={`flex w-150 flex-col ${state.view.kind === "list" ? "h-150" : "h-143"}`}
          showCloseButton={false}
        >
          <ScheduledTasksDialogHeader
            actionsLabel={actionsLabel}
            createLabel={createLabel}
            deleteLabel={deleteLabel}
            onCreate={state.startCreate}
            onDelete={
              deleteTask ? () => state.setDeleteTask(deleteTask) : undefined
            }
            title={title}
          />
          <div
            data-testid="scheduled-task-dialog-view"
            className="min-h-0 flex-1"
          >
            <ScheduledTasksDialogView
              view={state.view.kind}
              task={state.view.kind === "edit" ? state.view.task : undefined}
              onCreate={state.startCreate}
              onEdit={state.startEdit}
              onCancel={() => state.requestDestination("list")}
              onSuccess={() => state.resolveFormSuccess(state.formGeneration)}
              onDirtyChange={state.setIsDirty}
              onHasTasksChange={state.setHasTasks}
            />
          </div>
        </DialogContent>
      </Dialog>
      <ScheduledTasksDialogConfirmations
        discardOpen={state.pendingDestination !== undefined}
        deletePending={state.deletePending}
        deleteTask={state.deleteTask}
        onCancelDiscard={state.cancelDiscard}
        onConfirmDiscard={state.resolveDestination}
        onConfirmDelete={state.deleteScheduledTask}
        onDeleteOpenChange={state.handleDeleteOpenChange}
      />
    </>
  );
}
