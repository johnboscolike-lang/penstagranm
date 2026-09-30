import { describe, expect, it } from "vitest";

import { STREAK_MILESTONES, calcStreak, isStreakMilestone } from "@/utils/streak";

const days = (...keys: string[]) => new Set(keys);

// 2026-09-28(월) ~ 2026-10-02(금), 2026-09-26(토), 2026-09-27(일)
describe("연속 실천 일수", () => {
  it("아무 기록이 없으면 0이다", () => {
    expect(calcStreak(days(), "2026-09-30")).toEqual({ count: 0, includesToday: false });
  });

  it("오늘까지 이어진 날을 센다", () => {
    expect(calcStreak(days("2026-09-28", "2026-09-29", "2026-09-30"), "2026-09-30")).toEqual({ count: 3, includesToday: true });
  });

  it("오늘 아직 실천 전이면 어제까지의 연속을 유지해서 보여 준다", () => {
    expect(calcStreak(days("2026-09-28", "2026-09-29"), "2026-09-30")).toEqual({ count: 2, includesToday: false });
  });

  it("어제를 빼먹으면 끊긴다", () => {
    expect(calcStreak(days("2026-09-28", "2026-09-30"), "2026-09-30")).toEqual({ count: 1, includesToday: true });
    expect(calcStreak(days("2026-09-28"), "2026-09-30")).toEqual({ count: 0, includesToday: false });
  });

  it("주말은 건너뛰어도 끊기지 않는다", () => {
    const active = days("2026-09-24", "2026-09-25", "2026-09-28", "2026-09-29");

    expect(calcStreak(active, "2026-09-29")).toEqual({ count: 4, includesToday: true });
  });

  it("주말에 열어도 금요일까지의 연속을 보여 준다", () => {
    const active = days("2026-09-30", "2026-10-01", "2026-10-02");

    expect(calcStreak(active, "2026-10-03")).toEqual({ count: 3, includesToday: false });
    expect(calcStreak(active, "2026-10-04")).toEqual({ count: 3, includesToday: false });
  });

  it("월요일 아침에는 지난 금요일까지의 연속이 이어진다", () => {
    const active = days("2026-09-24", "2026-09-25");

    expect(calcStreak(active, "2026-09-28")).toEqual({ count: 2, includesToday: false });
  });

  it("주말에 남긴 기록은 세지 않고 흐름도 끊지 않는다", () => {
    const active = days("2026-09-25", "2026-09-26", "2026-09-28");

    expect(calcStreak(active, "2026-09-28")).toEqual({ count: 2, includesToday: true });
  });

  it("아주 오래 이어져도 끝난다", () => {
    const active = new Set<string>();
    const start = Date.UTC(2025, 0, 1);
    for (let index = 0; index < 900; index += 1) {
      active.add(new Date(start + index * 86_400_000).toISOString().slice(0, 10));
    }

    expect(calcStreak(active, "2026-09-30").count).toBeGreaterThan(100);
  });
});

describe("고비 일수", () => {
  it("정해진 일수에서만 축하한다", () => {
    STREAK_MILESTONES.forEach((count) => expect(isStreakMilestone(count)).toBe(true));
    expect(isStreakMilestone(2)).toBe(false);
    expect(isStreakMilestone(4)).toBe(false);
  });
});
