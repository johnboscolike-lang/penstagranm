import { Prisma, type PrismaClient } from "@prisma/client";

import { addDaysToKey, formatKoreanDay, getKstDateKey, getWeekStartKey, isSchoolDay } from "@/utils/kst";
import {
  buildLastWeekNews,
  buildWeekBoard,
  indexPromises,
  type PromiseRecord,
  type StudentRecord,
  type TeamRecord,
  type WeekBoard,
  type WeekNews,
} from "@/utils/quest-board";
import {
  buildRangeLabel,
  DEFAULT_PROMISE_PLAN,
  listUnitNumbers,
  suggestNextRange,
  type UnitKind,
} from "@/utils/quest-plan";
import {
  checkCanSubmit,
  canStudentEdit,
  countsTowardScore,
  statusAfterStudentEdit,
  toReviewStatus,
  MAX_PROOFS_PER_CARD,
  type ReviewStatus,
} from "@/utils/quest-review";
import { calcDailyResult, calcLevel, calcWeeklyQuestReward, type PromiseProgress } from "@/utils/quest-rules";
import { assignQuestSlots, isDailyQuestDue, isWeeklyQuestDue, pickQuestRange } from "@/utils/quest-schedule";
import type { CardState, HudView, ProofView, PromiseView, TodayView, UpcomingScheduleView } from "@/utils/quest-types";
import { prisma } from "@/utils/prisma";
import { HAT_KEYS } from "@/utils/art/hats";
import { petsFromAchievements } from "@/utils/achievement-rules";
import { syncAchievements } from "@/utils/achievement-repository";
import { calcStreak } from "@/utils/streak";
import { findHatByPurchaseKey, hatPurchaseKey, isHatKey, isPetKey, unlockedPetKeys } from "@/utils/cosmetics";
import { calcCoinBalance, findShopItem } from "@/utils/shop-items";

const HISTORY_WEEKS = 6;
const WEEKLY_SLOT_BASE = 100;

export type QuestErrorCode =
  | "NOT_FOUND"
  | "LOCKED"
  | "OUT_OF_RANGE"
  | "UNKNOWN_ITEM"
  | "ALREADY_OWNED"
  | "INSUFFICIENT_COINS"
  | "INVALID"
  | "FORBIDDEN";

/**
 * Error with a stable code so API routes can map it to an HTTP status and a Korean message.
 */
export class QuestError extends Error {
  code: QuestErrorCode;

  /**
   * Creates a quest rule error carrying a machine-readable code.
   */
  constructor(code: QuestErrorCode, message: string) {
    super(message);
    this.name = "QuestError";
    this.code = code;
  }
}

export type DbClient = PrismaClient | Prisma.TransactionClient;

interface CardRow {
  studentId: string;
  dateKey: string;
  slotIndex: number;
  unitStart: number;
  unitCount: number;
  reviewStatus: string;
  units: { unitNo: number }[];
}

/**
 * Counts the distinct confirmed units that fall inside the promise's planned range.
 */
export function countConfirmed(row: Pick<CardRow, "unitStart" | "unitCount" | "units">): number {
  const last = row.unitStart + row.unitCount - 1;

  return new Set(row.units.map((unit) => unit.unitNo).filter((unitNo) => unitNo >= row.unitStart && unitNo <= last)).size;
}

/**
 * Converts stored day-card rows into the plain records used by the scoring module.
 * A card the teacher sent back for a retry counts zero until it is submitted again.
 */
function toPromiseRecords(rows: CardRow[]): PromiseRecord[] {
  return rows.map((row) => ({
    studentId: row.studentId,
    dateKey: row.dateKey,
    slotIndex: row.slotIndex,
    plannedUnits: row.unitCount,
    confirmedUnits: countsTowardScore(toReviewStatus(row.reviewStatus)) ? countConfirmed(row) : 0,
  }));
}

/**
 * Loads every team and student (no "me" needed).
 */
