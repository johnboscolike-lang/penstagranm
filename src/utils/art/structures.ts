import { createRng, PixelCanvas, type ArtSpec } from "@/utils/art/canvas";

type Rng = () => number;

const ROOFS = {
  teal: { R: "#2f9f92", r: "#1f7a70", q: "#5fc9b8" },
  red: { R: "#d8635a", r: "#a8443f", q: "#f08c7c" },
  blue: { R: "#4a86c8", r: "#33629a", q: "#7db4ea" },
} as const;

const BUILDING_PALETTE = {
  O: "#3a2a24",
  a: "#dccfb2",
  b: "#efe4cb",
  c: "#c2b391",
  M: "#a89a78",
  F: "#f7ecd0",
  Y: "#ffe58f",
  y: "#ffc24f",
  G: "#8d6b3d",
  W: "#a06d3b",
  w: "#6b4526",
  h: "#f2c14e",
  e: "#1f4a2c",
  i: "#3f8f45",
  j: "#5cb85c",
  k: "#8fdc6a",
  p: "#f7a6c0",
  q: "#ffe3ee",
  v: "#b9a0ee",
  z: "#ffd75e",
} as const;

export interface WindowSpec {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface BuildingOptions {
  seed: number;
  width: number;
  wallHeight: number;
  roofHeight: number;
  roof: keyof typeof ROOFS;
  windows: WindowSpec[];
  door?: { x: number; w: number; h: number };
  tower?: { x: number; w: number; height: number };
  chimney?: { x: number };
  ivy?: number;
  flowerBoxes?: boolean;
}

const MARGIN = 5;

/**
 * Fills a rectangle of the canvas with staggered stone bricks.
 */
function paintStoneWall(canvas: PixelCanvas, x0: number, y0: number, width: number, height: number, rng: Rng): void {
  const brickHeight = 5;
  const brickWidth = 10;

  for (let y = y0; y < y0 + height; y += 1) {
    const row = Math.floor((y - y0) / brickHeight);
    const offset = (row % 2) * (brickWidth / 2);
    for (let x = x0; x < x0 + width; x += 1) {
      const isRowLine = (y - y0) % brickHeight === 0;
      const isColumnLine = (x - x0 + offset) % brickWidth === 0;
      canvas.set(x, y, isRowLine || isColumnLine ? "M" : "a");
    }
  }

  for (let row = 0; row * brickHeight < height; row += 1) {
    const offset = (row % 2) * (brickWidth / 2);
    for (let bx = x0 - offset; bx < x0 + width; bx += brickWidth) {
      const roll = rng();
      const symbol = roll < 0.28 ? "b" : roll < 0.4 ? "c" : null;
      if (symbol) {
        for (let y = y0 + row * brickHeight + 1; y < Math.min(y0 + (row + 1) * brickHeight, y0 + height); y += 1) {
          for (let x = Math.max(bx + 1, x0); x < Math.min(bx + brickWidth, x0 + width); x += 1) {
            canvas.set(x, y, symbol);
          }
        }
      }
    }
  }
  canvas.rect(x0, y0 + height - 3, width, 3, "c").rect(x0, y0 + height - 3, width, 1, "M");
}

/**
 * Paints a tiled hip roof that narrows toward the ridge.
 */
function paintRoof(canvas: PixelCanvas, left: number, right: number, top: number, height: number, rng: Rng): void {
  const ridgeInset = Math.round((right - left) * 0.2);

  for (let row = 0; row < height; row += 1) {
    const progress = (height - 1 - row) / Math.max(1, height - 1);
    const inset = Math.round(progress * ridgeInset);
    for (let x = left + inset; x < right - inset; x += 1) {
      const isTileEdge = row % 3 === 2;
      const isSeam = (x + (Math.floor(row / 3) % 2) * 3) % 6 === 0;
      let symbol = "R";
      if (isTileEdge || isSeam) {
        symbol = "r";
      } else if (row % 3 === 0 && rng() < 0.35) {
        symbol = "q";
      }
      canvas.set(x, top + row, symbol);
    }
  }
  canvas.rect(left, top + height - 1, right - left, 1, "r");
}

/**
 * Paints an arched, softly lit window with a cream frame and a sill.
 */
function paintWindow(canvas: PixelCanvas, spec: WindowSpec): void {
  const { x, y, w, h } = spec;
  const radius = w / 2;
  canvas.rect(x, y + Math.ceil(radius), w, h - Math.ceil(radius), "F");
  canvas.ellipse(x + (w - 1) / 2, y + radius, radius - 0.4, radius - 0.4, "F");
  canvas.rect(x + 1, y + Math.ceil(radius), w - 2, h - Math.ceil(radius) - 1, "Y");
  canvas.ellipse(x + (w - 1) / 2, y + radius, radius - 1.4, radius - 1.4, "Y");
  canvas.rect(x + 1, y + h - 4, w - 2, 3, "y");
  canvas.rect(x + Math.floor(w / 2), y + 1, 1, h - 2, "F");
  canvas.rect(x + 1, y + Math.floor(h / 2), w - 2, 1, "F");
  canvas.rect(x - 1, y + h - 1, w + 2, 2, "c").rect(x - 1, y + h - 1, w + 2, 1, "b");
}

/**
 * Paints a wooden double door with an arched top and a warm lit gap.
 */
function paintDoor(canvas: PixelCanvas, x: number, baseline: number, w: number, h: number): void {
  const top = baseline - h;
  canvas.rect(x - 1, top + 2, w + 2, h - 2, "F");
  canvas.ellipse(x + (w - 1) / 2, top + w / 2 + 1, w / 2 + 0.6, w / 2 + 0.6, "F");
  canvas.rect(x, top + Math.ceil(w / 2) + 1, w, h - Math.ceil(w / 2) - 1, "W");
  canvas.ellipse(x + (w - 1) / 2, top + w / 2 + 1, w / 2 - 0.5, w / 2 - 0.5, "W");
  canvas.rect(x + Math.floor(w / 2), top + 2, 1, h - 2, "O");
  for (let plankX = x + 2; plankX < x + w - 1; plankX += 3) {
    canvas.rect(plankX, top + Math.ceil(w / 2) + 2, 1, h - Math.ceil(w / 2) - 3, "w");
  }
  canvas.set(x + Math.floor(w / 2) - 2, baseline - Math.floor(h / 3), "h").set(x + Math.floor(w / 2) + 2, baseline - Math.floor(h / 3), "h");
  canvas.rect(x - 2, baseline - 1, w + 4, 2, "c");
}

/**
 * Drapes green ivy over stone cells only, so windows and doors stay clear.
 */
function paintIvy(canvas: PixelCanvas, rng: Rng, x0: number, x1: number, y0: number, y1: number, density: number): void {
  const clusters = Math.round(((x1 - x0) / 14) * density) + 1;
  for (let cluster = 0; cluster < clusters; cluster += 1) {
    const cx = x0 + Math.floor(rng() * (x1 - x0));
    const cy = y0 + Math.floor(rng() * 6);
    const radius = 3 + Math.floor(rng() * 4);
    for (let dy = -radius; dy <= radius + 9; dy += 1) {
      for (let dx = -radius; dx <= radius; dx += 1) {
        const inBlob = dx * dx + dy * dy <= radius * radius;
        const inStrand = dy > 0 && Math.abs(dx) <= 1 && dy < 4 + Math.floor(rng() * 9) + radius;
        const x = cx + dx;
        const y = cy + dy;
        const target = canvas.get(x, y);
        if ((inBlob || (inStrand && rng() < 0.7)) && "abcM".includes(target) && y < y1) {
          const roll = rng();
          canvas.set(x, y, roll < 0.5 ? "j" : roll < 0.8 ? "i" : "k");
        }
      }
    }
  }
}

/**
 * Generates a cozy stone building: tiled roof, arched windows, door, ivy, and optional tower/chimney.
 */
export function buildBuilding(options: BuildingOptions): ArtSpec {
  const rng = createRng(options.seed);
  const towerExtra = options.tower ? options.tower.height : 0;
  const width = options.width + MARGIN * 2;
  const height = options.roofHeight + options.wallHeight + Math.max(2, towerExtra - options.roofHeight) + 3;
  const canvas = new PixelCanvas(width, height);
  const wallTop = height - options.wallHeight - 1;
  const wallLeft = MARGIN;
  const roofColors = ROOFS[options.roof];

  paintStoneWall(canvas, wallLeft, wallTop, options.width, options.wallHeight, rng);

  if (options.tower) {
    const towerLeft = MARGIN + options.tower.x;
    const towerTop = wallTop - options.tower.height;
    paintStoneWall(canvas, towerLeft, towerTop, options.tower.w, options.tower.height + 3, rng);
    paintRoof(canvas, towerLeft - 2, towerLeft + options.tower.w + 2, towerTop - 8, 10, rng);
    canvas.rect(towerLeft + Math.floor(options.tower.w / 2) - 3, towerTop + 3, 7, 7, "F");
    canvas.ellipse(towerLeft + Math.floor(options.tower.w / 2), towerTop + 6, 3, 3, "Y");
    canvas.rect(towerLeft + Math.floor(options.tower.w / 2), towerTop + 4, 1, 3, "O").rect(towerLeft + Math.floor(options.tower.w / 2), towerTop + 6, 2, 1, "O");
  }

  if (options.chimney) {
    const chimneyLeft = MARGIN + options.chimney.x;
    paintStoneWall(canvas, chimneyLeft, wallTop - options.roofHeight - 4, 7, options.roofHeight + 6, rng);
    canvas.rect(chimneyLeft - 1, wallTop - options.roofHeight - 5, 9, 2, "c");
  }

  paintRoof(canvas, wallLeft - 3, wallLeft + options.width + 3, wallTop - options.roofHeight + 2, options.roofHeight, rng);

  options.windows.forEach((spec) => paintWindow(canvas, { ...spec, x: spec.x + MARGIN, y: spec.y + wallTop }));
  if (options.flowerBoxes) {
    options.windows.forEach((spec) => {
      const boxY = spec.y + wallTop + spec.h + 1;
      canvas.rect(spec.x + MARGIN - 1, boxY, spec.w + 2, 3, "w").rect(spec.x + MARGIN - 1, boxY, spec.w + 2, 1, "G");
      for (let flowerX = spec.x + MARGIN; flowerX < spec.x + MARGIN + spec.w; flowerX += 2) {
        canvas.set(flowerX, boxY - 1, rng() < 0.5 ? "p" : "v").set(flowerX + 1, boxY - 1, "j");
      }
    });
  }
  if (options.door) {
    paintDoor(canvas, MARGIN + options.door.x, height - 1, options.door.w, options.door.h);
  }
  if (options.ivy) {
    paintIvy(canvas, rng, wallLeft, wallLeft + options.width, wallTop - 4, height - 6, options.ivy);
  }

  canvas.outline("O");

  return { rows: canvas.toRows(), palette: { ...BUILDING_PALETTE, ...roofColors } };
}

/**
 * The classroom building: teal roof, four windows, arched door, ivy and a clock tower (110x84).
 */
export function buildSchoolHall(): ArtSpec {
  return buildBuilding({
    seed: 21,
    width: 100,
    wallHeight: 50,
    roofHeight: 14,
    roof: "teal",
    windows: [
      { x: 10, y: 10, w: 10, h: 20 },
      { x: 30, y: 10, w: 10, h: 20 },
      { x: 62, y: 10, w: 10, h: 20 },
      { x: 82, y: 10, w: 10, h: 20 },
    ],
    door: { x: 44, w: 16, h: 30 },
    tower: { x: 40, w: 20, height: 22 },
    ivy: 2,
    flowerBoxes: true,
  });
}

/**
 * The library: big central arch, tall windows, twin towers' worth of ivy (112x92).
 */
export function buildLibrary(): ArtSpec {
  return buildBuilding({
    seed: 33,
    width: 102,
    wallHeight: 58,
    roofHeight: 16,
    roof: "teal",
    windows: [
      { x: 8, y: 12, w: 10, h: 24 },
      { x: 26, y: 12, w: 10, h: 24 },
      { x: 66, y: 12, w: 10, h: 24 },
      { x: 84, y: 12, w: 10, h: 24 },
    ],
    door: { x: 40, w: 22, h: 40 },
    tower: { x: 41, w: 20, height: 24 },
    ivy: 2.6,
  });
}

/**
 * The cafeteria: low, wide, blue roof with big warm windows (84x54).
 */
export function buildCafeteria(): ArtSpec {
  return buildBuilding({
    seed: 45,
    width: 76,
    wallHeight: 32,
    roofHeight: 12,
    roof: "blue",
    windows: [
      { x: 8, y: 8, w: 12, h: 16 },
      { x: 26, y: 8, w: 12, h: 16 },
      { x: 56, y: 8, w: 12, h: 16 },
    ],
    door: { x: 39, w: 12, h: 22 },
    ivy: 1.2,
    flowerBoxes: true,
  });
}

/**
 * The cozy home: red roof, chimney, flower boxes (92x74).
 */
export function buildCottage(): ArtSpec {
  return buildBuilding({
    seed: 57,
    width: 80,
    wallHeight: 38,
    roofHeight: 20,
    roof: "red",
    windows: [
      { x: 10, y: 10, w: 12, h: 16 },
      { x: 58, y: 10, w: 12, h: 16 },
    ],
    door: { x: 33, w: 14, h: 26 },
    chimney: { x: 56 },
    ivy: 0.8,
    flowerBoxes: true,
  });
}

/**
 * Wide stone stairs with lit treads (96x28).
 */
export function buildStairs(width = 96, steps = 6): ArtSpec {
  const canvas = new PixelCanvas(width, steps * 4 + 4);
  const rng = createRng(9);

  for (let step = 0; step < steps; step += 1) {
    const inset = (steps - 1 - step) * 3;
    const y = step * 4 + 2;
    canvas.rect(inset, y, width - inset * 2, 1, "b").rect(inset, y + 1, width - inset * 2, 3, "a");
    canvas.rect(inset, y + 3, width - inset * 2, 1, "c");
    for (let x = inset + 6; x < width - inset - 3; x += 9 + Math.floor(rng() * 4)) {
      canvas.set(x, y + 2, "M");
    }
  }
  canvas.outline("O");

  return { rows: canvas.toRows(), palette: BUILDING_PALETTE };
}

/**
 * Iron street lamp with a lit glass lantern (14x44). The glow itself is added by CSS.
 */
export function buildLantern(): ArtSpec {
  return {
    rows: [
      "......OO......",
      ".....OggO.....",
      "....OggggO....",
      "...OOOOOOOO...",
      "...OYYYYYYO...",
      "...OYyyyyYO...",
      "...OYyyyyYO...",
      "...OYyyyyYO...",
      "...OYYYYYYO...",
      "...OOOOOOOO...",
      "....OggggO....",
      ".....OggO.....",
      "......OO......",
      "......OgO.....",
      "......OgO.....",
      "......OgO.....",
      "......OgO.....",
      "......OgO.....",
      "......OgO.....",
      "......OgO.....",
      "......OgO.....",
      "......OgO.....",
      "......OgO.....",
      "......OgO.....",
      "......OgO.....",
      "......OgO.....",
      "......OgO.....",
      "......OgO.....",
      "......OgO.....",
      "......OgO.....",
      ".....OgggO....",
      "....OggggGO...",
      "....OOOOOOO...",
    ].map((row) => row.padEnd(14, ".").slice(0, 14)),
    palette: { O: "#2a2a35", g: "#4a4a5c", G: "#6a6a80", Y: "#fff0a8", y: "#ffc24f" },
  };
}

/**
 * Teal hanging banner with a golden sprout (14x38).
 */
export function buildBanner(): ArtSpec {
  const canvas = new PixelCanvas(14, 38);
  canvas.rect(0, 0, 14, 2, "k").rect(6, 0, 2, 38, "k");
  canvas.rect(1, 2, 12, 26, "T").rect(1, 2, 1, 26, "u").rect(12, 2, 1, 26, "t");
  for (let i = 0; i < 4; i += 1) {
    canvas.rect(1 + i * 3, 28 + i, 3, 3 - i, "T").rect(1 + i * 3, 28 + i, 1, 3 - i, "u");
  }
  canvas.rect(6, 22, 2, 2, "G").line(7, 22, 7, 12, "G").ellipse(4, 12, 2, 1.4, "G").ellipse(10, 10, 2, 1.4, "G").ellipse(7, 8, 1.4, 1.6, "G");
  canvas.rect(3, 24, 8, 1, "g");
  canvas.outline("O");

  return {
    rows: canvas.toRows(),
    palette: { O: "#2a2a35", k: "#5b4a3a", T: "#1f9e8a", t: "#137565", u: "#5fd6bf", G: "#f2c14e", g: "#c48a1e" },
  };
}

/**
 * Wooden bench with iron ends (30x18).
 */
export function buildBench(): ArtSpec {
  const canvas = new PixelCanvas(30, 18);
  canvas.rect(2, 2, 26, 3, "W").rect(2, 2, 26, 1, "L").rect(2, 6, 26, 3, "W").rect(2, 6, 26, 1, "L");
  canvas.rect(3, 10, 24, 3, "W").rect(3, 10, 24, 1, "L").rect(3, 13, 24, 1, "w");
  canvas.rect(1, 1, 3, 15, "I").rect(26, 1, 3, 15, "I").rect(1, 12, 3, 3, "I").rect(26, 12, 3, 3, "I");
  canvas.outline("O");

  return {
    rows: canvas.toRows(),
    palette: { O: "#2a2a35", W: "#b47a44", L: "#d69a62", w: "#7a4f2a", I: "#2f6f66" },
  };
}

/**
 * Small wooden fence segment that tiles horizontally (16x18).
 */
export function buildFence(): ArtSpec {
  const canvas = new PixelCanvas(16, 18);
  canvas.rect(0, 4, 16, 3, "W").rect(0, 4, 16, 1, "L").rect(0, 10, 16, 3, "W").rect(0, 10, 16, 1, "L");
  canvas.rect(6, 0, 4, 18, "W").rect(6, 0, 1, 18, "L").rect(9, 0, 1, 18, "w");
  canvas.outline("O");

  return { rows: canvas.toRows(), palette: { O: "#3a2a24", W: "#a06d3b", L: "#c68f55", w: "#6b4526" } };
}

/**
 * Red mailbox on a post (16x28).
 */
export function buildMailbox(): ArtSpec {
  const canvas = new PixelCanvas(16, 28);
  canvas.rect(6, 14, 4, 14, "W").rect(9, 14, 1, 14, "w");
  canvas.rect(1, 4, 14, 10, "R").ellipse(7.5, 5, 6.5, 4, "R").rect(1, 11, 14, 3, "r");
  canvas.rect(4, 7, 8, 1, "d").rect(4, 9, 8, 1, "d");
  canvas.rect(13, 0, 2, 6, "G").rect(13, 0, 3, 2, "G");
  canvas.outline("O");

  return {
    rows: canvas.toRows(),
    palette: { O: "#3a2a24", W: "#a06d3b", w: "#6b4526", R: "#e0605a", r: "#a83a3a", d: "#8a3030", G: "#f2c14e" },
  };
}

/**
 * Bookshelf filled with colorful books (32x42).
 */
export function buildBookshelf(seed = 5): ArtSpec {
  const rng = createRng(seed);
  const canvas = new PixelCanvas(32, 42);
  canvas.rect(0, 0, 32, 42, "W").rect(2, 2, 28, 38, "d");
  const bookColors = ["r", "b", "g", "y", "p", "t", "o"];

  for (let shelf = 0; shelf < 4; shelf += 1) {
    const baseline = 10 + shelf * 9 + 1;
    let x = 3;
    while (x < 28) {
      const width = 2 + Math.floor(rng() * 2);
      const height = 5 + Math.floor(rng() * 4);
      const color = bookColors[Math.floor(rng() * bookColors.length)];
      canvas.rect(x, baseline - height, width, height, color).rect(x, baseline - height, 1, height, "l");
      x += width + (rng() < 0.15 ? 2 : 0);
    }
    canvas.rect(2, baseline, 28, 2, "W");
  }
  canvas.rect(0, 0, 32, 2, "L");
  canvas.outline("O");

  return {
    rows: canvas.toRows(),
    palette: {
      O: "#3a2a24",
      W: "#9a6a3a",
      L: "#c68f55",
      d: "#5a3a20",
      l: "#ffffff",
      r: "#d9534f",
      b: "#4a86c8",
      g: "#4aa86a",
      y: "#e8b83a",
      p: "#c76aa8",
      t: "#2f9f92",
      o: "#e08a3a",
    },
  };
}

/**
 * Green chalkboard with a wooden frame and chalk doodles (36x26).
 */
export function buildChalkboard(): ArtSpec {
  const canvas = new PixelCanvas(36, 26);
  canvas.rect(0, 0, 36, 26, "W").rect(2, 2, 32, 22, "G").rect(2, 22, 32, 2, "g");
  canvas.line(5, 6, 14, 6, "c").line(5, 10, 20, 10, "c").line(5, 14, 12, 14, "c");
  canvas.line(22, 14, 30, 6, "c").line(22, 14, 30, 14, "c").line(30, 6, 30, 14, "c");
  canvas.rect(6, 21, 5, 1, "y").rect(14, 21, 3, 1, "c");
  canvas.outline("O");

  return {
    rows: canvas.toRows(),
    palette: { O: "#3a2a24", W: "#a06d3b", G: "#2f5b4a", g: "#26493b", c: "#f3f0e2", y: "#ffd75e" },
  };
}

/**
 * Wooden study desk with a warm lamp, an open book and a mug (44x30).
 */
export function buildDesk(): ArtSpec {
  const canvas = new PixelCanvas(44, 30);
  canvas.rect(0, 14, 44, 4, "W").rect(0, 14, 44, 1, "L").rect(2, 18, 4, 11, "w").rect(38, 18, 4, 11, "w");
  canvas.rect(2, 18, 40, 3, "w");
  canvas.rect(14, 8, 16, 6, "P").rect(21, 8, 2, 6, "p").rect(16, 10, 4, 1, "i").rect(24, 10, 4, 1, "i");
  canvas.rect(5, 3, 2, 11, "I").rect(2, 1, 8, 4, "T").rect(3, 4, 6, 1, "Y");
  canvas.rect(35, 9, 5, 5, "F").rect(40, 10, 2, 3, "F").rect(36, 10, 3, 1, "c");
  canvas.outline("O");

  return {
    rows: canvas.toRows(),
    palette: {
      O: "#3a2a24",
      W: "#b47a44",
      L: "#d69a62",
      w: "#7a4f2a",
      P: "#fffaf0",
      p: "#d9c9a0",
      i: "#7bb6d9",
      I: "#2f6f66",
      T: "#1f9e8a",
      Y: "#fff0a8",
      F: "#f0f0f0",
      c: "#8b5a2b",
    },
  };
}

/**
 * Round stone tile used on the glowing bridge (22x14). The colored glow is added by CSS.
 */
export function buildBridgeTile(): ArtSpec {
  const canvas = new PixelCanvas(22, 14);
  canvas.rect(1, 3, 20, 8, "a").rect(1, 3, 20, 2, "b").rect(1, 9, 20, 2, "c");
  canvas.rect(5, 6, 12, 2, "M").rect(9, 5, 4, 4, "M");
  canvas.rect(2, 11, 18, 2, "w");
  canvas.outline("O");

  return { rows: canvas.toRows(), palette: BUILDING_PALETTE };
}

/**
 * Flower planter box for the front yard (32x18).
 */
export function buildFlowerbed(): ArtSpec {
  const rng = createRng(14);
  const canvas = new PixelCanvas(32, 20);
  canvas.rect(0, 11, 32, 8, "W").rect(0, 11, 32, 2, "L").rect(0, 17, 32, 2, "w");
  canvas.rect(0, 6, 32, 6, "j");
  for (let x = 1; x < 31; x += 2) {
    const height = 2 + Math.floor(rng() * 4);
    canvas.rect(x, 9 - height, 1, height + 2, "i");
    const color = ["p", "q", "z", "v"][Math.floor(rng() * 4)];
    canvas.set(x, 8 - height, color).set(x - 1, 8 - height, color).set(x, 7 - height, color);
  }
  canvas.outline("O");

  return {
    rows: canvas.toRows(),
    palette: { O: "#3a2a24", W: "#a06d3b", L: "#c68f55", w: "#6b4526", j: "#5cb85c", i: "#3f8f45", p: "#f7a6c0", q: "#ffffff", z: "#ffd75e", v: "#b9a0ee" },
  };
}

/**
 * Stone ring planter with a small tree (36x40).
 */
export function buildTreeBed(): ArtSpec {
  const rng = createRng(31);
  const canvas = new PixelCanvas(36, 40);
  canvas.ellipse(18, 32, 17, 6, "a").rect(1, 32, 34, 6, "a").ellipse(18, 37, 17, 3, "a");
  canvas.rect(1, 32, 34, 1, "b").rect(1, 36, 34, 2, "c");
  canvas.ellipse(18, 31, 14, 3.5, "e");
  canvas.rect(16, 18, 4, 14, "W").rect(18, 18, 2, 14, "w");
  for (const [cx, cy, rx, ry] of [
    [18, 10, 9, 8],
    [11, 16, 7, 6],
    [25, 16, 7, 6],
  ] as [number, number, number, number][]) {
    for (let y = cy - ry; y <= cy + ry; y += 1) {
      for (let x = cx - rx; x <= cx + rx; x += 1) {
        const dx = (x - cx) / (rx + 0.4);
        const dy = (y - cy) / (ry + 0.4);
        if (dx * dx + dy * dy <= 1) {
          const tilt = dx * 0.55 + dy * 0.85;
          canvas.set(x, y, tilt > 0.4 ? "d" : tilt < -0.4 && rng() < 0.7 ? "l" : "g");
        }
      }
    }
  }
  canvas.outline("O");

  return {
    rows: canvas.toRows(),
    palette: { O: "#2a3f24", a: "#dccfb2", b: "#efe4cb", c: "#bcae8c", e: "#5a3a20", W: "#9a6a3a", w: "#6b4526", d: "#3f8f45", g: "#5cb85c", l: "#8fdc6a" },
  };
}
