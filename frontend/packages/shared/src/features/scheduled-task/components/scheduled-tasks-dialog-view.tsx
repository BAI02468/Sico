import { type JSX } from "react";

import { ScheduledTaskForm } from "./scheduled-task-form";
import { ScheduledTaskListView } from "./scheduled-task-list-view";
import type { ScheduledTask } from "../schemas/scheduled-task";

type Props = {
  view: "list" | "create" | "edit";
  task?: ScheduledTask;
  onCreate: () => void;
  onEdit: (task: ScheduledTask) => void;
  onCancel: () => void;
  onSuccess: (task: ScheduledTask) => void;
  onDirtyChange: (isDirty: boolean) => void;
  onHasTasksChange: (hasTasks: boolean) => void;
};

export function ScheduledTasksDialogView({
  view,
  task,
  onCreate,
  onEdit,
  onCancel,
  onSuccess,
  onDirtyChange,
  onHasTasksChange,
}: Props): JSX.Element {
  if (view === "list") {
    return (
      <ScheduledTaskListView
        onCreate={onCreate}
        onEdit={onEdit}
        onHasTasksChange={onHasTasksChange}
      />
    );
  }
  return (
    <ScheduledTaskForm
      task={view === "edit" ? task : undefined}
      onCancel={onCancel}
      onDirtyChange={onDirtyChange}
      onSuccess={onSuccess}
    />
  );
}
