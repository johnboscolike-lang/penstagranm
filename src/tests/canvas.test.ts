import { describe, expect, it } from "vitest";

import { createRng, PixelCanvas } from "@/utils/art/canvas";

describe("PixelCanvas", () => {
  it("paints inside bounds and ignores writes outside", () => {
    const canvas = new PixelCanvas(3, 2);
    canvas.set(0, 0, "a").set(5, 5, "b").set(-1, 0, "c");

    expect(canvas.toRows()).toEqual(["a..", "..."]);
    expect(canvas.get(9, 9)).toBe(".");
  });

  it("draws rectangles, frames, and lines", () => {
    const canvas = new PixelCanvas(5, 5);
    canvas.frame(0, 0, 5, 5, "f").line(0, 0, 4, 4, "l");

    expect(canvas.toRows()).toEqual(["lffff", "fl..f", "f.l.f", "f..lf", "ffffl"]);
  });

  it("fills ellipses symmetrically", () => {
    const rows = new PixelCanvas(7, 7).ellipse(3, 3, 3, 3, "e").toRows();

    expect(rows[3]).toBe("eeeeeee");
    expect(rows[0]).toBe("..eee..");
    expect(rows[1]).toBe(".eeeee.");
    expect(rows[6]).toBe("..eee..");
  });

  it("stamps ASCII sprites while skipping transparent cells", () => {
    const canvas = new PixelCanvas(4, 2).rect(0, 0, 4, 2, "x").stamp(1, 0, ["a.", ".b"]);

    expect(canvas.toRows()).toEqual(["xaxx", "xxbx"]);
  });

  it("outlines shapes around the outside only", () => {
    const rows = new PixelCanvas(5, 5).set(2, 2, "a").outline("k").toRows();

    expect(rows).toEqual([".....", "..k..", ".kak.", "..k..", "....."]);
  });

  it("repaints matching cells with a chooser", () => {
    const rows = new PixelCanvas(3, 1).rect(0, 0, 3, 1, "g").repaint("g", (x) => (x === 1 ? "h" : null)).toRows();

    expect(rows).toEqual(["ghg"]);
  });
});

describe("createRng", () => {
  it("is deterministic and stays inside [0, 1)", () => {
    const first = createRng(42);
    const second = createRng(42);
    const values = Array.from({ length: 50 }, () => first());

    expect(values).toEqual(Array.from({ length: 50 }, () => second()));
    expect(values.every((value) => value >= 0 && value < 1)).toBe(true);
    expect(createRng(43)()).not.toBe(createRng(42)());
  });
});
