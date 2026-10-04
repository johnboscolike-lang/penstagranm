import React from "react";
import type { Plan } from "../timeline.ts";
import { C, FONT } from "../theme.ts";

type Props = { plan: Plan; t: number; lessonLabel: string; visible: number };

/**
 * 좌상단 현재 위치, 우상단 워드마크, 하단 진행선.
 * @param props 시간표와 현재 시각
 * @returns HUD
 */
export function Hud({ plan, t, lessonLabel, visible }: Props) {
  if (visible <= 0) return null;
  const ch = plan.chapters.find((c) => t >= c.start && t < c.end) ?? plan.chapters[plan.chapters.length - 1];
  const progress = Math.min(1, t / plan.total);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: visible }}>
      <div
        style={{
          position: "absolute",
          left: 72,
          top: 44,
          display: "flex",
          alignItems: "center",
          gap: 16,
          fontFamily: FONT.kr,
          fontSize: 24,
          color: C.iceDim,
          letterSpacing: "-0.01em",
        }}
      >
        <span style={{ fontFamily: FONT.mono, fontSize: 19, color: C.ice, letterSpacing: "0.04em" }}>{lessonLabel}</span>
        <span style={{ color: C.iceFaint }}>›</span>
        <span style={{ fontFamily: FONT.mono, fontSize: 19, color: C.yellow }}>{String(ch.chapter.no).padStart(2, "0")}</span>
        <span style={{ fontWeight: 600, color: C.ice }}>{ch.chapter.title}</span>
      </div>
      <div
        style={{
          position: "absolute",
          right: 72,
          top: 40,
          fontFamily: FONT.kr,
          fontWeight: 800,
          fontSize: 28,
          color: C.ice,
          letterSpacing: "-0.04em",
        }}
      >
        공업교육론<span style={{ color: C.yellow }}>.</span>
      </div>
      <div style={{ position: "absolute", left: 72, right: 72, bottom: 26, height: 3, background: "rgba(233,241,255,0.10)", borderRadius: 2 }}>
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${progress * 100}%`, background: C.ice, borderRadius: 2, opacity: 0.75 }} />
        {plan.chapters.slice(1).map((c) => (
          <div
            key={c.chapter.id}
            style={{ position: "absolute", left: `${(c.start / plan.total) * 100}%`, top: -4, width: 2, height: 11, background: "rgba(233,241,255,0.35)" }}
          />
        ))}
      </div>
    </div>
  );
}
