import type { Visual } from "./content/types.ts";
import type { Rect } from "./lib/anim.ts";

export type Material = "glass" | "paper" | "none";
export type PanelSpec = { rect: Rect; material: Material };

/** 화면 안전 영역: 위 HUD 96px, 아래 자막 150px. */
export const SAFE = { top: 104, bottom: 925, left: 96, right: 1824 };

const WIDE: Rect = { x: 112, y: 128, w: 1696, h: 780, r: 34 };

/**
 * 장면 종류별 주 패널의 자리와 재질. 장면이 바뀌면 이 패널 하나가 모프된다.
 * @param v 장면 시각 데이터
 * @returns 패널 명세
 */
export function panelFor(v: Visual): PanelSpec {
  switch (v.kind) {
    case "opening":
    case "closing":
      return { rect: { x: 960 - 30, y: 540 - 30, w: 60, h: 60, r: 30 }, material: "none" };
    case "statement":
      return { rect: { x: 200, y: 250, w: 1520, h: 560, r: 44 }, material: "glass" };
    case "map":
      return { rect: { x: 72, y: 150, w: 1776, h: 740, r: 40 }, material: "glass" };
    case "timeline":
      return { rect: { x: -40, y: 250, w: 2000, h: 560, r: 0 }, material: "glass" };
    case "exam":
      return { rect: { x: 168, y: 118, w: 1584, h: 800, r: 16 }, material: "paper" };
    case "metaphor":
      return { rect: { x: 140, y: 150, w: 1640, h: 750, r: 38 }, material: "glass" };
    default:
      return { rect: WIDE, material: "glass" };
  }
}
