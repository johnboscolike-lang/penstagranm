import { addDaysToKey, getEligibleDayKeys, getSchoolDayKeys, getWeekStartKey, getWeekdayIndex } from "@/utils/kst";
import {
  calcDailyScore,
  calcTeamScore,
  calcWeeklyScore,
  evaluateStormHistory,
  getVoucherTarget,
  getWeeklyStatus,
  groupTopRanks,
  hasParticipationStamp,
  isComeback,
  isFirstStep,
  isVoucherEarned,
  pickWeeklyBadge,
  rankWithTies,
  FORMAL_RANK_MIN_DAYS,
  type PromiseProgress,
  type WeekRecord,
  type WeeklyBadge,
  type WeeklyStatus,
} from "@/utils/quest-rules";

export interface StudentRecord {
  id: string;
  name: string;
  hairKey: string;
  teamId: string;
  isMe: boolean;
  joinedOn?: string;
}

export interface TeamRecord {
  id: string;
  name: string;
  emblem: string;
}

export interface PromiseRecord {
  studentId: string;
  dateKey: string;
  slotIndex: number;
  plannedUnits: number;
  confirmedUnits: number;
}

export type PromiseIndex = Map<string, Map<string, PromiseProgress[]>>;

export interface DailyScoreEntry {
  dateKey: string;
  score: number;
  stamp: boolean;
}

export interface StudentWeekStats {
  weekStartKey: string;
  eligibleDayKeys: string[];
  dailyScores: DailyScoreEntry[];
  score: number | null;
  stampCount: number;
  closed: boolean;
  status: WeeklyStatus;
  voucherTarget: number;
  voucherEarned: boolean;
}

export interface IndividualRow {
  studentId: string;
  name: string;
  hairKey: string;
  teamId: string;
  teamName: string;
  score: number | null;
  stampCount: number;
  rank: number;
}

export interface TeamRow {
  teamId: string;
  name: string;
  emblem: string;
  score: number | null;
  rank: number;
  memberNames: string[];
  memberHairKeys: string[];
}

export interface WeekBoard {
  weekStartKey: string;
  asOfKey: string;
  eligibleDayKeys: string[];
  closed: boolean;
  status: WeeklyStatus;
  individuals: IndividualRow[];
  topGroups: { rank: number; rows: IndividualRow[] }[];
  me: IndividualRow | null;
  myTeamRank: number | null;
  myStats: StudentWeekStats | null;
  teams: TeamRow[];
  previousWeekScore: number | null;
  deltaFromPreviousWeek: number | null;
}

export interface WeekNews {
  weekStartKey: string;
  score: number | null;
  stampCount: number;
  voucherEarned: boolean;
  badge: WeeklyBadge | null;
  baseline: number | null;
}

/**
 * Groups promise records by student and day, ordered by slot so the daily formulas can read them directly.
 */
export function indexPromises(records: PromiseRecord[]): PromiseIndex {
  const index: PromiseIndex = new Map();
  const ordered = [...records].sort((left, right) => left.slotIndex - right.slotIndex);

  ordered.forEach((record) => {
    const studentDays = index.get(record.studentId) ?? new Map<string, PromiseProgress[]>();
    const slots = studentDays.get(record.dateKey) ?? [];
    slots.push({ confirmedUnits: record.confirmedUnits, plannedUnits: record.plannedUnits });
    studentDays.set(record.dateKey, slots);
    index.set(record.studentId, studentDays);
  });

  return index;
}

/**
 * Reads one student's promises for a day. A missing day means nothing was planned or done.
 */
export function getDayProgress(index: PromiseIndex, studentId: string, dateKey: string): PromiseProgress[] {
  return index.get(studentId)?.get(dateKey) ?? [];
}

/**
 * Computes one student's daily scores, stamps, weekly average and voucher state for a week as of a date.
 * Days before the student joined (joinedOnKey) are not eligible, so a mid-week transfer starts on their first day.
 */
export function calcStudentWeek(
  index: PromiseIndex,
  studentId: string,
  weekAnyDayKey: string,
  asOfKey: string,
  joinedOnKey = "0000-01-01",
): StudentWeekStats {
  const weekStartKey = getWeekStartKey(weekAnyDayKey);
  const allWeekKeys = getSchoolDayKeys(weekStartKey);
  const fullWeekKeys = allWeekKeys.filter((dayKey) => dayKey >= joinedOnKey);
  const eligibleDayKeys = getEligibleDayKeys(weekStartKey, asOfKey).filter((dayKey) => dayKey >= joinedOnKey);
  const closed = asOfKey > allWeekKeys[allWeekKeys.length - 1];

  const dailyScores = eligibleDayKeys.map((dateKey) => {
    const progresses = getDayProgress(index, studentId, dateKey);

    return {
      dateKey,
      score: calcDailyScore(progresses),
      stamp: hasParticipationStamp(progresses),
    };
  });
  const stampCount = dailyScores.filter((entry) => entry.stamp).length;

  return {
    weekStartKey,
    eligibleDayKeys,
    dailyScores,
    score: calcWeeklyScore(dailyScores.map((entry) => entry.score)),
    stampCount,
    closed,
    status: getWeeklyStatus(eligibleDayKeys.length, closed),
    voucherTarget: getVoucherTarget(fullWeekKeys.length),
    voucherEarned: isVoucherEarned(stampCount, fullWeekKeys.length),
  };
}

