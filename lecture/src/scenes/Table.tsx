import React from "react";
import type { TableProps } from "../content/types.ts";
import { Reveal } from "../components/Reveal.tsx";
import { prog } from "../lib/anim.ts";
import { cueTime, useScene } from "../lib/clock.tsx";
import { C, FONT, toneColor } from "../theme.ts";

/**
 * 비교표 장면. 머리줄이 먼저 서고, 행이 말에 맞춰 한 줄씩 채워진다.
 * 묶음(groups)이 있으면 왼쪽에 묶음 띠가 생긴다.
 * @param props 표 장면 데이터
 * @returns 장면
 */
export function Table({ v }: { v: TableProps }) {
  const ctx = useScene();
  const { t, panel } = ctx;
  const hasAxis = v.rows.some((r) => r.axis);
  const hasGroups = !!v.groups?.length;
  const left = panel.x + 80;
  const width = panel.w - 160;
  const top = panel.y + (v.title ? 124 : 70);
  const footH = v.foot ? 84 : 20;
  const headH = 96;
  const avail = panel.y + panel.h - top - headH - footH - 28;
  const rowH = Math.min(v.rows.length <= 3 ? 150 : 124, avail / v.rows.length);
  const fs = Math.max(27, Math.min(42, rowH * 0.34));
  const groupW = hasGroups ? 190 : 0;
  const axisW = hasAxis ? Math.min(440, Math.max(170, longest(v.rows.map((r) => r.axis ?? "")) * fs * 0.95 + 40)) : 0;
  const colW = (width - groupW - axisW) / v.cols.length;
  const xCol = (i: number) => left + groupW + axisW + i * colW;

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {v.title ? (
        <Reveal at={ctx.ps.start + 0.4} style={{ position: "absolute", left, top: panel.y + 44 }}>
          <div style={{ fontFamily: FONT.kr, fontWeight: 800, fontSize: 44, color: C.ice, letterSpacing: "-0.035em" }}>{v.title}</div>
        </Reveal>
      ) : null}

      {v.cols.map((c, i) => {
        const a = cueTime(ctx, c.at, i);
        return (
          <Reveal key={i} at={a} mode="rise" style={{ position: "absolute", left: xCol(i) + 10, top, width: colW - 20 }}>
            <div style={{ borderBottom: `4px solid ${toneColor(c.tone)}`, paddingBottom: 12, height: headH - 20, boxSizing: "border-box", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
              <div style={{ fontFamily: FONT.kr, fontWeight: 800, fontSize: 38, color: toneColor(c.tone), letterSpacing: "-0.03em", wordBreak: "keep-all" }}>{c.t}</div>
              {c.sub ? <div style={{ fontFamily: FONT.kr, fontWeight: 500, fontSize: 24, color: C.iceDim, marginTop: 2, wordBreak: "keep-all" }}>{c.sub}</div> : null}
            </div>
          </Reveal>
        );
      })}

      {v.rows.map((r, i) => {
        const a = cueTime(ctx, r.at, i);
        const y = top + headH + i * rowH;
        const lit = prog(t, a, 0.5);
        const hot = r.tone === "yellow" ? 1 : 0;
        return (
          <div key={i}>
            <div
              style={{
                position: "absolute",
                left: left + groupW,
                top: y + 4,
                width: width - groupW,
                height: rowH - 8,
                borderRadius: 14,
                background: hot ? `rgba(255,200,61,${0.10 * lit})` : `rgba(233,241,255,${0.035 * lit})`,
                borderBottom: `1px solid rgba(233,241,255,${0.1 * lit})`,
              }}
            />
            {hasAxis ? (
              <Reveal at={a} style={{ position: "absolute", left: left + groupW + 22, top: y, height: rowH, display: "flex", alignItems: "center", width: axisW - 30 }}>
                <div style={{ fontFamily: FONT.kr, fontWeight: 700, fontSize: fs * 0.92, color: C.iceDim, letterSpacing: "-0.02em", lineHeight: 1.15 }}>{r.axis}</div>
              </Reveal>
            ) : null}
            {r.cells.map((cell, j) =>
              cell ? (
                <Reveal key={j} at={a + j * 0.08} style={{ position: "absolute", left: xCol(j) + 10, top: y, width: colW - 24, height: rowH, display: "flex", alignItems: "center" }}>
                  <div
                    style={{
                      fontFamily: FONT.kr,
                      fontWeight: 600,
                      fontSize: fs,
                      lineHeight: 1.2,
                      color: hot && j === r.cells.length - 1 ? C.yellow : C.ice,
                      letterSpacing: "-0.025em",
                      wordBreak: "keep-all",
                    }}
                  >
                    {cell}
                  </div>
                </Reveal>
              ) : null,
            )}
          </div>
        );
      })}

      {hasGroups
        ? v.groups!.map((g, gi) => {
            const idx = v.rows.map((r, i) => (r.group === gi ? i : -1)).filter((i) => i >= 0);
            if (!idx.length) return null;
            const y0 = top + headH + idx[0] * rowH + 6;
            const h = idx.length * rowH - 12;
            const a = cueTime(ctx, g.at, gi);
            const p = prog(t, a, 0.6);
            return (
              <div key={gi}>
                <div style={{ position: "absolute", left: left + 6, top: y0, width: 5, height: h * p, borderRadius: 3, background: toneColor(g.tone) }} />
                <Reveal at={a} style={{ position: "absolute", left: left + 26, top: y0, width: groupW - 36, height: h, display: "flex", alignItems: "center" }}>
                  <div style={{ fontFamily: FONT.kr, fontWeight: 800, fontSize: 30, color: toneColor(g.tone), letterSpacing: "-0.03em", lineHeight: 1.15, wordBreak: "keep-all" }}>{g.t}</div>
                </Reveal>
              </div>
            );
          })
        : null}

      {v.foot ? (
        <Reveal at={cueTime(ctx, v.foot.at)} mode="rise" style={{ position: "absolute", left, top: panel.y + panel.h - footH - 24, width }}>
          <div style={{ fontFamily: FONT.kr, fontWeight: 700, fontSize: 32, color: toneColor(v.foot.tone), letterSpacing: "-0.025em" }}>{v.foot.t}</div>
        </Reveal>
      ) : null}
    </div>
  );
}

function longest(xs: string[]): number {
  return xs.reduce((m, s) => Math.max(m, [...s].length), 0);
}
