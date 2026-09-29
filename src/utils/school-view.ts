import { formatKoreanDay, getKstDateKey, getKstMinutes, getWeekdayIndex, getWeekdayLabel } from "@/utils/kst";
import {
  formatMinutes,
  getMeal,
  getNextClass,
  getTimetable,
  SCHOOL_INFO_SOURCE,
  SCHOOL_NOTICES,
  summarizeMeal,
  type MealInfo,
  type SchoolNotice,
} from "@/utils/school-info";
import type { UpcomingScheduleView } from "@/utils/quest-types";

export interface TimetableRowView {
  period: number;
  subject: string;
  room: string;
  time: string;
  isNext: boolean;
}

export interface SchoolPanelData {
  dateLabel: string;
  source: string;
  checkedAt: string;
  nextClass: { headline: string; detail: string };
  timetableTitle: string;
  timetable: TimetableRowView[];
  meal: MealInfo & { summary: string; title: string };
  notices: SchoolNotice[];
  noticeHeadline: string;
  schedule: (UpcomingScheduleView & { whenLabel: string })[];
  scheduleHeadline: string;
}

/**
 * Describes a schedule date relative to today: 오늘, 내일, 금요일, or 10월 12일.
 */
export function describeScheduleDay(dateKey: string, todayKey: string): string {
  const diffDays = Math.round((new Date(`${dateKey}T00:00:00Z`).getTime() - new Date(`${todayKey}T00:00:00Z`).getTime()) / 86400000);

  if (diffDays === 0) {
    return "오늘";
  }

  if (diffDays === 1) {
    return "내일";
  }

  if (diffDays > 1 && diffDays < 7) {
    return `${getWeekdayLabel(dateKey)}요일`;
  }

  return formatKoreanDay(dateKey).replace(/ \(.\)$/, "");
}

/**
 * Builds the "오늘의 학교" panel data: next class, lunch, notices, and upcoming events.
 * 시간표·급식·공지는 데모 데이터이며 출처와 확인 시각을 함께 보여 준다.
 */
export function buildSchoolPanelData(now: Date, schedule: UpcomingScheduleView[]): SchoolPanelData {
  const todayKey = getKstDateKey(now);
  const weekday = getWeekdayIndex(todayKey);
  const minutes = getKstMinutes(now);
  const next = getNextClass(weekday, minutes);
  const nextWeekday = next.isTomorrow ? (weekday >= 4 ? 0 : weekday + 1) : weekday;
  const timetable = getTimetable(nextWeekday).map((period) => ({
    period: period.period,
    subject: period.subject,
    room: period.room,
    time: formatMinutes(period.startMinutes),
    isNext: period.period === next.period.period,
  }));
  const mealWeekday = weekday < 5 ? weekday : 0;
  const meal = getMeal(mealWeekday);
  const [firstEvent] = schedule;

  return {
    dateLabel: formatKoreanDay(todayKey),
    source: SCHOOL_INFO_SOURCE,
    checkedAt: `${formatMinutes(minutes)} 확인`,
    nextClass: {
      headline: next.period.subject,
      detail: `${next.isTomorrow ? "다음 수업일 " : ""}${next.period.period}교시 ${formatMinutes(next.period.startMinutes)}`,
    },
    timetableTitle: next.isTomorrow ? "다음 수업일 시간표" : "오늘 시간표",
    timetable,
    meal: { ...meal, summary: summarizeMeal(meal), title: weekday < 5 ? "오늘 급식" : "다음 급식(월요일)" },
    notices: [...SCHOOL_NOTICES],
    noticeHeadline: SCHOOL_NOTICES[0].title,
    schedule: schedule.map((item) => ({
      ...item,
      whenLabel: describeScheduleDay(getKstDateKey(new Date(item.scheduledFor)), todayKey),
    })),
    scheduleHeadline: firstEvent
      ? `${describeScheduleDay(getKstDateKey(new Date(firstEvent.scheduledFor)), todayKey)} ${firstEvent.title}`
      : "예정된 일정이 없어요",
  };
}
