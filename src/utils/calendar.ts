import {
  addDays,
  endOfMonth,
  format,
  isSameDay,
  isSameMonth,
  parse,
  startOfMonth,
  startOfWeek,
} from "date-fns";

import type { ScheduleItemView } from "@/utils/types";

export interface CalendarCell {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
}

export const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"] as const;

/**
 * Formats a date into the key used across schedule lookups.
 */
export function formatDateKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/**
 * Formats a month heading for the calendar page.
 */
export function formatMonthHeading(date: Date): string {
  return format(date, "yyyy년 M월");
}

/**
 * Formats feed timestamps in a compact Korean-friendly style.
 */
export function formatFeedTimestamp(dateValue: string | Date): string {
  const date = typeof dateValue === "string" ? new Date(dateValue) : dateValue;

  return format(date, "M월 d일 HH:mm");
}

/**
 * Parses a month query parameter and falls back to the current month when invalid.
 */
export function parseMonthInput(input?: string | string[]): Date {
  const monthValue = Array.isArray(input) ? input[0] : input;
  if (!monthValue || !/^\d{4}-\d{2}$/.test(monthValue)) {
    return startOfMonth(new Date());
  }

  const parsed = parse(`${monthValue}-01`, "yyyy-MM-dd", new Date());

  return Number.isNaN(parsed.getTime()) ? startOfMonth(new Date()) : startOfMonth(parsed);
}

/**
 * Parses a selected-day query parameter and falls back to a provided month date.
 */
export function parseSelectedDateInput(
  input: string | string[] | undefined,
  fallbackMonth: Date,
): Date {
  const dateValue = Array.isArray(input) ? input[0] : input;
  if (!dateValue || !/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    return fallbackMonth;
  }

  const parsed = parse(dateValue, "yyyy-MM-dd", new Date());

  return Number.isNaN(parsed.getTime()) ? fallbackMonth : parsed;
}

/**
 * Builds a six-row month grid so the calendar layout remains stable.
 */
export function buildMonthGrid(monthDate: Date): CalendarCell[] {
  const firstVisibleDay = startOfWeek(startOfMonth(monthDate), { weekStartsOn: 0 });
  const lastDayOfMonth = endOfMonth(monthDate);

  return Array.from({ length: 42 }, (_, index) => {
    const date = addDays(firstVisibleDay, index);

    return {
      date,
      isCurrentMonth: isSameMonth(date, monthDate),
      isToday: isSameDay(date, new Date()),
    };
  }).filter((cell) => cell.date <= addDays(lastDayOfMonth, 8) || true);
}

/**
 * Groups schedule items by day for quick calendar rendering.
 */
export function groupScheduleItemsByDate(
  items: ScheduleItemView[],
): Record<string, ScheduleItemView[]> {
  return items.reduce<Record<string, ScheduleItemView[]>>((grouped, item) => {
    const key = formatDateKey(new Date(item.scheduledFor));
    grouped[key] = [...(grouped[key] ?? []), item];

    return grouped;
  }, {});
}
