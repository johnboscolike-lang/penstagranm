/**
 * 우리반퀘스트 기획서의 계산 규칙을 화면·DB와 분리해 모아 둔 순수 함수 모음.
 * 점수는 반올림 전 값으로 계산하고, 화면에서만 소수 첫째 자리로 표시한다.
 */

export const PROMISE_SLOT_COUNT = 3;
export const XP_PER_PROMISE = 20;
export const XP_REFLECTION = 10;
export const COIN_PER_PROMISE = 4;
export const COIN_REFLECTION = 2;
export const XP_PER_LEVEL = 100;
export const STAMP_TARGET = 3;
export const STORM_GROWTH_GAIN = 20;
export const FORMAL_RANK_MIN_DAYS = 3;
export const MAX_DAILY_XP = XP_PER_PROMISE * PROMISE_SLOT_COUNT + XP_REFLECTION;
export const MAX_DAILY_COINS = COIN_PER_PROMISE * PROMISE_SLOT_COUNT + COIN_REFLECTION;

const TIE_EPSILON = 1e-9;

export interface PromiseProgress {
  confirmedUnits: number;
  plannedUnits: number;
}

export interface DailyResult {
  score: number;
  stamp: boolean;
  xp: number;
  coins: number;
}

export interface LevelInfo {
  level: number;
  xpInLevel: number;
  xpForNext: number;
}

export interface WeekRecord {
  score: number | null;
  stampCount: number;
  valid: boolean;
}

export interface WeekEvaluation {
  baseline: number | null;
  storm: boolean;
}

export type WeeklyBadge = "storm" | "comeback" | "firstStep" | "steady";

export type WeeklyStatus = "none" | "collecting" | "provisional" | "final";

export interface RankedEntry<T> {
  rank: number;
  entry: T;
}

export interface RankGroup<T> {
  rank: number;
  entries: T[];
}

/**
 * Clamps a unit count into the valid range for a promise (planned units are at least one).
 */
function normalizeProgress(progress: PromiseProgress): PromiseProgress {
  const plannedUnits = Math.max(1, Math.floor(progress.plannedUnits));
  const confirmedUnits = Math.min(plannedUnits, Math.max(0, Math.floor(progress.confirmedUnits)));

  return { confirmedUnits, plannedUnits };
}

/**
 * Returns the fulfilled ratio f (0 to 1) of one promise from distinct confirmed units.
 */
export function calcPromiseRatio(progress: PromiseProgress): number {
  const { confirmedUnits, plannedUnits } = normalizeProgress(progress);

  return confirmedUnits / plannedUnits;
}

/**
 * Computes the daily score: 100 x (f1 + f2 + f3) / 3. Missing slots count as zero.
 */
export function calcDailyScore(progresses: PromiseProgress[]): number {
  const total = progresses.slice(0, PROMISE_SLOT_COUNT).reduce((sum, progress) => sum + calcPromiseRatio(progress), 0);

  return (100 * total) / PROMISE_SLOT_COUNT;
}

/**
 * Gives a participation stamp when at least one promise is fully completed.
 */
export function hasParticipationStamp(progresses: PromiseProgress[]): boolean {
  return progresses.some((progress) => {
    const normalized = normalizeProgress(progress);

    return normalized.confirmedUnits === normalized.plannedUnits;
  });
}

/**
 * Computes the XP for one promise slot as floor(20 x f) using integer math to avoid float drift.
 */
export function calcPromiseXp(progress: PromiseProgress): number {
  const { confirmedUnits, plannedUnits } = normalizeProgress(progress);

  return Math.floor((XP_PER_PROMISE * confirmedUnits) / plannedUnits);
}

/**
 * Computes the coins for one promise slot as floor(4 x f).
 */
export function calcPromiseCoins(progress: PromiseProgress): number {
  const { confirmedUnits, plannedUnits } = normalizeProgress(progress);

  return Math.floor((COIN_PER_PROMISE * confirmedUnits) / plannedUnits);
}

/**
 * Summarizes one day: score, participation stamp, XP, and coins.
 */
export function calcDailyResult(progresses: PromiseProgress[], reflected: boolean): DailyResult {
  const slots = progresses.slice(0, PROMISE_SLOT_COUNT);
  const promiseXp = slots.reduce((sum, progress) => sum + calcPromiseXp(progress), 0);
  const promiseCoins = slots.reduce((sum, progress) => sum + calcPromiseCoins(progress), 0);

  return {
    score: calcDailyScore(slots),
    stamp: hasParticipationStamp(slots),
    xp: promiseXp + (reflected ? XP_REFLECTION : 0),
    coins: promiseCoins + (reflected ? COIN_REFLECTION : 0),
  };
}

/**
 * Converts accumulated XP into a level: 1 + floor(XP / 100).
 */
export function calcLevel(totalXp: number): LevelInfo {
  const safeXp = Math.max(0, Math.floor(totalXp));

  return {
    level: 1 + Math.floor(safeXp / XP_PER_LEVEL),
    xpInLevel: safeXp % XP_PER_LEVEL,
    xpForNext: XP_PER_LEVEL,
  };
}

/**
 * Averages the daily scores of the eligible days, or null when no day counted yet.
 */
export function calcWeeklyScore(dailyScores: number[]): number | null {
  if (dailyScores.length === 0) {
    return null;
  }

  return dailyScores.reduce((sum, score) => sum + score, 0) / dailyScores.length;
}

/**
 * Classifies how far a weekly ranking may be trusted for the current point in the week.
 */
