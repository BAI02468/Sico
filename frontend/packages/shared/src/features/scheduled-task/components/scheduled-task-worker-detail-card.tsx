import { useLingui } from "@lingui/react/macro";
import { type ReactElement } from "react";

import { ScheduledTaskCard } from "./scheduled-task-card";
import { useAgentQuery } from "../../digital-worker/hooks/use-agents-query";
import { type ScheduledTask } from "../schemas/scheduled-task";

export type ScheduledTaskWorkerDetailCardProps = {
  task: ScheduledTask;
  togglePending: boolean;
  onEdit: (task: ScheduledTask) => void;
  onToggle: (task: ScheduledTask, enabled: boolean) => void;
};

export function ScheduledTaskWorkerDetailCard({
  task,
  togglePending,
  onEdit,
  onToggle,
}: ScheduledTaskWorkerDetailCardProps): ReactElement {
  const { t } = useLingui();
  const workerQuery = useAgentQuery(task.agentInstanceId);
  const workerName =
    workerQuery.data?.name ??
    t({
      id: "scheduledTask.card.workerFallback",
      message: `Digital Worker ${task.agentInstanceId}`,
    });

  return (
    <ScheduledTaskCard
      task={task}
      workerName={workerName}
      workerIconUri={workerQuery.data?.iconUri}
      togglePending={togglePending}
      onEdit={onEdit}
      onToggle={onToggle}
    />
  );
}
