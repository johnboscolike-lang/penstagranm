import { describe, expect, it } from "vitest";

import { ACHIEVEMENTS, EMPTY_METRICS, earnedKeys, findAchievement, isAchieved, petsFromAchievements, progressOf, type AchievementMetrics } from "@/utils/achievement-rules";
import { CREATURE_NAMES, ITEM_NAMES } from "@/utils/art/cc0";

const withMetrics = (patch: Partial<AchievementMetrics>): AchievementMetrics => ({ ...EMPTY_METRICS, ...patch });

describe("업적 목록", () => {
  it("이름이 겹치지 않고 모두 있는 아이콘과 동물을 쓴다", () => {
    expect(new Set(ACHIEVEMENTS.map((def) => def.key)).size).toBe(ACHIEVEMENTS.length);
    ACHIEVEMENTS.forEach((def) => {
      expect(ITEM_NAMES, def.key).toContain(def.icon);
      expect(CREATURE_NAMES, def.key).toContain(def.pet);
      expect(def.target, def.key).toBeGreaterThan(0);
      expect(def.title.length, def.key).toBeGreaterThan(0);
      expect(def.hint.length, def.key).toBeGreaterThan(0);
    });
  });

  it("동물 펫이 업적마다 하나씩, 겹치지 않게 연결된다", () => {
    expect(new Set(ACHIEVEMENTS.map((def) => def.pet)).size).toBe(ACHIEVEMENTS.length);
    expect(ACHIEVEMENTS).toHaveLength(CREATURE_NAMES.length);
  });

  it("같은 기록을 쓰는 업적은 목표가 점점 커진다", () => {
    const targets = new Map<string, number[]>();
    ACHIEVEMENTS.forEach((def) => targets.set(def.metric, [...(targets.get(def.metric) ?? []), def.target]));
    targets.forEach((list) => expect(list).toEqual([...list].sort((left, right) => left - right)));
  });
});

describe("업적 판정", () => {
  it("아무것도 안 했을 때는 하나도 이루지 못한다 (시작 점수 1000은 꽃 리그에 못 미친다)", () => {
    expect(earnedKeys(EMPTY_METRICS)).toEqual([]);
  });

  it("목표에 정확히 닿으면 이룬 것이고 한 칸 모자라면 아니다", () => {
    const steps = findAchievement("acorn-collector");
    expect(steps).toBeDefined();
    expect(isAchieved(steps!, withMetrics({ confirmedUnits: 49 }))).toBe(false);
    expect(isAchieved(steps!, withMetrics({ confirmedUnits: 50 }))).toBe(true);
  });

  it("칸 수는 낮은 단계의 업적도 함께 이룬다", () => {
    const keys = earnedKeys(withMetrics({ confirmedUnits: 200 }));

    expect(keys).toEqual(expect.arrayContaining(["first-step", "acorn-collector", "elephant-memory"]));
  });

  it("대결·보스·모자·기록 업적은 각자의 기록으로만 판단한다", () => {
    expect(earnedKeys(withMetrics({ duelsPlayed: 1 }))).toEqual(["first-duel"]);
    expect(earnedKeys(withMetrics({ duelWins: 5 }))).toEqual(["clever-fox"]);
    expect(earnedKeys(withMetrics({ perfectDuels: 1 }))).toEqual(["tiger-warrior"]);
    expect(earnedKeys(withMetrics({ rating: 1080 }))).toEqual(["flower-league"]);
    expect(earnedKeys(withMetrics({ bossClaims: 1 }))).toEqual(["boss-hunter"]);
    expect(earnedKeys(withMetrics({ hatsOwned: 3 }))).toEqual(["fashionista"]);
    expect(earnedKeys(withMetrics({ posts: 3 }))).toEqual(["record-keeper"]);
    expect(earnedKeys(withMetrics({ streak: 3 }))).toEqual(["counting-sheep"]);
    expect(earnedKeys(withMetrics({ streak: 10 }))).toEqual(["counting-sheep", "slow-and-steady"]);
    expect(earnedKeys(withMetrics({ wordsLearned: 20 }))).toEqual(["word-collector"]);
    expect(earnedKeys(withMetrics({ wordsMastered: 10 }))).toEqual(["word-master"]);
  });

  it("진행 상황은 목표를 넘겨도 100%에서 멈추고 음수는 0으로 본다", () => {
    const def = findAchievement("elephant-memory")!;

    expect(progressOf(def, withMetrics({ confirmedUnits: 50 }))).toEqual({ value: 50, target: 200, percent: 25 });
    expect(progressOf(def, withMetrics({ confirmedUnits: 999 })).percent).toBe(100);
    expect(progressOf(def, withMetrics({ confirmedUnits: -3 })).value).toBe(0);
  });
});

describe("업적으로 만나는 펫", () => {
  it("이룬 업적의 동물만 돌려주고 모르는 이름은 무시한다", () => {
    expect(petsFromAchievements(["first-step", "clever-fox", "없는업적"])).toEqual(["chicken", "fox"]);
    expect(petsFromAchievements([])).toEqual([]);
    expect(findAchievement("없는업적")).toBeUndefined();
  });
});
