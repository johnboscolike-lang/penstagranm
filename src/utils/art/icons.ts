import { PixelCanvas, type ArtSpec } from "@/utils/art/canvas";

const INK = "#0d2b2a";

/**
 * Builds a round coin (12x12) with a small sprout mark.
 */
function coin(): ArtSpec {
  const canvas = new PixelCanvas(12, 12);
  canvas.ellipse(5.5, 5.5, 5.4, 5.4, "Y").ellipse(5.5, 5.5, 3.6, 3.6, "y");
  canvas.rect(5, 3, 2, 6, "Y").rect(3, 5, 2, 1, "Y").rect(7, 4, 2, 1, "Y");
  canvas.rect(2, 2, 2, 1, "W").rect(1, 3, 1, 2, "W");
  canvas.outline("K");

  return { rows: canvas.toRows(), palette: { K: "#7a4f12", Y: "#ffd84a", y: "#e6a91f", W: "#fff6c4" } };
}

/**
 * Builds a small green experience gem (12x12).
 */
function gem(): ArtSpec {
  return {
    rows: [
      "...KKKKKK...",
      "..KWWggggK..",
      ".KWggggggGK.",
      "KWggGGGGgGGK",
      "KggGGGGGGGGK",
      ".KgGGGGGGGK.",
      "..KGGGGGGK..",
      "...KGGGGK...",
      "....KGGK....",
      ".....KK.....",
    ],
    palette: { K: "#0f4a3a", W: "#d8ffe9", g: "#5be3a8", G: "#22b57e" },
  };
}

/**
 * Builds a medal (14x18): ribbon tails above a round golden disc with a sparkle.
 */
function medal(): ArtSpec {
  const canvas = new PixelCanvas(14, 18);
  canvas.line(2, 0, 6, 6, "b").line(3, 0, 7, 6, "b").line(4, 0, 8, 6, "b");
  canvas.line(11, 0, 7, 6, "b").line(10, 0, 6, 6, "b").line(9, 0, 5, 6, "b");
  canvas.ellipse(6.5, 12, 5.5, 5.5, "M").ellipse(6.5, 12, 4, 4, "m").ellipse(6.5, 12, 3.2, 3.2, "M");
  canvas.rect(6, 9, 1, 7, "l").rect(4, 12, 5, 1, "l").set(6, 12, "W");
  canvas.rect(2, 9, 2, 1, "l").set(1, 10, "l");
  canvas.outline("K");

  return { rows: canvas.toRows(), palette: { K: "#5a3a12", b: "#e0605a", M: "#ffd84a", l: "#fff6c4", m: "#e6a91f", W: "#ffffff" } };
}

/**
 * Builds a diagonal pencil (14x14) for the "record today" button.
 */
function pencil(): ArtSpec {
  const canvas = new PixelCanvas(14, 14);
  for (let i = 0; i < 9; i += 1) {
    canvas.set(4 + i, 9 - i, "Y").set(3 + i, 9 - i, "Y").set(5 + i, 9 - i, "y").set(4 + i, 10 - i, "y");
  }
  canvas.rect(11, 1, 2, 2, "R").rect(10, 2, 2, 2, "R").set(9, 3, "G").set(10, 4, "G").set(8, 4, "G").set(9, 5, "G");
  canvas.set(2, 10, "T").set(1, 11, "T").set(2, 11, "T").set(3, 10, "T").set(2, 12, "K").set(1, 12, "K");
  canvas.outline("K");

  return { rows: canvas.toRows(), palette: { K: "#0d2b2a", Y: "#ffd84a", y: "#e6a91f", R: "#ff8fa8", G: "#c9c9d6", T: "#f0d2a0" } };
}

/**
 * Builds a curved leafy sprig (14x18) that frames panel titles on both sides.
 */
