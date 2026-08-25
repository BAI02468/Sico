import {
  detectedTimeZone,
  nextHalfHour,
  parseScheduledTaskCron,
  serializeScheduledTaskCron,
} from "./cron-schedule";
import { scheduledTaskScheduleSchema } from "../schemas/schedule";
import {
  type ScheduledTask,
  type ScheduledTaskCreateInput,
  scheduledTaskCreateInputSchema,
  type ScheduledTaskUpdateInput,
  scheduledTaskUpdateInputSchema,
} from "../schemas/scheduled-task";
import {
  scheduledTaskFormSchema,
  type ScheduledTaskFormValues,
} from "../schemas/scheduled-task-form";

function formatTime(date: Date): string {
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${hour}:${minute}`;
}

export function createScheduledTaskDefaults(
  now = new Date(),
): ScheduledTaskFormValues {
  return {
    agentInstanceId: 0,
    attachments: [],
    enabled: true,
    frequency: "daily",
    message: "",
    name: "",
    sendEmailOnComplete: false,
    time: formatTime(nextHalfHour(now)),
    timezone: detectedTimeZone(),
  };
}

type EditableTaskFields = Pick<
  ScheduledTaskFormValues,
  | "agentInstanceId"
  | "attachments"
  | "enabled"
  | "message"
  | "name"
  | "sendEmailOnComplete"
  | "timezone"
>;

function editableTaskFields(task: ScheduledTask): EditableTaskFields {
  return {
    agentInstanceId: task.agentInstanceId,
    attachments: task.attachments,
    enabled: task.enabled,
    message: task.message,
    name: task.name,
    sendEmailOnComplete: task.extraInfo?.sendEmailOnComplete ?? false,
    timezone: task.timezone,
  };
}

export function editScheduledTaskDefaults(
  task: ScheduledTask,
): ScheduledTaskFormValues {
  const schedule = parseScheduledTaskCron(task.cronExpression);
  const fields = editableTaskFields(task);
  if (schedule.frequency === "custom") {
    return {
      ...fields,
      frequency: "custom",
      originalCronExpression: schedule.cronExpression,
      time: "",
    };
  }

  const time = `${String(schedule.hour).padStart(2, "0")}:${String(
    schedule.minute,
  ).padStart(2, "0")}`;
  if (schedule.frequency === "weekly") {
    return { ...fields, frequency: "weekly", time, weekday: schedule.weekday };
  }
  return { ...fields, frequency: "daily", time };
}

function formCronExpression(values: ScheduledTaskFormValues): string {
  if (values.frequency === "custom") {
    return values.originalCronExpression;
  }

  const [hourText, minuteText] = values.time.split(":");
  const schedule = scheduledTaskScheduleSchema.parse({
    frequency: values.frequency,
    hour: Number(hourText),
    minute: Number(minuteText),
    ...(values.frequency === "weekly" ? { weekday: values.weekday } : {}),
  });
  return serializeScheduledTaskCron(schedule);
}

export function scheduledTaskFormToCreateInput(
  values: ScheduledTaskFormValues,
): ScheduledTaskCreateInput {
  const parsed = scheduledTaskFormSchema.parse(values);
  const cronExpression = formCronExpression(parsed);
  const input = scheduledTaskCreateInputSchema.parse({
    agentInstanceId: parsed.agentInstanceId,
    attachments: parsed.attachments,
    cronExpression,
    enabled: parsed.enabled,
    extraInfo: { sendEmailOnComplete: parsed.sendEmailOnComplete },
    message: parsed.message,
    name: parsed.name,
    timezone: parsed.timezone,
  });
  return { ...input, cronExpression };
}

export function scheduledTaskFormToUpdateInput(
  id: number,
  values: ScheduledTaskFormValues,
): ScheduledTaskUpdateInput {
  const createInput = scheduledTaskFormToCreateInput(values);
  const input = scheduledTaskUpdateInputSchema.parse({ ...createInput, id });
  return { ...input, cronExpression: createInput.cronExpression };
}
