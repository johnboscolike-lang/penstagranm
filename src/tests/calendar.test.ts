import { buildMonthGrid, formatDateKey } from "@/utils/calendar";

describe("buildMonthGrid", () => {
  it("returns a six-week grid for April 2026", () => {
    const cells = buildMonthGrid(new Date(2026, 3, 8));

    expect(cells).toHaveLength(42);
    expect(formatDateKey(cells[0].date)).toBe("2026-03-29");
    expect(formatDateKey(cells[41].date)).toBe("2026-05-09");
  });
});
