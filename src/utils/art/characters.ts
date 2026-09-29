import { PixelCanvas, type ArtSpec } from "@/utils/art/canvas";
import { COLOR, getHairColors } from "@/utils/art/palette";

const HEAD_ROWS = [
  "....KKKKKK....",
  "..KKhhhhhhKK..",
  ".KhhiihhhhhhK.",
  "KhhiihhhhhhhhK",
  "KhhhhhhhhhhhhK",
  "KhhhhhhhhhhhhK",
  "KhhSSSShhSSShK",
  "KhjSSSSSSSSSjK",
  "KjSSWESSWESSjK",
  ".KSSEESSEESSK.",
  ".KSPPSSSSPPSK.",
  "..KSSSmmSSSK..",
  "...KKSSSSKK...",
  ".....KKKK.....",
];

/**
 * Builds the palette for a face with the given hair color set.
 */
function facePalette(hairKey: string): Record<string, string> {
  const hair = getHairColors(hairKey);

  return {
    K: COLOR.ink,
    h: hair.base,
    j: hair.shade,
    i: hair.light,
    S: COLOR.skin,
    s: COLOR.skinShade,
    E: COLOR.eye,
    W: COLOR.white,
    P: COLOR.cheek,
    m: COLOR.mouth,
  };
}

/**
 * Head-only avatar (14x14) used in HUD, rankings, and comments.
 */
export function buildHeadArt(hairKey: string): ArtSpec {
  return { rows: HEAD_ROWS, palette: facePalette(hairKey) };
}

/**
 * Full-body chibi adventurer (18x27): teal cloak, gold clasp, brown boots, hair ribbon.
 */
export function buildHeroArt(hairKey = "silver"): ArtSpec {
  const canvas = new PixelCanvas(18, 27);
  canvas.stamp(2, 0, HEAD_ROWS);
  // 머리 리본
  canvas.stamp(11, 0, ["..KK.", ".KttK", "KttuK", ".KKK."]);
  canvas.stamp(0, 14, [
    "....KKTTTTTTKK....",
    "...KTTuuGGuuTTK...",
    "..KTTTuGGGGuTTTK..",
    "..KTTTTWWWWTTTTK..",
    ".KTTStTWWWWTtSTTK.",
    ".KTTKtTWWWWTtKTTK.",
    ".KTTTtTTWWTTtTTTK.",
    ".KTTTTtTTTTtTTTTK.",
    "..KKTTTTTTTTTTKK..",
    "....KrrKKKKrrK....",
    "....KBBK..KBBK....",
    "...KbbbK..KbbbK...",
    "...KKKKK..KKKKK...",
  ]);

  return {
    rows: canvas.toRows(),
    palette: {
      ...facePalette(hairKey),
      T: COLOR.teal,
      t: COLOR.tealDark,
      u: COLOR.tealLight,
      G: COLOR.gold,
      W: COLOR.cream,
      r: COLOR.brownDark,
      B: COLOR.brown,
      b: COLOR.brownDark,
    },
  };
}

/**
 * Black cat with yellow eyes, teal scarf and a tiny satchel (20x15).
 */
export function buildCatArt(): ArtSpec {
  const rows = [
    ".....................",
    "..KK..KK.............",
    ".KccKKccK............",
    ".KcccccccK...........",
    "KcccccccccK..........",
    "KcYYcccYYcK.......KK.",
    "KcYYcccYYcK......KccK",
    "KccccPPccccK....KcccK",
    ".KccmmKmmccK...KccK..",
    ".KKtttttttKKKKKccK...",
    "..KtTtttTKccccccK....",
    "..KKtttKKccccccK.....",
    "...KccccccccccK......",
    "...KcKKcKKcKKcK......",
    "...KKK.KKK.KKK.......",
  ];

  return {
    rows,
    palette: {
      K: "#1c1620",
      c: "#3b3550",
      Y: "#ffd84a",
      P: "#ff9fb0",
      m: "#7a5a6a",
      t: COLOR.teal,
      T: COLOR.tealLight,
    },
  };
}

/**
 * Snow owl teacher with round glasses and a navy robe (20x24).
 */
