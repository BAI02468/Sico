import { i18n } from "@lingui/core";
import { msg } from "@lingui/core/macro";

import type { ScheduledTaskSchedule, Weekday } from "../schemas/schedule";

const DAILY = msg({
  id: "scheduledTask.schedule.daily",
  message: "Every day · {time}",
});
const WEEKLY = msg({
  id: "scheduledTask.schedule.weekly",
  message: "Every {weekday} · {time}",
});
const CUSTOM = msg({
  id: "scheduledTask.schedule.custom",
  message: "Custom schedule",
});
const SUNDAY = msg({ id: "scheduledTask.weekday.sunday", message: "Sunday" });
const MONDAY = msg({ id: "scheduledTask.weekday.monday", message: "Monday" });
const TUESDAY = msg({
  id: "scheduledTask.weekday.tuesday",
  message: "Tuesday",
});
const WEDNESDAY = msg({
  id: "scheduledTask.weekday.wednesday",
  message: "Wednesday",
});
const THURSDAY = msg({
  id: "scheduledTask.weekday.thursday",
  message: "Thursday",
});
const FRIDAY = msg({ id: "scheduledTask.weekday.friday", message: "Friday" });
const SATURDAY = msg({
  id: "scheduledTask.weekday.saturday",
  message: "Saturday",
});

function formatTime(hour: number, minute: number): string {
  const formatter = new Intl.DateTimeFormat(i18n.locale, {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  });
  return formatter.format(new Date(Date.UTC(2000, 0, 1, hour, minute)));
}

function formatWeekday(weekday: Weekday): string {
  switch (weekday) {
    case 0:
      return i18n._(SUNDAY.id, {}, SUNDAY);
    case 1:
      return i18n._(MONDAY.id, {}, MONDAY);
    case 2:
      return i18n._(TUESDAY.id, {}, TUESDAY);
    case 3:
      return i18n._(WEDNESDAY.id, {}, WEDNESDAY);
    case 4:
      return i18n._(THURSDAY.id, {}, THURSDAY);
    case 5:
      return i18n._(FRIDAY.id, {}, FRIDAY);
    case 6:
      return i18n._(SATURDAY.id, {}, SATURDAY);
    default:
      throw new Error(`Invalid weekday: ${weekday}`);
  }
}

export function formatScheduledTaskSchedule(
  schedule: ScheduledTaskSchedule,
): string {
  if (schedule.frequency === "custom") {
    return i18n._(CUSTOM.id, {}, CUSTOM);
  }

  const time = formatTime(schedule.hour, schedule.minute);
  if (schedule.frequency === "daily") {
    return i18n._(DAILY.id, { time }, DAILY);
  }

  return i18n._(
    WEEKLY.id,
    { time, weekday: formatWeekday(schedule.weekday) },
    WEEKLY,
  );
}
