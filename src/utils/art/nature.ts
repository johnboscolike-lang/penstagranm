import { createRng, PixelCanvas, type ArtSpec } from "@/utils/art/canvas";
import { COLOR } from "@/utils/art/palette";

type Rng = () => number;

const FOLIAGE_PALETTE = {
  o: "#1f4a2c",
  d: "#3f8f45",
  g: "#5cb85c",
  l: "#8fdc6a",
  m: "#c4f28a",
  t: "#9a6a3a",
  u: "#6b4526",
  p: "#f7a6c0",
  q: "#ffe3ee",
  w: "#ffffff",
  y: "#ffd75e",
  v: "#b9a0ee",
  s: "#3f8f45",
} as const;

/**
 * Paints one lit foliage blob: light on the upper left, dark on the lower right, with leafy speckles.
 */
function paintBlob(canvas: PixelCanvas, cx: number, cy: number, rx: number, ry: number, rng: Rng): void {
  for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y += 1) {
    for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x += 1) {
      const dx = (x - cx) / (rx + 0.4);
      const dy = (y - cy) / (ry + 0.4);
      if (dx * dx + dy * dy > 1) {
        continue;
      }

      const tilt = dx * 0.55 + dy * 0.85;
      let symbol = "g";
      if (tilt > 0.42) {
        symbol = rng() < 0.85 ? "d" : "g";
      } else if (tilt < -0.45) {
        symbol = rng() < 0.7 ? "l" : "g";
        if (tilt < -0.75 && rng() < 0.35) {
          symbol = "m";
        }
      } else if (rng() < 0.06) {
        symbol = rng() < 0.5 ? "d" : "l";
      }
      canvas.set(x, y, symbol);
    }
  }
}

/**
 * Scatters small flower dots over foliage cells.
 */
function scatterFlowers(canvas: PixelCanvas, rng: Rng, chance: number, colors: string[]): void {
  canvas.repaint("glmd", () => (rng() < chance ? colors[Math.floor(rng() * colors.length)] : null));
}

/**
 * Round leafy tree (56x64). The "blossom" variant is dotted with pink petals.
 */
export function buildTree(variant: "green" | "blossom", seed: number): ArtSpec {
  const canvas = new PixelCanvas(56, 64);
  const rng = createRng(seed);

  // 줄기
  canvas.rect(24, 40, 8, 22, "t").rect(29, 40, 3, 22, "u").rect(22, 58, 12, 4, "t").rect(30, 58, 4, 4, "u");
  canvas.rect(20, 61, 4, 2, "u").rect(32, 61, 4, 2, "u");
  canvas.line(27, 44, 18, 36, "u").line(29, 44, 38, 35, "u");

  const blobs: [number, number, number, number][] = [
    [28, 14, 14, 11],
    [15, 22, 13, 11],
    [41, 22, 13, 11],
    [28, 26, 18, 13],
    [11, 33, 10, 8],
    [45, 33, 10, 8],
    [27, 36, 17, 9],
  ];
  blobs.forEach(([cx, cy, rx, ry]) => paintBlob(canvas, cx, cy, rx, ry, rng));

  if (variant === "blossom") {
    scatterFlowers(canvas, rng, 0.11, ["p", "q", "p", "w"]);
  } else {
    scatterFlowers(canvas, rng, 0.035, ["y", "w"]);
  }

  canvas.outline("o");

  return { rows: canvas.toRows(), palette: FOLIAGE_PALETTE };
}

/**
 * Low flowering bush (44x22).
 */
export function buildBush(seed: number, flowerColors: string[] = ["p", "w", "y", "v"]): ArtSpec {
  const canvas = new PixelCanvas(44, 22);
  const rng = createRng(seed);

  paintBlob(canvas, 10, 13, 9, 7, rng);
  paintBlob(canvas, 33, 13, 9, 7, rng);
  paintBlob(canvas, 22, 10, 12, 8, rng);
  paintBlob(canvas, 22, 16, 20, 5, rng);
  scatterFlowers(canvas, rng, 0.1, flowerColors);
  canvas.outline("o");

  return { rows: canvas.toRows(), palette: FOLIAGE_PALETTE };
}

