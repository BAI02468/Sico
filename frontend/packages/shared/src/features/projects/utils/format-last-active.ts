import { formatDateTime } from "./format-date-time";
import { normalizeEpochMilliseconds } from "../../../utils/normalize-epoch-milliseconds";

// LAST ACTIVE timestamps reach this from two sources with DIFFERENT units:
// `project.updatedAt`/agent `updatedAt` are epoch MS, while per-member
// `rbacUser.updatedAt` is epoch SECONDS. Normalize before deferring to
// `formatDateTime` for the locale-stable `YYYY-MM-DD HH:mm` render (no
// browser-locale drift, so no CJK "年月日" output).
export function formatLastActive(value: number): string {
  return formatDateTime(normalizeEpochMilliseconds(value));
}