export async function loadRosterBase(): Promise<{ students: StudentRecord[]; teams: TeamRecord[] }> {
  const [teams, students] = await Promise.all([
    prisma.team.findMany({ orderBy: { name: "asc" } }),
    prisma.student.findMany({ orderBy: { name: "asc" } }),
  ]);

  return {
    students: students.map((student) => ({
      id: student.id,
      name: student.name,
      hairKey: student.hairKey,
      teamId: student.teamId,
      isMe: false,
      joinedOn: student.joinedOn,
    })),
    teams: teams.map((team) => ({ id: team.id, name: team.name, emblem: team.emblem })),
  };
}

/**
 * Loads every team and student, and finds the logged-in player ("me") by id.
 */
export async function loadRoster(meId: string): Promise<{ students: StudentRecord[]; teams: TeamRecord[]; me: StudentRecord }> {
  const base = await loadRosterBase();
  const me = base.students.find((student) => student.id === meId);
  if (!me) {
    throw new QuestError("NOT_FOUND", "학생 정보를 찾을 수 없어요. 다시 입장해 주세요.");
  }

  return { students: base.students.map((student) => ({ ...student, isMe: student.id === meId })), teams: base.teams, me: { ...me, isMe: true } };
}

/**
 * Loads all students' day-card promises from a date onward, with their confirmed units.
 */
async function loadPromiseRecordsSince(fromKey: string): Promise<PromiseRecord[]> {
  const rows = await prisma.dailyPromise.findMany({
    where: { dateKey: { gte: fromKey }, scope: "DAY" },
    select: {
      studentId: true,
      dateKey: true,
      slotIndex: true,
      unitStart: true,
      unitCount: true,
      reviewStatus: true,
      units: { select: { unitNo: true } },
    },
  });

  return toPromiseRecords(rows);
}

/**
 * Sums a student's lifetime XP and earned coins: day cards by the daily formulas (one reflection bonus per posting day)
 * plus the weekly-quest reward of every weekly card and the arena rewards of finished duels.
 */
async function calcLifetimeTotals(client: DbClient, studentId: string): Promise<{ xp: number; earnedCoins: number }> {
  const [rows, posts, asChallenger, asOpponent, bossRewards] = await Promise.all([
    client.dailyPromise.findMany({
      where: { studentId },
      select: {
        studentId: true,
        dateKey: true,
        slotIndex: true,
        unitStart: true,
        unitCount: true,
        scope: true,
        reviewStatus: true,
        units: { select: { unitNo: true } },
      },
    }),
    client.post.findMany({ where: { studentId }, select: { createdAt: true } }),
    client.duel.aggregate({ where: { challengerId: studentId, status: "DONE" }, _sum: { challengerXp: true, challengerCoins: true } }),
    client.duel.aggregate({ where: { opponentId: studentId, status: "DONE" }, _sum: { opponentXp: true, opponentCoins: true } }),
    client.bossReward.aggregate({ where: { studentId }, _sum: { xp: true, coins: true } }),
  ]);

  const dayRows = rows.filter((row) => row.scope !== "WEEK");
  const weekRows = rows.filter((row) => row.scope === "WEEK");

  const progressByDay = new Map<string, PromiseProgress[]>();
  toPromiseRecords(dayRows)
    .sort((left, right) => left.slotIndex - right.slotIndex)
    .forEach((record) => {
      const slots = progressByDay.get(record.dateKey) ?? [];
      slots.push({ confirmedUnits: record.confirmedUnits, plannedUnits: record.plannedUnits });
      progressByDay.set(record.dateKey, slots);
    });
  const reflectionDays = new Set(posts.map((post) => getKstDateKey(post.createdAt)));
  const allDays = new Set([...progressByDay.keys(), ...reflectionDays]);

  let xp = 0;
  let earnedCoins = 0;
  allDays.forEach((dateKey) => {
    const result = calcDailyResult(progressByDay.get(dateKey) ?? [], reflectionDays.has(dateKey));
    xp += result.xp;
    earnedCoins += result.coins;
  });

  toPromiseRecords(weekRows).forEach((record) => {
    const reward = calcWeeklyQuestReward({ confirmedUnits: record.confirmedUnits, plannedUnits: record.plannedUnits });
    xp += reward.xp;
    earnedCoins += reward.coins;
  });

  // 대결장 보상: 이기든 지든 참여 보상이 있고, 하루 횟수 제한은 대결이 끝날 때 이미 반영돼 있다.
  xp += (asChallenger._sum.challengerXp ?? 0) + (asOpponent._sum.opponentXp ?? 0);
  earnedCoins += (asChallenger._sum.challengerCoins ?? 0) + (asOpponent._sum.opponentCoins ?? 0);

  // 학급 보스를 쓰러뜨리고 받은 보상.
  xp += bossRewards._sum.xp ?? 0;
  earnedCoins += bossRewards._sum.coins ?? 0;

  return { xp, earnedCoins };
}

