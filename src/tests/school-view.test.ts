import { describe, expect, it } from "vitest";

import { buildSchoolPanelData, describeScheduleDay } from "@/utils/school-view";

describe("describeScheduleDay", () => {
  it("names today, tomorrow, weekdays this week, and later dates", () => {
    expect(describeScheduleDay("2026-09-30", "2026-09-30")).toBe("오늘");
    expect(describeScheduleDay("2026-10-01", "2026-09-30")).toBe("내일");
    expect(describeScheduleDay("2026-10-02", "2026-09-30")).toBe("금요일");
    expect(describeScheduleDay("2026-10-12", "2026-09-30")).toBe("10월 12일");
  });
});

describe("buildSchoolPanelData", () => {
  // 2026-09-30 10:20 KST (수요일) = 01:20 UTC
  const wednesdayMorning = new Date("2026-09-30T01:20:00Z");

  it("finds the current period and today's lunch", () => {
    const data = buildSchoolPanelData(wednesdayMorning, []);

    expect(data.dateLabel).toBe("9월 30일 (수)");
    expect(data.nextClass.detail).toContain("2교시");
    expect(data.timetable.filter((row) => row.isNext)).toHaveLength(1);
    expect(data.timetableTitle).toBe("오늘 시간표");
    expect(data.meal.title).toBe("오늘 급식");
    expect(data.meal.summary).toBe("제육볶음 · 잡곡밥");
    expect(data.checkedAt).toBe("10:20 확인");
  });

  it("labels the source as demo data and shows the nearest event", () => {
    const data = buildSchoolPanelData(wednesdayMorning, [
      { id: "1", title: "체육대회", notes: null, scheduledFor: "2026-10-02T00:00:00.000Z" },
    ]);

    expect(data.source).toContain("예시");
    expect(data.scheduleHeadline).toBe("금요일 체육대회");
    expect(data.schedule[0].whenLabel).toBe("금요일");
  });

  it("says so when there is nothing scheduled", () => {
    expect(buildSchoolPanelData(wednesdayMorning, []).scheduleHeadline).toBe("예정된 일정이 없어요");
  });

  it("points to the next school day after the last period and on weekends", () => {
    const wednesdayEvening = buildSchoolPanelData(new Date("2026-09-30T09:00:00Z"), []);
    const saturday = buildSchoolPanelData(new Date("2026-10-03T03:00:00Z"), []);

    expect(wednesdayEvening.timetableTitle).toBe("다음 수업일 시간표");
    expect(wednesdayEvening.nextClass.detail).toContain("다음 수업일");
    expect(saturday.meal.title).toBe("다음 급식(월요일)");
    expect(saturday.timetableTitle).toBe("다음 수업일 시간표");
  });
});