/**
 * Builds the individual and team boards for the week containing asOfKey.
 */
export function buildWeekBoard(input: {
  students: StudentRecord[];
  teams: TeamRecord[];
  index: PromiseIndex;
  asOfKey: string;
  meId: string;
}): WeekBoard {
  const { students, teams, index, asOfKey, meId } = input;
  const weekStartKey = getWeekStartKey(asOfKey);
  const teamNameById = new Map(teams.map((team) => [team.id, team.name]));
  const statsByStudent = new Map(
    students.map((student) => [
      student.id,
      calcStudentWeek(index, student.id, weekStartKey, asOfKey, student.joinedOn),
    ]),
  );

  const unranked = students.map((student) => {
    const stats = statsByStudent.get(student.id) as StudentWeekStats;

    return {
      studentId: student.id,
      name: student.name,
      hairKey: student.hairKey,
      teamId: student.teamId,
      teamName: teamNameById.get(student.teamId) ?? "",
      score: stats.score,
      stampCount: stats.stampCount,
    };
  });
  const rankedIndividuals = rankWithTies(unranked, (row) => row.score);
  const individuals: IndividualRow[] = rankedIndividuals.map((item) => ({ ...item.entry, rank: item.rank }));
  const topGroups = groupTopRanks(rankedIndividuals).map((group) => ({
    rank: group.rank,
    rows: group.entries.map((entry) => individuals.find((row) => row.studentId === entry.studentId) as IndividualRow),
  }));

  const teamRows = teams.map((team) => {
    const members = students.filter((student) => student.teamId === team.id);
    const studentDayScores = members.flatMap((member) =>
      (statsByStudent.get(member.id) as StudentWeekStats).dailyScores.map((entry) => entry.score),
    );

    return {
      teamId: team.id,
      name: team.name,
      emblem: team.emblem,
      score: calcTeamScore(studentDayScores),
      memberNames: members.map((member) => member.name),
      memberHairKeys: members.map((member) => member.hairKey),
    };
  });
  const rankedTeams = rankWithTies(teamRows, (row) => row.score);
  const teamBoard: TeamRow[] = rankedTeams.map((item) => ({ ...item.entry, rank: item.rank }));

  const me = individuals.find((row) => row.studentId === meId) ?? null;
  const myStudent = students.find((student) => student.id === meId);
  const myStats = statsByStudent.get(meId) ?? null;

  const previousWeekStats = calcStudentWeek(
    index,
    meId,
    addDaysToKey(weekStartKey, -7),
    addDaysToKey(weekStartKey, -1),
    myStudent?.joinedOn,
  );
  const previousValid = previousWeekStats.eligibleDayKeys.length >= FORMAL_RANK_MIN_DAYS;
  const previousWeekScore = previousValid ? previousWeekStats.score : null;
  const currentScore = myStats?.score ?? null;

  return {
    weekStartKey,
    asOfKey,
    eligibleDayKeys: myStats?.eligibleDayKeys ?? getEligibleDayKeys(weekStartKey, asOfKey),
    closed: getWeekdayIndex(asOfKey) >= 5,
    status: myStats?.status ?? "none",
    individuals,
    topGroups,
    me,
    myTeamRank: teamBoard.find((row) => row.teamId === myStudent?.teamId)?.rank ?? null,
    myStats,
    teams: teamBoard,
    previousWeekScore,
    deltaFromPreviousWeek: previousWeekScore !== null && currentScore !== null ? currentScore - previousWeekScore : null,
  };
}

/**
 * Evaluates the weeks before the current one and returns last week's news (voucher and badge).
 */
export function buildLastWeekNews(
  index: PromiseIndex,
  studentId: string,
  currentWeekStartKey: string,
  lookbackWeeks = 5,
  joinedOnKey?: string,
): WeekNews {
  const weekStarts = Array.from({ length: lookbackWeeks }, (_, offset) =>
    addDaysToKey(currentWeekStartKey, -7 * (lookbackWeeks - offset)),
  );
  const statsList = weekStarts.map((weekStart) =>
    calcStudentWeek(index, studentId, weekStart, addDaysToKey(weekStart, 6), joinedOnKey),
  );
  const records: WeekRecord[] = statsList.map((stats) => ({
    score: stats.score,
    stampCount: stats.stampCount,
    valid: stats.eligibleDayKeys.length >= FORMAL_RANK_MIN_DAYS,
  }));
  const evaluations = evaluateStormHistory(records);

  const lastIndex = statsList.length - 1;
  const last = statsList[lastIndex];
  const previous = records[lastIndex - 1];
  const hasPriorValidWeek = records.slice(0, lastIndex).some((record) => record.valid);
  const previousValid = previous?.valid ? previous : undefined;

  return {
    weekStartKey: last.weekStartKey,
    score: last.score,
    stampCount: last.stampCount,
    voucherEarned: last.voucherEarned,
    baseline: evaluations[lastIndex].baseline,
    badge: pickWeeklyBadge({
      storm: evaluations[lastIndex].storm,
      comeback: isComeback(previousValid ? previousValid.stampCount : null, last.stampCount),
      firstStep: isFirstStep(hasPriorValidWeek, last.voucherEarned),
      voucherEarned: last.voucherEarned,
    }),
  };
}
