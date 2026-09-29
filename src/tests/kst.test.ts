import { describe, expect, it } from "vitest";

import {
  addDaysToKey,
  formatKoreanDay,
  getEligibleDayKeys,
  getKstDateKey,
  getPreviousWeekStartKeys,
  getSchoolDayKeys,
  getWeekStartKey,
  getWeekdayIndex,
  isSchoolDay,
} from "@/utils/kst";

describe("getKstDateKey", () => {
  it("uses the Asia/Seoul calendar date regardless of the server clock", () => {
    expect(getKstDateKey(new Date("2026-09-28T16:00:00Z"))).toBe("2026-09-29");
    expect(getKstDateKey(new Date("2026-09-28T14:59:00Z"))).toBe("2026-09-28");
  });
});

describe("week helpers", () => {
  it("starts the week on Monday", () => {
    expect(getWeekStartKey("2026-09-29")).toBe("2026-09-28");
    expect(getWeekStartKey("2026-09-28")).toBe("2026-09-28");
    expect(getWeekStartKey("2026-10-04")).toBe("2026-09-28");
    expect(getWeekdayIndex("2026-10-04")).toBe(6);
  });

  it("lists Monday to Friday and only the days that already started", () => {
    expect(getSchoolDayKeys("2026-09-30")).toEqual([
      "2026-09-28",
      "2026-09-29",
      "2026-09-30",
      "2026-10-01",
      "2026-10-02",
    ]);
    expect(getEligibleDayKeys("2026-09-29", "2026-09-29")).toEqual(["2026-09-28", "2026-09-29"]);
    expect(getEligibleDayKeys("2026-09-29", "2026-10-04")).toHaveLength(5);
  });

  it("detects weekends and walks across month boundaries", () => {
    expect(isSchoolDay("2026-10-03")).toBe(false);
    expect(addDaysToKey("2026-09-30", 1)).toBe("2026-10-01");
    expect(getPreviousWeekStartKeys("2026-09-29", 2)).toEqual(["2026-09-21", "2026-09-14"]);
  });

  it("formats a Korean day label", () => {
    expect(formatKoreanDay("2026-09-29")).toBe("9월 29일 (화)");
  });
});
