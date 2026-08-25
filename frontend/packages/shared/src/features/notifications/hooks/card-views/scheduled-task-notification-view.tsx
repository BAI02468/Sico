import { i18n, type MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { CalendarClock } from "lucide-react";

import {
  type PlanStatus,
  PlanStatusSchema,
} from "../../../../schemas/plan-status";
import { type Notification } from "../../schemas/notification";
import {
  type NotificationCardAction,
  type NotificationCardView,
} from "../../types/card-view";

const COMPLETED_TITLE = msg({
  id: "notifications.scheduledTask.completedTitle",
  message: "Scheduled task completed",
});
const FAILED_TITLE = msg({
  id: "notifications.scheduledTask.failedTitle",
  message: "Scheduled task failed",
});
const FINISHED_TITLE = msg({
  id: "notifications.scheduledTask.finishedTitle",
  message: "Scheduled task finished",
});
const FALLBACK_TASK_TITLE = msg({
  id: "notifications.scheduledTask.fallbackTitle",
  message: "Scheduled task",
});
const COMPLETED_BODY = msg({
  id: "notifications.scheduledTask.completedBody",
  message: '"{taskTitle}" has completed successfully.',
});
const FAILED_BODY = msg({
  id: "notifications.scheduledTask.failedBody",
  message: '"{taskTitle}" has failed.',
});
const FINISHED_BODY = msg({
  id: "notifications.scheduledTask.finishedBody",
  message: '"{taskTitle}" has finished.',
});
type CopyDescriptors = { title: MessageDescriptor; body: MessageDescriptor };

function copyDescriptors(status: PlanStatus | undefined): CopyDescriptors {
  if (
    status === PlanStatusSchema.enum.NO_PLAN ||
    status === PlanStatusSchema.enum.COMPLETED
  ) {
    return { title: COMPLETED_TITLE, body: COMPLETED_BODY };
  }
  if (
    status === PlanStatusSchema.enum.UNKNOWN ||
    status === PlanStatusSchema.enum.FAILED
  ) {
    return { title: FAILED_TITLE, body: FAILED_BODY };
  }
  return { title: FINISHED_TITLE, body: FINISHED_BODY };
}

function firstNonBlank(...values: (string | undefined)[]): string | undefined {
  return values.find((value) => value?.trim().length)?.trim();
}

type OpenConversation = (agentId: number, conversationId: number) => void;

function scheduledTaskAction(
  notification: Notification,
  onOpen: OpenConversation,
): NotificationCardAction {
  const payload = notification.extraInfo?.scheduledTaskFinished;
  const agentId = payload?.agentInstance?.id;
  const conversationId = payload?.conversationId;
  if (
    agentId === undefined ||
    agentId <= 0 ||
    conversationId === undefined ||
    conversationId <= 0
  ) {
    return { kind: "none" };
  }
  return {
    kind: "card",
    onClick: () => onOpen(agentId, conversationId),
  };
}

export function scheduledTaskNotificationView(
  notification: Notification,
  onOpen: OpenConversation,
): NotificationCardView {
  const payload = notification.extraInfo?.scheduledTaskFinished;
  const taskTitle =
    firstNonBlank(payload?.task?.title, notification.content) ??
    i18n._(FALLBACK_TASK_TITLE.id, {}, FALLBACK_TASK_TITLE);
  const copy = copyDescriptors(payload?.status);
  return {
    leading: (
      <span
        data-testid="scheduled-task-notification-icon"
        className="bg-surface-sunken flex size-8 shrink-0 items-center justify-center rounded-full"
      >
        <CalendarClock
          className="text-foreground-tertiary size-4"
          aria-hidden
        />
      </span>
    ),
    title: i18n._(copy.title.id, {}, copy.title),
    body: i18n._(copy.body.id, { taskTitle }, copy.body),
    action: scheduledTaskAction(notification, onOpen),
  };
}
