/**
 * 공개(CC0) 16×16 도트: 동물(Tiny Creatures), 이모트(Kenney Emotes), 아이템 아이콘(Ninja Adventure).
 * 파일은 public/game/cc0 에 있고, 어떤 원본을 옮겼는지는 scripts/assets/import-cc0-extra.mjs 와 public/game/CREDITS.md 에 적혀 있다.
 */
export const CC0_TILE = 16;

export const CREATURE_NAMES = ["chicken", "sheep", "rabbit", "fox", "squirrel", "raccoon", "frog", "turtle", "owl", "polarbear", "tiger", "elephant", "cow", "giraffe"] as const;

/** 응원·칭찬이 되는 이모트만 둔다. (놀림이 될 수 있는 것은 넣지 않는다) */
export const EMOTE_NAMES = ["heart", "hearts", "star", "stars", "happy", "idea", "music", "exclamation"] as const;

export const ITEM_NAMES = [
  "goldCoin",
  "goldCup",
  "silverCup",
  "goldKey",
  "gemRed",
  "gemGreen",
  "gemPurple",
  "gemYellow",
  "onigiri",
  "honey",
  "fish",
  "sushi",
  "fortuneCookie",
  "heart",
  "lifePot",
  "feather",
] as const;

export type CreatureName = (typeof CREATURE_NAMES)[number];
export type EmoteName = (typeof EMOTE_NAMES)[number];
export type ItemName = (typeof ITEM_NAMES)[number];

export type Cc0Kind = "creatures" | "emotes" | "items";

const NAMES_BY_KIND: Readonly<Record<Cc0Kind, readonly string[]>> = {
  creatures: CREATURE_NAMES,
  emotes: EMOTE_NAMES,
  items: ITEM_NAMES,
};

/** 이모트마다 화면 읽기 프로그램과 말풍선 설명에 쓰는 한국어 이름 */
export const EMOTE_LABELS: Readonly<Record<EmoteName, string>> = {
  heart: "좋아요",
  hearts: "사랑해요",
  star: "멋져요",
  stars: "반짝반짝",
  happy: "즐거웠어요",
  idea: "똑똑해요",
  music: "신나요",
  exclamation: "와!",
};

/**
 * 도트 이미지 주소.
 */
export function cc0Url(kind: Cc0Kind, name: string): string {
  return `/game/cc0/${kind}/${name}.png`;
}

/**
 * 종류 안에 있는 이름인지 확인한다.
 */
export function isCc0Name(kind: Cc0Kind, name: unknown): boolean {
  return typeof name === "string" && NAMES_BY_KIND[kind].includes(name);
}

/**
 * 이모트 이름인지 확인한다.
 */
export function isEmoteName(value: unknown): value is EmoteName {
  return isCc0Name("emotes", value);
}
