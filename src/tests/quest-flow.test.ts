// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createTempDatabase } from "./helpers/temp-db";

type Repo = typeof import("@/utils/quest-repository");
type Teacher = typeof import("@/utils/teacher-repository");
type PrismaModule = typeof import("@/utils/prisma");

let repo: Repo;
let teacher: Teacher;
let prisma: PrismaModule["prisma"];
let disposeDatabase: () => Promise<void>;
let aId = "";
let bId = "";

const WEDNESDAY = "2026-09-30";
const MONDAY = "2026-09-28";

/**
 * Builds a valid quest input for the given students and overrides.
 */
function questInput(studentIds: string[], overrides: Record<string, unknown> = {}) {
  return {
    studentIds,
    kind: "DAILY" as const,
    subject: "수학",
    title: "올림포스 풀이",
    note: "",
    unitKind: "PAGE" as const,
    unitStart: 24,
    unitCount: 4,
    advance: false,
    weekdays: "12345",
    startDate: MONDAY,
    endDate: null,
    requireProof: true,
    ...overrides,
  };
}

beforeAll(async () => {
  disposeDatabase = (await createTempDatabase()).dispose;
  repo = await import("@/utils/quest-repository");
  teacher = await import("@/utils/teacher-repository");
  ({ prisma } = await import("@/utils/prisma"));

  const team = await prisma.team.create({ data: { name: "테스트팀", emblem: "star" } });
  aId = (await prisma.student.create({ data: { name: "가나", hairKey: "silver", teamId: team.id } })).id;
  bId = (await prisma.student.create({ data: { name: "다라", hairKey: "black", teamId: team.id } })).id;
});

afterAll(async () => {
  await disposeDatabase();
});

describe("daily quests", () => {
  it("creates one individual quest per student and puts it into today's first free slot", async () => {
    const result = await teacher.createQuests(questInput([aId, bId]), "수학 선생님", WEDNESDAY);
    const today = await repo.getTodayView(aId, WEDNESDAY);

    expect(result).toEqual({ created: 2, skipped: [], notToday: [] });
    expect(await prisma.quest.count()).toBe(2);
    expect(today.promises).toHaveLength(3);
    expect(today.promises[0]).toMatchObject({ subject: "수학", rangeLabel: "p.24~27", requireProof: true, reviewStatus: "OPEN" });
    expect(today.promises[0].questId).not.toBeNull();
    expect(today.promises[1].reviewStatus).toBe("NONE");
  });

  it("repeats only on the chosen weekdays and can continue the range day after day", async () => {
    await teacher.createQuests(questInput([bId], { title: "화목 읽기", subject: "국어", weekdays: "24", advance: true, unitStart: 10, unitCount: 5 }), "국어 선생님", WEDNESDAY);

    const wednesday = await repo.getTodayView(bId, WEDNESDAY);
    const thursday = await repo.getTodayView(bId, "2026-10-01");
    const nextTuesday = await repo.getTodayView(bId, "2026-10-06");

    expect(wednesday.promises.some((card) => card.title === "화목 읽기")).toBe(false);
    expect(thursday.promises.find((card) => card.title === "화목 읽기")?.rangeLabel).toBe("p.10~14");
    expect(nextTuesday.promises.find((card) => card.title === "화목 읽기")?.rangeLabel).toBe("p.15~19");
  });

  it("allows at most three daily quests per weekday and skips the student with a reason", async () => {
    await teacher.createQuests(questInput([aId], { title: "둘째" }), "선생님", WEDNESDAY);
    await teacher.createQuests(questInput([aId], { title: "셋째" }), "선생님", WEDNESDAY);
    const fourth = await teacher.createQuests(questInput([aId], { title: "넷째" }), "선생님", WEDNESDAY);

    expect(fourth.created).toBe(0);
    expect(fourth.skipped[0].message).toContain("3개까지");
  });

  it("does not overwrite a self-promise the student already worked on", async () => {
    const team = await prisma.team.findFirstOrThrow();
    const worker = await prisma.student.create({ data: { name: "진행중", hairKey: "brown", teamId: team.id } });
    const before = await repo.getTodayView(worker.id, WEDNESDAY);
    await repo.setUnitConfirmed({ studentId: worker.id, promiseId: before.promises[0].id, unitNo: 12, done: true, todayKey: WEDNESDAY });
    await repo.setUnitConfirmed({ studentId: worker.id, promiseId: before.promises[1].id, unitNo: 24, done: true, todayKey: WEDNESDAY });
    await repo.setUnitConfirmed({ studentId: worker.id, promiseId: before.promises[2].id, unitNo: 1, done: true, todayKey: WEDNESDAY });

    const created = await teacher.createQuests(questInput([worker.id]), "선생님", WEDNESDAY);
    expect(created.notToday).toEqual(["진행중"]);
    const today = await repo.getTodayView(worker.id, WEDNESDAY);
    const tomorrow = await repo.getTodayView(worker.id, "2026-10-01");

    expect(today.promises.every((card) => card.reviewStatus === "NONE")).toBe(true);
    expect(tomorrow.promises[0].reviewStatus).toBe("OPEN");
  });
});

