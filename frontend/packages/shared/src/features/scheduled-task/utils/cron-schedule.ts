import type { ScheduledTaskSchedule } from "../schemas/schedule";

function customSchedule(cronExpression: string): ScheduledTaskSchedule {
  return { cronExpression, frequency: "custom" };
}

function cronNumber(value: string): number | undefined {
  if (!/^\d+$/.test(value)) {
    return undefined;
  }
  return Number(value);
}

export function parseScheduledTaskCron(
  cronExpression: string,
): ScheduledTaskSchedule {
  const fields = cronExpression.split(" ");
  if (fields.length !== 5) {
    return customSchedule(cronExpression);
  }

  const [
    minuteField = "",
    hourField = "",
    dayOfMonth = "",
    month = "",
    weekdayField = "",
  ] = fields;
  if (dayOfMonth !== "*" || month !== "*") {
    return customSchedule(cronExpression);
  }

  const minute = cronNumber(minuteField);
  const hour = cronNumber(hourField);
  if (minute !== 0 && minute !== 30) {
    return customSchedule(cronExpression);
  }
  if (hour === undefined || hour < 0 || hour > 23) {
    return customSchedule(cronExpression);
  }

  if (weekdayField === "*") {
    return { frequency: "daily", hour, minute };
  }

  const weekday = cronNumber(weekdayField);
  if (weekday === undefined || weekday < 0 || weekday > 6) {
    return customSchedule(cronExpression);
  }

  return { frequency: "weekly", hour, minute, weekday };
}

export function serializeScheduledTaskCron(
  schedule: ScheduledTaskSchedule,
): string {
  if (schedule.frequency === "custom") {
    return schedule.cronExpression;
  }
  if (schedule.frequency === "daily") {
    return `${schedule.minute} ${schedule.hour} * * *`;
  }
  return `${schedule.minute} ${schedule.hour} * * ${schedule.weekday}`;
}

export function nextHalfHour(now = new Date()): Date {
  const next = new Date(now);
  next.setMinutes(now.getMinutes() < 30 ? 30 : 60, 0, 0);
  return next;
}

export function detectedTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}
