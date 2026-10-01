/**
 * 우리반퀘스트 픽셀 아트 팔레트. CSS 변수(globals.css)와 같은 색을 쓴다.
 */
export const INK = "#3a2a24";
export const INK_GREEN = "#1f4a2c";

export const COLOR = {
  ink: INK,
  cream: "#fff3d6",
  creamDeep: "#f6dfae",
  white: "#ffffff",
  skin: "#ffdcbf",
  skinShade: "#f2b592",
  cheek: "#ff9fb0",
  mouth: "#c96a6a",
  eye: "#2b2333",
  teal: "#1f9e8a",
  tealDark: "#137565",
  tealLight: "#66dcc4",
  gold: "#f2c14e",
  goldDark: "#c48a1e",
  brown: "#9a6a3a",
  brownDark: "#5f3d20",
  brownLight: "#c79560",
  red: "#e0605a",
  redDark: "#a83a3a",
  blue: "#5a9fe0",
  blueLight: "#a9d8f5",
  blueDark: "#2f5f9e",
  navy: "#2c3e6b",
  navyDark: "#1e2a4d",
  green: "#5cb85c",
  greenDark: "#2f7d3a",
  greenLight: "#9be36b",
  leaf: "#6cc04a",
  stone: "#dcd0b4",
  stoneShade: "#bcae8c",
  stoneDark: "#8f8264",
  pink: "#f7a6c0",
  lilac: "#b9a0ee",
  yellow: "#ffd75e",
  grey: "#8f9aa5",
  greyDark: "#5c6670",
} as const;

export interface HairColors {
  base: string;
  shade: string;
  light: string;
}

/**
 * 학생 머리색 표. 키는 Student.hairKey 와 같다.
 */
export const HAIR_COLORS: Readonly<Record<string, HairColors>> = {
  silver: { base: "#d3d7e2", shade: "#a3a9bd", light: "#ffffff" },
  rose: { base: "#f08fae", shade: "#c96486", light: "#ffc6d8" },
  black: { base: "#3d3a4d", shade: "#26232f", light: "#6b6783" },
  brown: { base: "#8a5a36", shade: "#623d22", light: "#b98456" },
  blonde: { base: "#f3cf6a", shade: "#d3a63a", light: "#fff0a8" },
  green: { base: "#78c56b", shade: "#4a9450", light: "#b6ee9e" },
  blue: { base: "#5fa8e8", shade: "#3874b8", light: "#a5d4ff" },
  orange: { base: "#f29a4a", shade: "#c96f2a", light: "#ffc98a" },
  purple: { base: "#9a7be0", shade: "#6c4fb0", light: "#cdb8ff" },
};

/**
 * Looks up hair colors with a safe fallback.
 */
export function getHairColors(hairKey: string | null | undefined): HairColors {
  return HAIR_COLORS[hairKey ?? "silver"] ?? HAIR_COLORS.silver;
}
