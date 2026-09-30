/**
 * Kenney(kenney.nl)의 CC0 에셋에서 게임에 쓸 것만 골라 public/game 아래로 옮긴다.
 * 사용법: node scripts/assets/import-kenney.mjs <Kenney 팩을 풀어 둔 폴더>
 *   폴더 안에 tiny-dungeon/, interface-sounds/, rpg-audio/, digital-audio/, impact-sounds/, music-jingles/ 가 있어야 한다.
 * 효과음은 소리 크기를 비슷하게 맞춰 mp3로 바꾼다. ffmpeg가 필요하다.
 * 라이선스: CC0 (https://creativecommons.org/publicdomain/zero/1.0/) — 표기는 필수가 아니지만 public/game/CREDITS.md에 남긴다.
 */
import { execFileSync, spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

/** Tiny Dungeon 타일 번호 → 게임 안 이름 */
export const SPRITES = {
  wizard: 84,
  boy: 85,
  monk: 86,
  viking: 87,
  girl: 88,
  mimic: 92,
  knight: 96,
  visor: 97,
  lad: 98,
  lady: 99,
  elder: 100,
  slime: 108,
  cyclops: 109,
  imp: 110,
  hermit: 111,
  ranger: 112,
  bat: 120,
  ghost: 121,
  spider: 122,
  rat: 123,
  wolf: 124,
  chest: 89,
  chestOpen: 90,
  sword: 104,
  shield: 101,
  potionGreen: 114,
  potionRed: 115,
  potionBlue: 116,
};

/** 게임 안 효과음 이름 → 원본 파일(팩/하위 경로) */
export const SFX = {
  click: "interface-sounds/Audio/click_001.ogg",
  tile: "interface-sounds/Audio/confirmation_001.ogg",
  correct: "digital-audio/Audio/pepSound3.ogg",
  wrong: "interface-sounds/Audio/error_004.ogg",
  thud: "interface-sounds/Audio/bong_001.ogg",
  coin: "rpg-audio/Audio/handleCoins.ogg",
  buy: "rpg-audio/Audio/handleCoins2.ogg",
  open: "interface-sounds/Audio/open_002.ogg",
  close: "interface-sounds/Audio/close_002.ogg",
  toggle: "interface-sounds/Audio/toggle_001.ogg",
  tick: "interface-sounds/Audio/tick_004.ogg",
  pop: "interface-sounds/Audio/question_003.ogg",
  submit: "interface-sounds/Audio/drop_002.ogg",
  page: "rpg-audio/Audio/bookFlip3.ogg",
  stamp: "impact-sounds/Audio/impactPunch_medium_000.ogg",
  hit: "impact-sounds/Audio/impactPunch_medium_001.ogg",
  smash: "impact-sounds/Audio/impactPunch_heavy_002.ogg",
  bell: "impact-sounds/Audio/impactBell_heavy_004.ogg",
  whoosh: "digital-audio/Audio/zapThreeToneUp.ogg",
  powerup: "digital-audio/Audio/powerUp1.ogg",
  draw: "digital-audio/Audio/twoTone1.ogg",
  levelup: "music-jingles/Audio/8-Bit jingles/jingles_NES12.ogg",
  win: "music-jingles/Audio/8-Bit jingles/jingles_NES08.ogg",
  lose: "music-jingles/Audio/8-Bit jingles/jingles_NES11.ogg",
};

const TARGET_MEAN_DB = -21;
const MAX_PEAK_DB = -2;

/**
 * 파일의 평균·최대 소리 크기(dB)를 잰다.
 * @param {string} file 소리 파일
 * @returns {{mean: number, max: number}} dB 값
 */
function measure(file) {
  const result = spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-i", file, "-af", "volumedetect", "-f", "null", "-"], { encoding: "utf8" });
  const output = `${result.stderr ?? ""}`;
  const mean = Number(output.match(/mean_volume: (-?[\d.]+) dB/)?.[1] ?? -20);
  const max = Number(output.match(/max_volume: (-?[\d.]+) dB/)?.[1] ?? -3);

  return { mean, max };
}

/**
 * 효과음 한 개를 크기를 맞춰 mp3(모노)로 저장한다.
 * @param {string} source 원본 ogg
 * @param {string} output 저장할 mp3 경로
 */
function convertSfx(source, output) {
  const { mean, max } = measure(source);
  const gain = Math.min(TARGET_MEAN_DB - mean, MAX_PEAK_DB - max);
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", source, "-af", `volume=${gain.toFixed(2)}dB`, "-ac", "1", "-ar", "44100", "-b:a", "96k", output]);
}

/**
 * 진입점: 스프라이트를 복사하고 효과음을 변환한다.
 */
function main() {
  const root = process.argv[2];
  if (!root) {
    throw new Error("사용법: node scripts/assets/import-kenney.mjs <Kenney 팩 폴더>");
  }
  const spriteDir = path.join(process.cwd(), "public/game/kenney");
  const sfxDir = path.join(process.cwd(), "public/game/sfx");
  mkdirSync(spriteDir, { recursive: true });
  mkdirSync(sfxDir, { recursive: true });

  Object.entries(SPRITES).forEach(([name, index]) => {
    copyFileSync(path.join(root, "tiny-dungeon/Tiles", `tile_${String(index).padStart(4, "0")}.png`), path.join(spriteDir, `${name}.png`));
  });
  Object.entries(SFX).forEach(([name, file]) => {
    convertSfx(path.join(root, file), path.join(sfxDir, `${name}.mp3`));
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
