import { describe, expect, it } from "vitest";

import {
  calcDailyResult,
  calcDailyScore,
  calcGrowthBaseline,
  calcLevel,
  calcPromiseCoins,
  calcPromiseRatio,
  calcPromiseXp,
  calcTeamScore,
  calcWeeklyScore,
  evaluateStormHistory,
  formatScore,
  getVoucherTarget,
  getWeeklyStatus,
  groupTopRanks,
  hasParticipationStamp,
  isComeback,
  isFirstStep,
  isStormGrowth,
  isVoucherEarned,
  MAX_DAILY_COINS,
  MAX_DAILY_XP,
  pickWeeklyBadge,
  rankWithTies,
  type PromiseProgress,
} from "@/utils/quest-rules";

/**
 * Builds a progress fixture from confirmed and planned unit counts.
 */
function progress(confirmedUnits: number, plannedUnits: number): PromiseProgress {
  return { confirmedUnits, plannedUnits };
}

describe("daily score", () => {
  it("matches the planning example: 3/6, 2/4, 5/15 is 44.4 points with no stamp", () => {
    const slots = [progress(3, 6), progress(2, 4), progress(5, 15)];

    expect(formatScore(calcDailyScore(slots))).toBe("44.4");
    expect(hasParticipationStamp(slots)).toBe(false);
  });

  it("gives a stamp once one promise is fully done, and 100 points when all are", () => {
    expect(hasParticipationStamp([progress(6, 6), progress(0, 4), progress(0, 15)])).toBe(true);
    expect(calcDailyScore([progress(6, 6), progress(4, 4), progress(15, 15)])).toBe(100);
  });

  it("treats missing slots as zero and clamps over-counted or empty plans", () => {
    expect(calcDailyScore([progress(4, 4)])).toBeCloseTo(33.333, 2);
    expect(calcPromiseRatio(progress(9, 4))).toBe(1);
    expect(calcPromiseRatio(progress(-2, 4))).toBe(0);
    expect(calcPromiseRatio(progress(1, 0))).toBe(1);
  });
});

describe("XP and coins", () => {
  it("matches the class example: fractions 1, 0.5, 0 give 50 points, 30 XP, 40 XP with reflection", () => {
    const slots = [progress(4, 4), progress(2, 4), progress(0, 4)];

    expect(calcDailyResult(slots, false)).toMatchObject({ score: 50, stamp: true, xp: 30, coins: 6 });
    expect(calcDailyResult(slots, true)).toMatchObject({ xp: 40, coins: 8 });
  });

  it("floors partial progress without floating point drift", () => {
    expect(calcPromiseXp(progress(1, 3))).toBe(6);
    expect(calcPromiseXp(progress(2, 3))).toBe(13);
    expect(calcPromiseXp(progress(57, 100))).toBe(11);
    expect(calcPromiseCoins(progress(1, 3))).toBe(1);
    expect(calcPromiseCoins(progress(3, 15))).toBe(0);
  });

  it("caps a perfect day at 70 XP and 14 coins", () => {
    const perfect = calcDailyResult([progress(6, 6), progress(4, 4), progress(15, 15)], true);

    expect(perfect.xp).toBe(MAX_DAILY_XP);
    expect(perfect.coins).toBe(MAX_DAILY_COINS);
    expect(MAX_DAILY_XP).toBe(70);
    expect(MAX_DAILY_COINS).toBe(14);
  });

  it("derives level from accumulated XP: 640 XP is Lv.7 with 40/100", () => {
    expect(calcLevel(640)).toEqual({ level: 7, xpInLevel: 40, xpForNext: 100 });
    expect(calcLevel(0).level).toBe(1);
    expect(calcLevel(99).level).toBe(1);
    expect(calcLevel(100).level).toBe(2);
  });
});

describe("weekly score and voucher", () => {
  it("scores Mon/Wed/Fri single-promise weeks at 20 points yet still earns the voucher", () => {
    const oneDone = calcDailyScore([progress(4, 4), progress(0, 4), progress(0, 4)]);
    const week = calcWeeklyScore([oneDone, 0, oneDone, 0, oneDone]);

    expect(week).toBeCloseTo(20, 6);
    expect(isVoucherEarned(3, 5)).toBe(true);
    expect(isVoucherEarned(2, 5)).toBe(false);
  });

  it("lowers the target for short weeks and ignores weeks without eligible days", () => {
    expect(getVoucherTarget(2)).toBe(2);
    expect(isVoucherEarned(2, 2)).toBe(true);
    expect(isVoucherEarned(0, 0)).toBe(false);
    expect(calcWeeklyScore([])).toBeNull();
  });

  it("marks a ranking as collecting, provisional, or final", () => {
    expect(getWeeklyStatus(0, false)).toBe("none");
    expect(getWeeklyStatus(2, false)).toBe("collecting");
    expect(getWeeklyStatus(3, false)).toBe("provisional");
    expect(getWeeklyStatus(5, true)).toBe("final");
    expect(getWeeklyStatus(2, true)).toBe("collecting");
  });
});

