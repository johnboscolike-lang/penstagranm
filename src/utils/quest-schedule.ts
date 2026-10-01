import { z } from "zod";

import { getWeekdayIndex, getWeekStartKey, addDaysToKey } from "@/utils/kst";
import { UNIT_KINDS, type PromiseRange, type UnitKind } from "@/utils/quest-plan";

export const QUEST_KINDS = ["DAILY", "WEEKLY"] as const;

export type QuestKind = (typeof QUEST_KINDS)[number];

export const MAX_DAILY_QUESTS = 3;
export const MAX_UNITS_PER_QUEST = 300;

const WEEKDAY_NAMES = ["월", "화", "수", "목", "금"] as const;

export interface QuestRule {
  kind: string;
  weekdays: string;
  startDate: string;
  endDate: string | null;
  active: boolean;
}

export interface QuestRangeRule extends QuestRule {
  unitKind: string;
  unitStart: number;
  unitCount: number;
  advance: boolean;
}

/**
 * Normalizes a weekday selection like "3,1,5" into the sorted digit string "135" (1 = Monday ... 5 = Friday).
 */
export function normalizeWeekdays(input: string): string {
  return Array.from(new Set(input.replace(/[^1-5]/g, "").split("")))
    .sort()
    .join("");
}

/**
 * Describes a weekday string for people: 매일(월~금) or 월·수·금.
 */
export function describeWeekdays(weekdays: string): string {
  const normalized = normalizeWeekdays(weekdays);
  if (normalized === "12345") {
    return "매일(월~금)";
  }

  return normalized
    .split("")
    .map((digit) => WEEKDAY_NAMES[Number(digit) - 1])
    .join("·");
}

/**
 * Tells whether a daily quest should produce a card on a given school day.
 */
export function isDailyQuestDue(quest: QuestRule, dateKey: string): boolean {
  if (quest.kind !== "DAILY" || !quest.active) {
    return false;
  }

  const weekdayIndex = getWeekdayIndex(dateKey);
  if (weekdayIndex > 4 || !quest.weekdays.includes(String(weekdayIndex + 1))) {
    return false;
  }

  return quest.startDate <= dateKey && (quest.endDate === null || dateKey <= quest.endDate);
}

/**
 * Tells whether a weekly quest covers the week that starts on the given Monday.
 */
export function isWeeklyQuestDue(quest: QuestRule, weekStartKey: string): boolean {
  if (quest.kind !== "WEEKLY" || !quest.active) {
    return false;
  }

  const friday = addDaysToKey(weekStartKey, 4);

  return quest.startDate <= friday && (quest.endDate === null || quest.endDate >= weekStartKey);
}

/**
 * Chooses the range for a new card: fixed quests repeat their range, "advance" quests continue after the last card.
 */
export function pickQuestRange(quest: QuestRangeRule, previousCard: PromiseRange | null): PromiseRange {
  const unitKind = quest.unitKind as UnitKind;

  if (quest.advance && previousCard && (unitKind === "PAGE" || unitKind === "LECTURE")) {
    return { unitKind, unitStart: previousCard.unitStart + previousCard.unitCount, unitCount: quest.unitCount };
  }

  return { unitKind, unitStart: quest.unitStart, unitCount: quest.unitCount };
}

export interface SlotState {
  slotIndex: number;
  questId: string | null;
  cardId: string;
  hasProgress: boolean;
}

export interface SlotAssignment {
  questId: string;
  slotIndex: number;
  replaceCardId: string | null;
}

/**
 * Decides which free slot (0-2) each due quest gets today. A default self-promise card without progress may be replaced;
 * quests that find no slot wait for tomorrow. Quests already carded today are left alone.
 */
export function assignQuestSlots(dueQuestIds: string[], slots: SlotState[], slotCount = MAX_DAILY_QUESTS): SlotAssignment[] {
  const alreadyCarded = new Set(slots.map((slot) => slot.questId).filter((id): id is string => id !== null));
  const occupied = new Map(slots.map((slot) => [slot.slotIndex, slot]));
  const assignments: SlotAssignment[] = [];

  for (const questId of dueQuestIds) {
    if (alreadyCarded.has(questId)) {
      continue;
    }

    let chosen: SlotAssignment | null = null;
    for (let slotIndex = 0; slotIndex < slotCount && !chosen; slotIndex += 1) {
      if (!occupied.has(slotIndex)) {
        chosen = { questId, slotIndex, replaceCardId: null };
      }
    }
    for (let slotIndex = 0; slotIndex < slotCount && !chosen; slotIndex += 1) {
      const slot = occupied.get(slotIndex);
      if (slot && slot.questId === null && !slot.hasProgress) {
        chosen = { questId, slotIndex, replaceCardId: slot.cardId };
      }
    }

    if (chosen) {
      assignments.push(chosen);
      occupied.set(chosen.slotIndex, { slotIndex: chosen.slotIndex, questId, cardId: `new-${questId}`, hasProgress: true });
    }
  }

  return assignments;
}

