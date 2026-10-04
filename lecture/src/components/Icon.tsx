import React from "react";
import type { IconName } from "../content/types.ts";

type Props = { name: IconName; size?: number; color?: string; stroke?: number; draw?: number };

/**
 * 선으로 그린 아이콘. draw(0~1)로 획이 그려지는 정도를 조절한다.
 * @param props 이름·크기·색·그리기 진행도
 * @returns SVG 아이콘
 */
export function Icon({ name, size = 120, color = "#E9F1FF", stroke = 3.2, draw = 1 }: Props) {
  const len = 600;
  const common = {
    fill: "none",
    stroke: color,
    strokeWidth: stroke,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeDasharray: len,
    strokeDashoffset: len * (1 - draw),
  };
  return (
    <svg width={size} height={size} viewBox="0 0 120 120">
      {PATHS[name].map((d, i) => (
        <path key={i} d={d} {...common} />
      ))}
    </svg>
  );
}

const PATHS: Record<IconName, string[]> = {
  recipe: [
    "M30 14 h46 l16 16 v76 h-62 z",
    "M76 14 v16 h16",
    "M42 48 h36 M42 62 h36 M42 76 h24",
    "M42 90 h14",
  ],
  chef: [
    "M34 62 c-14 -2 -16 -26 2 -28 c2 -14 22 -18 30 -6 c8 -12 30 -6 28 10 c14 4 10 26 -6 24",
    "M38 62 v30 h50 v-30",
    "M38 80 h50",
  ],
  fridge: ["M32 12 h56 v96 h-56 z", "M32 46 h56", "M42 24 v12 M42 58 v18"],
  pot: ["M20 52 h80", "M26 52 v34 c0 10 6 16 16 16 h36 c10 0 16 -6 16 -16 v-34", "M12 58 h14 M94 58 h14", "M48 40 c0 -8 6 -8 6 -16 M64 40 c0 -8 6 -8 6 -16"],
  bolt: ["M66 10 l-30 56 h26 l-8 44 l34 -60 h-26 z"],
  meter: ["M20 84 a40 40 0 0 1 80 0", "M60 84 l22 -30", "M60 84 m-5 0 a5 5 0 1 0 10 0 a5 5 0 1 0 -10 0", "M30 70 l6 3 M90 70 l-6 3 M60 48 v6"],
  gear: [
    "M60 38 a22 22 0 1 0 0.1 0",
    "M60 50 a10 10 0 1 0 0.1 0",
    "M60 14 v12 M60 94 v12 M14 60 h12 M94 60 h12 M27 27 l9 9 M84 84 l9 9 M27 93 l9 -9 M84 36 l9 -9",
  ],
  school: ["M14 52 l46 -28 l46 28", "M24 50 v50 h72 v-50", "M50 100 v-26 h20 v26", "M36 62 h8 M76 62 h8"],
  factory: ["M12 100 v-50 l24 14 v-14 l24 14 v-14 l24 14 v-36 h14 v72 z", "M30 84 h8 M50 84 h8 M70 84 h8"],
  person: ["M60 22 a14 14 0 1 0 0.1 0", "M32 104 c0 -22 12 -36 28 -36 s28 14 28 36"],
  book: ["M60 30 c-10 -8 -28 -10 -44 -6 v70 c16 -4 34 -2 44 6", "M60 30 c10 -8 28 -10 44 -6 v70 c-16 -4 -34 -2 -44 6", "M60 30 v70"],
  shield: ["M60 12 l38 14 v28 c0 26 -16 44 -38 54 c-22 -10 -38 -28 -38 -54 v-28 z", "M44 60 l12 12 l22 -24"],
  eye: ["M10 60 c14 -24 34 -36 50 -36 s36 12 50 36 c-14 24 -34 36 -50 36 s-36 -12 -50 -36 z", "M60 44 a16 16 0 1 0 0.1 0"],
  coin: ["M60 20 a40 40 0 1 0 0.1 0", "M60 34 v52 M48 44 c4 -6 22 -6 24 4 c2 12 -24 8 -24 20 c0 10 20 10 26 2"],
  flag: ["M30 108 v-96", "M30 16 h56 l-12 18 l12 18 h-56"],
  spark: ["M60 14 v24 M60 82 v24 M14 60 h24 M82 60 h24 M28 28 l16 16 M76 76 l16 16 M28 92 l16 -16 M76 44 l16 -16"],
};
