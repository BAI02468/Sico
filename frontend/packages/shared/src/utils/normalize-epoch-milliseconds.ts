const SECONDS_MS_THRESHOLD = 1e12;

export function normalizeEpochMilliseconds(
  epochSecondsOrMilliseconds: number,
): number {
  return epochSecondsOrMilliseconds < SECONDS_MS_THRESHOLD
    ? epochSecondsOrMilliseconds * 1000
    : epochSecondsOrMilliseconds;
}