/**
 * Row of little grass tufts and flowers for the ground edge (48x10).
 */
export function buildFlowerStrip(seed: number, colors: string[] = ["p", "w", "y", "v"]): ArtSpec {
  const canvas = new PixelCanvas(48, 10);
  const rng = createRng(seed);

  for (let x = 1; x < 47; x += 3 + Math.floor(rng() * 3)) {
    const height = 3 + Math.floor(rng() * 4);
    const top = 9 - height;
    canvas.rect(x, top + 1, 1, height, "d");
    canvas.set(x - 1, top + 2, "g").set(x + 1, top + 3, "g");
    if (rng() < 0.75) {
      const color = colors[Math.floor(rng() * colors.length)];
      canvas.set(x, top, color).set(x - 1, top, color).set(x + 1, top, color).set(x, top - 1, color).set(x, top + 1, "y");
    }
  }
  canvas.rect(0, 9, 48, 1, "d");

  return { rows: canvas.toRows(), palette: FOLIAGE_PALETTE };
}

/**
 * Hanging ivy strand (10 wide) used along walls and the HUD edges.
 */
export function buildIvy(height: number, seed: number): ArtSpec {
  const canvas = new PixelCanvas(10, height);
  const rng = createRng(seed);

  let x = 4;
  for (let y = 0; y < height; y += 1) {
    if (rng() < 0.3) {
      x = Math.max(2, Math.min(7, x + (rng() < 0.5 ? -1 : 1)));
    }
    canvas.set(x, y, "d");
    if (y % 3 === 1) {
      const side = rng() < 0.5 ? -1 : 1;
      canvas.set(x + side, y, "g").set(x + side * 2, y, "l").set(x + side, y + 1, "g").set(x + side * 2, y + 1, "d");
    }
  }
  canvas.outline("o");

  return { rows: canvas.toRows(), palette: FOLIAGE_PALETTE };
}

/**
 * Two layers of rolling hills (320x36). The curves repeat every 320 columns so the strip tiles seamlessly.
 */
export function buildHills(): ArtSpec {
  const canvas = new PixelCanvas(320, 36);

  for (let x = 0; x < 320; x += 1) {
    const far = Math.round(20 + 6 * Math.sin((2 * Math.PI * x * 5) / 320) + 3 * Math.sin((2 * Math.PI * x * 14) / 320 + 1));
    canvas.rect(x, 36 - far, 1, far, "a");
    const near = Math.round(11 + 5 * Math.sin((2 * Math.PI * x * 6) / 320 + 2) + 2 * Math.sin((2 * Math.PI * x * 21) / 320));
    canvas.rect(x, 36 - near, 1, near, "b");
  }

  return { rows: canvas.toRows(), palette: { a: "#bfe0c9", b: "#9bd48f" } };
}

/**
 * Soft cloud (40x14).
 */
export function buildCloud(seed: number): ArtSpec {
  const canvas = new PixelCanvas(40, 14);
  const rng = createRng(seed);

  canvas.ellipse(10, 9, 8, 4, "w").ellipse(21, 6, 9, 5, "w").ellipse(31, 9, 8, 4, "w").rect(6, 9, 28, 4, "w");
  canvas.repaint("w", (x, y) => (y >= 11 || (y >= 10 && rng() < 0.4) ? "s" : null));

  return { rows: canvas.toRows(), palette: { w: "#ffffff", s: "#dcebf7" } };
}

/**
 * Pale far-away castle silhouette for the sky backdrop (150x62).
 */
