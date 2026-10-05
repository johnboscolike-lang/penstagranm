import type { Tone } from "./content/types.ts";

/** 영상 규격. */
export const VIDEO = { width: 1920, height: 1080, fps: 30 } as const;

/** 팔레트. 한 장면에 강조색은 하나만 쓴다. */
export const C = {
  navy: "#0A1430",
  navyDeep: "#060C20",
  ink: "#0B1530",
  ice: "#E9F1FF",
  iceDim: "rgba(233,241,255,0.56)",
  iceFaint: "rgba(233,241,255,0.16)",
  line: "rgba(157,181,255,0.22)",
  blue: "#3D40FE",
  blueSoft: "#7C82FF",
  yellow: "#FFC83D",
  green: "#2BD576",
  red: "#FF5A6A",
  paper: "#F3F1EA",
  paperInk: "#141B33",
} as const;

/**
 * 톤 이름을 실제 색으로 바꾼다.
 * @param t 톤
 * @returns CSS 색
 */
export function toneColor(t: Tone | undefined): string {
  switch (t) {
    case "blue":
      return C.blueSoft;
    case "yellow":
      return C.yellow;
    case "green":
      return C.green;
    case "red":
      return C.red;
    case "dim":
      return C.iceDim;
    default:
      return C.ice;
  }
}

export const FONT = {
  kr: "Pretendard, Geist, sans-serif",
  num: "Geist, Pretendard, sans-serif",
  mono: "'Geist Mono', Pretendard, monospace",
} as const;

/** 모든 모프·카메라 이동에 쓰는 곡선과 길이. */
export const MORPH = { bezier: [0.45, 0, 0.15, 1] as const, seconds: 0.8 };

/** 장면 사이 간격(초). 앞쪽은 화면이 먼저 열리는 시간, 뒤쪽은 말이 끝난 뒤 여운. */
export const GAP = { lead: 0.55, tail: 0.4 };
