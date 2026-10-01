import { describe, expect, it } from "vitest";

import {
  COMBO_MAX_STEPS,
  GAME_SECONDS,
  MAX_FINISH_SECONDS,
  MAX_POINTS_PER_HIT,
  MAX_REWARDED_RUNS_PER_DAY,
  MAX_RUNS_PER_DAY,
  MIN_FINISH_SECONDS,
  MONSTERS_PER_ROUND,
  POINTS_PER_HIT,
  REWARD_TIERS,
  buildRounds,
  explainResultProblem,
  hitPoints,
  maxPlausibleScore,
  rewardForScore,
  runsLeft,
} from "@/utils/minigame-rules";
import { VOCABULARY } from "@/utils/quiz-bank";

describe("점수 계산", () => {
  it("연속으로 맞힐수록 점수가 오르지만 한도가 있다", () => {
    expect(hitPoints(0)).toBe(POINTS_PER_HIT);
    expect(hitPoints(1)).toBeGreaterThan(hitPoints(0));
    expect(hitPoints(COMBO_MAX_STEPS)).toBe(MAX_POINTS_PER_HIT);
    expect(hitPoints(99)).toBe(MAX_POINTS_PER_HIT);
    expect(hitPoints(-3)).toBe(POINTS_PER_HIT);
    expect(hitPoints(2.9)).toBe(hitPoints(2));
  });

  it("보상은 점수 구간이 높을수록 많고, 낮은 점수에는 없다", () => {
    expect(rewardForScore(0)).toEqual({ xp: 0, coins: 0 });
    expect(rewardForScore(59)).toEqual({ xp: 0, coins: 0 });
    expect(rewardForScore(60)).toEqual({ xp: 2, coins: 1 });
    expect(rewardForScore(139)).toEqual({ xp: 2, coins: 1 });
    expect(rewardForScore(140)).toEqual({ xp: 4, coins: 2 });
    expect(rewardForScore(9999)).toEqual({ xp: 4, coins: 2 });
  });

  it("하루에 받을 수 있는 보상의 최대치가 작다 (퀘스트보다 커지지 않는다)", () => {
    const best = REWARD_TIERS.reduce((max, tier) => Math.max(max, tier.coins), 0);

    expect(best * MAX_REWARDED_RUNS_PER_DAY).toBeLessThanOrEqual(6);
  });
});

describe("결과가 믿을 만한지", () => {
  const ok = { score: 140, hits: 10, misses: 3 };

  it("정상적인 결과는 문제가 없다", () => {
    expect(explainResultProblem(ok, GAME_SECONDS)).toBeNull();
    expect(explainResultProblem({ score: 0, hits: 0, misses: 0 }, GAME_SECONDS)).toBeNull();
  });

  it("게임이 끝나기 전에 보낸 결과나 너무 오래된 결과는 받지 않는다", () => {
    expect(explainResultProblem(ok, MIN_FINISH_SECONDS - 1)).toContain("아직");
    expect(explainResultProblem(ok, MAX_FINISH_SECONDS + 1)).toContain("너무");
    expect(explainResultProblem(ok, MIN_FINISH_SECONDS)).toBeNull();
  });

  it("숫자가 아니거나 음수·소수면 거절한다", () => {
    for (const bad of [{ ...ok, score: -1 }, { ...ok, hits: 1.5 }, { ...ok, misses: Number.NaN }, { ...ok, score: Number.POSITIVE_INFINITY }]) {
      expect(explainResultProblem(bad, GAME_SECONDS), JSON.stringify(bad)).not.toBeNull();
    }
  });

  it("점수가 적중 수와 맞지 않으면 거절한다", () => {
    expect(explainResultProblem({ score: 5, hits: 10, misses: 0 }, GAME_SECONDS)).not.toBeNull();
    expect(explainResultProblem({ score: 10 * MAX_POINTS_PER_HIT + 1, hits: 10, misses: 0 }, GAME_SECONDS)).not.toBeNull();
    expect(explainResultProblem({ score: 100, hits: 0, misses: 5 }, GAME_SECONDS)).not.toBeNull();
  });

  it("사람이 낼 수 없는 속도의 판 수나 점수는 거절한다", () => {
    expect(explainResultProblem({ score: 1000, hits: 70, misses: 0 }, GAME_SECONDS)).not.toBeNull();
    expect(explainResultProblem({ score: 0, hits: 0, misses: 200 }, GAME_SECONDS)).not.toBeNull();
    const limit = maxPlausibleScore(GAME_SECONDS);
    expect(explainResultProblem({ score: limit + 1, hits: Math.ceil((limit + 1) / MAX_POINTS_PER_HIT), misses: 0 }, GAME_SECONDS)).not.toBeNull();
  });

  it("걸린 시간이 길어도 인정하는 점수의 한도는 한 판 길이 언저리에서 멈춘다", () => {
    expect(maxPlausibleScore(1000)).toBe(maxPlausibleScore(GAME_SECONDS + 5));
    expect(maxPlausibleScore(10)).toBeLessThan(maxPlausibleScore(30));
    expect(maxPlausibleScore(0)).toBe(0);
  });
});

describe("하루 한도", () => {
  it("남은 판 수와 남은 보상 횟수를 센다", () => {
    expect(runsLeft(0, 0)).toEqual({ runs: MAX_RUNS_PER_DAY, rewards: MAX_REWARDED_RUNS_PER_DAY });
    expect(runsLeft(MAX_RUNS_PER_DAY, MAX_REWARDED_RUNS_PER_DAY)).toEqual({ runs: 0, rewards: 0 });
    expect(runsLeft(99, 99)).toEqual({ runs: 0, rewards: 0 });
  });
});

describe("라운드 만들기", () => {
  it("같은 시드면 언제나 같은 라운드가 나온다", () => {
    expect(buildRounds(7, 20)).toEqual(buildRounds(7, 20));
    expect(buildRounds(7, 20)).not.toEqual(buildRounds(8, 20));
  });

  it("라운드마다 보기 몬스터가 정해진 수만큼 있고 정답이 정확히 한 번 들어 있다", () => {
    const meaning = new Map(VOCABULARY);
    buildRounds(11, 40).forEach((round) => {
      expect(round.options).toHaveLength(MONSTERS_PER_ROUND);
      expect(new Set(round.options).size).toBe(MONSTERS_PER_ROUND);
      expect(round.options.filter((word) => word === round.answer)).toHaveLength(1);
      expect(meaning.get(round.answer)).toBe(round.prompt);
    });
  });

  it("처음 한 바퀴 안에서는 같은 단어가 정답으로 다시 나오지 않는다", () => {
    const rounds = buildRounds(3, 50);

    expect(new Set(rounds.map((round) => round.answer)).size).toBe(50);
  });

  it("단어 수보다 라운드가 많아도 돌아가며 이어진다", () => {
    const small: [string, string][] = [["a", "에이"], ["b", "비"], ["c", "씨"], ["d", "디"], ["e", "이"]];

    expect(buildRounds(1, 12, small)).toHaveLength(12);
  });
});
