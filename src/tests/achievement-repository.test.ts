// @vitest-environment node
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { ACHIEVEMENTS } from "@/utils/achievement-rules";
import { QUESTION_COUNT } from "@/utils/arena-rules";
import { createTempDatabase } from "./helpers/temp-db";

type Achievements = typeof import("@/utils/achievement-repository");
type Closet = typeof import("@/utils/closet-repository");
type Repo = typeof import("@/utils/quest-repository");
type PrismaModule = typeof import("@/utils/prisma");

let achievements: Achievements;
let closet: Closet;
let repo: Repo;
let prisma: PrismaModule["prisma"];
let disposeDatabase: () => Promise<void>;
const ids: Record<string, string> = {};

/**
 * 학생에게 카드 한 장을 만들고 앞에서부터 count칸을 완료로 표시한다.
 */
async function giveUnits(student: string, count: number, reviewStatus = "NONE", slotIndex = 0): Promise<void> {
  const card = await prisma.dailyPromise.create({
    data: { studentId: ids[student], dateKey: "2026-09-30", slotIndex, subject: "수학", title: "문제집", unitKind: "PAGE", unitStart: 1, unitCount: Math.max(count, 1), reviewStatus },
  });
  await prisma.promiseUnit.createMany({ data: Array.from({ length: count }, (_, index) => ({ promiseId: card.id, unitNo: index + 1 })) });
}

/**
 * 끝난 대결 한 판을 만든다. outcome 은 도전자 기준이다.
 */
async function giveDuel(challenger: string, opponent: string, outcome: "WIN" | "LOSE" | "DRAW", correct = { challenger: 3, opponent: 2 }): Promise<void> {
  await prisma.duel.create({
    data: {
      challengerId: ids[challenger],
      opponentId: ids[opponent],
      category: "MATH",
      questions: "[]",
      status: "DONE",
      dateKey: "2026-09-30",
      finishedKey: "2026-09-30",
      outcome,
      challengerCorrect: correct.challenger,
      opponentCorrect: correct.opponent,
    },
  });
}

beforeAll(async () => {
  disposeDatabase = (await createTempDatabase()).dispose;
  achievements = await import("@/utils/achievement-repository");
  closet = await import("@/utils/closet-repository");
  repo = await import("@/utils/quest-repository");
  ({ prisma } = await import("@/utils/prisma"));

  const team = await prisma.team.create({ data: { name: "빨강팀", emblem: "star" } });
  for (const [key, name] of [["a", "가온"], ["b", "나래"], ["c", "다솜"]] as const) {
    ids[key] = (await prisma.student.create({ data: { name, hairKey: "silver", teamId: team.id } })).id;
  }
});

afterEach(async () => {
  await prisma.bossReward.deleteMany();
  await prisma.achievement.deleteMany();
  await prisma.duel.deleteMany();
  await prisma.purchase.deleteMany();
  await prisma.post.deleteMany();
  await prisma.dailyPromise.deleteMany();
  await prisma.student.updateMany({ data: { rating: 1000, petKey: null, hatKey: null } });
});

afterAll(async () => {
  await disposeDatabase();
});

