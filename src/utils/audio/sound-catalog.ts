/**
 * 게임에서 쓰는 효과음·배경 음악의 이름과 파일 위치, 공간별 음악 배정.
 * 파일은 public/game 아래에 있다. (출처: public/game/CREDITS.md)
 */

export const SFX_NAMES = [
  "click",
  "tile",
  "correct",
  "wrong",
  "thud",
  "coin",
  "buy",
  "open",
  "close",
  "toggle",
  "tick",
  "pop",
  "submit",
  "page",
  "stamp",
  "hit",
  "smash",
  "bell",
  "whoosh",
  "powerup",
  "draw",
  "levelup",
  "win",
  "lose",
] as const;

export type SfxName = (typeof SFX_NAMES)[number];

export const BGM_TRACKS = ["school", "challenge", "room", "arena", "teacher"] as const;

export type BgmTrack = (typeof BGM_TRACKS)[number];

/** 짧은 팡파르. 재생되는 동안 배경 음악을 잠깐 낮춘다. */
export const JINGLES: readonly SfxName[] = ["levelup", "win", "lose", "draw"];

/** 효과음마다 소리 크기를 조금씩 다듬는 값 (1이 기본) */
export const SFX_TRIM: Readonly<Partial<Record<SfxName, number>>> = {
  click: 0.7,
  tick: 0.6,
  toggle: 0.8,
  levelup: 0.9,
  win: 0.9,
  lose: 0.8,
  smash: 0.9,
  whoosh: 0.7,
};

export type SoundSpace = "school" | "challenge" | "practice" | "room" | "arena" | "teacher" | "public";

const TRACK_BY_SPACE: Readonly<Record<SoundSpace, BgmTrack>> = {
  school: "school",
  challenge: "challenge",
  practice: "challenge",
  room: "room",
  arena: "arena",
  teacher: "teacher",
  public: "school",
};

/**
 * 공간에 어울리는 배경 음악을 고른다.
 */
export function bgmForSpace(space: SoundSpace): BgmTrack {
  return TRACK_BY_SPACE[space];
}

/**
 * 효과음 파일 주소.
 */
export function sfxUrl(name: SfxName): string {
  return `/game/sfx/${name}.mp3`;
}

/**
 * 배경 음악 파일 주소.
 */
export function bgmUrl(track: BgmTrack): string {
  return `/game/bgm/${track}.mp3`;
}

/**
 * 문자열이 효과음 이름인지 확인한다.
 */
export function isSfxName(value: string): value is SfxName {
  return (SFX_NAMES as readonly string[]).includes(value);
}
