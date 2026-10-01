import type { ArtSpec } from "@/utils/art/canvas";

export interface FrameSpec {
  /** 바깥쪽부터 링 색: 0 = 바깥 윤곽선 */
  rings: [string, string, string];
  fill: string;
  /** 채움 영역 안쪽 첫 줄(위)과 마지막 줄(아래)의 입체감 색 */
  light?: string;
  shade?: string;
}

const SIZE = 12;
const NOTCH = 2;

/**
 * Tells whether a cell is inside the rounded (notched-corner) rectangle inset by k cells.
 */
function insideInset(x: number, y: number, k: number): boolean {
  const width = SIZE - 2 * k;
  const lx = x - k;
  const ly = y - k;
  if (lx < 0 || ly < 0 || lx >= width || ly >= width) {
    return false;
  }
  const dx = Math.min(lx, width - 1 - lx);
  const dy = Math.min(ly, width - 1 - ly);

  return dx + dy >= Math.max(0, NOTCH - k);
}

/**
 * Builds a 12x12 pixel frame for CSS border-image (slice 4). Corners are notched so the box looks pixel-rounded.
 */
export function buildFrame(spec: FrameSpec): ArtSpec {
  const palette: Record<string, string> = { a: spec.rings[0], b: spec.rings[1], c: spec.rings[2], f: spec.fill };
  if (spec.light) {
    palette.l = spec.light;
  }
  if (spec.shade) {
    palette.s = spec.shade;
  }

  const rows = Array.from({ length: SIZE }, (_, y) =>
    Array.from({ length: SIZE }, (_, x) => {
      if (!insideInset(x, y, 0)) {
        return ".";
      }
      if (!insideInset(x, y, 1)) {
        return "a";
      }
      if (!insideInset(x, y, 2)) {
        return "b";
      }
      if (!insideInset(x, y, 3)) {
        return "c";
      }
      if (spec.light && y === 3 && x >= 3 && x < SIZE - 3) {
        return "l";
      }
      if (spec.shade && y === SIZE - 4 && x >= 3 && x < SIZE - 3) {
        return "s";
      }

      return "f";
    }).join(""),
  );

  return { rows, palette };
}

export const FRAME_SPECS: Readonly<Record<string, FrameSpec>> = {
  parchment: { rings: ["#3a2a24", "#e0a83c", "#e8cf98"], fill: "#fbf1d9" },
  hud: { rings: ["#0a1f1e", "#e0a83c", "#1d6b62"], fill: "#123c3a" },
  card: { rings: ["#b08553", "#f1dcae", "#fff8e8"], fill: "#fff8e8" },
  cardMint: { rings: ["#2fa792", "#d6f5ec", "#effbf7"], fill: "#effbf7" },
  tile: { rings: ["#a67c4e", "#f7e7bd", "#fff8e8"], fill: "#fff8e8", shade: "#ecd8a6" },
  tileDone: { rings: ["#0d4a3f", "#3fd4b4", "#17907f"], fill: "#17907f", light: "#37d6b4", shade: "#0f6a5c" },
  btnTeal: { rings: ["#0a3a34", "#4fe0c0", "#1aa08c"], fill: "#17907f", light: "#37d6b4", shade: "#0f6a5c" },
  btnCream: { rings: ["#7a5a34", "#ffffff", "#fff3d6"], fill: "#fff3d6", light: "#ffffff", shade: "#ecd8a6" },
  btnGold: { rings: ["#7a4f12", "#fff0a8", "#ffd84a"], fill: "#ffd84a", light: "#fff0a8", shade: "#e6a91f" },
  btnPink: { rings: ["#7a2a4a", "#ffc6d8", "#ff8fb1"], fill: "#ff8fb1", light: "#ffc6d8", shade: "#e0648e" },
  input: { rings: ["#a67c4e", "#e9d6a8", "#ffffff"], fill: "#ffffff" },
  chipDark: { rings: ["#0a1f1e", "#1d6b62", "#123c3a"], fill: "#123c3a" },
  bubble: { rings: ["#3a2a24", "#ffffff", "#ffffff"], fill: "#ffffff" },
  bar: { rings: ["#0a1f1e", "#0d2b2a", "#0d2b2a"], fill: "#0d2b2a" },
  seg: { rings: ["#a67c4e", "#efe0bb", "#efe0bb"], fill: "#efe0bb" },
};
