import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { SFX, SPRITES } from "../../scripts/assets/import-kenney.mjs";
import { KENNEY_NAMES } from "@/utils/art/kenney";
import { SFX_NAMES } from "@/utils/audio/sound-catalog";

describe("공개 에셋 목록", () => {
  it("코드가 쓰는 도트 이름과 가져오기 스크립트의 목록이 같다", () => {
    expect([...KENNEY_NAMES].sort()).toEqual(Object.keys(SPRITES).sort());
  });

  it("코드가 쓰는 효과음 이름과 가져오기 스크립트의 목록이 같다", () => {
    expect([...SFX_NAMES].sort()).toEqual(Object.keys(SFX).sort());
  });

  it("출처 파일에 CC0 라이선스와 쓰지 않은 것이 적혀 있다", () => {
    const credits = readFileSync(path.join(process.cwd(), "public/game/CREDITS.md"), "utf8");

    expect(credits).toContain("CC0");
    expect(credits).toContain("메이플스토리");
  });
});
