/**
 * 공개(CC0) 도트 에셋에서 귀여운 동물·이모트·아이템 아이콘을 골라 public/game/cc0 아래 16×16 PNG로 옮긴다.
 * 사용법: node scripts/assets/import-cc0-extra.mjs <팩을 풀어 둔 폴더>
 *   폴더 안에 tiny-creatures/ (Clint Bellanger, CC0), emotes-pack/ (Kenney, CC0), ninja-adventure/ (Pixel-boy, CC0) 가 있어야 한다.
 *   각 팩 안의 License.txt(CC0)는 직접 확인했고, 출처는 public/game/CREDITS.md에 남긴다.
 * 16×16보다 작은 그림은 투명한 16×16 판 가운데에 놓는다. ffmpeg가 필요하다.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const TILE = 16;

/** Tiny Creatures(타일 번호) → 게임 안 이름. 동물 펫으로 쓴다. */
export const CREATURES = {
  chicken: 151,
  sheep: 154,
  rabbit: 178,
  fox: 170,
  squirrel: 176,
  raccoon: 179,
  frog: 148,
  turtle: 150,
  owl: 118,
  polarbear: 165,
  tiger: 158,
  elephant: 159,
};

/** Kenney Emotes Pack(Pixel/Style 1, 말풍선 있는 것) 파일 → 게임 안 이름. 응원·칭찬이 되는 것만 골랐다(놀림이 될 수 있는 HAHA·눈물·화남은 뺐다). */
export const EMOTES = {
  heart: "emote_heart.png",
  hearts: "emote_hearts.png",
  star: "emote_star.png",
  stars: "emote_stars.png",
  happy: "emote_faceHappy.png",
  idea: "emote_idea.png",
  music: "emote_music.png",
  exclamation: "emote_exclamation.png",
};

/** The Ninja Adventure Asset Pack(Items 폴더 안 경로) → 게임 안 이름. 업적 아이콘 등에 쓴다. */
export const ITEMS = {
  goldCoin: "Treasure/GoldCoin.png",
  goldCup: "Treasure/GoldCup.png",
  silverCup: "Treasure/SilverCup.png",
  goldKey: "Treasure/GoldKey.png",
  gemRed: "Resource/GemRed.png",
  gemGreen: "Resource/GemGreen.png",
  gemPurple: "Resource/GemPurple.png",
  gemYellow: "Resource/GemYellow.png",
  onigiri: "Food/Onigiri.png",
  honey: "Food/Honey.png",
  fish: "Food/Fish.png",
  sushi: "Food/Sushi.png",
  fortuneCookie: "Food/FortuneCookie.png",
  heart: "Potion/Heart.png",
  lifePot: "Potion/LifePot.png",
  feather: "Resource/feather.png",
};

/**
 * 그림 한 장을 16×16 투명 캔버스 가운데에 놓아 저장한다. 이미 16×16이면 그대로다.
 * @param {string} source 원본 PNG
 * @param {string} output 저장할 PNG 경로
 * @param {boolean} [blackIsBackground] 배경이 순수한 검정(0,0,0)으로 칠해진 원본이면 true. 투명으로 바꾼다.
 *   Tiny Creatures는 그림 안쪽에 순수한 검정을 쓰지 않아서(12마리 모두 확인) 안전하다.
 */
function normalize(source, output, blackIsBackground = false) {
  const keyed = blackIsBackground ? "colorkey=0x000000:0.01:0.0," : "";
  execFileSync("ffmpeg", [
    "-y",
    "-loglevel",
    "error",
    "-i",
    source,
    "-vf",
    `format=rgba,${keyed}pad=${TILE}:${TILE}:(ow-iw)/2:(oh-ih)/2:color=black@0`,
    "-frames:v",
    "1",
    output,
  ]);
}

/**
 * 진입점: 세 팩에서 고른 그림을 옮긴다.
 */
function main() {
  const root = process.argv[2];
  if (!root) {
    throw new Error("사용법: node scripts/assets/import-cc0-extra.mjs <팩 폴더>");
  }
  const outRoot = path.join(process.cwd(), "public/game/cc0");
  ["creatures", "emotes", "items"].forEach((dir) => mkdirSync(path.join(outRoot, dir), { recursive: true }));

  Object.entries(CREATURES).forEach(([name, index]) => {
    normalize(path.join(root, "tiny-creatures/Tiles", `tile_${String(index).padStart(4, "0")}.png`), path.join(outRoot, "creatures", `${name}.png`), true);
  });
  Object.entries(EMOTES).forEach(([name, file]) => {
    normalize(path.join(root, "emotes-pack/PNG/Pixel/Style 1", file), path.join(outRoot, "emotes", `${name}.png`));
  });
  Object.entries(ITEMS).forEach(([name, file]) => {
    normalize(path.join(root, "ninja-adventure/Items", file), path.join(outRoot, "items", `${name}.png`));
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