export function getWeeklyStatus(eligibleDaysSoFar: number, weekClosed: boolean): WeeklyStatus {
  if (eligibleDaysSoFar <= 0) {
    return "none";
  }

  if (eligibleDaysSoFar < FORMAL_RANK_MIN_DAYS) {
    return "collecting";
  }

  return weekClosed ? "final" : "provisional";
}

/**
 * Returns how many stamps a student needs for the weekly voucher: min(3, eligible days).
 */
export function getVoucherTarget(eligibleDayCount: number): number {
  return Math.max(0, Math.min(STAMP_TARGET, Math.floor(eligibleDayCount)));
}

/**
 * Tells whether the base weekly voucher (ice cream) has been earned.
 */
export function isVoucherEarned(stampCount: number, eligibleDayCount: number): boolean {
  const target = getVoucherTarget(eligibleDayCount);

  return target > 0 && stampCount >= target;
}

/**
 * Builds the storm-growth baseline: max(mean of the last two valid weeks, last storm-growth week score).
 */
export function calcGrowthBaseline(
  lastTwoValidWeekScores: number[],
  lastStormWeekScore: number | null,
): number | null {
  if (lastTwoValidWeekScores.length < 2) {
    return null;
  }

  const average = (lastTwoValidWeekScores[0] + lastTwoValidWeekScores[1]) / 2;

  return lastStormWeekScore === null ? average : Math.max(average, lastStormWeekScore);
}

/**
 * Decides whether a finished week qualifies for the storm-growth badge (+20 points and 3 stamps).
 */
export function isStormGrowth(input: {
  score: number | null;
  baseline: number | null;
  stampCount: number;
  weekFinal: boolean;
}): boolean {
  if (input.score === null || input.baseline === null || !input.weekFinal) {
    return false;
  }

  return input.stampCount >= STAMP_TARGET && input.score >= input.baseline + STORM_GROWTH_GAIN;
}

/**
 * Walks weeks oldest to newest and finds each week's storm-growth baseline and result.
 * A week is valid when it had at least three eligible days and is closed.
 */
export function evaluateStormHistory(weeks: WeekRecord[]): WeekEvaluation[] {
  const evaluations: WeekEvaluation[] = [];
  let lastStormScore: number | null = null;

  weeks.forEach((week, index) => {
    const priorValidScores = weeks
      .slice(0, index)
      .filter((prior): prior is WeekRecord & { score: number } => prior.valid && prior.score !== null)
      .map((prior) => prior.score);
    const lastTwo = priorValidScores.slice(-2);
    const baseline = calcGrowthBaseline(lastTwo, lastStormScore);
    const storm = isStormGrowth({
      score: week.score,
      baseline,
      stampCount: week.stampCount,
      weekFinal: week.valid,
    });

    if (storm && week.score !== null) {
      lastStormScore = week.score;
    }

    evaluations.push({ baseline, storm });
  });

  return evaluations;
}

/**
 * Tells whether a week counts as a comeback: the last valid week had 0-1 stamps and this one reached three.
 */
export function isComeback(previousWeekStampCount: number | null, stampCount: number): boolean {
  return previousWeekStampCount !== null && previousWeekStampCount <= 1 && stampCount >= STAMP_TARGET;
}

/**
 * Tells whether a week is a first step: no earlier valid week exists and the base voucher was earned.
 */
export function isFirstStep(hasPriorValidWeek: boolean, voucherEarned: boolean): boolean {
  return !hasPriorValidWeek && voucherEarned;
}

/**
 * Picks the single badge shown for a week. All paths share one voucher per week.
 */
export function pickWeeklyBadge(input: {
  storm: boolean;
  comeback: boolean;
  firstStep: boolean;
  voucherEarned: boolean;
}): WeeklyBadge | null {
  if (input.storm) {
    return "storm";
  }

  if (input.comeback) {
    return "comeback";
  }

  if (input.firstStep) {
    return "firstStep";
  }

  return input.voucherEarned ? "steady" : null;
}

/**
 * Computes a team score as total student-day scores divided by the number of student-days.
 */
export function calcTeamScore(studentDayScores: number[]): number | null {
  if (studentDayScores.length === 0) {
    return null;
  }

  return studentDayScores.reduce((sum, score) => sum + score, 0) / studentDayScores.length;
}

/**
 * Ranks entries by score with shared ranks for ties (1, 1, 3 style). Null scores are left unranked.
 */
export function rankWithTies<T>(
  entries: T[],
  getScore: (entry: T) => number | null,
): RankedEntry<T>[] {
  const scored = entries
    .map((entry) => ({ entry, score: getScore(entry) }))
    .filter((item): item is { entry: T; score: number } => item.score !== null)
    .sort((left, right) => right.score - left.score);

  const ranked: RankedEntry<T>[] = [];
  scored.forEach((item, index) => {
    const previous = scored[index - 1];
    const isTie = previous !== undefined && Math.abs(previous.score - item.score) < TIE_EPSILON;
    const rank = isTie ? ranked[index - 1].rank : index + 1;
    ranked.push({ rank, entry: item.entry });
  });

  return ranked;
}

/**
 * Bundles ranked entries by rank and keeps only the top groups (ties stay together).
 */
export function groupTopRanks<T>(ranked: RankedEntry<T>[], maxRank = 3): RankGroup<T>[] {
  const groups: RankGroup<T>[] = [];

  ranked
    .filter((item) => item.rank <= maxRank)
    .forEach((item) => {
      const last = groups[groups.length - 1];
      if (last && last.rank === item.rank) {
        last.entries.push(item.entry);
        return;
      }

      groups.push({ rank: item.rank, entries: [item.entry] });
    });

  return groups;
}

/**
 * Formats a score for display with one decimal place.
 */
export function formatScore(score: number | null): string {
  return score === null ? "-" : score.toFixed(1);
}