/**
 * Makes sure a student never gets more than three daily quests on the same weekday (the three promise slots).
 */
export function checkDailyCapacity(
  existing: QuestRule[],
  candidate: QuestRule,
  max: number = MAX_DAILY_QUESTS,
): { ok: true } | { ok: false; message: string } {
  const overlaps = (quest: QuestRule) =>
    quest.kind === "DAILY" &&
    quest.active &&
    quest.startDate <= (candidate.endDate ?? "9999-12-31") &&
    candidate.startDate <= (quest.endDate ?? "9999-12-31");
  const relevant = existing.filter(overlaps);

  for (const digit of normalizeWeekdays(candidate.weekdays).split("")) {
    const count = relevant.filter((quest) => quest.weekdays.includes(digit)).length;
    if (count >= max) {
      return { ok: false, message: `${WEEKDAY_NAMES[Number(digit) - 1]}요일에는 일일 퀘스트를 ${max}개까지만 낼 수 있어요.` };
    }
  }

  return { ok: true };
}

/**
 * One-line summary of when and how much: "매일(월~금) · p.12~17 · 사진 인증".
 */
export function describeQuestSchedule(quest: QuestRule & { requireProof: boolean; advance: boolean }): string {
  const when = quest.kind === "WEEKLY" ? "이번 주 목표" : describeWeekdays(quest.weekdays);
  const period = quest.endDate ? ` · ${quest.startDate} ~ ${quest.endDate}` : "";

  return `${when}${period}${quest.advance ? " · 이어서" : ""}${quest.requireProof ? " · 사진 인증" : ""}`;
}

const dateKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "날짜는 2026-10-05 형식으로 적어 주세요.");

export const questInputSchema = z
  .object({
    studentIds: z.array(z.string().trim().min(1)).min(1, "퀘스트를 받을 학생을 한 명 이상 골라 주세요.").max(60),
    kind: z.enum(QUEST_KINDS),
    subject: z.string().trim().min(1, "과목을 적어 주세요.").max(12, "과목은 12자까지예요."),
    title: z.string().trim().min(1, "퀘스트 이름을 적어 주세요.").max(40, "이름은 40자까지예요."),
    note: z.string().trim().max(200, "메모는 200자까지예요.").optional().default(""),
    unitKind: z.enum(UNIT_KINDS),
    unitStart: z.number().int().min(1).max(9999).default(1),
    unitCount: z.number().int().min(1, "분량은 1 이상이어야 해요.").max(MAX_UNITS_PER_QUEST, `분량은 ${MAX_UNITS_PER_QUEST} 이하로 해 주세요.`),
    advance: z.boolean().default(false),
    weekdays: z.string().default("12345"),
    startDate: dateKeySchema,
    endDate: dateKeySchema.nullable().optional().default(null),
    requireProof: z.boolean().default(false),
  })
  .superRefine((value, ctx) => {
    if (value.kind === "DAILY" && normalizeWeekdays(value.weekdays).length === 0) {
      ctx.addIssue({ code: "custom", path: ["weekdays"], message: "반복할 요일을 하나 이상 골라 주세요." });
    }
    if (value.endDate && value.endDate < value.startDate) {
      ctx.addIssue({ code: "custom", path: ["endDate"], message: "마감일이 시작일보다 빠를 수 없어요." });
    }
    if (value.unitKind === "CHECK" && value.unitCount > 10) {
      ctx.addIssue({ code: "custom", path: ["unitCount"], message: "체크형 퀘스트는 최대 10회까지예요." });
    }
  });

export type QuestInput = z.infer<typeof questInputSchema>;

/**
 * Returns the Monday key a weekly quest card is stored under for a date.
 */
export function weeklyCardKey(dateKey: string): string {
  return getWeekStartKey(dateKey);
}
