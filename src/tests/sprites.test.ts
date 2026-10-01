import { describe, expect, it } from "vitest";

import { buildHeadArt, buildHeroArt } from "@/utils/art/characters";
import { buildFrame, FRAME_SPECS } from "@/utils/art/frames";
import { ICON_SPECS } from "@/utils/art/icons";
import { getSpriteUrl, SPRITE_SIZES } from "@/utils/art/manifest";
import { renderSprite, SPRITE_BUILDERS } from "@/utils/art/registry";
import { measurePixelRows, rowsToRects } from "@/utils/pixel";

describe("sprite registry", () => {
  it("keeps the client-side size manifest in sync with the generated art", () => {
    const generated = Object.fromEntries(
      Object.keys(SPRITE_BUILDERS).map((name) => {
        const sprite = renderSprite(name);
        return [name, sprite ? [sprite.width, sprite.height] : null];
      }),
    );

    expect(generated).toEqual(SPRITE_SIZES);
  });

  it("renders every sprite with real pixels and an intrinsic size", () => {
    Object.keys(SPRITE_BUILDERS).forEach((name) => {
      const sprite = renderSprite(name);

      expect(sprite, name).not.toBeNull();
      expect(sprite?.svg, name).toContain(`width="${sprite?.width}"`);
      expect(sprite?.svg.match(/<rect /g)?.length ?? 0, name).toBeGreaterThan(0);
    });
  });

  it("returns null for unknown names and builds versioned URLs", () => {
    expect(renderSprite("does-not-exist")).toBeNull();
    expect(getSpriteUrl("school")).toMatch(/^\/api\/sprites\/school\.svg\?v=/);
  });
});

describe("frames", () => {
  it("makes 12x12 frames with notched corners and an outer outline", () => {
    const { rows } = buildFrame(FRAME_SPECS.parchment);

    expect(rows).toHaveLength(12);
    expect(rows[0].startsWith("..")).toBe(true);
    expect(rows[0][2]).toBe("a");
    expect(rows[6][0]).toBe("a");
    expect(rows[6][6]).toBe("f");
  });

  it("adds bevel lines to button frames", () => {
    const { rows } = buildFrame(FRAME_SPECS.btnTeal);

    expect(rows[3][6]).toBe("l");
    expect(rows[8][6]).toBe("s");
  });
});

describe("characters and icons", () => {
  it("recolors the same avatar for each hair key", () => {
    const silver = buildHeadArt("silver");
    const rose = buildHeadArt("rose");

    expect(silver.rows).toEqual(rose.rows);
    expect(silver.palette.h).not.toBe(rose.palette.h);
    expect(buildHeadArt("unknown").palette.h).toBe(silver.palette.h);
  });

  it("keeps every character and icon grid rectangular and non-empty", () => {
    const arts = [buildHeroArt(), ...Object.values(ICON_SPECS)];

    arts.forEach((art) => {
      const { width } = measurePixelRows(art.rows);

      expect(art.rows.every((row) => row.length === width)).toBe(true);
      expect(rowsToRects(art.rows, art.palette).length).toBeGreaterThan(0);
    });
  });
});
