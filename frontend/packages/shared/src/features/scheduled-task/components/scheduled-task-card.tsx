import { useLingui } from "@lingui/react/macro";
import { Switch } from "@sico/ui";
import { Clock } from "lucide-react";
import { memo, type ReactElement } from "react";

import { DwAvatar } from "../../../components/dw-avatar";
import { type ScheduledTask } from "../schemas/scheduled-task";
import { parseScheduledTaskCron } from "../utils/cron-schedule";
import { formatScheduledTaskSchedule } from "../utils/format-schedule";

export type ScheduledTaskCardProps = {
  task: ScheduledTask;
  workerName: string;
  workerIconUri?: string;
  togglePending?: boolean;
  onEdit: (task: ScheduledTask) => void;
  onToggle: (task: ScheduledTask, enabled: boolean) => void;
};

function ScheduledTaskCardImpl({
  task,
  workerName,
  workerIconUri,
  togglePending = false,
  onEdit,
  onToggle,
}: ScheduledTaskCardProps): ReactElement {
  const { t } = useLingui();
  const schedule = formatScheduledTaskSchedule(
    parseScheduledTaskCron(task.cronExpression),
  );
  const editLabel = t({
    id: "scheduledTask.card.editAriaLabel",
    message: `Edit ${task.name}`,
  });
  const toggleLabel = task.enabled
    ? t({
        id: "scheduledTask.card.disableAriaLabel",
        message: `Disable ${task.name}`,
      })
    : t({
        id: "scheduledTask.card.enableAriaLabel",
        message: `Enable ${task.name}`,
      });

  return (
    <div className="relative min-w-0">
      <button
        type="button"
        aria-label={editLabel}
        onClick={() => onEdit(task)}
        className="bg-surface-basic border-stroke-subtle-card-rest hover:border-stroke-subtle-card-hover hover:shadow-m active:border-stroke-subtle-card-pressed focus-visible:ring-focus-rest/50 flex w-full flex-col gap-4 rounded-xl border px-4 py-3 text-left transition-shadow outline-none focus-visible:ring-3"
      >
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="text-foreground-primary truncate text-base font-medium">
            {task.name}
          </span>
          <span className="text-foreground-tertiary flex min-w-0 items-center gap-0.5 text-sm">
            <Clock aria-hidden="true" className="size-3 shrink-0" />
            <span className="truncate">{schedule}</span>
          </span>
        </span>
        <span className="text-foreground-secondary flex w-full min-w-0 items-center gap-1.5 pe-10 text-sm">
          <DwAvatar agent={{ iconUri: workerIconUri }} size="xs" decorative />
          <span className="truncate">{workerName}</span>
        </span>
      </button>
      <Switch
        aria-label={toggleLabel}
        checked={task.enabled}
        disabled={togglePending}
        onCheckedChange={(checked) => onToggle(task, checked)}
        className="absolute right-4 bottom-3 z-10"
      />
    </div>
  );
}

export const ScheduledTaskCard = memo(ScheduledTaskCardImpl);