function laurel(): ArtSpec {
  const canvas = new PixelCanvas(14, 18);
  const stem: [number, number][] = [
    [3, 17],
    [3, 15],
    [3, 13],
    [4, 11],
    [4, 9],
    [5, 7],
    [6, 5],
    [8, 3],
    [10, 2],
  ];
  stem.forEach(([x, y]) => canvas.set(x, y, "G"));
  [
    [3, 15, -1],
    [3, 12, 1],
    [4, 10, -1],
    [5, 7, 1],
    [6, 5, -1],
    [8, 3, 1],
  ].forEach(([x, y, side]) => {
    const dx = side < 0 ? -3 : 1;
    canvas.rect(x + dx, y - 1, 3, 2, "g").set(x + dx + (side < 0 ? 0 : 2), y + 1, "G");
    canvas.set(x + dx + (side < 0 ? 1 : 1), y - 2, "g");
  });
  canvas.rect(11, 1, 2, 2, "g").set(12, 0, "g").set(13, 1, "G");
  canvas.outline("K");

  return { rows: canvas.toRows(), palette: { K: "#1f4a2c", g: "#6cc04a", G: "#3f8f45" } };
}

export const ICON_SPECS: Readonly<Record<string, ArtSpec>> = {
  school: {
    rows: [
      "........K.........",
      "........KRRRK.....",
      "........K.........",
      ".......KKKK.......",
      "....KKKWWWWKKK....",
      "...KWWWWKKWWWWK...",
      "..KKKKKKKKKKKKKK..",
      "..KWKKWKKKKWKKWK..",
      "..KWKKWKWWKWKKWK..",
      "..KWKKWKWWKWKKWK..",
      "..KWKKWKWWKWKKWK..",
      "..KWWWWKWWKWWWWK..",
      ".KWWWWWWWWWWWWWWK.",
      ".KKKKKKKKKKKKKKKK.",
    ],
    palette: { K: INK, W: "#fff3d6", R: "#ff8a7a" },
  },
  challenge: {
    rows: [
      ".....KKKKKK.....",
      "....KWWWWWWK....",
      "..KKKKKKKKKKKK..",
      "..KWWWWWWWWWWK..",
      "..KWWWWWWWWGGK..",
      "..KWWWWWWWGGWK..",
      "..KWGGWWWGGWWK..",
      "..KWWGGWGGWWWK..",
      "..KWWWGGGWWWWK..",
      "..KWWWWGWWWWWK..",
      "..KWppppppppWK..",
      "..KWWWWWWWWWWK..",
      "..KWppppppWWWK..",
      "..KWWWWWWWWWWK..",
      "..KKKKKKKKKKKK..",
    ],
    palette: { K: INK, W: "#fff3d6", G: "#1f9e8a", p: "#c9b98e" },
  },
  room: {
    rows: [
      ".....KK..KK.....",
      "....KGGKKGGK....",
      "....KGGGGGGK....",
      ".....KKGGKK.....",
      "......KGGK......",
      "......KGGK......",
      "..KKKKKGGKKKKK..",
      ".KWWWWWWWWWWWWK.",
      ".KWWWWWWWWWWWWK.",
      ".KKBBBBBBBBBBKK.",
      "..KBBBBBBBBBBK..",
      "..KBBBBBBBBBBK..",
      "..KBBBBBBBBBBK..",
      "...KKKKKKKKKK...",
    ],
    palette: { K: INK, W: "#fff3d6", G: "#7be08a", B: "#c98d55" },
  },
  coin: coin(),
  gem: gem(),
  check: {
    rows: ["........KK", ".......KWK", ".KK...KWK.", "KWWK.KWK..", ".KWWKWK...", "..KWWK....", "...KK....."],
    palette: { K: "#0f6a5a", W: "#ffffff" },
  },
  chevron: {
    rows: ["KK....", "KKK...", ".KKK..", "..KKK.", "...KKK", "..KKK.", ".KKK..", "KKK...", "KK...."],
    palette: { K: "#137565" },
  },
  chevronLight: {
    rows: ["KK....", "KKK...", ".KKK..", "..KKK.", "...KKK", "..KKK.", ".KKK..", "KKK...", "KK...."],
    palette: { K: "#ffffff" },
  },
  gear: {
    rows: [
      ".....KK.....",
      "..KK.KK.KK..",
      ".KWWKKKKWWK.",
      "..KWWWWWWK..",
      ".KWWKKKKWWK.",
      "KKWWKWWKWWKK",
      "KKWWKWWKWWKK",
      ".KWWKKKKWWK.",
      "..KWWWWWWK..",
      ".KWWKKKKWWK.",
      "..KK.KK.KK..",
      ".....KK.....",
    ],
    palette: { K: INK, W: "#e9dcbc" },
  },
  book: {
    rows: [
      "..KKKKK..KKKKK..",
      ".KWWWWWKKWWWWWK.",
      ".KWggggKKWggggK.",
      ".KWWWWWKKWWWWWK.",
      ".KWggggKKWggggK.",
      ".KWWWWWKKWWWWWK.",
      ".KWggWWKKWWggWK.",
      ".KWWWWWKKWWWWWK.",
      "KKKKKKKKKKKKKKKK",
      "KbbbbbbbbbbbbbbK",
      ".KKKKKKKKKKKKKK.",
    ],
    palette: { K: INK, W: "#fff3d6", g: "#37b39a", b: "#137565" },
  },
  gift: {
    rows: [
      "....KK..KK....",
      "...KrrKKrrK...",
      "...KrKKKKrK...",
      ".KKKKKRRKKKKK.",
      ".KbbbbRRbbbbK.",
      ".KbbbbRRbbbbK.",
      ".KKKKKRRKKKKK.",
      ".KbbbbRRbbbbK.",
      ".KbbbbRRbbbbK.",
      ".KbbbbRRbbbbK.",
      ".KbbbbRRbbbbK.",
      ".KKKKKKKKKKKK.",
    ],
    palette: { K: "#12406b", r: "#ffd84a", R: "#ffd84a", b: "#4a9cf0" },
  },
  icecream: {
    rows: [
      "...KKKKKK...",
      "..KppWppwK..",
      ".KpWppppppK.",
      ".KpppwppppK.",
      "..KKKKKKKK..",
      ".KpppppWppK.",
      ".KpwppppppK.",
      "..KKKKKKKK..",
      "..KcCcCcCK..",
      "...KCcCcK...",
      "....KcCK....",
      ".....KcK....",
      "......K.....",
    ],
    palette: { K: "#7a4a30", p: "#ffb6d0", w: "#ffffff", W: "#fff0f6", c: "#e0a35a", C: "#f2c47a" },
  },
  star: {
    rows: ["....KK....", "...KYYK...", "KKKKYYKKKK", "KYYYYYYYYK", ".KYYWYYYK.", "..KYYYYK..", "..KYYKYYK.", ".KYYK.KYYK", ".KKK...KKK"],
    palette: { K: "#8a5a12", Y: "#ffd84a", W: "#fff6c4" },
  },
  sprout: {
    rows: ["...KK..KK..", "..KggKKggK.", ".KgGGgGGgK.", ".KgGGKGGgK.", "..KKKKKKK..", "....KsK....", "....KsK....", "....KsK....", "..KKKsKKK..", ".KbbbbbbbK."],
    palette: { K: "#1f4a2c", g: "#8fdc6a", G: "#3fae5a", s: "#3fae5a", b: "#a06d3b" },
  },
  wave: {
    rows: [
      ".....KK.....",
      "....KbbK....",
      "....KbbK....",
      "...KbwbbK...",
      "...KbwbbK...",
      "..KbwbbbbK..",
      "..KbbbbbBK..",
      "..KbbbbBBK..",
      "...KBBBBK...",
      "....KKKK....",
    ],
    palette: { K: "#1f4a7a", w: "#d8f0ff", b: "#4aa0e8", B: "#2f78c4" },
  },
  mail: {
    rows: ["KKKKKKKKKKKK", "KWKKWWWWKKWK", "KWWWKKKKWWWK", "KWWWWWWWWWWK", "KWWWWppWWWWK", "KWWWpppppWWK", "KWWWWWWWWWWK", "KKKKKKKKKKKK"],
    palette: { K: "#7a4f2a", W: "#fff6e2", p: "#ff7a90" },
  },
  feather: pencil(),
  calendar: {
    rows: [
      "..K......K..",
      "KKKKKKKKKKKK",
      "KRRRRRRRRRRK",
      "KWWWWWWWWWWK",
      "KWbWbWbWbWWK",
      "KWWWWWWWWWWK",
      "KWbWbWbWbWWK",
      "KWWWWWWWWWWK",
      "KWbWbWbWWWWK",
      "KKKKKKKKKKKK",
    ],
    palette: { K: "#0d2b2a", R: "#ff7a7a", W: "#fff6e2", b: "#4a9cb0" },
  },
  medal: medal(),
  laurel: laurel(),
  bell: {
    rows: ["....KK....", "...KYYK...", "..KYYYYK..", "..KYWYYK..", ".KYWYYYYK.", ".KYYYYYYK.", "KYYYYYYYYK", "KKKKKKKKKK", "....KK...."],
    palette: { K: "#7a4f12", Y: "#ffd84a", W: "#fff6c4" },
  },
  lock: {
    rows: ["..KKKK..", ".KggggK.", ".Kg..gK.", "KKKKKKKK", "KYYYYYYK", "KYYKKYYK", "KYYYKYYK", "KKKKKKKK"],
    palette: { K: "#5a4a2a", g: "#c9c9d6", Y: "#e6c15a" },
  },
  heart: {
    rows: ["..KK..KK..", ".KrrKKrrK.", "KrWrrrrrrK", "KrrrrrrrrK", ".KrrrrrrK.", "..KrrrrK..", "...KrrK...", "....KK...."],
    palette: { K: "#7a2a3a", r: "#ff6f8f", W: "#ffd0dc" },
  },
  triangle: {
    rows: ["KK........", "KbK.......", "KbbK......", "KbwbK.....", "KbbbbK....", "KbwwbbK...", "KbbbbbbK..", "KbwwwwwbK.", "KKKKKKKKKK"],
    palette: { K: "#12406b", b: "#7db4ea", w: "#e6f4ff" },
  },
  abc: {
    rows: [
      ".KK.KKK..KK.",
      "K..KK..K.K..",
      "KKKKKKK..K..",
      "K..KK..K.K..",
      "K..KKKKK..KK",
    ],
    palette: { K: "#137565" },
  },
  play: {
    rows: ["KKKKKKKKKKKK", "KbbbbbbbbbbK", "KbbKKbbbbbbK", "KbbKWKbbbbbK", "KbbKWWKbbbbK", "KbbKWKbbbbbK", "KbbKKbbbbbbK", "KbbbbbbbbbbK", "KKKKKKKKKKKK"],
    palette: { K: "#3a2a24", b: "#ff8a5a", W: "#fff6e2" },
  },
  bowl: {
    rows: [
      "...KKKKKKKK...",
      "..KWWWWWWWWK..",
      ".KWWwWWWWwWWK.",
      "KKKKKKKKKKKKKK",
      ".KRRRRRRRRRRK.",
      ".KRRRRRRRRRRK.",
      "..KRRRRRRRRK..",
      "...KRRRRRRK...",
      "....KKKKKK....",
    ],
    palette: { K: INK, W: "#ffffff", w: "#ffe9c2", R: "#ff8a6a" },
  },
  megaphone: {
    rows: [
      ".........KK...",
      "........KRRK..",
      "..KKKK.KRRRRK.",
      ".KYYYYKRRRRRRK",
      "KYYYYYKRRRRRRK",
      "KYYYYYKRRRRRRK",
      ".KYYYYKRRRRRRK",
      "..KKKKK.KRRRK.",
      "....KYK..KKK..",
      "....KYK.......",
      "....KK........",
    ],
    palette: { K: INK, Y: "#ffd84a", R: "#ff8a6a" },
  },
  sparkle: {
    rows: ["...K...", "...K...", "..KWK..", "KKWWWKK", "..KWK..", "...K...", "...K..."],
    palette: { K: "#ffd84a", W: "#ffffff" },
  },
};

/**
 * Looks up an icon by name and fails loudly on typos during development.
 */
export function getIconSpec(name: string): ArtSpec {
  const spec = ICON_SPECS[name];
  if (!spec) {
    throw new Error(`알 수 없는 아이콘: ${name}`);
  }

  return spec;
}

export const MEDAL_PALETTES: Readonly<Record<number, Record<string, string>>> = {
  1: { K: "#5a3a12", b: "#e0605a", M: "#ffd84a", l: "#fff6c4", m: "#e6a91f" },
  2: { K: "#3a4256", b: "#5a9fe0", M: "#d5dbe6", l: "#ffffff", m: "#9aa5bd" },
  3: { K: "#4a2a12", b: "#5aa86a", M: "#e09a5a", l: "#ffd0a0", m: "#b0672f" },
};
