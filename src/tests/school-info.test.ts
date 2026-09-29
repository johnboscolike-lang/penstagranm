import { describe, expect, it } from "vitest";

import { formatMinutes, getMeal, getNextClass, getTimetable, summarizeMeal } from "@/utils/school-info";

describe("getNextClass", () => {
  it("returns the class that is running or about to start today", () => {
    const next = getNextClass(1, 9 * 60 + 20);

    expect(next.isTomorrow).toBe(false);
    expect(next.period.period).toBe(1);
  });

  it("moves to the following period once a class has ended", () => {
    const next = getNextClass(0, 9 * 60 + 50);

    expect(next.period.period).toBe(2);
    expect(next.period.subject).toBe(getTimetable(0)[1].subject);
  });

  it("rolls over to the next school day after the last period", () => {
    const next = getNextClass(2, 17 * 60);

    expect(next.isTomorrow).toBe(true);
    expect(next.period).toEqual(getTimetable(3)[0]);
  });

  it("points to Monday after Friday and on weekends", () => {
    expect(getNextClass(4, 18 * 60).period).toEqual(getTimetable(0)[0]);
    expect(getNextClass(5, 10 * 60).isTomorrow).toBe(true);
    expect(getNextClass(6, 10 * 60).period).toEqual(getTimetable(0)[0]);
  });
});

describe("meal and time helpers", () => {
  it("summarizes the first two dishes", () => {
    expect(summarizeMeal(getMeal(0))).toBe("비빔밥 · 미역국");
  });

  it("formats period start times", () => {
    expect(formatMinutes(9 * 60)).toBe("09:00");
    expect(formatMinutes(14 * 60 + 5)).toBe("14:05");
  });
});