describe("기록 모으기", () => {
  it("아무 기록이 없으면 모두 0이고 대결 점수는 시작 점수다", async () => {
    expect(await achievements.collectMetrics(prisma, ids.a, 0)).toEqual({
      streak: 0,
      confirmedUnits: 0,
      duelsPlayed: 0,
      duelWins: 0,
      perfectDuels: 0,
      rating: 1000,
      bossClaims: 0,
      hatsOwned: 0,
      posts: 0,
      emotesSent: 0,
    });
  });

  it("칸·대결·승리·만점·이모트를 정확히 센다 (도전자와 상대 입장 모두)", async () => {
    await giveUnits("a", 4);
    await giveUnits("a", 2, "SUBMITTED", 1);
    await giveDuel("a", "b", "WIN", { challenger: QUESTION_COUNT, opponent: 1 }); // a 승, 만점
    await giveDuel("b", "a", "LOSE", { challenger: 1, opponent: 4 }); // 상대 입장 a 승
    await giveDuel("a", "c", "LOSE", { challenger: 2, opponent: 3 }); // a 패
    await giveDuel("c", "a", "DRAW", { challenger: 3, opponent: QUESTION_COUNT }); // 무승부, a 만점
    await prisma.duel.updateMany({ where: { challengerId: ids.a }, data: { challengerEmote: "star" } });
    await prisma.duel.updateMany({ where: { opponentId: ids.a, challengerId: ids.b }, data: { opponentEmote: "heart" } });

    const metrics = await achievements.collectMetrics(prisma, ids.a, 2);

    expect(metrics).toMatchObject({ streak: 2, confirmedUnits: 6, duelsPlayed: 4, duelWins: 2, perfectDuels: 2, emotesSent: 3 });
  });

  it("선생님이 다시 시도로 돌려보낸 카드는 칸 수에서 뺀다", async () => {
    await giveUnits("a", 5, "RETRY");
    await giveUnits("a", 3, "CONFIRMED", 1);

    expect((await achievements.collectMetrics(prisma, ids.a, 0)).confirmedUnits).toBe(3);
  });

  it("끝나지 않은 대결은 대결 수에 넣지 않는다", async () => {
    await prisma.duel.create({ data: { challengerId: ids.a, opponentId: ids.b, category: "MATH", questions: "[]", status: "PENDING", dateKey: "2026-09-30" } });

    expect((await achievements.collectMetrics(prisma, ids.a, 0)).duelsPlayed).toBe(0);
  });
});

describe("업적 저장", () => {
  it("기록이 없으면 이룬 업적이 없다", async () => {
    expect(await achievements.syncAchievements(prisma, ids.a, 0)).toEqual({ earned: [], fresh: [] });
  });

  it("조건을 채우면 저장하고 알림 정보를 돌려준다. 알려 주기 전까지는 계속 새 업적이다", async () => {
    await giveUnits("a", 1);

    const first = await achievements.syncAchievements(prisma, ids.a, 0);
    expect(first.earned).toEqual(["first-step"]);
    expect(first.fresh).toEqual([{ key: "first-step", title: "첫걸음", icon: "feather", petName: "꼬꼬닭" }]);

    const again = await achievements.syncAchievements(prisma, ids.a, 0);
    expect(again.fresh.map((item) => item.key)).toEqual(["first-step"]);
    expect(await prisma.achievement.count({ where: { studentId: ids.a } })).toBe(1);
  });

  it("봤음으로 바꾸면 더는 새 업적으로 뜨지 않고, 이룬 업적 목록에는 그대로 남는다", async () => {
    await giveUnits("a", 1);
    await achievements.syncAchievements(prisma, ids.a, 0);

    expect(await achievements.markAchievementsSeen(ids.a, ["first-step"])).toBe(1);
    expect(await achievements.markAchievementsSeen(ids.a, ["first-step"])).toBe(0);
    const after = await achievements.syncAchievements(prisma, ids.a, 0);

    expect(after.fresh).toEqual([]);
    expect(after.earned).toEqual(["first-step"]);
  });

  it("봤음 처리는 내 업적만 바꾸고 모르는 이름은 무시한다", async () => {
    await giveUnits("a", 1);
    await giveUnits("b", 1);
    await achievements.syncAchievements(prisma, ids.a, 0);
    await achievements.syncAchievements(prisma, ids.b, 0);

    expect(await achievements.markAchievementsSeen(ids.a, ["first-step", "없는업적"])).toBe(1);
    expect(await achievements.markAchievementsSeen(ids.a, ["없는업적"])).toBe(0);
    expect(await achievements.markAchievementsSeen(ids.a, [])).toBe(0);
    expect((await achievements.syncAchievements(prisma, ids.b, 0)).fresh).toHaveLength(1);
  });

  it("같은 학생의 요청이 동시에 와도 오류 없이 업적은 한 번만 남는다", async () => {
    await giveUnits("a", 60);

    const results = await Promise.all(Array.from({ length: 6 }, () => achievements.syncAchievements(prisma, ids.a, 3)));

    results.forEach((result) => expect(result.earned.length).toBeGreaterThanOrEqual(3));
    const rows = await prisma.achievement.findMany({ where: { studentId: ids.a } });
    expect(rows.map((row) => row.key).sort()).toEqual(["acorn-collector", "counting-sheep", "first-step"]);
  });

  it("연속 실천 일수는 받은 값으로 판단한다", async () => {
    expect((await achievements.syncAchievements(prisma, ids.a, 2)).earned).toEqual([]);
    expect((await achievements.syncAchievements(prisma, ids.a, 3)).earned).toEqual(["counting-sheep"]);
  });

  it("점수가 올라 꽃 리그에 닿으면 업적을 이룬다", async () => {
    await prisma.student.update({ where: { id: ids.a }, data: { rating: 1080 } });

    expect((await achievements.syncAchievements(prisma, ids.a, 0)).earned).toEqual(["flower-league"]);
  });
});

