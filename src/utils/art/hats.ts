import { PixelCanvas, type ArtSpec } from "@/utils/art/canvas";
import { COLOR, INK } from "@/utils/art/palette";

export const HAT_WIDTH = 14;

export interface HatArt {
  /** 머리(14×14) 맨 위 줄부터 덮어씌우는 도트. "."은 원래 머리를 그대로 둔다. */
  rows: readonly string[];
  palette: Readonly<Record<string, string>>;
}

/**
 * 왼쪽 절반(7칸)만 적으면 좌우 대칭으로 14칸을 만들어 준다.
 */
function mirror(half: string): string {
  return half + Array.from(half).reverse().join("");
}

/** 모자 도트. 모두 얼굴(14×14) 안에 들어와서 둥근 아바타 틀에서도 잘리지 않는다. */
export const HAT_ART = {
  crown: {
    rows: [
      mirror("..K...K"),
      mirror("..KK.Kc"),
      mirror(".KccKac"),
      mirror(".Kaaaaa"),
      mirror(".KbdbaE"),
    ],
    palette: { K: INK, a: COLOR.gold, b: COLOR.goldDark, c: COLOR.yellow, d: COLOR.red, E: COLOR.blue },
  },
  cap: {
    rows: [
      "....KKKKKK....",
      "..KKaaaaaaKK..",
      ".KaacaaaaaaaK.",
      "KaacaaaaaaaaaK",
      "KbbbbbbbbbbbbK",
      "KKKKKKKKKKKKKK",
    ],
    palette: { K: INK, a: COLOR.red, b: COLOR.redDark, c: "#ff9b94" },
  },
  beret: {
    rows: [
      ".......Kb.....",
      "...KKKKKKKK...",
      "..KaaaaacaaKK.",
      ".KaaacaaaaaaaK",
      "KaaaaaaaaaabbK",
      "KKbbbbbbbbbKK.",
    ],
    palette: { K: INK, a: COLOR.navy, b: COLOR.navyDark, c: COLOR.blue },
  },
  headband: {
    rows: [
      "..............",
      "..............",
      "..............",
      "KaaaaaaaaaayaK",
      "KabbbbbbbyyyyK",
      "..........yy..",
    ],
    palette: { K: INK, a: COLOR.pink, b: "#e77ea0", y: COLOR.yellow },
  },
  flower: {
    rows: [
      "..............",
      "........KwK...",
      ".......KwyyK..",
      "........KwK...",
      "..............",
    ],
    palette: { K: INK, w: COLOR.white, y: COLOR.yellow },
  },
  ears: {
    rows: [mirror(".KK...."), mirror(".KaK..."), mirror(".KpaK..")],
    palette: { K: INK, a: "#4b4760", p: COLOR.pink },
  },
  sprout: {
    rows: [
      "......KK......",
      "....KKgKgKK...",
      ".....KgGKg....",
      "......KGK.....",
    ],
    palette: { K: INK, g: COLOR.greenLight, G: COLOR.greenDark },
  },
} as const satisfies Record<string, HatArt>;

export type HatKey = keyof typeof HAT_ART;

export const HAT_KEYS = Object.keys(HAT_ART) as HatKey[];

/**
 * 모자 이름인지 확인한다.
 */
export function isHatKey(value: unknown): value is HatKey {
  return typeof value === "string" && (HAT_KEYS as string[]).includes(value);
}

/**
 * 머리 도트 위에 모자를 덧씌운다. 모자 색 기호는 얼굴 기호와 겹치지 않게 바꿔 붙인다.
 * 모자가 없으면 원래 도트를 그대로 돌려준다. (x, y)는 머리 왼쪽 위 모서리가 놓인 자리다.
 */
export function overlayHat(art: ArtSpec, hatKey: string | null | undefined, x = 0, y = 0): ArtSpec {
  if (!isHatKey(hatKey)) {
    return art;
  }
  const hat: HatArt = HAT_ART[hatKey];
  const symbols = Object.keys(hat.palette).filter((symbol) => symbol !== "K");
  const remap = new Map(symbols.map((symbol, index) => [symbol, String.fromCharCode(0x0391 + index)]));
  const width = Math.max(...art.rows.map((row) => row.length));
  const canvas = new PixelCanvas(width, art.rows.length);
  canvas.stamp(0, 0, art.rows);
  canvas.stamp(
    x,
    y,
    hat.rows.map((row) => Array.from(row).map((symbol) => remap.get(symbol) ?? symbol).join("")),
  );

  return {
    rows: canvas.toRows(),
    palette: { ...art.palette, ...Object.fromEntries(symbols.map((symbol) => [remap.get(symbol) as string, hat.palette[symbol]])) },
  };
}
