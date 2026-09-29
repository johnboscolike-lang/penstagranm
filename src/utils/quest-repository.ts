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
import { calcDailyResult, calcLevel, type PromiseProgress } from "@/utils/quest-rules";
import type { HudView, PromiseView, TodayView, UpcomingScheduleView } from "@/utils/quest-types";
import { prisma } from "@/utils/prisma";
import { calcCoinBalance, findShopItem } from "@/utils/shop-items";

const HISTORY_WEEKS = 6;

export type QuestErrorCode =
  | "NOT_FOUND"
  | "LOCKED"
  | "OUT_OF_RANGE"
  | "UNKNOWN_ITEM"
  | "ALREADY_OWNED"
  | "INSUFFICIENT_COINS";

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

type DbClient = PrismaClient | Prisma.TransactionClient;

interface PromiseRow {
  studentId: string;
  dateKey: string;
  slotIndex: number;
  unitStart: number;
  unitCount: number;
  units: { unitNo: number }[];
}

/**
 * Counts the distinct confirmed units that fall inside the promise's planned range.
 */
function countConfirmed(row: Pick<PromiseRow, "unitStart" | "unitCount" | "units">): number {
  const last = row.unitStart + row.unitCount - 1;

  return new Set(row.units.map((unit) => unit.unitNo).filter((unitNo) => unitNo >= row.unitStart && unitNo <= last))
    .size;
}

/**
 * Converts stored promise rows into the plain records used by the scoring module.
 */
function toPromiseRecords(rows: PromiseRow[]): PromiseRecord[] {
  return rows.map((row) => ({
    studentId: row.studentId,
    dateKey: row.dateKey,
    slotIndex: row.slotIndex,
    plannedUnits: row.unitCount,
    confirmedUnits: countConfirmed(row),
  }));
}

/**
 * Loads every team and student, and finds the demo player ("me").
 */
export async function loadRoster(): Promise<{ students: StudentRecord[]; teams: TeamRecord[]; me: StudentRecord }> {
  const [teams, students] = await Promise.all([
    prisma.team.findMany({ orderBy: { name: "asc" } }),
    prisma.student.findMany({ orderBy: { name: "asc" } }),
  ]);
  const mapped: StudentRecord[] = students.map((student) => ({
    id: student.id,
    name: student.name,
    hairKey: student.hairKey,
    teamId: student.teamId,
    isMe: student.isMe,
    joinedOn: student.joinedOn,
  }));
  const me = mapped.find((student) => student.isMe);
  if (!me) {
    throw new QuestError("NOT_FOUND", "데모 학생 정보가 없습니다. npm run db:seed 를 먼저 실행해 주세요.");
  }

  return {
    students: mapped,
    teams: teams.map((team) => ({ id: team.id, name: team.name, emblem: team.emblem })),
    me,
  };
}

/**
 * Loads all students' promises from a date onward, with their confirmed units.
 */
async function loadPromiseRecordsSince(fromKey: string): Promise<PromiseRecord[]> {
  const rows = await prisma.dailyPromise.findMany({
    where: { dateKey: { gte: fromKey } },
    select: {
      studentId: true,
      dateKey: true,
      slotIndex: true,
      unitStart: true,
      unitCount: true,
      units: { select: { unitNo: true } },
    },
  });

  return toPromiseRecords(rows);
}

/**
 * Sums a student's lifetime XP and earned coins, counting one reflection bonus per posting day.
 */
async function calcLifetimeTotals(client: DbClient, studentId: string): Promise<{ xp: number; earnedCoins: number }> {
  const [rows, posts] = await Promise.all([
    client.dailyPromise.findMany({
      where: { studentId },
      select: {
        studentId: true,
        dateKey: true,
        slotIndex: true,
        unitStart: true,
        unitCount: true,
        units: { select: { unitNo: true } },
      },
    }),
    client.post.findMany({ where: { studentId }, select: { createdAt: true } }),
  ]);

  const progressByDay = new Map<string, PromiseProgress[]>();
  toPromiseRecords(rows)
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

/**
 * Builds the profile capsule data (level, XP bar, coins) shown on every screen.
 */
async function buildHudView(me: StudentRecord, teams: TeamRecord[]): Promise<HudView> {
  const totals = await getStudentTotals(me.id);
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
  };
}

export interface PageBase {
  hud: HudView;
  meId: string;
  todayKey: string;
}

/**
 * Loads what every page needs: the HUD, the demo player's id, and today's Asia/Seoul date key.
 */
export async function getPageBase(): Promise<PageBase> {
  const { me, teams } = await loadRoster();

  return { hud: await buildHudView(me, teams), meId: me.id, todayKey: getKstDateKey() };
}

/**
 * Makes sure today's three promise cards exist. Pages continue from the previous range; weekends stay empty.
 */
