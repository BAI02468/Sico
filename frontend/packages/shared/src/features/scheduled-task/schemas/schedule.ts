import { z } from "zod";

export const ScheduleFrequencySchema = z.enum(["daily", "weekly", "custom"]);
export type ScheduleFrequency = z.infer<typeof ScheduleFrequencySchema>;

export const WeekdaySchema = z.number().int().min(0).max(6);
export type Weekday = z.infer<typeof WeekdaySchema>;

const halfHourMinuteSchema = z.union([z.literal(0), z.literal(30)]);
const hourSchema = z.number().int().min(0).max(23);

const dailyScheduleSchema = z.object({
  frequency: z.literal("daily"),
  hour: hourSchema,
  minute: halfHourMinuteSchema,
});

const weeklyScheduleSchema = dailyScheduleSchema.extend({
  frequency: z.literal("weekly"),
  weekday: WeekdaySchema,
});

const customScheduleSchema = z.object({
  cronExpression: z.string(),
  frequency: z.literal("custom"),
});

export const scheduledTaskScheduleSchema = z.discriminatedUnion("frequency", [
  dailyScheduleSchema,
  weeklyScheduleSchema,
  customScheduleSchema,
]);
export type ScheduledTaskSchedule = z.infer<typeof scheduledTaskScheduleSchema>;
