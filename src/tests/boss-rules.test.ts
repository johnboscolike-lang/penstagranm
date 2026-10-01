import { describe, expect, it } from "vitest";

import {
  BOSSES,
  DEFAULT_RAID_LEVEL,
  DUEL_DAMAGE,
  MIN_BOSS_HP,
  RAID_LEVELS,
  bossForWeek,
  bossMood,
  buildRaid,
  damageNeededPerDay,
  damageOf,
  explainRewardBlock,
  isRaidLevelKey,
  raidLevelFor,
  raidMaxHp,
} from "@/utils/boss-rules";
import { KENNEY_NAMES } from "@/utils/art/kenney";

describe("이번 주 보스 고르기", () => {
  it("같은 주에는 언제나 같은 보스가 나온다", () => {
    expect(bossForWeek("2026-09-28")).toEqual(bossForWeek("2026-09-28"));
  });

  it("주가 바뀔 때마다 다음 보스로 넘어가고, 다 돌면 처음으로 돌아온다", () => {
    const keys = Array.from({ length: BOSSES.length + 1 }, (_, index) => {
      const date = new Date(Date.UTC(2026, 8, 28 + index * 7));

      return bossForWeek(date.toISOString().slice(0, 10)).key;
    });

    expect(new Set(keys.slice(0, BOSSES.length)).size).toBe(BOSSES.length);
    expect(keys[BOSSES.length]).toBe(keys[0]);
  });

  it("모든 보스가 실제로 있는 도트 그림을 쓴다", () => {
    BOSSES.forEach((boss) => expect(KENNEY_NAMES).toContain(boss.sprite));
    expect(new Set(BOSSES.map((boss) => boss.key)).size).toBe(BOSSES.length);
  });
});

describe("체력과 피해", () => {
  it("학생 수에 비례하되 아주 작은 반도 바닥 체력을 갖는다", () => {
    expect(raidMaxHp(12)).toBe(12 * raidLevelFor(DEFAULT_RAID_LEVEL).hpPerStudent);
    expect(raidMaxHp(1)).toBe(MIN_BOSS_HP);
    expect(raidMaxHp(0)).toBe(MIN_BOSS_HP);
  });

  it("난이도가 높을수록 같은 반에서도 보스가 튼튼하다", () => {
    const hp = RAID_LEVELS.map((level) => raidMaxHp(10, level.hpPerStudent));

    expect(hp).toEqual([...hp].sort((left, right) => left - right));
    expect(new Set(hp).size).toBe(RAID_LEVELS.length);
  });

  it("난이도 이름을 확인하고, 모르는 값은 기본 난이도로 바꾼다", () => {
    expect(isRaidLevelKey("hard")).toBe(true);
    expect(isRaidLevelKey("impossible")).toBe(false);
    expect(raidLevelFor("easy").label).toBe("쉬움");
    expect(raidLevelFor("???").key).toBe(DEFAULT_RAID_LEVEL);
  });

  it("칸은 1, 끝난 대결은 정해진 만큼 피해를 주고 음수·소수는 무시한다", () => {
    expect(damageOf(10, 0)).toBe(10);
    expect(damageOf(3, 2)).toBe(3 + 2 * DUEL_DAMAGE);
    expect(damageOf(-5, -1)).toBe(0);
    expect(damageOf(2.9, 1.9)).toBe(2 + DUEL_DAMAGE);
  });

  it("남은 체력에 따라 보스 표정이 바뀌고 쓰러지면 down 이다", () => {
    expect(bossMood(100, false)).toBe("fresh");
    expect(bossMood(70, false)).toBe("hurt");
    expect(bossMood(26, false)).toBe("hurt");
    expect(bossMood(25, false)).toBe("weak");
    expect(bossMood(0, true)).toBe("down");
  });
});

describe("보스 상태 계산", () => {
  const contributions = [
    { studentId: "b", units: 10, duels: 0 },
    { studentId: "a", units: 5, duels: 2 },
    { studentId: "c", units: 0, duels: 0 },
  ];

  it("학생별 피해를 더해 남은 체력과 순위를 만든다", () => {
    const raid = buildRaid({ weekKey: "2026-09-28", playerCount: 3, contributions });

    expect(raid.maxHp).toBe(raidMaxHp(3));
    expect(raid.damage).toBe(10 + 5 + 2 * DUEL_DAMAGE);
    expect(raid.hpLeft).toBe(raidMaxHp(3) - raid.damage);
    expect(raid.ranking.map((entry) => entry.studentId)).toEqual(["a", "b", "c"]);
    expect(raid.defeated).toBe(false);
  });

  it("난이도에 맞는 학생당 체력으로 최대 체력을 정한다", () => {
    const raid = buildRaid({ weekKey: "2026-09-28", playerCount: 10, hpPerStudent: 90, contributions: [] });

    expect(raid.maxHp).toBe(900);
    expect(raid.percentLeft).toBe(100);
  });

  it("피해가 같으면 학생 번호 순으로 안정적으로 줄 세운다", () => {
    const raid = buildRaid({
      weekKey: "2026-09-28",
      playerCount: 2,
      contributions: [
        { studentId: "z", units: 3, duels: 0 },
        { studentId: "m", units: 3, duels: 0 },
      ],
    });

    expect(raid.ranking.map((entry) => entry.studentId)).toEqual(["m", "z"]);
  });

  it("체력이 0이 되면 쓰러지고, 넘친 피해는 표시하지 않는다", () => {
    const raid = buildRaid({ weekKey: "2026-09-28", playerCount: 3, contributions: [{ studentId: "a", units: 500, duels: 0 }] });

    expect(raid.defeated).toBe(true);
    expect(raid.hpLeft).toBe(0);
    expect(raid.percentLeft).toBe(0);
    expect(raid.damage).toBe(raid.maxHp);
    expect(raid.mood).toBe("down");
  });
});

describe("보상 받기 조건", () => {
  it("이미 받았으면 이유를 알려 준다", () => {
    expect(explainRewardBlock({ defeated: true, myDamage: 5, claimed: true })).toContain("이미");
  });

  it("보스가 살아 있으면 받을 수 없다", () => {
    expect(explainRewardBlock({ defeated: false, myDamage: 5, claimed: false })).toContain("아직");
  });

  it("한 번도 참여하지 않았으면 받을 수 없다", () => {
    expect(explainRewardBlock({ defeated: true, myDamage: 0, claimed: false })).toContain("참여");
  });

  it("쓰러뜨렸고 참여했다면 받을 수 있다", () => {
    expect(explainRewardBlock({ defeated: true, myDamage: 1, claimed: false })).toBeNull();
  });
});

describe("하루에 필요한 피해", () => {
  it("남은 평일로 나누어 올림한다", () => {
    expect(damageNeededPerDay(100, 4)).toBe(25);
    expect(damageNeededPerDay(101, 4)).toBe(26);
  });

  it("주말처럼 남은 날이 없어도 0으로 나누지 않는다", () => {
    expect(damageNeededPerDay(30, 0)).toBe(30);
  });
});
