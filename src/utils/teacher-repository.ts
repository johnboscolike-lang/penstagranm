import { formatKoreanDay, getKstDateKey, getWeekStartKey } from "@/utils/kst";
import { buildRangeLabel, listUnitNumbers, type UnitKind } from "@/utils/quest-plan";
import { checkCanReview, toReviewStatus, type ReviewDecision } from "@/utils/quest-review";
import { calcDailyScore } from "@/utils/quest-rules";
import { checkDailyCapacity, describeQuestSchedule, isDailyQuestDue, type QuestInput } from "@/utils/quest-schedule";
import type { QuestView, ReviewItemView, StudentOverviewView } from "@/utils/quest-types";
import { CARD_INCLUDE, countConfirmed, ensureTodayPromises, loadRosterBase, QuestError } from "@/utils/quest-repository";
import { prisma } from "@/utils/prisma";

export interface StudentOption {
  id: string;
  name: string;
  hairKey: string;
  teamId: string;
  teamName: string;
}

/**
 * Lists every student with their team for the quest form's student picker.
 */
export async function listStudentOptions(): Promise<StudentOption[]> {
  const { students, teams } = await loadRosterBase();
  const teamName = new Map(teams.map((team) => [team.id, team.name]));

  return students.map((student) => ({
    id: student.id,
    name: student.name,
    hairKey: student.hairKey,
    teamId: student.teamId,
    teamName: teamName.get(student.teamId) ?? "",
  }));
}

/**
 * Creates one quest per selected student (the same rules, an individual record each).
 * Daily quests are capped at three per weekday; students who would exceed it are skipped with a reason.
 * Today's cards are prepared right away so students see the new quest immediately.
 */
export async function createQuests(input: QuestInput, createdBy: string, todayKey: string = getKstDateKey()) {
  const students = await prisma.student.findMany({ where: { id: { in: input.studentIds } } });
  if (students.length === 0) {
    throw new QuestError("NOT_FOUND", "선택한 학생을 찾을 수 없어요.");
  }

  const created: string[] = [];
  const createdQuestIds: { studentId: string; studentName: string; questId: string }[] = [];
  const skipped: { studentName: string; message: string }[] = [];

  for (const student of students) {
    if (input.kind === "DAILY") {
      const existing = await prisma.quest.findMany({ where: { studentId: student.id, kind: "DAILY", active: true } });
      const capacity = checkDailyCapacity(existing, { kind: "DAILY", weekdays: input.weekdays, startDate: input.startDate, endDate: input.endDate, active: true });
      if (!capacity.ok) {
        skipped.push({ studentName: student.name, message: capacity.message });
        continue;
      }
    }

    const quest = await prisma.quest.create({
      data: {
        studentId: student.id,
        kind: input.kind,
        subject: input.subject,
        title: input.title,
        note: input.note,
        unitKind: input.unitKind,
        unitStart: input.unitStart,
        unitCount: input.unitCount,
        advance: input.advance,
        weekdays: input.weekdays,
        startDate: input.startDate,
        endDate: input.endDate,
        requireProof: input.requireProof,
        createdBy,
      },
    });
    created.push(student.id);
    createdQuestIds.push({ studentId: student.id, studentName: student.name, questId: quest.id });
  }

  await Promise.all(created.map((studentId) => ensureTodayPromises(studentId, todayKey)));

  // 오늘 나타나야 하는데 자리가 없어서 내일부터 나타나는 학생을 알려 준다.
  const notToday: string[] = [];
  if (input.kind === "DAILY" && isDailyQuestDue({ kind: "DAILY", weekdays: input.weekdays, startDate: input.startDate, endDate: input.endDate, active: true }, todayKey)) {
    const carded = await prisma.dailyPromise.findMany({
      where: { questId: { in: createdQuestIds.map((item) => item.questId) }, dateKey: todayKey },
      select: { questId: true },
    });
    const cardedIds = new Set(carded.map((card) => card.questId));
    notToday.push(...createdQuestIds.filter((item) => !cardedIds.has(item.questId)).map((item) => item.studentName));
  }

  return { created: created.length, skipped, notToday };
}

/**
 * Lists all quests with student names, newest first inside each student.
 */