/**
 * Sums the coins a student has already spent in the shop.
 */
async function calcSpentCoins(client: DbClient, studentId: string): Promise<number> {
  const result = await client.purchase.aggregate({ where: { studentId }, _sum: { cost: true } });

  return result._sum.cost ?? 0;
}

/**
 * Returns a student's lifetime XP and spendable coins (earned minus spent).
 */
export async function getStudentTotals(studentId: string): Promise<{ xp: number; coins: number }> {
  const [totals, spent] = await Promise.all([calcLifetimeTotals(prisma, studentId), calcSpentCoins(prisma, studentId)]);

  return { xp: totals.xp, coins: calcCoinBalance(totals.earnedCoins, spent) };
}

export interface Wardrobe {
  found: boolean;
  /** 쓰고 있는 모자·펫. 가지고 있지 않은 값이 남아 있으면 쓰지 않은 것으로 본다. */
  hatKey: string | null;
  petKey: string | null;
  ownedHatKeys: Set<string>;
  ownedPetKeys: Set<string>;
}

/**
 * 학생이 가진 모자(구매 기록)와 펫(보스 보상 기록), 그리고 지금 쓰고 있는 것을 한꺼번에 읽는다.
 */
export async function loadWardrobe(client: DbClient, studentId: string): Promise<Wardrobe> {
  const [student, purchases, rewards, achievements] = await Promise.all([
    client.student.findUnique({ where: { id: studentId }, select: { hatKey: true, petKey: true } }),
    client.purchase.findMany({ where: { studentId, itemKey: { startsWith: "hat:" } }, select: { itemKey: true } }),
    client.bossReward.findMany({ where: { studentId }, select: { weekKey: true } }),
    client.achievement.findMany({ where: { studentId }, select: { key: true } }),
  ]);
  const ownedPurchases = new Set(purchases.map((purchase) => purchase.itemKey));
  const ownedHatKeys = new Set(HAT_KEYS.filter((key) => ownedPurchases.has(hatPurchaseKey(key))));
  const ownedPetKeys = new Set<string>([...unlockedPetKeys(rewards.map((reward) => reward.weekKey)), ...petsFromAchievements(achievements.map((row) => row.key))]);

  return {
    found: student !== null,
    hatKey: isHatKey(student?.hatKey) && ownedHatKeys.has(student.hatKey) ? student.hatKey : null,
    petKey: isPetKey(student?.petKey) && ownedPetKeys.has(student.petKey) ? student.petKey : null,
    ownedHatKeys,
    ownedPetKeys,
  };
}

const STREAK_LOOKBACK_DAYS = 120;

/**
 * 학생이 약속 칸을 하나라도 채운 날짜들(선생님이 다시 시도로 돌려보낸 카드는 제외)을 모은다.
 */
async function loadActiveDays(client: DbClient, studentId: string, todayKey: string): Promise<Set<string>> {
  const rows = await client.dailyPromise.findMany({
    where: { studentId, scope: "DAY", dateKey: { gte: addDaysToKey(todayKey, -STREAK_LOOKBACK_DAYS), lte: todayKey } },
    select: { dateKey: true, unitStart: true, unitCount: true, reviewStatus: true, units: { select: { unitNo: true } } },
  });

  return new Set(rows.filter((row) => countsTowardScore(toReviewStatus(row.reviewStatus)) && countConfirmed(row) > 0).map((row) => row.dateKey));
}

