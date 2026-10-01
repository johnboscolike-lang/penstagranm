import { describe, expect, it } from "vitest";

import {
  buildRangeLabel,
  buildUnitLabel,
  DEFAULT_PROMISE_PLAN,
  getSubjectTone,
  listUnitNumbers,
  suggestNextRange,
} from "@/utils/quest-plan";
import { calcCoinBalance, findShopItem, SHOP_ITEMS } from "@/utils/shop-items";

describe("promise ranges", () => {
  it("builds labels for pages, words, and lectures", () => {
    expect(buildRangeLabel({ unitKind: "PAGE", unitStart: 12, unitCount: 6 })).toBe("p.12~17");
    expect(buildRangeLabel({ unitKind: "PAGE", unitStart: 9, unitCount: 1 })).toBe("p.9");
    expect(buildRangeLabel({ unitKind: "WORD", unitStart: 1, unitCount: 15 })).toBe("15개");
    expect(buildRangeLabel({ unitKind: "LECTURE", unitStart: 3, unitCount: 2 })).toBe("3~4강");
  });

  it("lists absolute unit numbers and unit labels", () => {
    expect(listUnitNumbers({ unitStart: 24, unitCount: 4 })).toEqual([24, 25, 26, 27]);
    expect(buildUnitLabel("PAGE", 24, 24)).toBe("24");
    expect(buildUnitLabel("WORD", 3, 1)).toBe("3");
  });

  it("starts with the first pages and then continues from the previous range", () => {
    const [korean, math, words] = DEFAULT_PROMISE_PLAN;

    expect(suggestNextRange(null, korean, 0)).toEqual({ unitKind: "PAGE", unitStart: 12, unitCount: 6 });
    expect(suggestNextRange(null, math, 1)).toEqual({ unitKind: "PAGE", unitStart: 24, unitCount: 4 });
    expect(suggestNextRange({ unitKind: "PAGE", unitStart: 12, unitCount: 6 }, korean, 0).unitStart).toBe(18);
    expect(suggestNextRange({ unitKind: "WORD", unitStart: 1, unitCount: 15 }, words, 2).unitStart).toBe(1);
  });

  it("maps subjects to accent tones", () => {
    expect(getSubjectTone("국어")).toBe("rose");
    expect(getSubjectTone("수학")).toBe("sky");
    expect(getSubjectTone("영단어")).toBe("leaf");
    expect(getSubjectTone("인강")).toBe("sun");
  });
});

describe("shop", () => {
  it("looks up items and keeps the balance non-negative", () => {
    expect(findShopItem("bench")?.cost).toBe(30);
    expect(findShopItem("dragon")).toBeUndefined();
    expect(SHOP_ITEMS).toHaveLength(6);
    expect(calcCoinBalance(120, 45)).toBe(75);
    expect(calcCoinBalance(10, 45)).toBe(0);
  });
});
