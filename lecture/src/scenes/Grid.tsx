import React from "react";
import type { GridProps } from "../content/types.ts";
import { Reveal } from "../components/Reveal.tsx";
import { prog } from "../lib/anim.ts";
import { cueTime, useScene } from "../lib/clock.tsx";
import { C, FONT, toneColor } from "../theme.ts";

/**
 * 두 축 격자 장면(예: 지식의 유형 × 용도). 축 이름이 서고 칸이 하나씩 켜진다.
 * @param props 격자 장면 데이터
 * @returns 장면
 */
export function Grid({ v }: { v: GridProps }) {
  const ctx = useScene();
  const { t, panel } = ctx;
  const left = panel.x + 250;
  const top = panel.y + 170;
  const cw = (panel.w - 250 - 560) / v.xs.length;
  const ch = (panel.h - 170 - 140) / v.ys.length;
  const xAt = cueTime(ctx, v.xAt);
  const yAt = cueTime(ctx, v.yAt);
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <Reveal at={xAt} style={{ position: "absolute", left, top: panel.y + 44, width: cw * v.xs.length }}>
        <div style={{ fontFamily: FONT.kr, fontWeight: 800, fontSize: 32, color: C.blueSoft, textAlign: "center" }}>{v.xTitle} →</div>
      </Reveal>
      <Reveal at={yAt} style={{ position: "absolute", left: panel.x + 56, top: panel.y + 44, whiteSpace: "nowrap" }}>
        <div style={{ fontFamily: FONT.kr, fontWeight: 800, fontSize: 32, color: C.yellow, lineHeight: 1.2 }}>↓ {v.yTitle}</div>
      </Reveal>
      {v.xs.map((x, i) => (
        <Reveal key={x} at={xAt + i * 0.1} style={{ position: "absolute", left: left + i * cw, top: top - 60, width: cw, textAlign: "center" }}>
          <div style={{ fontFamily: FONT.kr, fontWeight: 800, fontSize: 34, color: C.ice }}>{x}</div>
        </Reveal>
      ))}
      {v.ys.map((y, j) => (
        <Reveal key={y} at={yAt + j * 0.1} style={{ position: "absolute", left: panel.x + 64, top: top + j * ch + ch / 2 - 24 }}>
          <div style={{ fontFamily: FONT.kr, fontWeight: 800, fontSize: 36, color: C.ice }}>{y}</div>
        </Reveal>
      ))}
      {v.xs.map((_, i) =>
        v.ys.map((__, j) => {
          const p = Math.min(prog(t, xAt, 0.6), prog(t, yAt + (i + j) * 0.04, 0.6));
          return (
            <div
              key={`${i}-${j}`}
              style={{
                position: "absolute",
                left: left + i * cw + 6,
                top: top + j * ch + 6,
                width: cw - 12,
                height: ch - 12,
                borderRadius: 12,
                border: `1.5px solid rgba(233,241,255,${0.16 * p})`,
                background: `rgba(233,241,255,${0.025 * p})`,
              }}
            />
          );
        }),
      )}
      {v.cells.map((c, k) => {
        const a = cueTime(ctx, c.at, k);
        const p = prog(t, a, 0.6);
        const col = toneColor(c.tone);
        const cx = left + c.x * cw;
        const cy = top + c.y * ch;
        return (
          <div key={k}>
            <div style={{ position: "absolute", left: cx + 6, top: cy + 6, width: cw - 12, height: ch - 12, borderRadius: 12, border: `3px solid ${col}`, opacity: p, background: `rgba(255,255,255,${0.06 * p})` }} />
            <Reveal at={a + 0.15} mode="rise" style={{ position: "absolute", left: left + v.xs.length * cw + 44, top: cy + 4, width: 480 }}>
              <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                <span style={{ width: 16, height: 16, borderRadius: 4, background: col, flex: "none" }} />
                <span style={{ fontFamily: FONT.kr, fontWeight: 800, fontSize: 34, color: C.ice, lineHeight: 1.25, wordBreak: "keep-all" }}>
                  {v.xs[c.x]} × {v.ys[c.y]}
                  <br />
                  <span style={{ color: C.iceDim, fontWeight: 500, fontSize: 28 }}>{c.t}</span>
                </span>
              </div>
            </Reveal>
          </div>
        );
      })}
      {v.foot ? (
        <Reveal at={cueTime(ctx, v.foot.at)} mode="rise" style={{ position: "absolute", left: panel.x + 80, top: panel.y + panel.h - 96 }}>
          <div style={{ fontFamily: FONT.kr, fontWeight: 700, fontSize: 32, color: toneColor(v.foot.tone) }}>{v.foot.t}</div>
        </Reveal>
      ) : null}
    </div>
  );
}