describe("업적판", () => {
  it("모든 업적을 보여 주고 이룬 개수와 진행 정도를 계산한다", async () => {
    await giveUnits("a", 25);
    await achievements.syncAchievements(prisma, ids.a, 0);

    const board = await achievements.getAchievementBoard(ids.a, 0);
    const acorn = board.items.find((item) => item.key === "acorn-collector");

    expect(board.total).toBe(ACHIEVEMENTS.length);
    expect(board.earnedCount).toBe(1);
    expect(acorn).toMatchObject({ earned: false, value: 25, target: 50, percent: 50, petName: "도토리다람쥐" });
    expect(board.items.find((item) => item.key === "first-step")?.earned).toBe(true);
  });
});

describe("동물 펫", () => {
  it("업적을 이루면 그 동물을 옷장에서 만나 데려갈 수 있다", async () => {
    await expect(closet.equipCosmetic({ studentId: ids.a, slot: "pet", key: "chicken" })).rejects.toMatchObject({ code: "LOCKED" });

    await giveUnits("a", 1);
    await achievements.syncAchievements(prisma, ids.a, 0);
    const view = await closet.equipCosmetic({ studentId: ids.a, slot: "pet", key: "chicken" });

    expect(view.petKey).toBe("chicken");
    expect(view.pets.find((pet) => pet.key === "chicken")).toMatchObject({ owned: true, equipped: true, art: "creatures", source: "achievement", name: "꼬꼬닭" });
    expect(view.pets.find((pet) => pet.key === "fox")).toMatchObject({ owned: false });
    expect(view.pets.find((pet) => pet.key === "fox")?.hint).toContain("영리한 여우");
  });

  it("다른 학생이 만난 동물은 쓸 수 없고, 화면 위쪽 정보에는 내가 데려간 동물만 보인다", async () => {
    await giveUnits("a", 1);
    await achievements.syncAchievements(prisma, ids.a, 0);
    await closet.equipCosmetic({ studentId: ids.a, slot: "pet", key: "chicken" });

    await expect(closet.equipCosmetic({ studentId: ids.b, slot: "pet", key: "chicken" })).rejects.toMatchObject({ code: "LOCKED" });
    expect((await repo.getPageBase(ids.a)).hud.petKey).toBe("chicken");
    expect((await repo.getPageBase(ids.b)).hud.petKey).toBeNull();
  });

  it("보스 펫과 동물 펫을 함께 갖는다", async () => {
    await giveUnits("a", 1);
    await prisma.bossReward.create({ data: { studentId: ids.a, weekKey: "2026-09-28", xp: 30, coins: 8 } });
    await achievements.syncAchievements(prisma, ids.a, 0);

    const view = await closet.getCloset(ids.a);

    // 꼬꼬닭(첫걸음) + 토끼(보스 사냥꾼 업적) + 그 주의 보스 몬스터 1마리
    expect(view.pets.filter((pet) => pet.owned).map((pet) => pet.source).sort()).toEqual(["achievement", "achievement", "boss"]);
    expect(view.pets.find((pet) => pet.key === "rabbit")?.owned).toBe(true);
  });
});

describe("화면 위쪽 정보에 들어가는 새 업적", () => {
  it("첫 화면에서 새 업적이 나오고, 봤음 뒤에는 나오지 않는다", async () => {
    await giveUnits("a", 1);

    const first = (await repo.getPageBase(ids.a)).hud;
    expect(first.newAchievements.map((item) => item.key)).toEqual(["first-step"]);

    await achievements.markAchievementsSeen(ids.a, ["first-step"]);
    expect((await repo.getPageBase(ids.a)).hud.newAchievements).toEqual([]);
  });
});
