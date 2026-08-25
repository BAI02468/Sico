import { z } from "zod";

import { isIanaTimezone } from "./iana-timezone";
import { commonAttachmentSchema } from "../../../schemas/common-attachment";

export const scheduledTaskIdSchema = z.number().int().safe().positive();

const timestampSchema = z.number().int().safe().nonnegative();
const requiredTextSchema = z.string().trim().min(1);

const timezoneSchema = requiredTextSchema.refine(isIanaTimezone);
const responseAttachmentsSchema = z
  .array(commonAttachmentSchema)
  .nullish()
  .transform((attachments) => attachments ?? []);

export const scheduledTaskExtraInfoSchema = z
  .object({ sendEmailOnComplete: z.boolean() })
  .strict();
export type ScheduledTaskExtraInfo = z.infer<
  typeof scheduledTaskExtraInfoSchema
>;

const writableTaskFields = {
  name: requiredTextSchema,
  enabled: z.boolean(),
  agentInstanceId: scheduledTaskIdSchema,
  message: requiredTextSchema,
  attachments: z.array(commonAttachmentSchema),
  cronExpression: requiredTextSchema,
  timezone: timezoneSchema,
  extraInfo: scheduledTaskExtraInfoSchema.optional(),
};

export const scheduledTaskCreateInputSchema = z.object(writableTaskFields);
export type ScheduledTaskCreateInput = z.infer<
  typeof scheduledTaskCreateInputSchema
>;

export const scheduledTaskUpdateInputSchema =
  scheduledTaskCreateInputSchema.extend({ id: scheduledTaskIdSchema });
export type ScheduledTaskUpdateInput = z.infer<
  typeof scheduledTaskUpdateInputSchema
>;

export const scheduledTaskSchema = z.object({
  id: scheduledTaskIdSchema,
  ...writableTaskFields,
  attachments: responseAttachmentsSchema,
  creatorUsername: z.string(),
  nextRunAt: timestampSchema,
  lastRunAt: timestampSchema,
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});
export type ScheduledTask = z.infer<typeof scheduledTaskSchema>;

export function scheduledTaskUpdateInputFromTask(
  task: ScheduledTask,
  overrides: Partial<ScheduledTaskCreateInput> = {},
): ScheduledTaskUpdateInput {
  return scheduledTaskUpdateInputSchema.parse({
    id: task.id,
    name: task.name,
    enabled: task.enabled,
    agentInstanceId: task.agentInstanceId,
    message: task.message,
    attachments: task.attachments,
    cronExpression: task.cronExpression,
    timezone: task.timezone,
    ...(task.extraInfo === undefined ? {} : { extraInfo: task.extraInfo }),
    ...overrides,
  });
}
