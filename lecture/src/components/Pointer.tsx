import React from "react";

/**
 * macOS 기본 화살표 포인터 모양. 강사의 시선을 대신한다.
 * @param props 위치와 눌림 정도
 * @returns 포인터
 */
export function Pointer({ x, y, press = 0, opacity = 1 }: { x: number; y: number; press?: number; opacity?: number }) {
  const s = 1 - 0.12 * press;
  return (
    <svg
      width={40}
      height={56}
      viewBox="0 0 20 28"
      style={{ position: "absolute", left: x - 3, top: y - 2, scale: String(s), transformOrigin: "3px 2px", opacity, filter: "drop-shadow(0 3px 5px rgba(0,0,0,0.35))" }}
    >
      <path d="M1.5 1.5 L1.5 22.5 L6.6 17.6 L10 25.8 L13.6 24.3 L10.2 16.3 L17.2 16.3 Z" fill="#111" stroke="#fff" strokeWidth={1.6} strokeLinejoin="round" />
    </svg>
  );
}
