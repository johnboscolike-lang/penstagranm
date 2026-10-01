// @vitest-environment node
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { GAME_SECONDS, MAX_REWARDED_RUNS_PER_DAY, MAX_RUNS_PER_DAY, MONSTERS_PER_ROUND } from "@/utils/minigame-rules";
import { createTempDatabase } from "./helpers/temp-db";

type Games = typeof import("@/utils/minigame-repository");
type Repo = typeof import("@/utils/quest-repository");
type Achievements = typeof import("@/utils/achievement-repository");
type PrismaModule = typeof import("@/utils/prisma");

let games: Games;
let repo: Repo;
let achievements: Achievements;
let prisma: PrismaModule["prisma"];
let disposeDatabase: () => Promise<void>;
const ids: Record<string, string> = {};

const START = new Date("2026-10-05T03:00:00Z"); // 한국 시간 2026-10-05 12:00
const AFTER_GAME = new Date(START.getTime() + (GAME_SECONDS + 1) * 1000);
const GOOD = { score: 160, hits: 11, misses: 4 }; // 최고 보상 구간

beforeAll(async () => {
  disposeDatabase = (await createTempDatabase()).dispose;
  games = await import("@/utils/minigame-repository");
  repo = await import("@/utils/quest-repository");
  achievements = await import("@/utils/achievement-repository");
  ({ prisma } = await import("@/utils/prisma"));

  const team = await prisma.team.create({ data: { name: "빨강팀", emblem: "star" } });
  for (const [key, name] of [["a", "가온"], ["b", "나래"]] as const) {
    ids[key] = (await prisma.student.create({ data: { name, hairKey: "silver", teamId: team.id } })).id;
  }
});

afterEach(async () => {
  await prisma.miniGameRun.deleteMany();
  await prisma.achievement.deleteMany();
});

afterAll(async () => {
  await disposeDatabase();
});

describe("한 판 시작", () => {
  it("판을 시작하면 라운드를 받고 오늘 시작한 판이 센다", async () => {
    const start = await games.startMiniGame({ studentId: ids.a, now: START });

    expect(start.rounds.length).toBeGreaterThanOrEqual(30);
    start.rounds.forEach((round) => {
      expect(round.options).toHaveLength(MONSTERS_PER_ROUND);
      expect(round.options).toContain(round.answer);
    });
    expect(start.summary).toMatchObject({ startedToday: 1, runsLeft: MAX_RUNS_PER_DAY - 1, rewardsLeft: MAX_REWARDED_RUNS_PER_DAY });
    expect((await prisma.miniGameRun.findUniqueOrThrow({ where: { id: start.runId } })).status).toBe("STARTED");
  });

  it("판마다 다른 문제가 나오고, 같은 판은 같은 문제다", async () => {
    const first = await games.startMiniGame({ studentId: ids.a, now: START });
    const second = await games.startMiniGame({ studentId: ids.a, now: START });

    expect(first.rounds).not.toEqual(second.rounds);
  });

  it("하루에 시작할 수 있는 판 수를 넘으면 거절한다. 다음 날에는 다시 시작할 수 있다", async () => {
    for (let index = 0; index < MAX_RUNS_PER_DAY; index += 1) {
      await games.startMiniGame({ studentId: ids.a, now: START });
    }

    await expect(games.startMiniGame({ studentId: ids.a, now: START })).rejects.toMatchObject({ code: "LOCKED" });
    await expect(games.startMiniGame({ studentId: ids.b, now: START })).resolves.toBeDefined();
    await expect(games.startMiniGame({ studentId: ids.a, now: new Date(START.getTime() + 86_400_000) })).resolves.toBeDefined();
  });
});

