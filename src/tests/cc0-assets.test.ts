import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { CREATURES, EMOTES, ITEMS } from "../../scripts/assets/import-cc0-extra.mjs";
import { CC0_TILE, CREATURE_NAMES, EMOTE_LABELS, EMOTE_NAMES, ITEM_NAMES, cc0Url, isCc0Name, isEmoteName } from "@/utils/art/cc0";

const PUBLIC_DIR = path.join(process.cwd(), "public");

/**
 * PNG 머리말에서 가로·세로를 읽는다.
 */
function pngSize(file: string): { width: number; height: number; colorType: number } {
  const bytes = readFileSync(file);

  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), colorType: bytes[25] };
}

describe("CC0 도트 목록", () => {
  it("코드가 쓰는 이름과 가져오기 스크립트의 목록이 같다", () => {
    expect([...CREATURE_NAMES].sort()).toEqual(Object.keys(CREATURES).sort());
    expect([...EMOTE_NAMES].sort()).toEqual(Object.keys(EMOTES).sort());
    expect([...ITEM_NAMES].sort()).toEqual(Object.keys(ITEMS).sort());
  });

  it("모든 그림 파일이 있고 정확히 16×16이며, 폴더에 쓰지 않는 파일이 없다", () => {
    (["creatures", "emotes", "items"] as const).forEach((kind) => {
      const names = { creatures: CREATURE_NAMES, emotes: EMOTE_NAMES, items: ITEM_NAMES }[kind] as readonly string[];
      names.forEach((name) => {
        const file = path.join(PUBLIC_DIR, cc0Url(kind, name));
        expect(existsSync(file), `${kind}/${name}`).toBe(true);
        expect(pngSize(file), `${kind}/${name}`).toMatchObject({ width: CC0_TILE, height: CC0_TILE });
      });
      const onDisk = readdirSync(path.join(PUBLIC_DIR, "game/cc0", kind)).map((file) => file.replace(/\.png$/, "")).sort();
      expect(onDisk).toEqual([...names].sort());
    });
  });

  it("동물 그림은 투명 배경(RGBA)이다", () => {
    CREATURE_NAMES.forEach((name) => {
      expect(pngSize(path.join(PUBLIC_DIR, cc0Url("creatures", name))).colorType, name).toBe(6);
    });
  });

  it("모든 이모트에 한국어 이름이 있고, 놀림이 될 만한 것은 없다", () => {
    EMOTE_NAMES.forEach((name) => expect(EMOTE_LABELS[name].length).toBeGreaterThan(0));
    ["laugh", "anger", "faceAngry", "faceSad", "cross", "drop"].forEach((name) => expect(isEmoteName(name)).toBe(false));
  });

  it("이름 검사는 종류와 이름이 맞을 때만 참이다", () => {
    expect(isCc0Name("creatures", "fox")).toBe(true);
    expect(isCc0Name("emotes", "fox")).toBe(false);
    expect(isCc0Name("items", 3)).toBe(false);
    expect(isEmoteName("heart")).toBe(true);
    expect(cc0Url("items", "goldCoin")).toBe("/game/cc0/items/goldCoin.png");
  });

  it("출처 파일에 세 팩의 출처가 적혀 있다", () => {
    const credits = readFileSync(path.join(PUBLIC_DIR, "game/CREDITS.md"), "utf8");

    ["Tiny Creatures", "Emotes", "Ninja Adventure"].forEach((pack) => expect(credits).toContain(pack));
  });
});