export async function listQuests(): Promise<QuestView[]> {
  const quests = await prisma.quest.findMany({
    include: { student: { include: { team: true } } },
    orderBy: [{ createdAt: "desc" }],
  });

  return quests
    .sort((left, right) => left.student.name.localeCompare(right.student.name, "ko"))
    .map((quest) => ({
      id: quest.id,
      studentId: quest.studentId,
      studentName: quest.student.name,
      teamName: quest.student.team.name,
      kind: quest.kind === "WEEKLY" ? "WEEKLY" : "DAILY",
      subject: quest.subject,
      title: quest.title,
      note: quest.note,
      unitKind: quest.unitKind as UnitKind,
      unitStart: quest.unitStart,
      unitCount: quest.unitCount,
      rangeLabel: buildRangeLabel({ unitKind: quest.unitKind as UnitKind, unitStart: quest.unitStart, unitCount: quest.unitCount }),
      scheduleLabel: describeQuestSchedule(quest),
      requireProof: quest.requireProof,
      active: quest.active,
      createdBy: quest.createdBy,
    }));
}

/**
 * Removes today's and this week's cards of a quest when the student has not started them,
 * so a paused or deleted quest does not linger on the student's screen.
 */
async function removeUntouchedCards(questId: string, todayKey: string): Promise<void> {
  await prisma.dailyPromise.deleteMany({
    where: {
      questId,
      reviewStatus: "OPEN",
      units: { none: {} },
      proofs: { none: {} },
      dateKey: { gte: getWeekStartKey(todayKey) },
    },
  });
}

/**
 * Pauses or resumes a quest. Paused quests stop creating new cards.
 */
export async function setQuestActive(questId: string, active: boolean, todayKey: string = getKstDateKey()): Promise<void> {
  const quest = await prisma.quest.findUnique({ where: { id: questId } });
  if (!quest) {
    throw new QuestError("NOT_FOUND", "퀘스트를 찾을 수 없어요.");
  }

  if (active && quest.kind === "DAILY") {
    const others = await prisma.quest.findMany({ where: { studentId: quest.studentId, kind: "DAILY", active: true, id: { not: quest.id } } });
    const capacity = checkDailyCapacity(others, { kind: "DAILY", weekdays: quest.weekdays, startDate: quest.startDate, endDate: quest.endDate, active: true });
    if (!capacity.ok) {
      throw new QuestError("INVALID", capacity.message);
    }
  }

  await prisma.quest.update({ where: { id: questId }, data: { active } });
  if (active) {
    await ensureTodayPromises(quest.studentId, todayKey);
  } else {
    await removeUntouchedCards(questId, todayKey);
  }
}

/**
 * Deletes a quest. Cards the student already worked on stay in their records without the quest link.
 */
export async function deleteQuest(questId: string, todayKey: string = getKstDateKey()): Promise<void> {
  const quest = await prisma.quest.findUnique({ where: { id: questId } });
  if (!quest) {
    throw new QuestError("NOT_FOUND", "퀘스트를 찾을 수 없어요.");
  }

  await removeUntouchedCards(questId, todayKey);
  await prisma.quest.delete({ where: { id: questId } });
}

/**
 * Formats a card's date for the review list: a weekday label for day cards, "이번 주" style range for weekly cards.
 */
function describeCardDate(scope: string, dateKey: string): string {
  return scope === "WEEK" ? `${formatKoreanDay(dateKey)} 주간` : formatKoreanDay(dateKey);
}

type ReviewCard = Awaited<ReturnType<typeof loadReviewCards>>[number];

/**
 * Loads cards with student, team, units, proofs and quest note for the review screens.
 */
async function loadReviewCards(where: Record<string, unknown>, orderBy: Record<string, "asc" | "desc">, take: number) {
  return prisma.dailyPromise.findMany({
    where,
    orderBy,
    take,
    include: { ...CARD_INCLUDE, student: { include: { team: true } } },
  });
}

/**
 * Maps a loaded card to the row shown to the teacher.
 */