/**
 * Builds the profile capsule data (level, XP bar, coins) shown on every screen.
 */
async function buildHudView(me: StudentRecord, teams: TeamRecord[]): Promise<HudView> {
  const todayKey = getKstDateKey();
  const activeDays = await loadActiveDays(prisma, me.id, todayKey);
  const streak = calcStreak(activeDays, todayKey);
  // 업적을 먼저 저장해야 방금 만난 동물 펫이 아래 옷장 정보에 바로 들어간다.
  const achievements = await syncAchievements(prisma, me.id, streak.count);
  const [totals, arenaInbox, look] = await Promise.all([
    getStudentTotals(me.id),
    prisma.duel.count({ where: { opponentId: me.id, status: "PENDING", opponentScore: null } }),
    loadWardrobe(prisma, me.id),
  ]);
  const level = calcLevel(totals.xp);

  return {
    name: me.name,
    hairKey: me.hairKey,
    teamName: teams.find((team) => team.id === me.teamId)?.name ?? "",
    level: level.level,
    xpInLevel: level.xpInLevel,
    xpForNext: level.xpForNext,
    totalXp: totals.xp,
    coins: totals.coins,
    arenaInbox,
    hatKey: look.hatKey,
    petKey: look.petKey,
    streak: streak.count,
    streakToday: streak.includesToday,
    newAchievements: achievements.fresh,
  };
}

export interface PageBase {
  hud: HudView;
  meId: string;
  todayKey: string;
}

/**
 * Loads what every student page needs: the HUD, the player's id, and today's Asia/Seoul date key.
 */
export async function getPageBase(meId: string): Promise<PageBase> {
  const { me, teams } = await loadRoster(meId);

  return { hud: await buildHudView(me, teams), meId: me.id, todayKey: getKstDateKey() };
}

/**
 * Creates a row and ignores the unique-constraint error when another request created the same card first.
 */
async function createIgnoringDuplicate(create: () => Promise<unknown>): Promise<void> {
  try {
    await create();
  } catch (error: unknown) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) {
      throw error;
    }
  }
}

/**
 * Creates this week's cards for the student's active weekly quests (one card per quest per week).
 */
export async function ensureWeekCards(studentId: string, dateKey: string): Promise<void> {
  const weekStart = getWeekStartKey(dateKey);
  const quests = await prisma.quest.findMany({
    where: { studentId, kind: "WEEKLY", active: true },
    orderBy: { createdAt: "asc" },
  });
  if (quests.length === 0) {
    return;
  }

  const existing = await prisma.dailyPromise.findMany({
    where: { studentId, scope: "WEEK", dateKey: weekStart },
    select: { questId: true },
  });
  const carded = new Set(existing.map((card) => card.questId));

  for (const [index, quest] of quests.entries()) {
    if (carded.has(quest.id) || !isWeeklyQuestDue(quest, weekStart)) {
      continue;
    }

    const previous = await prisma.dailyPromise.findFirst({
      where: { questId: quest.id, scope: "WEEK", dateKey: { lt: weekStart } },
      orderBy: { dateKey: "desc" },
    });
    const range = pickQuestRange(
      quest,
      previous ? { unitKind: previous.unitKind as UnitKind, unitStart: previous.unitStart, unitCount: previous.unitCount } : null,
    );

    await createIgnoringDuplicate(() =>
      prisma.dailyPromise.create({
        data: {
          studentId,
          dateKey: weekStart,
          slotIndex: WEEKLY_SLOT_BASE + index,
          scope: "WEEK",
          questId: quest.id,
          subject: quest.subject,
          title: quest.title,
          unitKind: range.unitKind,
          unitStart: range.unitStart,
          unitCount: range.unitCount,
          requireProof: quest.requireProof,
          reviewStatus: "OPEN",
        },
      }),
    );
  }
}

/**
 * Makes sure today's three promise cards exist. Teacher daily quests come first (repeating on their weekdays),
 * the remaining slots get the student's own default promises; weekends stay empty.
 */
