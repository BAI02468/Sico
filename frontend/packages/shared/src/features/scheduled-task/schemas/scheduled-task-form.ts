import { i18n } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { z } from "zod";

import { isIanaTimezone } from "./iana-timezone";
import { WeekdaySchema } from "./schedule";
import { commonAttachmentSchema } from "../../../schemas/common-attachment";

const NAME_REQUIRED = msg({
  id: "scheduledTask.form.validation.name.required",
  message: "Enter a task name",
});
const MESSAGE_REQUIRED = msg({
  id: "scheduledTask.form.validation.message.required",
  message: "Enter task instructions",
});
const WORKER_REQUIRED = msg({
  id: "scheduledTask.form.validation.worker.required",
  message: "Select a Digital Worker",
});
const WEEKDAY_REQUIRED = msg({
  id: "scheduledTask.form.validation.weekday.required",
  message: "Select a day of the week",
});
const TIME_INVALID = msg({
  id: "scheduledTask.form.validation.time.invalid",
  message: "Select a valid time",
});
const TIMEZONE_REQUIRED = msg({
  id: "scheduledTask.form.validation.timezone.required",
  message: "Select a timezone",
});
const TIMEZONE_INVALID = msg({
  id: "scheduledTask.form.validation.timezone.invalid",
  message: "Select a valid timezone",
});
const CUSTOM_SCHEDULE_REQUIRED = msg({
  id: "scheduledTask.form.validation.customSchedule.required",
  message: "The original custom schedule is unavailable",
});

const halfHourTimeSchema = z.string().regex(/^(?:[01]\d|2[0-3]):(?:00|30)$/, {
  error: () => i18n._(TIME_INVALID),
});

const baseFormFields = {
  agentInstanceId: z
    .number({ error: () => i18n._(WORKER_REQUIRED) })
    .int({ error: () => i18n._(WORKER_REQUIRED) })
    .safe({ error: () => i18n._(WORKER_REQUIRED) })
    .positive({ error: () => i18n._(WORKER_REQUIRED) }),
  attachments: z.array(commonAttachmentSchema),
  enabled: z.boolean(),
  message: z
    .string()
    .trim()
    .min(1, { error: () => i18n._(MESSAGE_REQUIRED) }),
  name: z
    .string()
    .trim()
    .min(1, { error: () => i18n._(NAME_REQUIRED) }),
  originalCronExpression: z.string().optional(),
  sendEmailOnComplete: z.boolean(),
  timezone: z
    .string()
    .trim()
    .min(1, { error: () => i18n._(TIMEZONE_REQUIRED) })
    .refine(isIanaTimezone, { error: () => i18n._(TIMEZONE_INVALID) }),
  weekday: WeekdaySchema.optional(),
};

const dailyFormSchema = z.object({
  ...baseFormFields,
  frequency: z.literal("daily"),
  time: halfHourTimeSchema,
});

const weeklyFormSchema = dailyFormSchema.extend({
  frequency: z.literal("weekly"),
  weekday: z
    .number({ error: () => i18n._(WEEKDAY_REQUIRED) })
    .pipe(WeekdaySchema),
});

const customFormSchema = z.object({
  ...baseFormFields,
  frequency: z.literal("custom"),
  originalCronExpression: z
    .string({ error: () => i18n._(CUSTOM_SCHEDULE_REQUIRED) })
    .min(1, { error: () => i18n._(CUSTOM_SCHEDULE_REQUIRED) }),
  time: z.string(),
});

export const scheduledTaskFormSchema = z.discriminatedUnion("frequency", [
  dailyFormSchema,
  weeklyFormSchema,
  customFormSchema,
]);
export type ScheduledTaskFormValues = z.infer<typeof scheduledTaskFormSchema>;
