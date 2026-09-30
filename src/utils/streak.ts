import { addDaysToKey, isSchoolDay } from "@/utils/kst";

/** 이 일수에 처음 도달하면 축하 소리와 알림을 크게 낸다. */
export const STREAK_MILESTONES: readonly number[] = [3, 5, 10, 20, 30];

const MAX_LOOKBACK_DAYS = 400;

export interface StreakResult {
  /** 연속으로 실천한 등교일 수 */
  count: number;
  /** 오늘도 이미 실천했는지 (오늘이 등교일이 아니면 false) */
  includesToday: boolean;
}

/**
 * 앞선 등교일(월~금) 날짜를 찾는다.
 */
function previousSchoolDay(dateKey: string): string {
  let cursor = addDaysToKey(dateKey, -1);
  for (let step = 0; step < 7 && !isSchoolDay(cursor); step += 1) {
    cursor = addDaysToKey(cursor, -1);
  }

  return cursor;
}

/**
 * 연속 실천 일수를 센다. 주말은 건너뛰고(끊기지 않는다), 오늘 아직 실천 전이면 어제까지의 연속을 그대로 보여 준다.
 * 하루라도 실천한 등교일이 빠지면 거기서 끊긴다. (공휴일은 알 수 없어서 평일로 본다)
 */
export function calcStreak(activeDays: ReadonlySet<string>, todayKey: string): StreakResult {
  const todayIsSchool = isSchoolDay(todayKey);
  const includesToday = todayIsSchool && activeDays.has(todayKey);
  let cursor = todayIsSchool ? todayKey : previousSchoolDay(todayKey);
  if (todayIsSchool && !includesToday) {
    cursor = previousSchoolDay(todayKey);
  }

  let count = 0;
  for (let guard = 0; guard < MAX_LOOKBACK_DAYS && activeDays.has(cursor); guard += 1) {
    count += 1;
    cursor = previousSchoolDay(cursor);
  }

  return { count, includesToday };
}

/**
 * 방금 도달한 연속 일수가 축하할 만한 고비인지 알려 준다.
 */
export function isStreakMilestone(count: number): boolean {
  return STREAK_MILESTONES.includes(count);
}