export async function ensureTodayPromises(studentId: string, dateKey: string): Promise<void> {
  await ensureWeekCards(studentId, dateKey);
  if (!isSchoolDay(dateKey)) {
    return;
  }

  const [quests, cards] = await Promise.all([
    prisma.quest.findMany({ where: { studentId, kind: "DAILY", active: true }, orderBy: { createdAt: "asc" } }),
    prisma.dailyPromise.findMany({
      where: { studentId, dateKey, scope: "DAY" },
      select: { id: true, slotIndex: true, questId: true, units: { select: { unitNo: true } } },
    }),
  ]);

  const due = quests.filter((quest) => isDailyQuestDue(quest, dateKey));
  const assignments = assignQuestSlots(
    due.map((quest) => quest.id),
    cards.map((card) => ({ slotIndex: card.slotIndex, questId: card.questId, cardId: card.id, hasProgress: card.units.length > 0 })),
  );
  const taken = new Set(cards.map((card) => card.slotIndex));

  for (const assignment of assignments) {
    const quest = due.find((item) => item.id === assignment.questId);
    if (!quest) {
      continue;
    }

    const previous = await prisma.dailyPromise.findFirst({
      where: { questId: quest.id, scope: "DAY", dateKey: { lt: dateKey } },
      orderBy: { dateKey: "desc" },
    });
    const range = pickQuestRange(
      quest,
      previous ? { unitKind: previous.unitKind as UnitKind, unitStart: previous.unitStart, unitCount: previous.unitCount } : null,
    );

    await createIgnoringDuplicate(() =>
      prisma.$transaction(async (tx) => {
        if (assignment.replaceCardId) {
          await tx.dailyPromise.delete({ where: { id: assignment.replaceCardId } });
        }
        await tx.dailyPromise.create({
          data: {
            studentId,
            dateKey,
            slotIndex: assignment.slotIndex,
            scope: "DAY",
            questId: quest.id,
            subject: quest.subject,
            title: quest.title,
            unitKind: range.unitKind,
            unitStart: range.unitStart,
            unitCount: range.unitCount,
            requireProof: quest.requireProof,
            reviewStatus: "OPEN",
          },
        });
      }),
    );
    taken.add(assignment.slotIndex);
  }

  for (const [slotIndex, template] of DEFAULT_PROMISE_PLAN.entries()) {
    if (taken.has(slotIndex)) {
      continue;
    }

    const previous = await prisma.dailyPromise.findFirst({
      where: { studentId, slotIndex, scope: "DAY", questId: null, dateKey: { lt: dateKey } },
      orderBy: { dateKey: "desc" },
    });
    const range = suggestNextRange(
      previous ? { unitKind: previous.unitKind as UnitKind, unitStart: previous.unitStart, unitCount: previous.unitCount } : null,
      template,
      slotIndex,
    );

    await createIgnoringDuplicate(() =>
      prisma.dailyPromise.create({
        data: {
          studentId,
          dateKey,
          slotIndex,
          scope: "DAY",
          subject: template.subject,
          title: template.title,
          unitKind: range.unitKind,
          unitStart: range.unitStart,
          unitCount: range.unitCount,
        },
      }),
    );
  }
}

const CARD_INCLUDE = {
  units: { select: { unitNo: true }, orderBy: { unitNo: "asc" as const } },
  proofs: { select: { id: true, imageUrl: true }, orderBy: { createdAt: "asc" as const } },
  quest: { select: { note: true } },
};

type CardWithRelations = Prisma.DailyPromiseGetPayload<{ include: typeof CARD_INCLUDE }>;

/**
 * Turns a stored card and its units/proofs into the view the screens need.
 */
