/**
 * 홍보 영상의 박자표. 음악 합성 스크립트, 영상 타임라인, 테스트가 같은 값을 쓴다.
 */

export const BPM = 120;
export const BEATS_PER_BAR = 4;
export const TOTAL_BARS = 20;
export const BEAT_SECONDS = 60 / BPM;
export const BAR_SECONDS = BEAT_SECONDS * BEATS_PER_BAR;
export const DURATION_SECONDS = TOTAL_BARS * BAR_SECONDS;

/** 마디별 코드 (A 마이너 기반). 인덱스가 마디 번호다. */
export const CHORD_BY_BAR = [
  "Am", "F",
  "Am", "F", "C", "G",
  "Am", "F", "C", "G",
  "Am", "F", "G",
  "Am", "F", "C", "G",
  "F", "G", "Am",
];

/** 장면 구간. 시작 마디와 길이(마디)를 담는다. */
export const SECTIONS = [
  { name: "intro", startBar: 0, bars: 2 },
  { name: "hook", startBar: 2, bars: 2 },
  { name: "assign", startBar: 4, bars: 4 },
  { name: "proof", startBar: 8, bars: 4 },
  { name: "review", startBar: 12, bars: 4 },
  { name: "spaces", startBar: 16, bars: 2 },
  { name: "cta", startBar: 18, bars: 2 },
];

/**
 * 마디 번호와 박 번호를 초 단위 시각으로 바꾼다.
 * @param {number} bar 0부터 시작하는 마디 번호
 * @param {number} [beat] 마디 안의 박 (소수 가능, 0~4)
 * @returns {number} 초
 */
export function beatTime(bar, beat = 0) {
  return bar * BAR_SECONDS + beat * BEAT_SECONDS;
}
