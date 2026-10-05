import { bezier, interpolate } from "./rt.ts";
import { MORPH } from "../theme.ts";

/** cubic-bezier(.45,0,.15,1) */
export const ease = bezier(...MORPH.bezier);

/** 텍스트가 올라올 때 쓰는 감속 곡선. 바운스 없음. */
export const easeOut = bezier(0.16, 1, 0.3, 1);

/**
 * t0에서 시작해 dur 동안 0→1로 진행하는 값.
 * @param t 현재 시각(초)
 * @param t0 시작 시각(초)
 * @param dur 길이(초)
 * @param fn 이징
 * @returns 0~1
 */
export function prog(t: number, t0: number, dur = MORPH.seconds, fn = ease): number {
  if (!Number.isFinite(t0)) return t0 < 0 ? 1 : 0;
  if (dur <= 0) return t >= t0 ? 1 : 0;
  return interpolate(t, [t0, t0 + dur], [0, 1], fn);
}

/**
 * 두 값 사이 선형 보간.
 * @param a 시작
 * @param b 끝
 * @param p 0~1
 * @returns 보간값
 */
export function mix(a: number, b: number, p: number): number {
  return a + (b - a) * p;
}

export type Rect = { x: number; y: number; w: number; h: number; r: number };

/**
 * 사각형 보간.
 * @param a 시작 사각형
 * @param b 끝 사각형
 * @param p 0~1
 * @returns 보간 사각형
 */
export function mixRect(a: Rect, b: Rect, p: number): Rect {
  return { x: mix(a.x, b.x, p), y: mix(a.y, b.y, p), w: mix(a.w, b.w, p), h: mix(a.h, b.h, p), r: mix(a.r, b.r, p) };
}

/**
 * #RRGGBB 두 색을 보간한다.
 * @param a 시작 색
 * @param b 끝 색
 * @param p 0~1
 * @returns rgb() 문자열
 */
export function mixColor(a: string, b: string, p: number): string {
  const pa = hex(a);
  const pb = hex(b);
  const c = pa.map((v, i) => Math.round(mix(v, pb[i], p)));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

function hex(s: string): number[] {
  const h = s.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}

/**
 * 원 아이리스 반지름. 반지름이 아니라 면적으로 이징해 시작 프레임이 튀지 않게 한다.
 * @param r0 시작 반지름
 * @param r1 끝 반지름
 * @param p 0~1 (이징 적용 전)
 * @returns 반지름
 */
export function irisRadius(r0: number, r1: number, p: number): number {
  const e = ease(Math.max(0, Math.min(1, p)));
  return Math.sqrt(mix(r0 * r0, r1 * r1, e));
}
