import { describe, expect, it } from "vitest";

import {
  BASE_POINTS,
  MAX_CHALLENGES_PER_DAY,
  MAX_PAIR_DUELS_PER_DAY,
  MAX_REWARDED_DUELS_PER_DAY,
  MAX_SPEED_BONUS,
  QUESTION_MS,
  RATING_FLOOR,
  START_RATING,
  applyElo,
  decideOutcome,
  explainChallengeBlock,
  expectedScore,
  flipOutcome,
  isValidAnswerSet,
  leagueFor,
  pointsToNextLeague,
  rewardFor,
  scoreAnswers,
} from "@/utils/arena-rules";

describe("리그와 레이팅", () => {
  it("레이팅에 맞는 리그를 고르고, 다음 리그까지 남은 점수를 알려 준다", () => {
    expect(leagueFor(START_RATING).key).toBe("sprout");
    expect(leagueFor(RATING_FLOOR).key).toBe("seed");
    expect(leagueFor(1080).key).toBe("flower");
    expect(leagueFor(1500).key).toBe("star");
    expect(pointsToNextLeague(1000)).toBe(80);
    expect(pointsToNextLeague(1400)).toBeNull();
  });

  it("실력이 같으면 기대 승률이 50%이고, 높은 쪽이 더 높다", () => {
    expect(expectedScore(1000, 1000)).toBeCloseTo(0.5, 5);
    expect(expectedScore(1200, 1000)).toBeGreaterThan(0.7);
    expect(expectedScore(1000, 1200)).toBeLessThan(0.3);
  });

  it("같은 실력끼리 이기면 +12, 지면 −12이고 상대는 반대로 움직인다", () => {
    expect(applyElo(1000, 1000, "WIN")).toEqual({ challenger: 1012, opponent: 988, delta: 12 });
    expect(applyElo(1000, 1000, "LOSE")).toEqual({ challenger: 988, opponent: 1012, delta: -12 });
    expect(applyElo(1000, 1000, "DRAW").delta).toBe(0);
  });

  it("약한 사람이 강한 사람을 이기면 더 많이 오르고, 바닥(800) 아래로는 내려가지 않는다", () => {
    expect(applyElo(900, 1300, "WIN").delta).toBeGreaterThan(20);
    expect(applyElo(1300, 900, "WIN").delta).toBeLessThan(4);
    expect(applyElo(RATING_FLOOR, 1200, "LOSE").challenger).toBe(RATING_FLOOR);
    expect(applyElo(1200, RATING_FLOOR, "WIN").opponent).toBe(RATING_FLOOR);
  });
});

describe("채점", () => {
  it("맞으면 100점에 빠를수록 최대 20점이 더해지고 틀리면 0점이다", () => {
    const result = scoreAnswers([1, 2, 0], [
      { choice: 1, ms: 0 },
      { choice: 3, ms: 3000 },
      { choice: 0, ms: QUESTION_MS / 2 },
    ]);

    expect(result.correct).toBe(2);
    expect(result.marks).toEqual([true, false, true]);
    expect(result.score).toBe(BASE_POINTS + MAX_SPEED_BONUS + BASE_POINTS + MAX_SPEED_BONUS / 2);
  });

  it("시간이 다 지났거나 답을 안 고르면 0점이고, 시간은 최대치로 잘린다", () => {
    const result = scoreAnswers([0, 0], [{ choice: 0, ms: QUESTION_MS }, { choice: null, ms: 500 }]);

    expect(result.score).toBe(0);
    expect(result.totalMs).toBe(QUESTION_MS + 500);
    expect(scoreAnswers([0], [{ choice: 0, ms: 999999 }]).totalMs).toBe(QUESTION_MS);
    expect(scoreAnswers([0], [{ choice: 0, ms: -50 }]).totalMs).toBe(0);
  });

  it("답이 모자라도 채점은 되고 모자란 문제는 틀린 것으로 본다", () => {
    expect(scoreAnswers([0, 1], [{ choice: 0, ms: 100 }]).correct).toBe(1);
  });

  it("답안 모양 검사: 개수·보기 번호·시간이 어긋나면 거절한다", () => {
    const good = [{ choice: 0, ms: 10 }, { choice: null, ms: 12000 }];

    expect(isValidAnswerSet(good, 2, 4)).toBe(true);
    expect(isValidAnswerSet(good, 3, 4)).toBe(false);
    expect(isValidAnswerSet([{ choice: 4, ms: 1 }, good[1]], 2, 4)).toBe(false);
    expect(isValidAnswerSet([{ choice: 1.5, ms: 1 }, good[1]], 2, 4)).toBe(false);
    expect(isValidAnswerSet([{ choice: 0, ms: Number.NaN }, good[1]], 2, 4)).toBe(false);
    expect(isValidAnswerSet("답", 2, 4)).toBe(false);
    expect(isValidAnswerSet([null, good[1]], 2, 4)).toBe(false);
  });
});

describe("결과와 보상", () => {
  it("점수가 같으면 무승부이고, 뒤집어 보면 반대가 된다", () => {
    expect(decideOutcome(300, 200)).toBe("WIN");
    expect(decideOutcome(100, 220)).toBe("LOSE");
    expect(decideOutcome(240, 240)).toBe("DRAW");
    expect(flipOutcome("WIN")).toBe("LOSE");
    expect(flipOutcome("DRAW")).toBe("DRAW");
  });

  it("이기든 지든 참여 보상이 있고, 하루 횟수를 넘기면 없다", () => {
    expect(rewardFor("WIN", 0)).toEqual({ xp: 6, coins: 3 });
    expect(rewardFor("DRAW", 2)).toEqual({ xp: 4, coins: 2 });
    expect(rewardFor("LOSE", 0)).toEqual({ xp: 3, coins: 1 });
    expect(rewardFor("WIN", MAX_REWARDED_DUELS_PER_DAY)).toEqual({ xp: 0, coins: 0 });
  });

  it("도전장을 못 내는 이유를 우선순위대로 알려 준다", () => {
    const ok = { enabled: true, isSelf: false, challengesToday: 0, pairDuelsToday: 0, openBetweenPair: false };

    expect(explainChallengeBlock(ok)).toBeNull();
    expect(explainChallengeBlock({ ...ok, enabled: false })).toContain("선생님");
    expect(explainChallengeBlock({ ...ok, isSelf: true })).toContain("나 자신");
    expect(explainChallengeBlock({ ...ok, openBetweenPair: true })).toContain("끝나지 않은");
    expect(explainChallengeBlock({ ...ok, challengesToday: MAX_CHALLENGES_PER_DAY })).toContain("하루에");
    expect(explainChallengeBlock({ ...ok, pairDuelsToday: MAX_PAIR_DUELS_PER_DAY })).toContain("충분히");
  });
});
