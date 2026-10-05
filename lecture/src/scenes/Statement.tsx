import React from "react";
import type { StatementProps } from "../content/types.ts";
import { Reveal } from "../components/Reveal.tsx";
import { cueTime, useScene } from "../lib/clock.tsx";
import { C, FONT, toneColor } from "../theme.ts";

const SIZE = { xl: 76, l: 58, m: 40 } as const;

/**
 * 큰 문장 장면. 줄마다 마스크로 올라오고, 메모는 오른쪽 아래에 쌓인다.
 * @param props 문장 장면 데이터
 * @returns 장면
 */
export function Statement({ v }: { v: StatementProps }) {
  const ctx = useScene();
  const { panel } = ctx;
  const hasNotes = !!v.notes?.length;
  return (
    <div
      style={{
        position: "absolute",
        left: panel.x + 96,
        top: panel.y,
        width: panel.w - 192,
        height: panel.h,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: 18,
      }}
    >
      {v.kicker ? (
        <Reveal at={cueTime(ctx, undefined, 0)}>
          <div style={{ fontFamily: FONT.mono, fontSize: 24, color: C.yellow, letterSpacing: "0.06em", marginBottom: 10 }}>{v.kicker}</div>
        </Reveal>
      ) : null}
      {v.lines.map((ln, i) => (
        <Reveal key={i} at={cueTime(ctx, ln.at, i)}>
          <div
            style={{
              fontFamily: FONT.kr,
              fontWeight: ln.size === "m" ? 600 : 800,
              fontSize: SIZE[ln.size ?? "l"] * (hasNotes ? 0.92 : 1),
              lineHeight: 1.16,
              letterSpacing: "-0.035em",
              color: toneColor(ln.tone),
              wordBreak: "keep-all",
            }}
          >
            {ln.t}
          </div>
        </Reveal>
      ))}
      {hasNotes ? (
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 26 }}>
          {v.notes!.map((n, i) => (
            <Reveal key={i} at={cueTime(ctx, n.at, i)} mode="rise">
              <div
                style={{
                  padding: "10px 20px",
                  borderRadius: 999,
                  border: `1.5px solid ${toneColor(n.tone)}`,
                  color: toneColor(n.tone),
                  fontFamily: FONT.kr,
                  fontWeight: 600,
                  fontSize: 28,
                  letterSpacing: "-0.02em",
                }}
              >
                {n.t}
              </div>
            </Reveal>
          ))}
        </div>
      ) : null}
    </div>
  );
}
