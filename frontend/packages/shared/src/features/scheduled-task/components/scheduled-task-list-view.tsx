import { useLingui } from "@lingui/react/macro";
import { Button } from "@sico/ui";
import { useAtomValue } from "jotai";
import {
  type ReactElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { ScheduledTaskGridSkeleton } from "./scheduled-task-grid-skeleton";
import { ScheduledTaskListContent } from "./scheduled-task-list-content";
import { userAtom } from "../../../atoms/auth-atom";
import { useInfiniteScrollSentinel } from "../../../hooks/use-infinite-scroll-sentinel";
import { logger } from "../../../utils/logger";
import {
  useAgentsQuery,
  useDedupedAgents,
} from "../../digital-worker/hooks/use-agents-query";
import { type Agent } from "../../digital-worker/schemas/agent";
import { useToggleScheduledTaskMutation } from "../hooks/use-scheduled-task-mutations";
import {
  selectDedupedScheduledTasks,
  useScheduledTasksInfiniteQuery,
} from "../hooks/use-scheduled-tasks-query";
import { type ScheduledTask } from "../schemas/scheduled-task";

export type ScheduledTaskListViewProps = {
  onCreate: () => void;
  onEdit: (task: ScheduledTask) => void;
  onHasTasksChange?: (hasTasks: boolean) => void;
};

type PendingToggleCounts = ReadonlyMap<number, number>;

function workerMap(workers: Agent[]): Map<number, Agent> {
  return new Map(workers.map((worker) => [worker.id, worker]));
}

function useHasTasksReport(
  hasTasks: boolean,
  settled: boolean,
  onHasTasksChange?: (hasTasks: boolean) => void,
): void {
  useEffect(() => {
    if (settled) {
      onHasTasksChange?.(hasTasks);
    }
  }, [hasTasks, onHasTasksChange, settled]);
}

function useOperatorWorkersQuery(): ReturnType<typeof useAgentsQuery> {
  const operatorUsername = useAtomValue(userAtom)?.email;
  return useAgentsQuery(
    { operatorUsername, showInactive: true },
    { enabled: operatorUsername !== undefined },
  );
}

function updatePendingToggleCount(
  previous: PendingToggleCounts,
  taskId: number,
  delta: 1 | -1,
): PendingToggleCounts {
  const next = new Map(previous);
  const count = (next.get(taskId) ?? 0) + delta;
  if (count > 0) {
    next.set(taskId, count);
  } else {
    next.delete(taskId);
  }
  return next;
}

export function ScheduledTaskListView({
  onCreate,
  onEdit,
  onHasTasksChange,
}: ScheduledTaskListViewProps): ReactElement {
  const { t } = useLingui();
  const query = useScheduledTasksInfiniteQuery();
  const { mutate: mutateToggle } = useToggleScheduledTaskMutation();
  const [pendingToggleCounts, setPendingToggleCounts] =
    useState<PendingToggleCounts>(() => new Map());
  const workersQuery = useOperatorWorkersQuery();
  const workers = useDedupedAgents(workersQuery.data?.pages);
  const workersById = useMemo(() => workerMap(workers), [workers]);
  const tasks = selectDedupedScheduledTasks(query.data?.pages ?? []);
  const tasksSettled = !query.isPending && !query.isError;
  useHasTasksReport(tasks.length > 0, tasksSettled, onHasTasksChange);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useInfiniteScrollSentinel(
    sentinelRef,
    {
      fetchNextPage: query.fetchNextPage,
      hasNextPage: query.hasNextPage && !query.isFetchNextPageError,
      isFetchingNextPage: query.isFetchingNextPage,
    },
    { fillOnComplete: true, rootRef: scrollRef },
  );

  const toggleTask = useCallback(
    (task: ScheduledTask, enabled: boolean): void => {
      setPendingToggleCounts((previous) =>
        updatePendingToggleCount(previous, task.id, 1),
      );
      mutateToggle(
        { task, enabled },
        {
          onSettled: () =>
            setPendingToggleCounts((previous) =>
              updatePendingToggleCount(previous, task.id, -1),
            ),
        },
      );
    },
    [mutateToggle],
  );
  const retryInitial = (): void => {
    query.refetch().catch((error: unknown) => {
      logger.error("scheduled task: list retry failed", { error });
    });
  };
  const retryNextPage = (): void => {
    query.fetchNextPage().catch((error: unknown) => {
      logger.error("scheduled task: next page retry failed", { error });
    });
  };

  let content: ReactElement;
  if (query.isPending) {
    content = <ScheduledTaskGridSkeleton />;
  } else if (query.isError && query.data === undefined) {
    content = (
      <div
        role="alert"
        className="flex min-h-72 flex-col items-center justify-center gap-3 text-center"
      >
        <p className="text-foreground-secondary text-sm">
          {t({
            id: "scheduledTask.list.initialError",
            message: "Couldn't load scheduled tasks.",
          })}
        </p>
        <Button variant="secondary" onClick={retryInitial}>
          {t({ id: "scheduledTask.list.retry", message: "Retry" })}
        </Button>
      </div>
    );
  } else {
    content = (
      <ScheduledTaskListContent
        tasks={tasks}
        workersById={workersById}
        isFetchingNextPage={query.isFetchingNextPage}
        isNextPageError={query.isFetchNextPageError}
        isWorkersPending={workersQuery.isPending}
        isTogglePending={(taskId) => pendingToggleCounts.has(taskId)}
        onCreate={onCreate}
        onEdit={onEdit}
        onRetryNextPage={retryNextPage}
        onToggle={toggleTask}
      />
    );
  }

  return (
    <div
      ref={scrollRef}
      className="scrollbar h-full min-h-0 overflow-y-auto pe-1"
    >
      {content}
      <div ref={sentinelRef} aria-hidden="true" />
    </div>
  );
}