export function buildCastle(): ArtSpec {
  const canvas = new PixelCanvas(150, 62);

  /**
   * Draws a tower with a cone roof and a small flag.
   */
  function tower(x: number, top: number, width: number, bodyHeight: number, roofHeight: number): void {
    const bodyTop = top + roofHeight;
    canvas.rect(x, bodyTop, width, bodyHeight, "b");
    canvas.rect(x + width - 3, bodyTop, 3, bodyHeight, "s");
    for (let row = 0; row < roofHeight; row += 1) {
      const inset = Math.floor(((roofHeight - row) * (width / 2)) / roofHeight);
      canvas.rect(x - 2 + inset, top + row, width + 4 - inset * 2, 1, "r");
    }
    canvas.rect(x + Math.floor(width / 2), top - 5, 1, 6, "s").rect(x + Math.floor(width / 2) + 1, top - 5, 4, 2, "f");
    canvas.rect(x + Math.floor(width / 2) - 1, bodyTop + 6, 2, 4, "w");
  }

  canvas.rect(28, 40, 94, 22, "b").rect(28, 40, 94, 3, "s");
  for (let x = 28; x < 122; x += 6) {
    canvas.rect(x, 37, 3, 3, "b");
  }
  tower(64, 6, 22, 40, 20);
  tower(34, 22, 14, 30, 14);
  tower(112, 22, 14, 30, 14);
  tower(8, 36, 12, 26, 10);
  tower(130, 36, 12, 26, 10);
  canvas.rect(72, 46, 6, 16, "w").rect(60, 50, 3, 5, "w").rect(92, 50, 3, 5, "w");

  return {
    rows: canvas.toRows(),
    palette: { b: "#cfd9f2", s: "#b3c0e2", r: "#8fa8dd", w: "#8497c9", f: "#f7a6c0" },
  };
}

export const SKY_STOPS = [COLOR.blueLight, "#e6f5fb", "#fdf4dc"] as const;

/**
 * Seamless cobblestone paving tile (32x32) for plazas and paths.
 */
export function buildFloorTile(): ArtSpec {
  const canvas = new PixelCanvas(32, 32);
  const rng = createRng(77);
  const rowHeight = 8;

  canvas.rect(0, 0, 32, 32, "M");
  for (let row = 0; row < 4; row += 1) {
    const y = row * rowHeight;
    const offset = (row % 2) * 8;
    for (let x = -offset; x < 32; x += 16) {
      const roll = rng();
      const tone = roll < 0.4 ? "a" : roll < 0.7 ? "b" : "c";
      for (let py = y + 1; py < y + rowHeight; py += 1) {
        for (let px = x + 1; px < x + 16; px += 1) {
          const wrapped = ((px % 32) + 32) % 32;
          canvas.set(wrapped, py, py === y + 1 ? "h" : tone);
        }
      }
    }
  }

  return { rows: canvas.toRows(), palette: { M: "#b9ab8a", a: "#e4d8bc", b: "#eee3c9", c: "#d6c8a8", h: "#f8f0dc" } };
}

/**
 * Seamless water tile (32x16) with light ripples. CSS scrolls it sideways.
 */
export function buildWaterTile(): ArtSpec {
  const canvas = new PixelCanvas(32, 16);
  canvas.rect(0, 0, 32, 16, "a");
  canvas.rect(0, 8, 32, 8, "b");
  for (const [x, y, w] of [
    [2, 3, 6],
    [16, 1, 8],
    [24, 6, 5],
    [8, 11, 7],
    [22, 13, 8],
    [0, 8, 4],
  ] as [number, number, number][]) {
    canvas.rect(x, y, w, 1, "w");
  }

  return { rows: canvas.toRows(), palette: { a: "#6cc4e8", b: "#4fb0dc", w: "#c9f0ff" } };
}

/**
 * Seamless waterfall strip (16x40). CSS scrolls it downward.
 */
export function buildWaterfallTile(): ArtSpec {
  const canvas = new PixelCanvas(16, 40);
  const rng = createRng(19);

  canvas.rect(0, 0, 16, 40, "a");
  for (let x = 0; x < 16; x += 1) {
    const streakHeight = 6 + Math.floor(rng() * 14);
    const start = Math.floor(rng() * 40);
    for (let y = start; y < start + streakHeight; y += 1) {
      canvas.set(x, y % 40, x % 3 === 0 ? "w" : "b");
    }
  }

  return { rows: canvas.toRows(), palette: { a: "#78cdee", b: "#b6e8fa", w: "#ffffff" } };
}
