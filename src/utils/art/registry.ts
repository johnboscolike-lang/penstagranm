import type { ArtSpec } from "@/utils/art/canvas";
import { buildFrame, FRAME_SPECS } from "@/utils/art/frames";
import {
  buildBush,
  buildCastle,
  buildCloud,
  buildFlowerStrip,
  buildFloorTile,
  buildHills,
  buildIvy,
  buildTree,
  buildWaterfallTile,
  buildWaterTile,
} from "@/utils/art/nature";
import {
  buildBanner,
  buildBench,
  buildBookshelf,
  buildBridgeTile,
  buildCafeteria,
  buildChalkboard,
  buildCottage,
  buildDesk,
  buildFence,
  buildFlowerbed,
  buildLantern,
  buildLibrary,
  buildMailbox,
  buildSchoolHall,
  buildStairs,
  buildTreeBed,
} from "@/utils/art/structures";
import { rowsToSvgMarkup, measurePixelRows } from "@/utils/pixel";

const FRAME_BUILDERS = Object.fromEntries(
  Object.entries(FRAME_SPECS).map(([key, spec]) => [`frame-${key}`, () => buildFrame(spec)]),
) as Record<string, () => ArtSpec>;

/**
 * 서버가 SVG 로 내려주는 배경·소품·프레임 스프라이트 목록. 이름이 곧 URL(/api/sprites/이름.svg)이다.
 */
export const SPRITE_BUILDERS: Readonly<Record<string, () => ArtSpec>> = {
  "tree-green": () => buildTree("green", 11),
  "tree-green-b": () => buildTree("green", 23),
  "tree-blossom": () => buildTree("blossom", 7),
  "bush-a": () => buildBush(3),
  "bush-b": () => buildBush(9, ["w", "y"]),
  "bush-c": () => buildBush(15, ["p", "q", "p", "v"]),
  "flowers-a": () => buildFlowerStrip(5),
  "flowers-b": () => buildFlowerStrip(12, ["p", "q", "w"]),
  "ivy-a": () => buildIvy(30, 2),
  "ivy-b": () => buildIvy(46, 8),
  "ivy-c": () => buildIvy(22, 13),
  "cloud-a": () => buildCloud(4),
  "cloud-b": () => buildCloud(9),
  castle: () => buildCastle(),
  hills: () => buildHills(),
  "floor-stone": () => buildFloorTile(),
  "water-tile": () => buildWaterTile(),
  "waterfall-tile": () => buildWaterfallTile(),
  school: () => buildSchoolHall(),
  library: () => buildLibrary(),
  cafeteria: () => buildCafeteria(),
  cottage: () => buildCottage(),
  stairs: () => buildStairs(),
  lantern: () => buildLantern(),
  banner: () => buildBanner(),
  bench: () => buildBench(),
  fence: () => buildFence(),
  mailbox: () => buildMailbox(),
  bookshelf: () => buildBookshelf(),
  chalkboard: () => buildChalkboard(),
  desk: () => buildDesk(),
  "bridge-tile": () => buildBridgeTile(),
  flowerbed: () => buildFlowerbed(),
  treebed: () => buildTreeBed(),
  ...FRAME_BUILDERS,
};

export interface RenderedSprite {
  svg: string;
  width: number;
  height: number;
}

const cache = new Map<string, RenderedSprite>();

/**
 * Renders a named sprite to SVG (cached). Returns null for unknown names.
 */
export function renderSprite(name: string): RenderedSprite | null {
  const cached = cache.get(name);
  if (cached) {
    return cached;
  }

  const builder = SPRITE_BUILDERS[name];
  if (!builder) {
    return null;
  }

  const art = builder();
  const { width, height } = measurePixelRows(art.rows);
  const rendered = { svg: rowsToSvgMarkup(art.rows, art.palette, { intrinsic: true }), width, height };
  cache.set(name, rendered);

  return rendered;
}
