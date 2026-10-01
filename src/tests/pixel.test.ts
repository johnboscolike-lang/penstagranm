import { describe, expect, it } from "vitest";

import { measurePixelRows, rowsToRects, rowsToSvgMarkup, svgToDataUri } from "@/utils/pixel";

const PALETTE = { a: "#111111", b: "#eeeeee" } as const;

describe("rowsToRects", () => {
  it("merges horizontal runs and skips transparent cells", () => {
    const rects = rowsToRects(["aab.", "...b"], PALETTE);

    expect(rects).toEqual([
      { x: 0, y: 0, w: 2, h: 1, fill: "#111111" },
      { x: 2, y: 0, w: 1, h: 1, fill: "#eeeeee" },
      { x: 3, y: 1, w: 1, h: 1, fill: "#eeeeee" },
    ]);
  });

  it("stacks identical runs on consecutive rows into one taller rect", () => {
    const rects = rowsToRects(["aa", "aa", "aa"], PALETTE);

    expect(rects).toEqual([{ x: 0, y: 0, w: 2, h: 3, fill: "#111111" }]);
  });

  it("does not stack across a gap row or when the run changes", () => {
    expect(rowsToRects(["a", ".", "a"], PALETTE)).toHaveLength(2);
    expect(rowsToRects(["aa", "a."], PALETTE)).toHaveLength(2);
  });

  it("ignores symbols without a palette color", () => {
    expect(rowsToRects(["zz"], PALETTE)).toEqual([]);
  });
});

describe("svg helpers", () => {
  it("measures the widest row", () => {
    expect(measurePixelRows(["a", "aaa", "aa"])).toEqual({ width: 3, height: 3 });
  });

  it("emits crisp SVG with optional background and padding", () => {
    const svg = rowsToSvgMarkup(["a"], PALETTE, { background: "#ffffff", padding: 1 });

    expect(svg).toContain('viewBox="0 0 3 3"');
    expect(svg).toContain('shape-rendering="crispEdges"');
    expect(svg).toContain('<rect width="3" height="3" fill="#ffffff"/>');
    expect(svg).toContain('<rect x="1" y="1" width="1" height="1" fill="#111111"/>');
  });

  it("adds an intrinsic size only when requested (needed for border-image sources)", () => {
    expect(rowsToSvgMarkup(["aa"], PALETTE)).toMatch(/^<svg xmlns="[^"]+" viewBox=/);
    expect(rowsToSvgMarkup(["aa"], PALETTE, { intrinsic: true })).toMatch(/^<svg xmlns="[^"]+" width="2" height="1" viewBox=/);
  });

  it("builds an encoded data URI", () => {
    expect(svgToDataUri("<svg/>")).toBe("data:image/svg+xml;charset=UTF-8,%3Csvg%2F%3E");
  });
});
