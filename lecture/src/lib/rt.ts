/**
 * 화면 계산에 필요한 최소 런타임: 보간과 베지어 이징, 에셋 경로.
 * 플레이어는 음성의 재생 시각 t 하나로 모든 화면을 계산한다(타이머·프레임 간 상태 없음).
 */

export type EasingFn = (x: number) => number;

/**
 * CSS cubic-bezier 와 같은 곡선을 만든다.
 * @param x1 첫 제어점 x
 * @param y1 첫 제어점 y
 * @param x2 둘째 제어점 x
 * @param y2 둘째 제어점 y
 * @returns 0~1 입력을 받는 이징 함수
 */
export function bezier(x1: number, y1: number, x2: number, y2: number): EasingFn {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const sx = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sy = (t: number) => ((ay * t + by) * t + cy) * t;
  const dx = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) {
      const err = sx(t) - x;
      const d = dx(t);
      if (Math.abs(err) < 1e-6 || Math.abs(d) < 1e-6) break;
      t -= err / d;
    }
    t = Math.min(1, Math.max(0, t));
    return sy(t);
  };
}

/**
 * 구간 [a,b]의 t를 [0,1]로 바꿔 이징한 뒤 [y0,y1]로 보간한다(양끝 고정).
 * @param t 입력
 * @param input 입력 구간
 * @param output 출력 구간
 * @param easing 이징
 * @returns 보간값
 */
export function interpolate(t: number, input: [number, number], output: [number, number], easing: EasingFn = (x) => x): number {
  const [a, b] = input;
  const p = b === a ? (t >= b ? 1 : 0) : Math.min(1, Math.max(0, (t - a) / (b - a)));
  return output[0] + (output[1] - output[0]) * easing(p);
}

/** 빌드된 플레이어 기준 에셋 경로. */
export function asset(path: string): string {
  return `assets/${path}`;
}