describe("weekly quests", () => {
  it("creates one card per week that stays editable all week and does not enter the daily score", async () => {
    await teacher.createQuests(questInput([bId], { kind: "WEEKLY", subject: "영어", title: "독해 20쪽", unitStart: 1, unitCount: 20, requireProof: false }), "영어 선생님", WEDNESDAY);
    const today = await repo.getTodayView(bId, WEDNESDAY);
    const weekly = today.weekly.find((card) => card.title === "독해 20쪽");

    expect(weekly).toMatchObject({ scope: "WEEK", unitCount: 20, rangeLabel: "p.1~20" });
    expect(today.promises.some((card) => card.title === "독해 20쪽")).toBe(false);

    const before = await repo.getStudentTotals(bId);
    await repo.setUnitConfirmed({ studentId: bId, promiseId: weekly!.id, unitNo: 1, done: true, todayKey: "2026-10-02" });
    for (let unitNo = 2; unitNo <= 10; unitNo += 1) {
      await repo.setUnitConfirmed({ studentId: bId, promiseId: weekly!.id, unitNo, done: true, todayKey: WEDNESDAY });
    }
    const after = await repo.getStudentTotals(bId);

    expect(after.xp - before.xp).toBe(15); // 10/20 -> floor(30 x 0.5)
    expect(after.coins - before.coins).toBe(3);
  });

  it("locks weekly cards after their week and starts a fresh card next week", async () => {
    const weekly = (await repo.getTodayView(bId, WEDNESDAY)).weekly[0];

    await expect(
      repo.setUnitConfirmed({ studentId: bId, promiseId: weekly.id, unitNo: 11, done: true, todayKey: "2026-10-05" }),
    ).rejects.toMatchObject({ code: "LOCKED" });

    const nextWeek = await repo.getTodayView(bId, "2026-10-05");
    expect(nextWeek.weekly).toHaveLength(1);
    expect(nextWeek.weekly[0].id).not.toBe(weekly.id);
    expect(nextWeek.weekly[0].confirmedUnitNos).toEqual([]);
  });
});

