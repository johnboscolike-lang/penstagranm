import { buildMonthGrid, formatDateKey, formatFeedTimestamp, groupScheduleItemsByDate, pickDefaultSelectedDay } from "@/utils/calendar";
import { formatKstMonthDay, formatKstTime } from "@/utils/kst";

describe("buildMonthGrid", () => {
  it("returns a six-week grid for April 2026", () => {
    const cells = buildMonthGrid(new Date(2026, 3, 8));

    expect(cells).toHaveLength(42);
    expect(formatDateKey(cells[0].date)).toBe("2026-03-29");
    expect(formatDateKey(cells[41].date)).toBe("2026-05-09");
  });
});

describe("Asia/Seoul time helpers", () => {
  it("formats schedule times the same way on any server clock", () => {
    // 2026-09-28 14:10 KST == 05:10 UTC
    expect(formatKstTime("2026-09-28T05:10:00.000Z")).toBe("14:10");
    expect(formatFeedTimestamp("2026-09-28T05:10:00.000Z")).toBe("9월 28일 14:10");
    expect(formatKstMonthDay("2026-09-30T16:30:00.000Z")).toBe("10월 1일");
  });

  it("groups schedule items by their Korean calendar day", () => {
    const grouped = groupScheduleItemsByDate([
      { id: "a", title: "늦은 일정", notes: null, scheduledFor: "2026-09-30T16:30:00.000Z" },
      { id: "b", title: "이른 일정", notes: null, scheduledFor: "2026-10-01T00:10:00.000Z" },
    ]);

    expect(Object.keys(grouped)).toEqual(["2026-10-01"]);
    expect(grouped["2026-10-01"]).toHaveLength(2);
  });

  it("preselects today only when it lies inside the shown month", () => {
    const september = new Date(2026, 8, 1);

    expect(formatDateKey(pickDefaultSelectedDay(september, "2026-09-30"))).toBe("2026-09-30");
    expect(formatDateKey(pickDefaultSelectedDay(september, "2026-10-01"))).toBe("2026-09-01");
  });
});