describe("storm growth", () => {
  it("uses the two-week average as baseline: 30 and 40 then 60 points qualifies", () => {
    const baseline = calcGrowthBaseline([30, 40], null);

    expect(baseline).toBe(35);
    expect(isStormGrowth({ score: 60, baseline, stampCount: 3, weekFinal: true })).toBe(true);
  });

  it("needs +20 points, three stamps, a final week, and a baseline", () => {
    expect(isStormGrowth({ score: 54.9, baseline: 35, stampCount: 3, weekFinal: true })).toBe(false);
    expect(isStormGrowth({ score: 60, baseline: 35, stampCount: 2, weekFinal: true })).toBe(false);
    expect(isStormGrowth({ score: 60, baseline: 35, stampCount: 3, weekFinal: false })).toBe(false);
    expect(isStormGrowth({ score: 60, baseline: null, stampCount: 3, weekFinal: true })).toBe(false);
    expect(calcGrowthBaseline([30], null)).toBeNull();
  });

  it("raises the baseline to the last storm-growth week to stop repeat awards", () => {
    expect(calcGrowthBaseline([30, 40], 50)).toBe(50);
    expect(calcGrowthBaseline([60, 50], 40)).toBe(55);
  });
});

describe("evaluateStormHistory", () => {
  it("needs two valid weeks before the first storm-growth award", () => {
    const result = evaluateStormHistory([
      { score: 30, stampCount: 2, valid: true },
      { score: 40, stampCount: 3, valid: true },
      { score: 60, stampCount: 3, valid: true },
    ]);

    expect(result.map((week) => week.baseline)).toEqual([null, null, 35]);
    expect(result.map((week) => week.storm)).toEqual([false, false, true]);
  });

  it("skips invalid weeks and lifts the baseline after an award", () => {
    const result = evaluateStormHistory([
      { score: 30, stampCount: 3, valid: true },
      { score: 40, stampCount: 3, valid: true },
      { score: 90, stampCount: 1, valid: false },
      { score: 60, stampCount: 3, valid: true },
      { score: 65, stampCount: 3, valid: true },
    ]);

    expect(result[3].baseline).toBe(35);
    expect(result[3].storm).toBe(true);
    expect(result[4].baseline).toBe(60);
    expect(result[4].storm).toBe(false);
  });
});

describe("weekly badge", () => {
  it("recognizes a comeback after a 0-1 stamp week", () => {
    expect(isComeback(0, 3)).toBe(true);
    expect(isComeback(1, 4)).toBe(true);
    expect(isComeback(2, 3)).toBe(false);
    expect(isComeback(null, 3)).toBe(false);
    expect(isComeback(0, 2)).toBe(false);
  });

  it("recognizes a first step only when there is no earlier valid week", () => {
    expect(isFirstStep(false, true)).toBe(true);
    expect(isFirstStep(true, true)).toBe(false);
    expect(isFirstStep(false, false)).toBe(false);
  });

  it("gives one badge per week with storm growth first and steady last", () => {
    expect(pickWeeklyBadge({ storm: true, comeback: true, firstStep: true, voucherEarned: true })).toBe("storm");
    expect(pickWeeklyBadge({ storm: false, comeback: true, firstStep: true, voucherEarned: true })).toBe("comeback");
    expect(pickWeeklyBadge({ storm: false, comeback: false, firstStep: true, voucherEarned: true })).toBe("firstStep");
    expect(pickWeeklyBadge({ storm: false, comeback: false, firstStep: false, voucherEarned: true })).toBe("steady");
    expect(pickWeeklyBadge({ storm: false, comeback: false, firstStep: false, voucherEarned: false })).toBeNull();
  });
});

describe("team score and ranking", () => {
  it("averages by student-days so uneven teams compare fairly", () => {
    expect(calcTeamScore([80, 90, 70])).toBe(80);
    expect(calcTeamScore([100, 60])).toBe(80);
    expect(calcTeamScore([])).toBeNull();
  });

  it("shares a rank among ties and skips the following ranks", () => {
    const ranked = rankWithTies(
      [
        { name: "가", score: 70 },
        { name: "나", score: 80 },
        { name: "다", score: 80 },
        { name: "라", score: 60 },
        { name: "마", score: null },
      ],
      (entry) => entry.score,
    );

    expect(ranked.map((item) => [item.entry.name, item.rank])).toEqual([
      ["나", 1],
      ["다", 1],
      ["가", 3],
      ["라", 4],
    ]);
  });

  it("bundles the top ranks and keeps a large tie on a single line", () => {
    const ranked = rankWithTies(
      ["a", "b", "c", "d", "e"].map((name) => ({ name, score: 90 })).concat([{ name: "f", score: 50 }]),
      (entry) => entry.score,
    );
    const groups = groupTopRanks(ranked);

    expect(groups).toHaveLength(1);
    expect(groups[0].rank).toBe(1);
    expect(groups[0].entries).toHaveLength(5);
  });

  it("treats float noise as a tie", () => {
    const ranked = rankWithTies([{ s: 0.1 + 0.2 }, { s: 0.3 }], (entry) => entry.s);

    expect(ranked.map((item) => item.rank)).toEqual([1, 1]);
  });
});
