import { describe, expect, it } from "vitest";

import {
  assignQuestSlots,
  checkDailyCapacity,
  describeQuestSchedule,
  describeWeekdays,
  isDailyQuestDue,
  isWeeklyQuestDue,
  normalizeWeekdays,
  pickQuestRange,
  questInputSchema,
  type QuestRule,
} from "@/utils/quest-schedule";

const DAILY: QuestRule = { kind: "DAILY", weekdays: "12345", startDate: "2026-09-28", endDate: null, active: true };

describe("weekday helpers", () => {
  it("normalizes, sorts and drops weekend digits", () => {
    expect(normalizeWeekdays("5,1,3,3,7,0")).toBe("135");
    expect(describeWeekdays("12345")).toBe("매일(월~금)");
    expect(describeWeekdays("135")).toBe("월·수·금");
  });
});

describe("isDailyQuestDue", () => {
  it("repeats on the chosen weekdays only", () => {
    const monWedFri = { ...DAILY, weekdays: "135" };

    expect(isDailyQuestDue(monWedFri, "2026-09-28")).toBe(true); // 월
    expect(isDailyQuestDue(monWedFri, "2026-09-29")).toBe(false); // 화
    expect(isDailyQuestDue(monWedFri, "2026-09-30")).toBe(true); // 수
    expect(isDailyQuestDue(monWedFri, "2026-10-03")).toBe(false); // 토
  });

  it("respects the start date, the end date, and the paused state", () => {
    const limited = { ...DAILY, startDate: "2026-09-30", endDate: "2026-10-01" };

    expect(isDailyQuestDue(limited, "2026-09-29")).toBe(false);
    expect(isDailyQuestDue(limited, "2026-09-30")).toBe(true);
    expect(isDailyQuestDue(limited, "2026-10-01")).toBe(true);
    expect(isDailyQuestDue(limited, "2026-10-02")).toBe(false);
    expect(isDailyQuestDue({ ...DAILY, active: false }, "2026-09-30")).toBe(false);
    expect(isDailyQuestDue({ ...DAILY, kind: "WEEKLY" }, "2026-09-30")).toBe(false);
  });
});

describe("isWeeklyQuestDue", () => {
  const weekly: QuestRule = { kind: "WEEKLY", weekdays: "12345", startDate: "2026-09-30", endDate: "2026-10-09", active: true };

  it("covers every week that overlaps the quest period", () => {
    expect(isWeeklyQuestDue(weekly, "2026-09-21")).toBe(false);
    expect(isWeeklyQuestDue(weekly, "2026-09-28")).toBe(true);
    expect(isWeeklyQuestDue(weekly, "2026-10-05")).toBe(true);
    expect(isWeeklyQuestDue(weekly, "2026-10-12")).toBe(false);
    expect(isWeeklyQuestDue({ ...weekly, endDate: null }, "2026-12-07")).toBe(true);
  });
});

describe("pickQuestRange", () => {
  const base = { ...DAILY, unitKind: "PAGE", unitStart: 30, unitCount: 5, advance: false };

  it("repeats a fixed range", () => {
    expect(pickQuestRange(base, { unitKind: "PAGE", unitStart: 30, unitCount: 5 })).toEqual({
      unitKind: "PAGE",
      unitStart: 30,
      unitCount: 5,
    });
  });

  it("continues after the previous card when advance is on", () => {
    const advancing = { ...base, advance: true };

    expect(pickQuestRange(advancing, null).unitStart).toBe(30);
    expect(pickQuestRange(advancing, { unitKind: "PAGE", unitStart: 30, unitCount: 5 }).unitStart).toBe(35);
  });

  it("never advances words or checks", () => {
    const words = { ...base, unitKind: "WORD", unitStart: 1, advance: true };

    expect(pickQuestRange(words, { unitKind: "WORD", unitStart: 1, unitCount: 5 }).unitStart).toBe(1);
  });
});

