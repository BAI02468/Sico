import { i18n } from "@lingui/core";
import { msg } from "@lingui/core/macro";

// Relative-time bucket descriptors — module-scope `msg()` so the extractor sees
// them (a `t` parameter would be invisible to it). `relativeTime` runs outside
// a component, so it resolves each via `i18n._()` at call time. Each carries the
// count as a value so translators can reorder per locale.
const TIME_JUST_NOW = msg({
  id: "notifications.time.justNow",
  message: "just now",
});
const TIME_MINUTES = msg({
  id: "notifications.time.minutes",
  message: "{min} min ago",
});
const TIME_HOURS = msg({
  id: "notifications.time.hours",
  message: "{hr}h ago",
});
const TIME_DAYS = msg({ id: "notifications.time.days", message: "{day}d ago" });
const TIME_WEEKS = msg({
  id: "notifications.time.weeks",
  message: "{week}w ago",
});
const TIME_MONTHS = msg({
  id: "notifications.time.months",
  message: "{month}mo ago",
});
const TIME_YEARS = msg({
  id: "notifications.time.years",
  message: "{year}y ago",
});

// Relative time, coarse buckets (legacy `momentAgo`, "5m ago" style). `epochMs`
// is epoch ms. `Date.now()` is fine in a render-time helper (not a workflow).
export function relativeTime(epochMs: number): string {
  if (!epochMs) {
    return "";
  }
  const diff = Date.now() - epochMs;
  const min = Math.floor(diff / 60000);
  if (min < 1) {
    return i18n._(TIME_JUST_NOW);
  }
  if (min < 60) {
    return i18n._(TIME_MINUTES.id, { min }, TIME_MINUTES);
  }
  const hr = Math.floor(min / 60);
  if (hr < 24) {
    return i18n._(TIME_HOURS.id, { hr }, TIME_HOURS);
  }
  const day = Math.floor(hr / 24);
  if (day < 7) {
    return i18n._(TIME_DAYS.id, { day }, TIME_DAYS);
  }
  // Cap the day bucket: past a week, coarsen to weeks/months/years so a stale
  // row reads "3w ago" instead of an unbounded "400d ago". Bucket edges are
  // gated on `day` (not the derived count) so the 30-day month and 365-day
  // year approximations can't leave a gap — e.g. day 360 must read "11mo ago",
  // not fall through to "0y ago".
  const week = Math.floor(day / 7);
  if (day < 35) {
    return i18n._(TIME_WEEKS.id, { week }, TIME_WEEKS);
  }
  const month = Math.floor(day / 30);
  if (day < 365) {
    return i18n._(TIME_MONTHS.id, { month }, TIME_MONTHS);
  }
  const year = Math.floor(day / 365);
  return i18n._(TIME_YEARS.id, { year }, TIME_YEARS);
}
