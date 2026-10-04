import React from "react";
import type { RecapProps } from "../content/types.ts";
import { Reveal } from "../components/Reveal.tsx";
import { prog } from "../lib/anim.ts";
import { cueTime, useScene } from "../lib/clock.tsx";
import { C, FONT, toneColor } from "../theme.ts";

/**
 * 종합 장면: 가운데 질문에서 가지가 뻗고, 가지마다 잎(핵심어)이 붙는다.
 * @param props 종합 장면 데이터
 * @returns 장면
 */
export function Recap({ v }: { v: RecapProps }) {
  const ctx = useScene();
  const { t, panel } = ctx;
  const rootX = panel.x + 90;
  const rootW = 300;
  const n = v.branches.length;
  const top = panel.y + 70;
  const bottom = panel.y + panel.h - (v.foot ? 130 : 60);
  const rowH = (bottom - top) / n;
  const rootY = top + (bottom - top) / 2;
  const bx = rootX + rootW + 120;
  const rootAt = cueTime(ctx, v.rootAt, 0);
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0 }}>
        {v.branches.map((b, i) => {
          const y = top + rowH * i + rowH / 2;
          const p = prog(t, cueTime(ctx, b.at, i), 0.7);
          const d = `M ${rootX + rootW} ${rootY} C ${rootX + rootW + 70} ${rootY}, ${bx - 70} ${y}, ${bx} ${y}`;
          return <path key={i} d={d} fill="none" stroke={C.blueSoft} strokeWidth={2.5} strokeDasharray={400} strokeDashoffset={400 * (1 - p)} opacity={0.75} />;
        })}
      </svg>
      <Reveal at={rootAt} mode="pop" style={{ position: "absolute", left: rootX, top: rootY - 70, width: rootW }}>
        <div
          style={{
            height: 140,
            borderRadius: 30,
            background: C.yellow,
            color: C.ink,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: FONT.kr,
            fontWeight: 800,
            fontSize: 40,
            letterSpacing: "-0.035em",
            textAlign: "center",
          }}
        >
          {v.root}
        </div>
      </Reveal>
      {v.branches.map((b, i) => {
        const y = top + rowH * i;
        const a = cueTime(ctx, b.at, i);
        return (
          <div key={i} style={{ position: "absolute", left: bx + 24, top: y, height: rowH, width: panel.x + panel.w - bx - 90, display: "flex", alignItems: "center", gap: 22 }}>
            <Reveal at={a}>
              <div style={{ minWidth: 220, fontFamily: FONT.kr, fontWeight: 800, fontSize: 34, color: C.ice, letterSpacing: "-0.03em" }}>{b.t}</div>
            </Reveal>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {b.leaves.map((leaf, j) => (
                <Reveal key={j} at={a + 0.18 + j * 0.14} mode="rise">
                  <div
                    style={{
                      padding: "8px 16px",
                      borderRadius: 10,
                      background: "rgba(61,64,254,0.2)",
                      border: "1.5px solid rgba(124,130,255,0.5)",
                      fontFamily: FONT.kr,
                      fontWeight: 600,
                      fontSize: Math.min(26, rowH * 0.2),
                      color: C.ice,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {leaf}
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        );
      })}
      {v.foot ? (
        <Reveal at={cueTime(ctx, v.foot.at)} mode="rise" style={{ position: "absolute", left: panel.x + 90, top: panel.y + panel.h - 104 }}>
          <div style={{ fontFamily: FONT.kr, fontWeight: 700, fontSize: 32, color: toneColor(v.foot.tone) }}>{v.foot.t}</div>
        </Reveal>
      ) : null}
    </div>
  );
}