export function toPromiseView(row: CardWithRelations): PromiseView {
  const range = { unitKind: row.unitKind as UnitKind, unitStart: row.unitStart, unitCount: row.unitCount };
  const valid = new Set(listUnitNumbers(range));

  return {
    id: row.id,
    slotIndex: row.slotIndex,
    scope: row.scope === "WEEK" ? "WEEK" : "DAY",
    subject: row.subject,
    title: row.title,
    unitKind: range.unitKind,
    unitStart: row.unitStart,
    unitCount: row.unitCount,
    rangeLabel: buildRangeLabel(range),
    confirmedUnitNos: row.units.map((unit) => unit.unitNo).filter((unitNo) => valid.has(unitNo)),
    questId: row.questId,
    questNote: row.quest?.note ?? "",
    requireProof: row.requireProof,
    reviewStatus: toReviewStatus(row.reviewStatus),
    feedback: row.feedback,
    reviewedBy: row.reviewedBy,
    proofs: row.proofs,
  };
}

export { CARD_INCLUDE };

/**
 * Loads today's promise cards (and this week's weekly quest cards) with confirmed units, proofs and review state.
 */
export async function getTodayView(studentId: string, dateKey: string): Promise<TodayView> {
  await ensureTodayPromises(studentId, dateKey);

  const weekStart = getWeekStartKey(dateKey);
  const [rows, weeklyRows, posts] = await Promise.all([
    prisma.dailyPromise.findMany({
      where: { studentId, dateKey, scope: "DAY" },
      orderBy: { slotIndex: "asc" },
      include: CARD_INCLUDE,
    }),
    prisma.dailyPromise.findMany({
      where: { studentId, dateKey: weekStart, scope: "WEEK" },
      orderBy: { slotIndex: "asc" },
      include: CARD_INCLUDE,
    }),
    prisma.post.findMany({ where: { studentId }, select: { createdAt: true } }),
  ]);

  return {
    dateKey,
    label: formatKoreanDay(dateKey),
    isSchoolDay: isSchoolDay(dateKey),
    reflected: posts.some((post) => getKstDateKey(post.createdAt) === dateKey),
    promises: rows.map(toPromiseView),
    weekly: weeklyRows.map(toPromiseView),
  };
}

/**
 * Loads the week board (rankings, teams, my week) for the week containing the given date.
 */
export async function getWeekBoardView(dateKey: string, meId: string): Promise<WeekBoard> {
  const { students, teams, me } = await loadRoster(meId);
  const weekStart = getWeekStartKey(dateKey);
  const fromKey = addDaysToKey(weekStart, -7 * HISTORY_WEEKS);
  const [records, pendingReviewCount] = await Promise.all([
    loadPromiseRecordsSince(fromKey),
    prisma.dailyPromise.count({
      where: { scope: "DAY", reviewStatus: "SUBMITTED", dateKey: { gte: weekStart, lte: addDaysToKey(weekStart, 4) } },
    }),
  ]);

  return buildWeekBoard({ students, teams, index: indexPromises(records), asOfKey: dateKey, meId: me.id, pendingReviewCount });
}

/**
 * Loads last week's news (voucher and badge) for the player.
 */
export async function getLastWeekNewsView(dateKey: string, meId: string): Promise<WeekNews> {
  const { me } = await loadRoster(meId);
  const currentWeekStart = getWeekStartKey(dateKey);
  const fromKey = addDaysToKey(currentWeekStart, -7 * HISTORY_WEEKS);
  const records = await loadPromiseRecordsSince(fromKey);

  return buildLastWeekNews(indexPromises(records), me.id, currentWeekStart, HISTORY_WEEKS - 1, me.joinedOn);
}

/**
 * Tells whether a card may still be changed on the given day: day cards only today, weekly cards during their week.
 */
function isCardOpenOn(card: { scope: string; dateKey: string }, todayKey: string): boolean {
  if (card.scope === "WEEK") {
    return todayKey >= card.dateKey && todayKey <= addDaysToKey(card.dateKey, 6);
  }

  return card.dateKey === todayKey;
}

/**
 * Loads a card owned by the student and checks that they may still change it.
 */