describe("결과 받기", () => {
  it("한 판이 지난 뒤 올바른 결과를 보내면 보상을 받고 내 기록이 남는다", async () => {
    const { runId } = await games.startMiniGame({ studentId: ids.a, now: START });
    const before = await repo.getStudentTotals(ids.a);

    const done = await games.finishMiniGame({ studentId: ids.a, runId, ...GOOD, now: AFTER_GAME });

    expect(done).toMatchObject({ ...GOOD, xp: 4, coins: 2, newBest: true });
    expect(done.summary).toMatchObject({ bestScore: 160, totalPlays: 1, rewardsLeft: MAX_REWARDED_RUNS_PER_DAY - 1 });
    const after = await repo.getStudentTotals(ids.a);
    expect(after.xp - before.xp).toBe(4);
    expect(after.coins - before.coins).toBe(2);
  });

  it("같은 판의 결과는 한 번만 받는다 (동시에 와도)", async () => {
    const { runId } = await games.startMiniGame({ studentId: ids.a, now: START });

    const results = await Promise.allSettled(Array.from({ length: 4 }, () => games.finishMiniGame({ studentId: ids.a, runId, ...GOOD, now: AFTER_GAME })));

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const sum = await prisma.miniGameRun.aggregate({ where: { studentId: ids.a }, _sum: { coins: true } });
    expect(sum._sum.coins).toBe(2);
  });

  it("한 판 길이가 지나기 전에 보낸 결과는 받지 않는다", async () => {
    const { runId } = await games.startMiniGame({ studentId: ids.a, now: START });

    await expect(games.finishMiniGame({ studentId: ids.a, runId, ...GOOD, now: new Date(START.getTime() + 5000) })).rejects.toMatchObject({ code: "INVALID" });
    expect((await prisma.miniGameRun.findUniqueOrThrow({ where: { id: runId } })).status).toBe("STARTED");
    // 한 판이 지난 뒤에는 같은 판의 결과를 다시 보낼 수 있다
    await expect(games.finishMiniGame({ studentId: ids.a, runId, ...GOOD, now: AFTER_GAME })).resolves.toMatchObject({ coins: 2 });
  });

  it("앞뒤가 맞지 않는 결과는 받지 않는다", async () => {
    const { runId } = await games.startMiniGame({ studentId: ids.a, now: START });
    const bad = [
      { score: 99999, hits: 11, misses: 4 },
      { score: 100, hits: 0, misses: 3 },
      { score: -5, hits: 0, misses: 0 },
      { score: 160, hits: 11.5, misses: 4 },
      { score: 3000, hits: 200, misses: 0 },
    ];

    for (const result of bad) {
      await expect(games.finishMiniGame({ studentId: ids.a, runId, ...result, now: AFTER_GAME }), JSON.stringify(result)).rejects.toMatchObject({ code: "INVALID" });
    }
    expect(await prisma.miniGameRun.count({ where: { status: "DONE" } })).toBe(0);
  });

  it("남의 판이나 없는 판의 결과는 받지 않는다", async () => {
    const { runId } = await games.startMiniGame({ studentId: ids.a, now: START });

    await expect(games.finishMiniGame({ studentId: ids.b, runId, ...GOOD, now: AFTER_GAME })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(games.finishMiniGame({ studentId: ids.a, runId: "없는판", ...GOOD, now: AFTER_GAME })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("너무 오래 지난 판의 결과는 받지 않는다", async () => {
    const { runId } = await games.startMiniGame({ studentId: ids.a, now: START });

    await expect(games.finishMiniGame({ studentId: ids.a, runId, ...GOOD, now: new Date(START.getTime() + 3_600_000) })).rejects.toMatchObject({ code: "INVALID" });
  });

  it("점수가 낮으면 보상이 없고, 하루 보상 횟수가 지나면 점수는 남아도 보상은 없다", async () => {
    const low = await games.startMiniGame({ studentId: ids.a, now: START });
    expect(await games.finishMiniGame({ studentId: ids.a, runId: low.runId, score: 30, hits: 3, misses: 5, now: AFTER_GAME })).toMatchObject({ xp: 0, coins: 0 });

    for (let index = 0; index < MAX_REWARDED_RUNS_PER_DAY; index += 1) {
      const { runId } = await games.startMiniGame({ studentId: ids.a, now: START });
      expect(await games.finishMiniGame({ studentId: ids.a, runId, ...GOOD, now: AFTER_GAME })).toMatchObject({ coins: 2 });
    }
    const extra = await games.startMiniGame({ studentId: ids.a, now: START });
    const result = await games.finishMiniGame({ studentId: ids.a, runId: extra.runId, ...GOOD, now: AFTER_GAME });

    expect(result).toMatchObject({ xp: 0, coins: 0, newBest: false });
    expect(result.summary.rewardsLeft).toBe(0);
    expect(result.summary.totalPlays).toBe(2 + MAX_REWARDED_RUNS_PER_DAY);
  });

  it("보상은 다음 날 다시 받을 수 있다", async () => {
    for (let index = 0; index < MAX_REWARDED_RUNS_PER_DAY; index += 1) {
      const { runId } = await games.startMiniGame({ studentId: ids.a, now: START });
      await games.finishMiniGame({ studentId: ids.a, runId, ...GOOD, now: AFTER_GAME });
    }
    const tomorrow = new Date(START.getTime() + 86_400_000);
    const { runId } = await games.startMiniGame({ studentId: ids.a, now: tomorrow });

    await expect(games.finishMiniGame({ studentId: ids.a, runId, ...GOOD, now: new Date(tomorrow.getTime() + 31_000) })).resolves.toMatchObject({ coins: 2 });
  });
});

describe("업적 연동", () => {
  it("5판을 끝내면 몬스터 사냥꾼, 150점을 넘기면 사냥 달인 업적을 이룬다", async () => {
    for (let index = 0; index < 5; index += 1) {
      const { runId } = await games.startMiniGame({ studentId: ids.a, now: new Date(START.getTime() + index * 86_400_000) });
      await games.finishMiniGame({ studentId: ids.a, runId, score: index === 4 ? 160 : 50, hits: index === 4 ? 11 : 4, misses: 2, now: new Date(START.getTime() + index * 86_400_000 + 31_000) });
    }

    const metrics = await achievements.collectMetrics(prisma, ids.a, 0);
    expect(metrics).toMatchObject({ miniGamePlays: 5, miniGameBest: 160 });
    expect((await achievements.syncAchievements(prisma, ids.a, 0)).earned).toEqual(expect.arrayContaining(["monster-hunter", "hunt-master"]));
  });
});