describe("assignQuestSlots", () => {
  it("fills free slots in order and skips quests that already have a card", () => {
    const result = assignQuestSlots(
      ["q1", "q2", "q3"],
      [{ slotIndex: 0, questId: "q1", cardId: "c1", hasProgress: true }],
    );

    expect(result).toEqual([
      { questId: "q2", slotIndex: 1, replaceCardId: null },
      { questId: "q3", slotIndex: 2, replaceCardId: null },
    ]);
  });

  it("replaces an untouched default self-promise but never a card with progress or another quest", () => {
    const slots = [
      { slotIndex: 0, questId: null, cardId: "default-a", hasProgress: false },
      { slotIndex: 1, questId: null, cardId: "default-b", hasProgress: true },
      { slotIndex: 2, questId: "old", cardId: "quest-card", hasProgress: false },
    ];

    expect(assignQuestSlots(["new1", "new2"], slots)).toEqual([{ questId: "new1", slotIndex: 0, replaceCardId: "default-a" }]);
  });

  it("gives nothing when every slot is protected", () => {
    const slots = [0, 1, 2].map((slotIndex) => ({ slotIndex, questId: `q${slotIndex}`, cardId: `c${slotIndex}`, hasProgress: false }));

    expect(assignQuestSlots(["extra"], slots)).toEqual([]);
  });
});

describe("questInputSchema", () => {
  const valid = {
    studentIds: ["s1", "s2"],
    kind: "DAILY",
    subject: "수학",
    title: "올림포스 풀이",
    unitKind: "PAGE",
    unitStart: 24,
    unitCount: 4,
    weekdays: "135",
    startDate: "2026-10-05",
    requireProof: true,
  };

  it("accepts a normal daily quest and fills defaults", () => {
    const parsed = questInputSchema.parse(valid);

    expect(parsed.endDate).toBeNull();
    expect(parsed.advance).toBe(false);
    expect(parsed.note).toBe("");
  });

  it("rejects missing students, empty weekdays, bad dates, and oversized amounts", () => {
    const message = (input: unknown) => {
      const result = questInputSchema.safeParse(input);
      return result.success ? "OK" : result.error.issues[0].message;
    };

    expect(message({ ...valid, studentIds: [] })).toContain("학생");
    expect(message({ ...valid, weekdays: "67" })).toContain("요일");
    expect(message({ ...valid, startDate: "10/5" })).toContain("형식");
    expect(message({ ...valid, endDate: "2026-10-01" })).toContain("마감일");
    expect(message({ ...valid, unitCount: 0 })).toContain("1 이상");
    expect(message({ ...valid, unitKind: "CHECK", unitCount: 20 })).toContain("10회");
  });

  it("describes a schedule in one line", () => {
    expect(describeQuestSchedule({ ...DAILY, weekdays: "135", requireProof: true, advance: true })).toBe("월·수·금 · 이어서 · 사진 인증");
    expect(describeQuestSchedule({ ...DAILY, kind: "WEEKLY", endDate: "2026-10-09", requireProof: false, advance: false })).toBe(
      "이번 주 목표 · 2026-09-28 ~ 2026-10-09",
    );
  });
});

describe("checkDailyCapacity", () => {
  const quest = (weekdays: string, extra: Partial<QuestRule> = {}): QuestRule => ({ ...DAILY, weekdays, ...extra });

  it("allows up to three quests per weekday and blocks the fourth", () => {
    const three = [quest("12345"), quest("135"), quest("12")];

    expect(checkDailyCapacity(three.slice(0, 2), quest("12345"))).toEqual({ ok: true });
    const blocked = checkDailyCapacity(three, quest("1"));

    expect(blocked.ok).toBe(false);
    expect(blocked.ok ? "" : blocked.message).toContain("월요일");
  });

  it("only counts weekdays the new quest actually uses, active quests, and overlapping periods", () => {
    const busyMonday = [quest("1"), quest("1"), quest("1")];

    expect(checkDailyCapacity(busyMonday, quest("2345"))).toEqual({ ok: true });
    expect(checkDailyCapacity(busyMonday.map((item) => ({ ...item, active: false })), quest("1"))).toEqual({ ok: true });
    expect(
      checkDailyCapacity(
        busyMonday.map((item) => ({ ...item, endDate: "2026-10-02" })),
        quest("1", { startDate: "2026-10-05" }),
      ),
    ).toEqual({ ok: true });
  });
});
