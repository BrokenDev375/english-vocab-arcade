/**
 * Formats a Date or ISO string into YYYY-MM-DD in the given IANA timezone.
 */
export function formatLocalDate(dateInput: Date | string, timezone: string = "UTC"): string {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) {
    return "";
  }

  try {
    // en-CA produces YYYY-MM-DD format
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  } catch {
    // Fallback if timezone string is invalid
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  }
}

/**
 * Shifts a YYYY-MM-DD string by a given number of days.
 */
function shiftDateStr(dateStr: string, dayDelta: number): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + dayDelta));
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Pure streak calculation based on user's timezone.
 *
 * Rules:
 * - Each distinct calendar day with >= 1 active event counts as an active day.
 * - If today has an event, streak starts from today and counts backwards consecutive days.
 * - If today has NO event but yesterday DOES, the streak is maintained (starts from yesterday and counts backwards).
 * - Otherwise streak is 0.
 *
 * @param timestamps List of event dates or ISO strings
 * @param timezone IANA timezone (default: UTC)
 * @param now Reference "current" date for test injectability (default: new Date())
 */
export function calculateStreak(
  timestamps: Array<Date | string>,
  timezone: string = "UTC",
  now: Date = new Date()
): number {
  if (!timestamps.length) return 0;

  const activeDates = new Set<string>();
  for (const ts of timestamps) {
    const formatted = formatLocalDate(ts, timezone);
    if (formatted) {
      activeDates.add(formatted);
    }
  }

  if (activeDates.size === 0) return 0;

  const todayStr = formatLocalDate(now, timezone);
  const yesterdayStr = shiftDateStr(todayStr, -1);

  let currentCheckingDate: string;
  let streak = 0;

  if (activeDates.has(todayStr)) {
    streak = 1;
    currentCheckingDate = shiftDateStr(todayStr, -1);
  } else if (activeDates.has(yesterdayStr)) {
    streak = 1;
    currentCheckingDate = shiftDateStr(yesterdayStr, -1);
  } else {
    return 0;
  }

  while (activeDates.has(currentCheckingDate)) {
    streak += 1;
    currentCheckingDate = shiftDateStr(currentCheckingDate, -1);
  }

  return streak;
}
