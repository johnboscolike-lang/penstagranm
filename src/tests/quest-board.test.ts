import { describe, expect, it } from "vitest";

import {
  buildLastWeekNews,
  buildWeekBoard,
  calcStudentWeek,
  getDayProgress,
  indexPromises,
  type PromiseRecord,
  type StudentRecord,
  type TeamRecord,
} from "@/utils/quest-board";

const TEAMS: TeamRecord[] = [
  { id: "t1", name: "별빛팀", emblem: "star" },
  { id: "t2", name: "새싹팀", emblem: "sprout" },
];

const STUDENTS: StudentRecord[] = [
  { id: "s1", name: "가", hairKey: "black", teamId: "t1", isMe: false },
  { id: "s2", name: "나", hairKey: "brown", teamId: "t1", isMe: false },
  { id: "me", name: "도토리", hairKey: "silver", teamId: "t2", isMe: true },
];

// 2026-09-28(월) ~ 2026-10-02(금)
const WEEK = ["2026-09-28", "2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02"];

/**
 * Builds the three promise records of one day from confirmed counts (planned 4, 4, 4).
 */
function day(studentId: string, dateKey: string, confirmed: [number, number, number]): PromiseRecord[] {
  return confirmed.map((confirmedUnits, slotIndex) => ({
    studentId,
    dateKey,
    slotIndex,
    plannedUnits: 4,
    confirmedUnits,
  }));
}

describe("calcStudentWeek", () => {
  it("scores Mon/Wed/Fri single-promise weeks at 20 and still earns the voucher once the week is over", () => {
    const records = [WEEK[0], WEEK[2], WEEK[4]].flatMap((dateKey) => day("me", dateKey, [4, 0, 0]));
    const index = indexPromises(records);
    const stats = calcStudentWeek(index, "me", "2026-09-30", "2026-10-04");

    expect(stats.score).toBeCloseTo(20, 6);
    expect(stats.stampCount).toBe(3);
    expect(stats.voucherEarned).toBe(true);
    expect(stats.status).toBe("final");
    expect(stats.closed).toBe(true);
  });

  it("only counts started days and treats past days without records as zero", () => {
    const index = indexPromises(day("me", WEEK[0], [4, 4, 4]));
    const stats = calcStudentWeek(index, "me", "2026-09-29", "2026-09-30");

    expect(stats.eligibleDayKeys).toEqual(WEEK.slice(0, 3));
    expect(stats.dailyScores.map((entry) => entry.score)).toEqual([100, 0, 0]);
    expect(stats.score).toBeCloseTo(33.333, 2);
    expect(stats.status).toBe("provisional");
    expect(stats.voucherEarned).toBe(false);
  });

  it("marks a two-day week as still collecting records", () => {
    const stats = calcStudentWeek(indexPromises([]), "me", "2026-09-29", "2026-09-29");

    expect(stats.status).toBe("collecting");
    expect(stats.score).toBe(0);
  });

  it("starts a Thursday transfer on their first day and lowers the voucher target", () => {
    const records = [WEEK[3], WEEK[4]].flatMap((dateKey) => day("me", dateKey, [4, 0, 0]));
    const stats = calcStudentWeek(indexPromises(records), "me", "2026-09-30", "2026-10-04", "2026-10-01");

    expect(stats.eligibleDayKeys).toEqual([WEEK[3], WEEK[4]]);
    expect(stats.voucherTarget).toBe(2);
    expect(stats.voucherEarned).toBe(true);
    expect(stats.status).toBe("collecting");
  });

  it("has no record before the student joined", () => {
    const stats = calcStudentWeek(indexPromises([]), "me", "2026-09-29", "2026-10-04", "2026-10-05");

    expect(stats.eligibleDayKeys).toEqual([]);
    expect(stats.score).toBeNull();
    expect(stats.voucherEarned).toBe(false);
    expect(stats.status).toBe("none");
  });

  it("returns an empty read for unknown students and days", () => {
    expect(getDayProgress(indexPromises([]), "nobody", "2026-09-28")).toEqual([]);
  });
});

