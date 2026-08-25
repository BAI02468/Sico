import { useLingui } from "@lingui/react/macro";
import { Button } from "@sico/ui";
import { type ReactElement } from "react";

import { ScheduledTaskCard } from "./scheduled-task-card";
import { ScheduledTaskGridSkeleton } from "./scheduled-task-grid-skeleton";
import { ScheduledTaskWorkerDetailCard } from "./scheduled-task-worker-detail-card";
import { MessageState } from "../../../components/message-state";
import { EMPTY_ILLUSTRATIONS } from "../../../constants/empty-illustration";
import { type Agent } from "../../digital-worker/schemas/agent";
import { type ScheduledTask } from "../schemas/scheduled-task";

export type ScheduledTaskListContentProps = {
  tasks: ScheduledTask[];
  workersById: ReadonlyMap<number, Agent>;
  isFetchingNextPage: boolean;
  isNextPageError: boolean;
  isWorkersPending: boolean;
  isTogglePending: (taskId: number) => boolean;
  onCreate: () => void;
  onEdit: (task: ScheduledTask) => void;
  onRetryNextPage: () => void;
  onToggle: (task: ScheduledTask, enabled: boolean) => void;
};

export function ScheduledTaskListContent({
  tasks,
  workersById,
  isFetchingNextPage,
  isNextPageError,
  isWorkersPending,
  isTogglePending,
  onCreate,
  onEdit,
  onRetryNextPage,
  onToggle,
}: ScheduledTaskListContentProps): ReactElement {
  const { t } = useLingui();
  if (tasks.length === 0) {
    const illustration = EMPTY_ILLUSTRATIONS.skills;
    return (
      <MessageState
        fill
        illustrationUrl={illustration.url}
        illustrationWidth={illustration.width}
        illustrationHeight={illustration.height}
        heading={t({
          id: "scheduledTask.list.emptyTitle",
          message: "No task yet",
        })}
        body={t({
          id: "scheduledTask.list.emptyDescription",
          message:
            "Automate recurring work - digest, standups, reviews - by scheduling your first task",
        })}
        action={
          <Button variant="secondary" size="sm" onClick={onCreate}>
            {t({ id: "scheduledTask.list.create", message: "Create new" })}
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        {tasks.map((task) => {
          const togglePending = isTogglePending(task.id);
          const worker = workersById.get(task.agentInstanceId);
          const workerName = worker?.role
            ? `${worker.name}, ${worker.role}`
            : worker?.name;
          return workersById.has(task.agentInstanceId) || isWorkersPending ? (
            <ScheduledTaskCard
              key={task.id}
              task={task}
              workerName={
                workerName ??
                t({
                  id: "scheduledTask.card.workerFallback",
                  message: `Digital Worker ${task.agentInstanceId}`,
                })
              }
              workerIconUri={worker?.iconUri}
              togglePending={togglePending}
              onEdit={onEdit}
              onToggle={onToggle}
            />
          ) : (
            <ScheduledTaskWorkerDetailCard
              key={task.id}
              task={task}
              togglePending={togglePending}
              onEdit={onEdit}
              onToggle={onToggle}
            />
          );
        })}
      </div>
      {isFetchingNextPage ? <ScheduledTaskGridSkeleton count={2} /> : null}
      {isNextPageError && !isFetchingNextPage ? (
        <div
          role="alert"
          className="flex items-center justify-center gap-3 py-2"
        >
          <span className="text-foreground-secondary text-sm">
            {t({
              id: "scheduledTask.list.nextPageError",
              message: "Couldn't load more scheduled tasks.",
            })}
          </span>
          <Button variant="secondary" onClick={onRetryNextPage}>
            {t({
              id: "scheduledTask.list.retryMore",
              message: "Retry loading more",
            })}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
