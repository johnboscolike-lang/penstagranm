import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { SFX as KENNEY_SFX, SPRITES as KENNEY_SPRITES } from "../../scripts/assets/import-kenney.mjs";
import { TRACKS as CC0_TRACKS } from "../../scripts/audio/import-cc0-bgm.mjs";
import { TRACKS as SYNTH_TRACKS } from "../../scripts/audio/tracks.mjs";
import { BGM_TRACKS, JINGLES, SFX_NAMES, bgmForSpace, bgmUrl, isSfxName, sfxUrl } from "@/utils/audio/sound-catalog";

const PUBLIC_DIR = path.join(process.cwd(), "public");

describe("소리 목록", () => {
  it("효과음 이름마다 파일이 있고, 목록에 없는 파일은 남아 있지 않다", () => {
    SFX_NAMES.forEach((name) => {
      expect(existsSync(path.join(PUBLIC_DIR, sfxUrl(name))), name).toBe(true);
    });
    const files = readdirSync(path.join(PUBLIC_DIR, "game/sfx")).map((file) => file.replace(/\.mp3$/, "")).sort();

    expect(files).toEqual([...SFX_NAMES].sort());
  });

  it("효과음 목록이 공개 에셋 가져오기 스크립트의 목록과 같다", () => {
    expect(Object.keys(KENNEY_SFX).sort()).toEqual([...SFX_NAMES].sort());
  });

  it("공개 스프라이트 파일이 모두 옮겨져 있다", () => {
    Object.keys(KENNEY_SPRITES).forEach((name) => {
      expect(existsSync(path.join(PUBLIC_DIR, "game/kenney", `${name}.png`)), name).toBe(true);
    });
  });

  it("배경 음악 곡마다 파일이 있다", () => {
    BGM_TRACKS.forEach((track) => {
      expect(existsSync(path.join(PUBLIC_DIR, bgmUrl(track))), track).toBe(true);
    });
  });

  it("배경 음악 목록이 합성 곡과 외부 CC0 곡을 합친 것과 같고, 파일 크기가 너무 크지 않다", () => {
    const synth = (SYNTH_TRACKS as { name: string }[]).map((track) => track.name);
    const external = (CC0_TRACKS as { name: string }[]).map((track) => track.name);

    expect([...BGM_TRACKS].sort()).toEqual([...synth, ...external].sort());
    BGM_TRACKS.forEach((track) => {
      const bytes = statSync(path.join(PUBLIC_DIR, bgmUrl(track))).size;
      expect(bytes, track).toBeLessThan(1_600_000);
    });
  });

  it("공간마다 알맞은 음악이 배정되고, 입구 화면은 학교 음악을 쓴다", () => {
    expect(bgmForSpace("arena")).toBe("battle");
    expect(bgmForSpace("practice")).toBe("challenge");
    expect(bgmForSpace("teacher")).toBe("teacher");
    expect(bgmForSpace("public")).toBe("school");
    expect(bgmForSpace("room")).toBe("room");
  });

  it("팡파르는 실제 효과음 이름이고 이름 검사가 동작한다", () => {
    JINGLES.forEach((name) => expect(isSfxName(name)).toBe(true));
    expect(isSfxName("없는소리")).toBe(false);
  });
});