describe("buildWeekBoard", () => {
  const records = [
    ...WEEK.slice(0, 3).flatMap((dateKey) => day("s1", dateKey, [4, 4, 4])),
    ...WEEK.slice(0, 3).flatMap((dateKey) => day("s2", dateKey, [4, 2, 0])),
    ...WEEK.slice(0, 3).flatMap((dateKey) => day("me", dateKey, [4, 4, 4])),
    // 지난주: 도토리 40점 근처
    ...["2026-09-21", "2026-09-22", "2026-09-23"].flatMap((dateKey) => day("me", dateKey, [4, 2, 0])),
  ];
  const index = indexPromises(records);
  const board = buildWeekBoard({ students: STUDENTS, teams: TEAMS, index, asOfKey: "2026-09-30", meId: "me" });

  it("shares first place between students with the same score", () => {
    expect(board.individuals.map((row) => [row.name, row.rank])).toEqual([
      ["가", 1],
      ["도토리", 1],
      ["나", 3],
    ]);
    expect(board.topGroups).toHaveLength(2);
    expect(board.topGroups[0].rows).toHaveLength(2);
    expect(board.me?.rank).toBe(1);
  });

  it("compares teams by student-day average so team size does not matter", () => {
    const [first, second] = board.teams;

    expect(second.name).toBe("별빛팀");
    expect(second.score).toBeCloseTo((100 + 100 + 100 + 50 + 50 + 50) / 6, 6);
    expect(first.name).toBe("새싹팀");
    expect(first.score).toBe(100);
    expect(board.myTeamRank).toBe(1);
  });

  it("reports the provisional status and the change from last week", () => {
    expect(board.status).toBe("provisional");
    expect(board.closed).toBe(false);
    // 지난주 월~수 50점, 목·금 기록 없음(0점) → (50 + 50 + 50 + 0 + 0) / 5 = 30
    expect(board.previousWeekScore).toBeCloseTo(30, 6);
    expect(board.deltaFromPreviousWeek).toBeCloseTo(70, 6);
  });
});

describe("buildLastWeekNews", () => {
  /**
   * Builds one full school week of a student with the same confirmed counts every day.
   */
  function fullWeek(studentId: string, mondayKey: string, confirmed: [number, number, number]): PromiseRecord[] {
    const [year, month, date] = mondayKey.split("-").map(Number);
    return Array.from({ length: 5 }, (_, offset) => {
      const key = new Date(Date.UTC(year, month - 1, date + offset)).toISOString().slice(0, 10);
      return day(studentId, key, confirmed);
    }).flat();
  }

  it("awards storm growth when last week beats the two-week baseline by 20 points", () => {
    const records = [
      ...fullWeek("me", "2026-08-31", [4, 0, 0]),
      ...fullWeek("me", "2026-09-07", [4, 2, 0]),
      ...fullWeek("me", "2026-09-14", [4, 4, 0]),
      ...fullWeek("me", "2026-09-21", [4, 4, 4]),
    ];
    const news = buildLastWeekNews(indexPromises(records), "me", "2026-09-28", 4);

    // 세 번째 주(66.7점)가 이미 폭풍성장이었으므로 기준선은 그 주 점수로 올라간다.
    expect(news.baseline).toBeCloseTo(66.6667, 3);
    expect(news.score).toBe(100);
    expect(news.badge).toBe("storm");
    expect(news.voucherEarned).toBe(true);
  });

  it("gives a steady badge for a normal week and nothing without three stamps", () => {
    const steady = [
      ...fullWeek("me", "2026-09-07", [4, 4, 0]),
      ...fullWeek("me", "2026-09-14", [4, 4, 0]),
      ...fullWeek("me", "2026-09-21", [4, 4, 0]),
    ];
    const none = [...steady.filter((record) => record.dateKey < "2026-09-21"), ...day("me", "2026-09-21", [4, 4, 4])];

    expect(buildLastWeekNews(indexPromises(steady), "me", "2026-09-28", 3).badge).toBe("steady");
    expect(buildLastWeekNews(indexPromises(none), "me", "2026-09-28", 3).badge).toBeNull();
  });

  it("marks a comeback after a quiet week", () => {
    const records = [
      ...fullWeek("me", "2026-09-14", [4, 4, 4]),
      ...day("me", "2026-09-21", [4, 0, 0]),
    ];
    const quiet = buildLastWeekNews(indexPromises(records), "me", "2026-09-28", 2);
    const back = buildLastWeekNews(
      indexPromises([...records, ...fullWeek("me", "2026-09-28", [4, 4, 4])]),
      "me",
      "2026-10-05",
      2,
    );

    expect(quiet.stampCount).toBe(1);
    expect(back.badge).toBe("comeback");
  });

  it("calls the first qualifying week after joining a first step", () => {
    const records = fullWeek("me", "2026-09-21", [4, 0, 0]);
    const news = buildLastWeekNews(indexPromises(records), "me", "2026-09-28", 3, "2026-09-21");

    expect(news.badge).toBe("firstStep");
    expect(news.baseline).toBeNull();
  });
});