async function loadEditableCard(studentId: string, promiseId: string, todayKey: string) {
  const card = await prisma.dailyPromise.findUnique({ where: { id: promiseId } });
  if (!card || card.studentId !== studentId) {
    throw new QuestError("NOT_FOUND", "약속을 찾을 수 없어요.");
  }

  const status = toReviewStatus(card.reviewStatus);
  if (!canStudentEdit(status)) {
    throw new QuestError("LOCKED", "선생님이 확인한 퀘스트는 고칠 수 없어요.");
  }

  if (!isCardOpenOn(card, todayKey)) {
    throw new QuestError("LOCKED", "지난 약속은 고칠 수 없어요. 오늘의 약속만 기록해요.");
  }

  return { card, status };
}

/**
 * Moves a submitted card back to "in progress" after the student changed it.
 */
async function reopenAfterEdit(promiseId: string, status: ReviewStatus): Promise<void> {
  const next = statusAfterStudentEdit(status);
  if (next !== status) {
    await prisma.dailyPromise.update({ where: { id: promiseId }, data: { reviewStatus: next, submittedAt: null } });
  }
}

/**
 * Reads the current state of one card so the client can refresh without a full reload.
 */
export async function getCardState(promiseId: string): Promise<CardState> {
  const row = await prisma.dailyPromise.findUnique({ where: { id: promiseId }, include: CARD_INCLUDE });
  if (!row) {
    throw new QuestError("NOT_FOUND", "약속을 찾을 수 없어요.");
  }
  const view = toPromiseView(row);

  return { confirmedUnitNos: view.confirmedUnitNos, reviewStatus: view.reviewStatus, feedback: view.feedback, proofs: view.proofs };
}

/**
 * Confirms or clears one unit of a card. The same unit never counts twice.
 */
export async function setUnitConfirmed(input: {
  studentId: string;
  promiseId: string;
  unitNo: number;
  done: boolean;
  todayKey: string;
}): Promise<CardState> {
  const { card, status } = await loadEditableCard(input.studentId, input.promiseId, input.todayKey);

  if (!listUnitNumbers(card).includes(input.unitNo)) {
    throw new QuestError("OUT_OF_RANGE", "약속 범위에 없는 칸이에요.");
  }

  if (input.done) {
    await prisma.promiseUnit.upsert({
      where: { promiseId_unitNo: { promiseId: card.id, unitNo: input.unitNo } },
      update: {},
      create: { promiseId: card.id, unitNo: input.unitNo },
    });
  } else {
    await prisma.promiseUnit.deleteMany({ where: { promiseId: card.id, unitNo: input.unitNo } });
  }

  await reopenAfterEdit(card.id, status);

  return getCardState(card.id);
}

/**
 * Attaches a proof photo (already stored, relative URL) to a teacher-quest card.
 */
export async function addProof(input: { studentId: string; promiseId: string; imageUrl: string; todayKey: string }): Promise<CardState> {
  const { card, status } = await loadEditableCard(input.studentId, input.promiseId, input.todayKey);

  if (status === "NONE") {
    throw new QuestError("INVALID", "선생님이 낸 퀘스트에만 사진 인증을 올릴 수 있어요.");
  }

  const count = await prisma.questProof.count({ where: { promiseId: card.id } });
  if (count >= MAX_PROOFS_PER_CARD) {
    throw new QuestError("INVALID", `인증 사진은 ${MAX_PROOFS_PER_CARD}장까지 올릴 수 있어요.`);
  }

  await prisma.questProof.create({ data: { promiseId: card.id, imageUrl: input.imageUrl } });
  await reopenAfterEdit(card.id, status);

  return getCardState(card.id);
}

/**
 * Removes one of the student's own proof photos while the card is still editable.
 */
export async function removeProof(input: { studentId: string; proofId: string; todayKey: string }): Promise<CardState> {
  const proof = await prisma.questProof.findUnique({ where: { id: input.proofId }, include: { promise: true } });
  if (!proof || proof.promise.studentId !== input.studentId) {
    throw new QuestError("NOT_FOUND", "사진을 찾을 수 없어요.");
  }

  const { card, status } = await loadEditableCard(input.studentId, proof.promiseId, input.todayKey);
  await prisma.questProof.delete({ where: { id: proof.id } });
  await reopenAfterEdit(card.id, status);

  return getCardState(card.id);
}