export function buildOwlArt(): ArtSpec {
  const canvas = new PixelCanvas(20, 24);
  canvas.stamp(0, 0, [
    "..KK..........KK....",
    ".KwwK........KwwK...",
    ".KwwwKKKKKKKKwwwK...",
    "KwwwwwwwwwwwwwwwwK..",
    "KwwGGGGwwwwGGGGwwK..",
    "KwGWWKWGwwGWWKWGwK..",
    "KwGWKKWGwwGWKKWGwK..",
    "KwwGGGGwOOwGGGGwwK..",
    ".KwwwwwwOOwwwwwwK...",
    "..KwwwwwwwwwwwwK....",
    "...KKKwwwwwwKKK.....",
  ]);
  canvas.stamp(0, 11, [
    "..KNNNNNNNNNNNNK....",
    ".KNNnNNNNNNNNnNNK...",
    "KNNNNNNwwwwNNNNNNK..",
    "KNNNNNwwwwwwNNNNNK..",
    "KNnNNNwwwwwwNNNnNK..",
    "KNNNNNNwwwwNNNNNNK..",
    ".KNNNNNNNNNNNNNNK...",
    ".KNNNNNNNNNNNNNK....",
    "..KKGGKKKKKKGGKK....",
    "...KOOK....KOOK.....",
    "....KK......KK......",
  ]);

  return {
    rows: canvas.toRows(),
    palette: {
      K: COLOR.ink,
      w: "#f7f5ee",
      G: "#c9a23a",
      W: COLOR.white,
      O: "#f0a13a",
      N: COLOR.navy,
      n: COLOR.blue,
    },
  };
}

/**
 * Small blue bird (9x8).
 */
export function buildBirdArt(): ArtSpec {
  return {
    rows: [
      "...KKK...",
      "..KbbbK..",
      ".KbbEbbKK",
      ".KbbbbbOO",
      "KbbwwbbK.",
      "KbbwwwbK.",
      ".KKbbbK..",
      "..O.O....",
    ],
    palette: { K: COLOR.ink, b: COLOR.blue, w: COLOR.blueLight, E: COLOR.eye, O: "#f0a13a" },
  };
}

/**
 * Small walking student in a navy uniform with a backpack (11x19).
 */
export function buildStudentArt(hairKey: string, bagColor: string): ArtSpec {
  const hair = getHairColors(hairKey);

  return {
    rows: [
      "...KKKKK...",
      "..KhhhhhK..",
      ".KhhhhhhhK.",
      ".KhSSSSShK.",
      ".KhSESESKK.",
      "..KSSSSSK..",
      "...KKSKK...",
      ".KKnnnnnKK.",
      "KbKnnwwnKbK",
      "KbKnnnnnKbK",
      "KbKSnnnSKbK",
      ".KKnnnnnKK.",
      "..KpppppK..",
      "..KppKppK..",
      "..KppKppK..",
      "..KwwKwwK..",
      "..KKK.KKK..",
    ],
    palette: {
      K: COLOR.ink,
      h: hair.base,
      S: COLOR.skin,
      E: COLOR.eye,
      n: COLOR.navy,
      w: COLOR.white,
      b: bagColor,
      p: COLOR.navyDark,
    },
  };
}

const artCache = new Map<string, ArtSpec>();

/**
 * Builds art once per key and reuses it, so avatars in long lists do not rebuild their grids on every render.
 */
function cached(key: string, build: () => ArtSpec): ArtSpec {
  const hit = artCache.get(key);
  if (hit) {
    return hit;
  }

  const art = build();
  artCache.set(key, art);

  return art;
}

export const STUDENT_BAG_COLORS = ["#c94a4a", "#4a8ac9", "#e0a13a", "#4aa86a", "#8a63d2"] as const;

export type CharacterName = "hero" | "cat" | "owl" | "bird";

/**
 * Returns the cached head-only avatar for a hair key.
 */
export function getHeadArt(hairKey: string | null | undefined): ArtSpec {
  const key = hairKey ?? "silver";

  return cached(`head:${key}`, () => buildHeadArt(key));
}

/**
 * Returns a cached named character sprite.
 */
export function getCharacterArt(name: CharacterName, hairKey = "silver"): ArtSpec {
  switch (name) {
    case "hero":
      return cached(`hero:${hairKey}`, () => buildHeroArt(hairKey));
    case "cat":
      return cached("cat", buildCatArt);
    case "owl":
      return cached("owl", buildOwlArt);
    default:
      return cached("bird", buildBirdArt);
  }
}

/**
 * Returns a cached walking-student sprite (hair color and bag color decide the variant).
 */
export function getStudentArt(hairKey: string, bagIndex: number): ArtSpec {
  const bag = STUDENT_BAG_COLORS[bagIndex % STUDENT_BAG_COLORS.length];

  return cached(`student:${hairKey}:${bag}`, () => buildStudentArt(hairKey, bag));
}