function toReviewItem(card: ReviewCard): ReviewItemView {
  const range = { unitKind: card.unitKind as UnitKind, unitStart: card.unitStart, unitCount: card.unitCount };
  const valid = new Set(listUnitNumbers(range));

  return {
    promiseId: card.id,
    studentId: card.studentId,
    studentName: card.student.name,
    hairKey: card.student.hairKey,
    teamName: card.student.team.name,
    scope: card.scope === "WEEK" ? "WEEK" : "DAY",
    dateLabel: describeCardDate(card.scope, card.dateKey),
    subject: card.subject,
    title: card.title,
    questNote: card.quest?.note ?? "",
    rangeLabel: buildRangeLabel(range),
    unitKind: range.unitKind,
    unitStart: card.unitStart,
    unitCount: card.unitCount,
    confirmedUnitNos: card.units.map((unit) => unit.unitNo).filter((unitNo) => valid.has(unitNo)),
    requireProof: card.requireProof,
    proofs: card.proofs,
    submittedAt: card.submittedAt ? card.submittedAt.toISOString() : null,
    reviewStatus: toReviewStatus(card.reviewStatus),
    feedback: card.feedback,
  };
}

/**
 * Lists cards waiting for the teacher, oldest submission first.
 */
export async function listReviewQueue(): Promise<ReviewItemView[]> {
  const cards = await loadReviewCards({ reviewStatus: "SUBMITTED" }, { submittedAt: "asc" }, 100);

  return cards.map(toReviewItem);
}

/**
 * Lists the most recently reviewed cards so the teacher can see (and reopen) what was decided.
 */
export async function listRecentReviews(limit = 8): Promise<ReviewItemView[]> {
  const cards = await loadReviewCards({ reviewedAt: { not: null }, reviewStatus: { in: ["CONFIRMED", "RETRY", "HELP"] } }, { reviewedAt: "desc" }, limit);

  return cards.map(toReviewItem);
}

/**
 * Records the teacher's decision on a submitted (or in-progress) teacher-quest card.
 */
export async function reviewCard(input: { promiseId: string; decision: ReviewDecision; feedback: string; reviewerName: string }): Promise<void> {
  const card = await prisma.dailyPromise.findUnique({ where: { id: input.promiseId } });
  if (!card) {
    throw new QuestError("NOT_FOUND", "약속을 찾을 수 없어요.");
  }

  const feedback = input.feedback.trim().slice(0, 200);
  const check = checkCanReview({ status: toReviewStatus(card.reviewStatus), decision: input.decision, feedback });
  if (!check.ok) {
    throw new QuestError("INVALID", check.reason);
  }

  await prisma.dailyPromise.update({
    where: { id: card.id },
    data: { reviewStatus: input.decision, feedback, reviewedAt: new Date(), reviewedBy: input.reviewerName },
  });
}

/**
 * Summarizes every student's cards for today: score, and each card's progress and review state.
 */
export async function getClassOverview(todayKey: string): Promise<StudentOverviewView[]> {
  const { students, teams } = await loadRosterBase();
  await Promise.all(students.map((student) => ensureTodayPromises(student.id, todayKey)));

  const weekStart = getWeekStartKey(todayKey);
  const cards = await prisma.dailyPromise.findMany({
    where: { OR: [{ dateKey: todayKey, scope: "DAY" }, { dateKey: weekStart, scope: "WEEK" }] },
    orderBy: { slotIndex: "asc" },
    include: { units: { select: { unitNo: true } } },
  });
  const teamName = new Map(teams.map((team) => [team.id, team.name]));

  return students.map((student) => {
    const own = cards.filter((card) => card.studentId === student.id);
    const dayCards = own.filter((card) => card.scope !== "WEEK");

    return {
      studentId: student.id,
      name: student.name,
      hairKey: student.hairKey,
      teamName: teamName.get(student.teamId) ?? "",
      todayScore: calcDailyScore(dayCards.map((card) => ({ confirmedUnits: countConfirmed(card), plannedUnits: card.unitCount }))),
      cards: own.map((card) => ({
        id: card.id,
        subject: card.subject,
        title: card.title,
        scope: card.scope === "WEEK" ? ("WEEK" as const) : ("DAY" as const),
        reviewStatus: toReviewStatus(card.reviewStatus),
        confirmed: countConfirmed(card),
        planned: card.unitCount,
      })),
    };
  });
}

/**
 * Counts cards waiting for the teacher (shown as the badge on the review tab).
 */
export async function countPendingReviews(): Promise<number> {
  return prisma.dailyPromise.count({ where: { reviewStatus: "SUBMITTED" } });
}
