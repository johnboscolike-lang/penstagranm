const KST_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const WEEKDAY_SHORT = ["월", "화", "수", "목", "금", "토", "일"] as const;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Converts an instant into the Asia/Seoul calendar date key (yyyy-MM-dd).
 */
export function getKstDateKey(date: Date = new Date()): string {
  return KST_FORMATTER.format(date);
}

/**
 * Parses a yyyy-MM-dd key into a UTC midnight date so weekday math ignores server time zones.
 */
function parseKey(dateKey: string): Date {
  return new Date(`${dateKey}T00:00:00Z`);
}

/**
 * Formats a UTC date back into a yyyy-MM-dd key.
 */
function toKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Shifts a date key by a number of days.
 */
export function addDaysToKey(dateKey: string, days: number): string {
  return toKey(new Date(parseKey(dateKey).getTime() + days * DAY_MS));
}

/**
 * Returns the weekday index of a date key where Monday is 0 and Sunday is 6.
 */
export function getWeekdayIndex(dateKey: string): number {
  return (parseKey(dateKey).getUTCDay() + 6) % 7;
}

/**
 * Returns the Monday that starts the challenge week containing the given date.
 */
export function getWeekStartKey(dateKey: string): string {
  return addDaysToKey(dateKey, -getWeekdayIndex(dateKey));
}

/**
 * Lists the Monday-to-Friday school days of the week containing the given date.
 */
export function getSchoolDayKeys(dateKey: string): string[] {
  const monday = getWeekStartKey(dateKey);

  return Array.from({ length: 5 }, (_, index) => addDaysToKey(monday, index));
}

/**
 * Tells whether a date key falls on a school day (Monday to Friday).
 */
export function isSchoolDay(dateKey: string): boolean {
  return getWeekdayIndex(dateKey) < 5;
}

/**
 * Lists the school days of a week that have already started as of a given date.
 */
export function getEligibleDayKeys(weekAnyDayKey: string, asOfKey: string): string[] {
  return getSchoolDayKeys(weekAnyDayKey).filter((dayKey) => dayKey <= asOfKey);
}

/**
 * Returns the previous weeks' Monday keys, most recent first.
 */
export function getPreviousWeekStartKeys(dateKey: string, count: number): string[] {
  const monday = getWeekStartKey(dateKey);

  return Array.from({ length: count }, (_, index) => addDaysToKey(monday, -7 * (index + 1)));
}

/**
 * Formats a date key as a short Korean label such as "9월 29일 (화)".
 */
export function formatKoreanDay(dateKey: string): string {
  const date = parseKey(dateKey);

  return `${date.getUTCMonth() + 1}월 ${date.getUTCDate()}일 (${WEEKDAY_SHORT[getWeekdayIndex(dateKey)]})`;
}

/**
 * Returns the one-letter Korean weekday label for a date key.
 */
export function getWeekdayLabel(dateKey: string): string {
  return WEEKDAY_SHORT[getWeekdayIndex(dateKey)];
}

/**
 * Returns minutes since midnight in Asia/Seoul for an instant.
 */
export function getKstMinutes(date: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? 0);

  return hour * 60 + minute;
}

const KST_TIME_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Seoul",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/**
 * Formats an instant as HH:mm in Asia/Seoul, so server and browser always agree.
 */
export function formatKstTime(dateValue: string | Date): string {
  const date = typeof dateValue === "string" ? new Date(dateValue) : dateValue;

  return KST_TIME_FORMATTER.format(date);
}

/**
 * Formats an instant as "M월 d일" in Asia/Seoul.
 */
export function formatKstMonthDay(dateValue: string | Date): string {
  const date = typeof dateValue === "string" ? new Date(dateValue) : dateValue;
  const [, month, day] = getKstDateKey(date).split("-").map(Number);

  return `${month}월 ${day}일`;
}
