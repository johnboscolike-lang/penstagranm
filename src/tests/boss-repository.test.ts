// @vitest-environment node
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { BOSS_REWARD, DUEL_DAMAGE, raidLevelFor } from "@/utils/boss-rules";
import { createTempDatabase } from "./helpers/temp-db";

type Boss = typeof import("@/utils/boss-repository");
type Repo = typeof import("@/utils/quest-repository");
type PrismaModule = typeof import("@/utils/prisma");

let boss: Boss;
let repo: Repo;
let prisma: PrismaModule["prisma"];
let disposeDatabase: () => Promise<void>;
const ids: Record<string, string> = {};

const TODAY = "2026-09-30"; // 수요일
const WEEK = "2026-09-28";
const LAST_WEEK = "2026-09-21";

/**
 * 학생에게 카드 한 장을 만들고 앞에서부터 count칸을 완료로 표시한다.
 */
async function giveUnits(student: string, dateKey: string, count: number, reviewStatus = "NONE", slotIndex = 0): Promise<void> {
  const card = await prisma.dailyPromise.create({
    data: { studentId: ids[student], dateKey, slotIndex, subject: "수학", title: "문제집", unitKind: "PAGE", unitStart: 1, unitCount: Math.max(count, 1), reviewStatus },
  });
  await prisma.promiseUnit.createMany({ data: Array.from({ length: count }, (_, index) => ({ promiseId: card.id, unitNo: index + 1 })) });
}

/**
 * 끝난 대결 한 판을 그 날짜에 기록한다.
 */
async function giveDuel(challenger: string, opponent: string, finishedKey: string): Promise<void> {
  await prisma.duel.create({
    data: { challengerId: ids[challenger], opponentId: ids[opponent], category: "MATH", questions: "[]", status: "DONE", dateKey: finishedKey, finishedKey },
  });
}

beforeAll(async () => {
  disposeDatabase = (await createTempDatabase()).dispose;
  boss = await import("@/utils/boss-repository");
  repo = await import("@/utils/quest-repository");
  ({ prisma } = await import("@/utils/prisma"));

  const team = await prisma.team.create({ data: { name: "빨강팀", emblem: "star" } });
  for (const [key, name] of [["a", "가온"], ["b", "나래"], ["c", "다솜"], ["d", "라온"], ["e", "마루"], ["f", "바다"]] as const) {
    ids[key] = (await prisma.student.create({ data: { name, hairKey: "silver", teamId: team.id } })).id;
  }
});

afterEach(async () => {
  await prisma.classSetting.deleteMany();
  await prisma.bossReward.deleteMany();
  await prisma.duel.deleteMany();
  await prisma.dailyPromise.deleteMany();
});

afterAll(async () => {
  await disposeDatabase();
});

describe("보스 화면", () => {
  it("아무도 시작하지 않았으면 체력이 가득 차 있고 보상은 받을 수 없다", async () => {
    const view = await boss.getRaidView(ids.a, TODAY);

    expect(view.weekKey).toBe(WEEK);
    expect(view.percentLeft).toBe(100);
    expect(view.defeated).toBe(false);
    expect(view.top).toEqual([]);
    expect(view.me.rank).toBeNull();
    expect(view.rewards[0]).toMatchObject({ isCurrentWeek: true, claimed: false });
    expect(view.rewards[0].blockedReason).toContain("아직");
    expect(view.schoolDaysLeft).toBe(3);
  });

  it("확인한 칸과 끝난 대결이 피해로 쌓이고 기여도 순위가 나온다", async () => {
    await giveUnits("a", TODAY, 5);
    await giveUnits("b", WEEK, 2);
    await giveDuel("a", "b", TODAY);

    const view = await boss.getRaidView(ids.b, TODAY);

    expect(view.damage).toBe(5 + 2 + 2 * DUEL_DAMAGE);
    expect(view.top.map((member) => member.name)).toEqual(["가온", "나래"]);
    expect(view.top[1].isMe).toBe(true);
    expect(view.me).toMatchObject({ units: 2, duels: 1, damage: 2 + DUEL_DAMAGE, rank: 2 });
  });

  it("선생님이 다시 시도로 돌려보낸 카드는 다시 제출하기 전까지 세지 않는다", async () => {
    await giveUnits("a", TODAY, 6, "RETRY");
    await giveUnits("a", TODAY, 3, "SUBMITTED", 1);

    expect((await boss.getRaidView(ids.a, TODAY)).me.units).toBe(3);
  });

  it("지난주나 다음 주 기록은 이번 주 피해에 섞이지 않는다", async () => {
    await giveUnits("a", LAST_WEEK, 4);
    await giveUnits("a", "2026-10-05", 4);
    await giveDuel("a", "b", LAST_WEEK);

    expect((await boss.getRaidView(ids.a, TODAY)).damage).toBe(0);
  });

  it("주말에는 남은 평일이 0이고 하루 목표도 계산할 수 있다", async () => {
    const view = await boss.getRaidView(ids.a, "2026-10-03");

    expect(view.schoolDaysLeft).toBe(0);
    expect(view.neededPerDay).toBe(view.hpLeft);
  });
});

