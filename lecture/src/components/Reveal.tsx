import React from "react";
import { easeOut, prog } from "../lib/anim.ts";
import { useScene } from "../lib/clock.tsx";

type Props = {
  /** 등장 시각(초, 절대) */
  at: number;
  children: React.ReactNode;
  /** 마스크 안에서 올라오기(기본) 또는 제자리 등장 */
  mode?: "mask" | "rise" | "pop";
  dur?: number;
  style?: React.CSSProperties;
  inline?: boolean;
};

/**
 * 줄 단위 마스크 리빌. 등장 전에는 보이지 않고, 장면이 닫힐 때는 위로 빠져나간다.
 * @param props 등장 시각과 내용
 * @returns 리빌 래퍼
 */
export function Reveal({ at, children, mode = "mask", dur = 0.62, style, inline }: Props) {
  const { t, exitAt } = useScene();
  const pIn = prog(t, at, dur, easeOut);
  const pOut = prog(t, exitAt, 0.38);
  if (pIn <= 0) {
    return <div style={{ ...style, display: inline ? "inline-block" : style?.display, visibility: "hidden" }}>{children}</div>;
  }
  if (mode === "mask") {
    return (
      <div style={{ overflow: "hidden", display: inline ? "inline-block" : style?.display ?? "block", verticalAlign: "bottom", ...style }}>
        <div style={{ translate: `0 ${(1 - pIn) * 105 - pOut * 105}%`, opacity: 1 - pOut * 0.6 }}>{children}</div>
      </div>
    );
  }
  const y = mode === "rise" ? (1 - pIn) * 26 : 0;
  const s = mode === "pop" ? 0.94 + 0.06 * pIn : 1;
  return (
    <div
      style={{
        display: inline ? "inline-block" : style?.display,
        ...style,
        opacity: pIn * (1 - pOut),
        translate: `0 ${y - pOut * 22}px`,
        scale: String(s),
      }}
    >
      {children}
    </div>
  );
}