export async function ensureTodayPromises(studentId: string, dateKey: string): Promise<void> {
  if (!isSchoolDay(dateKey)) {
    return;
  }

  const existing = await prisma.dailyPromise.findMany({
    where: { studentId, dateKey },
    select: { slotIndex: true },
  });
  const existingSlots = new Set(existing.map((row) => row.slotIndex));

  for (const [slotIndex, template] of DEFAULT_PROMISE_PLAN.entries()) {
    if (existingSlots.has(slotIndex)) {
      continue;
    }

    const previous = await prisma.dailyPromise.findFirst({
      where: { studentId, slotIndex, dateKey: { lt: dateKey } },
      orderBy: { dateKey: "desc" },
    });
    const range = suggestNextRange(
      previous
        ? { unitKind: previous.unitKind as UnitKind, unitStart: previous.unitStart, unitCount: previous.unitCount }
        : null,
      template,
      slotIndex,
    );

    await prisma.dailyPromise.upsert({
      where: { studentId_dateKey_slotIndex: { studentId, dateKey, slotIndex } },
      update: {},
      create: {
        studentId,
        dateKey,
        slotIndex,
        subject: template.subject,
        title: template.title,
        unitKind: range.unitKind,
        unitStart: range.unitStart,
        unitCount: range.unitCount,
      },
    });
  }
}

/**
 * Loads today's promise cards with the units that are already confirmed.
 */
export async function getTodayView(studentId: string, dateKey: string): Promise<TodayView> {
  const schoolDay = isSchoolDay(dateKey);
  if (schoolDay) {
    await ensureTodayPromises(studentId, dateKey);
  }

  const [rows, posts] = await Promise.all([
    prisma.dailyPromise.findMany({
      where: { studentId, dateKey },
      orderBy: { slotIndex: "asc" },
      include: { units: { select: { unitNo: true }, orderBy: { unitNo: "asc" } } },
    }),
    prisma.post.findMany({ where: { studentId }, select: { createdAt: true } }),
  ]);

  const promises: PromiseView[] = rows.map((row) => {
    const range = { unitKind: row.unitKind as UnitKind, unitStart: row.unitStart, unitCount: row.unitCount };
    const valid = new Set(listUnitNumbers(range));

    return {
      id: row.id,
      slotIndex: row.slotIndex,
      subject: row.subject,
      title: row.title,
      unitKind: range.unitKind,
      unitStart: row.unitStart,
      unitCount: row.unitCount,
      rangeLabel: buildRangeLabel(range),
      confirmedUnitNos: row.units.map((unit) => unit.unitNo).filter((unitNo) => valid.has(unitNo)),
    };
  });

  return {
    dateKey,
    label: formatKoreanDay(dateKey),
    isSchoolDay: schoolDay,
    reflected: posts.some((post) => getKstDateKey(post.createdAt) === dateKey),
    promises,
  };
}

/**
 * Loads the week board (rankings, teams, my week) for the week containing the given date.
 */
export async function getWeekBoardView(dateKey: string): Promise<WeekBoard> {
  const { students, teams, me } = await loadRoster();
  const fromKey = addDaysToKey(getWeekStartKey(dateKey), -7 * HISTORY_WEEKS);
  const records = await loadPromiseRecordsSince(fromKey);

  return buildWeekBoard({ students, teams, index: indexPromises(records), asOfKey: dateKey, meId: me.id });
}

/**
 * Loads last week's news (voucher and badge) for the demo player.
 */
export async function getLastWeekNewsView(dateKey: string): Promise<WeekNews> {
  const { me } = await loadRoster();
  const currentWeekStart = getWeekStartKey(dateKey);
  const fromKey = addDaysToKey(currentWeekStart, -7 * HISTORY_WEEKS);
  const records = await loadPromiseRecordsSince(fromKey);

  return buildLastWeekNews(indexPromises(records), me.id, currentWeekStart, HISTORY_WEEKS - 1, me.joinedOn);
}

/**
 * Confirms or clears one unit of today's promise. The same unit never counts twice.
 */
export async function setUnitConfirmed(input: {
  studentId: string;
  promiseId: string;
  unitNo: number;
  done: boolean;
  todayKey: string;
}): Promise<number[]> {
  const promise = await prisma.dailyPromise.findUnique({ where: { id: input.promiseId } });
  if (!promise || promise.studentId !== input.studentId) {
    throw new QuestError("NOT_FOUND", "약속을 찾을 수 없어요.");
  }

  if (promise.dateKey !== input.todayKey) {
    throw new QuestError("LOCKED", "지난 약속은 고칠 수 없어요. 오늘의 약속만 기록해요.");
  }

  const validUnits = new Set(listUnitNumbers(promise));
  if (!validUnits.has(input.unitNo)) {
    throw new QuestError("OUT_OF_RANGE", "약속 범위에 없는 칸이에요.");
  }

  if (input.done) {
    await prisma.promiseUnit.upsert({
      where: { promiseId_unitNo: { promiseId: promise.id, unitNo: input.unitNo } },
      update: {},
      create: { promiseId: promise.id, unitNo: input.unitNo },
    });
  } else {
    await prisma.promiseUnit.deleteMany({ where: { promiseId: promise.id, unitNo: input.unitNo } });
  }

  const units = await prisma.promiseUnit.findMany({
    where: { promiseId: promise.id },
    select: { unitNo: true },
    orderBy: { unitNo: "asc" },
  });

  return units.map((unit) => unit.unitNo).filter((unitNo) => validUnits.has(unitNo));
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
  const item = findShopItem(itemKey);
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