describe("photo proof and review", () => {
  let cardId = "";

  it("blocks submitting until there is progress and a proof photo", async () => {
    const card = (await repo.getTodayView(aId, WEDNESDAY)).promises[0];
    cardId = card.id;

    await expect(repo.submitCard({ studentId: aId, promiseId: cardId, todayKey: WEDNESDAY })).rejects.toMatchObject({ code: "INVALID" });
    await repo.setUnitConfirmed({ studentId: aId, promiseId: cardId, unitNo: 24, done: true, todayKey: WEDNESDAY });
    await expect(repo.submitCard({ studentId: aId, promiseId: cardId, todayKey: WEDNESDAY })).rejects.toThrow("사진 인증");

    const withProof = await repo.addProof({ studentId: aId, promiseId: cardId, imageUrl: "/uploads/a.jpg", todayKey: WEDNESDAY });
    expect(withProof.proofs).toHaveLength(1);

    const submitted = await repo.submitCard({ studentId: aId, promiseId: cardId, todayKey: WEDNESDAY });
    expect(submitted.reviewStatus).toBe("SUBMITTED");
    expect((await teacher.listReviewQueue()).map((item) => item.promiseId)).toContain(cardId);
    expect(await teacher.countPendingReviews()).toBeGreaterThanOrEqual(1);
  });

  it("pulls a submitted card back to in-progress when the student changes it", async () => {
    const edited = await repo.setUnitConfirmed({ studentId: aId, promiseId: cardId, unitNo: 25, done: true, todayKey: WEDNESDAY });

    expect(edited.reviewStatus).toBe("OPEN");
    expect((await repo.submitCard({ studentId: aId, promiseId: cardId, todayKey: WEDNESDAY })).reviewStatus).toBe("SUBMITTED");
  });

  it("does not let another student touch the card or its photos", async () => {
    await expect(repo.addProof({ studentId: bId, promiseId: cardId, imageUrl: "/uploads/x.jpg", todayKey: WEDNESDAY })).rejects.toMatchObject({ code: "NOT_FOUND" });

    const proofId = (await prisma.questProof.findFirstOrThrow({ where: { promiseId: cardId } })).id;
    await expect(repo.removeProof({ studentId: bId, proofId, todayKey: WEDNESDAY })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("asks for a reason on retry, and a retry card counts zero until it is submitted again", async () => {
    await expect(teacher.reviewCard({ promiseId: cardId, decision: "RETRY", feedback: " ", reviewerName: "수학 선생님" })).rejects.toMatchObject({
      code: "INVALID",
    });

    const scoreWith = async () => (await repo.getWeekBoardView(WEDNESDAY, aId)).me?.score ?? 0;
    const before = await scoreWith();
    await teacher.reviewCard({ promiseId: cardId, decision: "RETRY", feedback: "사진이 흐려요. 다시 찍어 주세요.", reviewerName: "수학 선생님" });
    const duringRetry = await scoreWith();

    expect(duringRetry).toBeLessThan(before);
    expect((await repo.getTodayView(aId, WEDNESDAY)).promises[0]).toMatchObject({ reviewStatus: "RETRY", feedback: "사진이 흐려요. 다시 찍어 주세요.", reviewedBy: "수학 선생님" });
    expect(await repo.getLatestFeedbackFor(aId)).toEqual({ who: "수학 선생님", text: "사진이 흐려요. 다시 찍어 주세요." });

    await repo.addProof({ studentId: aId, promiseId: cardId, imageUrl: "/uploads/b.jpg", todayKey: WEDNESDAY });
    await repo.submitCard({ studentId: aId, promiseId: cardId, todayKey: WEDNESDAY });
    expect(await scoreWith()).toBeCloseTo(before, 6);
  });

  it("locks a confirmed card for the student and limits proofs to four", async () => {
    await teacher.reviewCard({ promiseId: cardId, decision: "CONFIRMED", feedback: "잘했어요!", reviewerName: "수학 선생님" });

    await expect(repo.setUnitConfirmed({ studentId: aId, promiseId: cardId, unitNo: 26, done: true, todayKey: WEDNESDAY })).rejects.toMatchObject({ code: "LOCKED" });
    await expect(repo.addProof({ studentId: aId, promiseId: cardId, imageUrl: "/uploads/c.jpg", todayKey: WEDNESDAY })).rejects.toMatchObject({ code: "LOCKED" });

    // 다시 열어서(다시 시도) 사진 한도를 확인한다.
    await teacher.reviewCard({ promiseId: cardId, decision: "HELP", feedback: "같이 봐요", reviewerName: "수학 선생님" });
    await repo.addProof({ studentId: aId, promiseId: cardId, imageUrl: "/uploads/d.jpg", todayKey: WEDNESDAY });
    await repo.addProof({ studentId: aId, promiseId: cardId, imageUrl: "/uploads/e.jpg", todayKey: WEDNESDAY });
    await expect(repo.addProof({ studentId: aId, promiseId: cardId, imageUrl: "/uploads/f.jpg", todayKey: WEDNESDAY })).rejects.toThrow("4장까지");
  });

  it("does not review or take photos on self-made promises", async () => {
    const team = await prisma.team.findFirstOrThrow();
    const free = await prisma.student.create({ data: { name: "자유", hairKey: "green", teamId: team.id } });
    const selfMade = (await repo.getTodayView(free.id, WEDNESDAY)).promises[0];

    expect(selfMade.reviewStatus).toBe("NONE");
    await expect(teacher.reviewCard({ promiseId: selfMade.id, decision: "CONFIRMED", feedback: "", reviewerName: "선생님" })).rejects.toMatchObject({ code: "INVALID" });
    await expect(repo.addProof({ studentId: free.id, promiseId: selfMade.id, imageUrl: "/uploads/z.jpg", todayKey: WEDNESDAY })).rejects.toMatchObject({ code: "INVALID" });
  });

  it("marks a closed week as waiting while cards are still unreviewed", async () => {
    const team = await prisma.team.findFirstOrThrow();
    const waiting = await prisma.student.create({ data: { name: "대기", hairKey: "blue", teamId: team.id } });
    for (const dateKey of ["2026-09-21", "2026-09-22", "2026-09-23"]) {
      await prisma.dailyPromise.create({
        data: { studentId: waiting.id, dateKey, slotIndex: 0, subject: "수학", title: "t", unitKind: "PAGE", unitStart: 1, unitCount: 4, reviewStatus: "SUBMITTED" },
      });
    }

    const board = await repo.getWeekBoardView("2026-09-26", waiting.id);
    expect(board.pendingReviewCount).toBeGreaterThanOrEqual(3);
    expect(board.status).toBe("waiting");
  });
});

describe("managing quests", () => {
  it("removes an untouched card when a quest is paused, and brings it back on resume", async () => {
    await teacher.createQuests(questInput([bId], { title: "멈춤 시험", subject: "과학", weekdays: "3" }), "선생님", WEDNESDAY);
    const quest = await prisma.quest.findFirstOrThrow({ where: { title: "멈춤 시험" } });
    expect((await repo.getTodayView(bId, WEDNESDAY)).promises.some((card) => card.title === "멈춤 시험")).toBe(true);

    await teacher.setQuestActive(quest.id, false, WEDNESDAY);
    expect((await repo.getTodayView(bId, WEDNESDAY)).promises.some((card) => card.title === "멈춤 시험")).toBe(false);

    await teacher.setQuestActive(quest.id, true, WEDNESDAY);
    expect((await repo.getTodayView(bId, WEDNESDAY)).promises.some((card) => card.title === "멈춤 시험")).toBe(true);
  });

  it("keeps worked cards when a quest is deleted", async () => {
    const quest = await prisma.quest.findFirstOrThrow({ where: { title: "멈춤 시험" } });
    const card = (await repo.getTodayView(bId, WEDNESDAY)).promises.find((item) => item.title === "멈춤 시험")!;
    await repo.setUnitConfirmed({ studentId: bId, promiseId: card.id, unitNo: 24, done: true, todayKey: WEDNESDAY });

    await teacher.deleteQuest(quest.id, WEDNESDAY);

    const kept = await prisma.dailyPromise.findUnique({ where: { id: card.id } });
    expect(kept?.questId).toBeNull();
    expect(await prisma.quest.findUnique({ where: { id: quest.id } })).toBeNull();
  });

  it("summarizes the class for the teacher", async () => {
    const overview = await teacher.getClassOverview(WEDNESDAY);
    const student = overview.find((item) => item.studentId === aId)!;

    expect(overview.length).toBeGreaterThanOrEqual(2);
    expect(student.cards.some((card) => card.reviewStatus === "HELP")).toBe(true);
    expect(student.cards.every((card) => card.planned > 0)).toBe(true);
  });
});