describe("보스 난이도", () => {
  it("정하지 않으면 보통이고, 바꾸면 체력이 바로 달라진다", async () => {
    expect((await boss.getRaidLevel()).key).toBe("normal");
    const normal = await boss.getRaidView(ids.a, TODAY);

    await boss.setRaidLevel("hard");
    const hard = await boss.getRaidView(ids.a, TODAY);
    await boss.setRaidLevel("easy");
    const easy = await boss.getRaidView(ids.a, TODAY);

    expect(easy.maxHp).toBeLessThan(normal.maxHp);
    expect(normal.maxHp).toBeLessThan(hard.maxHp);
    expect(hard.maxHp).toBe(6 * raidLevelFor("hard").hpPerStudent);
  });

  it("알 수 없는 난이도는 저장하지 않는다", async () => {
    await expect(boss.setRaidLevel("impossible" as never)).rejects.toMatchObject({ code: "INVALID" });
    expect((await boss.getRaidLevel()).key).toBe("normal");
  });

  it("쓰러뜨린 뒤에 난이도를 올리면 다시 살아나 보상을 받을 수 없다", async () => {
    await giveUnits("a", TODAY, 400);
    expect((await boss.getRaidView(ids.a, TODAY)).defeated).toBe(true);

    await boss.setRaidLevel("hard");
    const view = await boss.getRaidView(ids.a, TODAY);

    expect(view.maxHp).toBeGreaterThan(400);
    expect(view.defeated).toBe(false);
  });

  it("선생님 요약에 난이도, 체력, 보상 받은 학생 수가 나온다", async () => {
    await giveUnits("a", TODAY, 400);
    await giveUnits("b", TODAY, 2);
    await boss.claimRaidReward({ studentId: ids.b, weekKey: WEEK, todayKey: TODAY });

    const summary = await boss.getRaidTeacherSummary(TODAY);

    expect(summary).toMatchObject({ level: "normal", defeated: true, claimedCount: 1, playerCount: 6 });
    expect(summary.bossName.length).toBeGreaterThan(0);
  });
});

describe("보상 받기", () => {
  it("보스가 살아 있으면 받을 수 없다", async () => {
    await giveUnits("a", TODAY, 5);

    await expect(boss.claimRaidReward({ studentId: ids.a, weekKey: WEEK, todayKey: TODAY })).rejects.toMatchObject({ code: "LOCKED" });
  });

  it("보스를 쓰러뜨리면 참여한 학생만 한 번 받고, 경험치와 코인이 합계에 들어간다", async () => {
    await giveUnits("a", TODAY, 400);
    await giveUnits("b", TODAY, 1);
    const before = await repo.getStudentTotals(ids.b);

    const view = await boss.getRaidView(ids.b, TODAY);
    expect(view.defeated).toBe(true);
    expect(view.rewards[0].blockedReason).toBeNull();

    await expect(boss.claimRaidReward({ studentId: ids.b, weekKey: WEEK, todayKey: TODAY })).resolves.toEqual(BOSS_REWARD);
    const after = await repo.getStudentTotals(ids.b);
    expect(after.xp - before.xp).toBe(BOSS_REWARD.xp);
    expect(after.coins - before.coins).toBe(BOSS_REWARD.coins);

    await expect(boss.claimRaidReward({ studentId: ids.b, weekKey: WEEK, todayKey: TODAY })).rejects.toMatchObject({ code: "LOCKED" });
    expect((await boss.getRaidView(ids.b, TODAY)).rewards[0].claimed).toBe(true);
  });

  it("한 번도 참여하지 않은 학생은 받을 수 없다", async () => {
    await giveUnits("a", TODAY, 400);

    await expect(boss.claimRaidReward({ studentId: ids.f, weekKey: WEEK, todayKey: TODAY })).rejects.toMatchObject({ code: "LOCKED" });
  });

  it("이번 주와 지난주가 아닌 보스는 받을 수 없다", async () => {
    await expect(boss.claimRaidReward({ studentId: ids.a, weekKey: "2026-09-07", todayKey: TODAY })).rejects.toMatchObject({ code: "INVALID" });
    await expect(boss.claimRaidReward({ studentId: ids.a, weekKey: "2026-10-05", todayKey: TODAY })).rejects.toMatchObject({ code: "INVALID" });
  });

  it("지난주에 쓰러뜨린 보스는 안 받은 학생에게만 이번 주 화면에서 알려 주고, 받을 수도 있다", async () => {
    await giveUnits("a", LAST_WEEK, 400);
    await giveUnits("c", LAST_WEEK, 2);

    const view = await boss.getRaidView(ids.c, TODAY);
    const last = view.rewards.find((reward) => !reward.isCurrentWeek);
    expect(last).toMatchObject({ weekKey: LAST_WEEK, claimed: false, blockedReason: null });

    await boss.claimRaidReward({ studentId: ids.c, weekKey: LAST_WEEK, todayKey: TODAY });
    expect((await boss.getRaidView(ids.c, TODAY)).rewards.some((reward) => !reward.isCurrentWeek)).toBe(false);
  });
});
