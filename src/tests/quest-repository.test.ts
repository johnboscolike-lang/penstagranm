// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createTempDatabase } from "./helpers/temp-db";

type Repo = typeof import("@/utils/quest-repository");
type PrismaModule = typeof import("@/utils/prisma");

let repo: Repo;
let prisma: PrismaModule["prisma"];
let disposeDatabase: () => Promise<void>;
let meId = "";
let otherId = "";
let buyerId = "";

const TODAY = "2026-09-30";

/**
 * Creates one full day of three promises (4 units each) with the given confirmed unit counts.
 */
async function createDay(studentId: string, dateKey: string, confirmed: [number, number, number]): Promise<void> {
  for (const [slotIndex, count] of confirmed.entries()) {
    const promise = await prisma.dailyPromise.create({
      data: {
        studentId,
        dateKey,
        slotIndex,
        subject: "국어",
        title: "테스트",
        unitKind: "PAGE",
        unitStart: 1,
        unitCount: 4,
      },
    });
    for (let unitNo = 1; unitNo <= count; unitNo += 1) {
      await prisma.promiseUnit.create({ data: { promiseId: promise.id, unitNo } });
    }
  }
}

beforeAll(async () => {
  disposeDatabase = (await createTempDatabase()).dispose;
  repo = await import("@/utils/quest-repository");
  ({ prisma } = await import("@/utils/prisma"));

  const team = await prisma.team.create({ data: { name: "테스트팀", emblem: "star" } });
  meId = (await prisma.student.create({ data: { name: "나", hairKey: "silver", isMe: true, teamId: team.id } })).id;
  otherId = (await prisma.student.create({ data: { name: "친구", hairKey: "black", teamId: team.id } })).id;
  buyerId = (await prisma.student.create({ data: { name: "구매자", hairKey: "rose", teamId: team.id } })).id;
});

afterAll(async () => {
  await disposeDatabase();
});

describe("ensureTodayPromises", () => {
  it("creates three cards once and never duplicates them", async () => {
    await repo.ensureTodayPromises(meId, TODAY);
    await repo.ensureTodayPromises(meId, TODAY);
    const today = await repo.getTodayView(meId, TODAY);

    expect(today.promises).toHaveLength(3);
    expect(today.promises.map((promise) => promise.rangeLabel)).toEqual(["p.12~17", "p.24~27", "15개"]);
    expect(today.isSchoolDay).toBe(true);
  });

  it("continues the page range on the next school day and restarts words", async () => {
    const next = await repo.getTodayView(meId, "2026-10-01");

    expect(next.promises.map((promise) => promise.rangeLabel)).toEqual(["p.18~23", "p.28~31", "15개"]);
  });

  it("creates nothing on weekends", async () => {
    const saturday = await repo.getTodayView(meId, "2026-10-03");

    expect(saturday.isSchoolDay).toBe(false);
    expect(saturday.promises).toEqual([]);
  });
});

describe("setUnitConfirmed", () => {
  it("counts the same unit once and can clear it", async () => {
    const [first] = (await repo.getTodayView(meId, TODAY)).promises;
    const base = { studentId: meId, promiseId: first.id, unitNo: 12, todayKey: TODAY };

    expect((await repo.setUnitConfirmed({ ...base, done: true })).confirmedUnitNos).toEqual([12]);
    expect((await repo.setUnitConfirmed({ ...base, done: true })).confirmedUnitNos).toEqual([12]);
    expect(await prisma.promiseUnit.count({ where: { promiseId: first.id } })).toBe(1);
    expect((await repo.setUnitConfirmed({ ...base, done: false })).confirmedUnitNos).toEqual([]);
  });

  it("rejects units outside the planned range", async () => {
    const [first] = (await repo.getTodayView(meId, TODAY)).promises;

    await expect(
      repo.setUnitConfirmed({ studentId: meId, promiseId: first.id, unitNo: 99, done: true, todayKey: TODAY }),
    ).rejects.toMatchObject({ code: "OUT_OF_RANGE" });
  });

  it("locks promises of past days so old goals cannot be rewritten", async () => {
    const [first] = (await repo.getTodayView(meId, TODAY)).promises;

    await expect(
      repo.setUnitConfirmed({ studentId: meId, promiseId: first.id, unitNo: 12, done: true, todayKey: "2026-10-01" }),
    ).rejects.toMatchObject({ code: "LOCKED" });
  });

  it("does not let a student touch someone else's promise", async () => {
    await repo.ensureTodayPromises(otherId, TODAY);
    const [othersFirst] = (await repo.getTodayView(otherId, TODAY)).promises;

    await expect(
      repo.setUnitConfirmed({ studentId: meId, promiseId: othersFirst.id, unitNo: 12, done: true, todayKey: TODAY }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("XP, coins and the shop", () => {
  beforeAll(async () => {
    for (const dateKey of ["2026-09-21", "2026-09-22", "2026-09-23", "2026-09-24", "2026-09-25"]) {
      await createDay(buyerId, dateKey, [4, 4, 4]);
    }
  });

  it("adds up XP and coins from confirmed units", async () => {
    // 하루 12칸 완수: 약속 XP 20x3 = 60, 코인 4x3 = 12. 닷새면 300 XP, 60 코인.
    expect(await repo.getStudentTotals(buyerId)).toEqual({ xp: 300, coins: 60 });
  });

  it("gives the reflection bonus once per posting day, even with two posts", async () => {
    const postData = { studentId: buyerId, authorName: "구매자", authorRole: "테스트", lessonTitle: "t", caption: "c" };
    await prisma.post.create({ data: { ...postData, createdAt: new Date("2026-09-25T16:00:00+09:00") } });
    await prisma.post.create({ data: { ...postData, createdAt: new Date("2026-09-25T18:30:00+09:00") } });

    expect(await repo.getStudentTotals(buyerId)).toEqual({ xp: 310, coins: 62 });
  });

  it("spends only coins when buying: XP and level stay the same", async () => {
    const before = await repo.getStudentTotals(buyerId);
    const result = await repo.purchaseItem(buyerId, "banner");
    const after = await repo.getStudentTotals(buyerId);

    expect(result.coins).toBe(before.coins - 15);
    expect(after.coins).toBe(before.coins - 15);
    expect(after.xp).toBe(before.xp);
    expect(await repo.getOwnedItemKeys(buyerId)).toEqual(["banner"]);
  });

  it("refuses duplicates, unknown items, and purchases beyond the balance", async () => {
    await expect(repo.purchaseItem(buyerId, "banner")).rejects.toMatchObject({ code: "ALREADY_OWNED" });
    await expect(repo.purchaseItem(buyerId, "dragon")).rejects.toMatchObject({ code: "UNKNOWN_ITEM" });

    await repo.purchaseItem(buyerId, "bookshelf");
    await expect(repo.purchaseItem(buyerId, "treebed")).rejects.toMatchObject({ code: "INSUFFICIENT_COINS" });
    expect(await repo.getOwnedItemKeys(buyerId)).toEqual(["banner", "bookshelf"]);
  });
});

describe("week views from the database", () => {
  it("ranks the week and reports last week's news without throwing", async () => {
    const board = await repo.getWeekBoardView("2026-09-30", meId);
    const news = await repo.getLastWeekNewsView("2026-09-30", meId);

    expect(board.individuals.length).toBe(3);
    expect(board.me?.name).toBe("나");
    expect(news.weekStartKey).toBe("2026-09-21");
    expect(news.stampCount).toBe(0);
  });
});