/**
 * Sends a teacher-quest card to the teacher for confirmation.
 */
export async function submitCard(input: { studentId: string; promiseId: string; todayKey: string }): Promise<CardState> {
  const { card, status } = await loadEditableCard(input.studentId, input.promiseId, input.todayKey);
  const [unitCount, proofCount] = await Promise.all([
    prisma.promiseUnit.count({ where: { promiseId: card.id, unitNo: { gte: card.unitStart, lte: card.unitStart + card.unitCount - 1 } } }),
    prisma.questProof.count({ where: { promiseId: card.id } }),
  ]);

  const check = checkCanSubmit({ status, confirmedUnits: unitCount, requireProof: card.requireProof, proofCount });
  if (!check.ok) {
    throw new QuestError("INVALID", check.reason);
  }

  await prisma.dailyPromise.update({ where: { id: card.id }, data: { reviewStatus: "SUBMITTED", submittedAt: new Date() } });

  return getCardState(card.id);
}

/**
 * Finds the newest feedback a teacher gave this student: a card review or a comment on a post.
 */
export async function getLatestFeedbackFor(studentId: string): Promise<{ who: string; text: string } | null> {
  const [review, comment] = await Promise.all([
    prisma.dailyPromise.findFirst({
      where: { studentId, feedback: { not: "" }, reviewedAt: { not: null } },
      orderBy: { reviewedAt: "desc" },
    }),
    prisma.comment.findFirst({
      where: { authorName: { endsWith: "선생님" }, post: { studentId } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const reviewTime = review?.reviewedAt?.getTime() ?? 0;
  const commentTime = comment?.createdAt.getTime() ?? 0;
  if (review && reviewTime >= commentTime) {
    return { who: review.reviewedBy || "선생님", text: review.feedback };
  }

  return comment ? { who: comment.authorName, text: comment.body } : null;
}

/**
 * Lists the shop item keys the student already owns.
 */
export async function getOwnedItemKeys(studentId: string): Promise<string[]> {
  const purchases = await prisma.purchase.findMany({ where: { studentId }, orderBy: { createdAt: "asc" } });

  return purchases.map((purchase) => purchase.itemKey);
}

/**
 * Buys a shop item with coins. Only coins are spent; XP and level stay untouched.
 */
export async function purchaseItem(studentId: string, itemKey: string): Promise<{ coins: number }> {
  const item = findShopItem(itemKey) ?? findHatByPurchaseKey(itemKey);
  if (!item) {
    throw new QuestError("UNKNOWN_ITEM", "없는 아이템이에요.");
  }

  return prisma.$transaction(async (tx) => {
    const owned = await tx.purchase.findUnique({ where: { studentId_itemKey: { studentId, itemKey } } });
    if (owned) {
      throw new QuestError("ALREADY_OWNED", "이미 가지고 있는 아이템이에요.");
    }

    const [totals, spent] = await Promise.all([calcLifetimeTotals(tx, studentId), calcSpentCoins(tx, studentId)]);
    const balance = calcCoinBalance(totals.earnedCoins, spent);
    if (balance < item.cost) {
      throw new QuestError("INSUFFICIENT_COINS", `코인이 ${item.cost - balance}개 모자라요.`);
    }

    await tx.purchase.create({ data: { studentId, itemKey, cost: item.cost } });

    return { coins: balance - item.cost };
  });
}

/**
 * Lists the next schedule entries starting today (Asia/Seoul) for the school panel.
 */
export async function getUpcomingSchedule(todayKey: string, limit = 3): Promise<UpcomingScheduleView[]> {
  const items = await prisma.scheduleItem.findMany({
    where: { scheduledFor: { gte: new Date(`${todayKey}T00:00:00+09:00`) } },
    orderBy: { scheduledFor: "asc" },
    take: limit,
  });

  return items.map((item) => ({
    id: item.id,
    title: item.title,
    notes: item.notes,
    scheduledFor: item.scheduledFor.toISOString(),
  }));
}

export type { ProofView };
