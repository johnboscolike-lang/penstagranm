/**
 * Kenney(kenney.nl) Tiny Dungeon의 CC0 16×16 도트 캐릭터. public/game/kenney 에 파일이 있다.
 * 어떤 원본을 옮겼는지는 scripts/assets/import-kenney.mjs 와 public/game/CREDITS.md 에 적혀 있다.
 */
export const KENNEY_NAMES = [
  "wizard",
  "boy",
  "monk",
  "viking",
  "girl",
  "mimic",
  "knight",
  "visor",
  "lad",
  "lady",
  "elder",
  "slime",
  "cyclops",
  "imp",
  "hermit",
  "ranger",
  "bat",
  "ghost",
  "spider",
  "rat",
  "wolf",
  "chest",
  "chestOpen",
  "sword",
  "shield",
  "potionGreen",
  "potionRed",
  "potionBlue",
] as const;

export type KenneyName = (typeof KENNEY_NAMES)[number];

export const KENNEY_TILE = 16;

/**
 * 도트 이미지 주소.
 */
export function kenneyUrl(name: KenneyName): string {
  return `/game/kenney/${name}.png`;
}
