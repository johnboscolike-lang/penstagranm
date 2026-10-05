import React from "react";
import type { ListProps } from "../content/types.ts";
import { Reveal } from "../components/Reveal.tsx";
import { prog } from "../lib/anim.ts";
import { cueTime, useScene } from "../lib/clock.tsx";
import { C, FONT, toneColor } from "../theme.ts";

/**
 * 목록 장면. steps는 단계 흐름, cards는 카드 격자, stack은 꼬리표+설명 줄.
 * @param props 목록 장면 데이터
 * @returns 장면
 */
export function List({ v }: { v: ListProps }) {
  const ctx = useScene();
  const { panel } = ctx;
  const left = panel.x + 80;
  const width = panel.w - 160;
  const top = panel.y + (v.title ? 140 : 80);
  const bottom = panel.y + panel.h - (v.foot ? 120 : 50);
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {v.title ? (
        <Reveal at={ctx.ps.start + 0.4} style={{ position: "absolute", left, top: panel.y + 56 }}>
          <div style={{ fontFamily: FONT.kr, fontWeight: 800, fontSize: 44, color: C.ice, letterSpacing: "-0.035em" }}>{v.title}</div>
        </Reveal>
      ) : null}
      {v.layout === "cards" ? <Cards v={v} left={left} width={width} top={top} bottom={bottom} /> : null}
      {v.layout === "stack" ? <Stack v={v} left={left} width={width} top={top} bottom={bottom} /> : null}
      {v.layout === "steps" ? <Steps v={v} left={left} width={width} top={top} bottom={bottom} /> : null}
      {v.foot ? (
        <Reveal at={cueTime(ctx, v.foot.at)} mode="rise" style={{ position: "absolute", left, top: panel.y + panel.h - 104, width }}>
          <div style={{ fontFamily: FONT.kr, fontWeight: 700, fontSize: 32, color: toneColor(v.foot.tone), letterSpacing: "-0.025em" }}>{v.foot.t}</div>
        </Reveal>
      ) : null}
    </div>
  );
}

type L = { v: ListProps; left: number; width: number; top: number; bottom: number };

function Cards({ v, left, width, top, bottom }: L) {
  const ctx = useScene();
  const n = v.items.length;
  const perRow = n <= 5 ? n : Math.ceil(n / 2);
  const rows = Math.ceil(n / perRow);
  const gap = 22;
  const w = (width - gap * (perRow - 1)) / perRow;
  const h = Math.min(rows === 1 ? 380 : 300, (bottom - top - gap * (rows - 1)) / rows);
  const bigTag = v.items.every((it) => (it.tag ?? "").length <= 4);
  return (
    <>
      {v.items.map((it, i) => {
        const r = Math.floor(i / perRow);
        const c = i % perRow;
        return (
          <Reveal key={i} at={cueTime(ctx, it.at, i)} mode="rise" style={{ position: "absolute", left: left + c * (w + gap), top: top + r * (h + gap) }}>
            <div
              style={{
                width: w,
                height: h,
                boxSizing: "border-box",
                borderRadius: 22,
                background: "rgba(6,12,32,0.45)",
                border: `1.5px solid ${it.tone === "yellow" ? "rgba(255,200,61,0.6)" : "rgba(233,241,255,0.16)"}`,
                padding: "28px 28px",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  fontFamily: bigTag && /^[0-9]+$/.test(it.tag ?? "") ? FONT.num : FONT.kr,
                  fontWeight: 800,
                  fontSize: bigTag ? 72 : 44,
                  lineHeight: 1,
                  color: toneColor(it.tone),
                  letterSpacing: "-0.04em",
                }}
              >
                {it.tag}
              </div>
              <div style={{ fontFamily: FONT.kr, fontWeight: 700, fontSize: 36, color: C.ice, marginTop: 20, letterSpacing: "-0.03em", wordBreak: "keep-all", lineHeight: 1.2 }}>{it.t}</div>
              {it.sub ? <div style={{ fontFamily: FONT.kr, fontWeight: 500, fontSize: 28, color: C.iceDim, marginTop: 12, wordBreak: "keep-all", lineHeight: 1.25 }}>{it.sub}</div> : null}
            </div>
          </Reveal>
        );
      })}
    </>
  );
}

function Stack({ v, left, width, top, bottom }: L) {
  const ctx = useScene();
  const n = v.items.length;
  const rowH = Math.min(136, (bottom - top) / n);
  const tagW = Math.min(300, Math.max(...v.items.map((it) => [...(it.tag ?? "")].length)) * 34 + 56);
  return (
    <>
      {v.items.map((it, i) => {
        const a = cueTime(ctx, it.at, i);
        const p = prog(ctx.t, a, 0.5);
        return (
          <div key={i}>
            <div style={{ position: "absolute", left, top: top + i * rowH + rowH - 2, width: width * p, height: 1, background: "rgba(233,241,255,0.12)" }} />
            <Reveal at={a} style={{ position: "absolute", left, top: top + i * rowH, height: rowH, display: "flex", alignItems: "center" }}>
              <div
                style={{
                  minWidth: tagW - 30,
                  padding: "8px 18px",
                  borderRadius: 12,
                  background: it.tone === "yellow" ? C.yellow : it.tone === "red" ? "rgba(255,90,106,0.18)" : "rgba(61,64,254,0.28)",
                  color: it.tone === "yellow" ? C.ink : it.tone === "red" ? C.red : C.ice,
                  fontFamily: FONT.kr,
                  fontWeight: 800,
                  fontSize: 30,
                  textAlign: "center",
                  letterSpacing: "-0.03em",
                }}
              >
                {it.tag}
              </div>
            </Reveal>
            <Reveal at={a + 0.08} style={{ position: "absolute", left: left + tagW + 10, top: top + i * rowH, height: rowH, width: width - tagW - 10, display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <div style={{ fontFamily: FONT.kr, fontWeight: 700, fontSize: Math.min(36, rowH * 0.32), color: C.ice, letterSpacing: "-0.025em", wordBreak: "keep-all", lineHeight: 1.2 }}>{it.t}</div>
              {it.sub ? (
                <div style={{ fontFamily: FONT.kr, fontWeight: 500, fontSize: Math.min(27, rowH * 0.24), color: C.iceDim, marginTop: 6, wordBreak: "keep-all", lineHeight: 1.25 }}>{it.sub}</div>
              ) : null}
            </Reveal>
          </div>
        );
      })}
    </>
  );
}

function Steps({ v, left, width, top, bottom }: L) {
  const ctx = useScene();
  const n = v.items.length;
  const rowH = Math.min(140, (bottom - top) / n);
  const dotX = left + 26;
  let lastLit = -1;
  v.items.forEach((it, i) => {
    if (ctx.t >= cueTime(ctx, it.at, i)) lastLit = i;
  });
  const lineP = lastLit < 0 ? 0 : lastLit / Math.max(1, n - 1);
  return (
    <>
      <div style={{ position: "absolute", left: dotX - 1.5, top: top + rowH / 2, width: 3, height: (n - 1) * rowH, background: "rgba(233,241,255,0.12)" }} />
      <div style={{ position: "absolute", left: dotX - 1.5, top: top + rowH / 2, width: 3, height: (n - 1) * rowH * lineP, background: C.blueSoft }} />
      {v.items.map((it, i) => {
        const a = cueTime(ctx, it.at, i);
        const p = prog(ctx.t, a, 0.45);
        const col = toneColor(it.tone);
        return (
          <div key={i}>
            <div
              style={{
                position: "absolute",
                left: dotX - 13,
                top: top + i * rowH + rowH / 2 - 13,
                width: 26,
                height: 26,
                borderRadius: 13,
                background: p > 0 ? (it.tone === "yellow" ? C.yellow : C.blueSoft) : C.navy,
                border: `2px solid ${p > 0 ? "transparent" : "rgba(233,241,255,0.3)"}`,
                scale: String(0.6 + 0.4 * p),
              }}
            />
            <Reveal at={a} style={{ position: "absolute", left: left + 76, top: top + i * rowH + (rowH - Math.min(rowH, 96)) / 2, width: width - 76 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 28, minHeight: Math.min(rowH, 96) }}>
                {it.tag ? (
                  <div style={{ minWidth: 200, fontFamily: FONT.kr, fontWeight: 800, fontSize: 38, color: col, letterSpacing: "-0.03em" }}>{it.tag}</div>
                ) : null}
                <div>
                  <div style={{ fontFamily: FONT.kr, fontWeight: 700, fontSize: Math.min(40, rowH * 0.32), color: C.ice, letterSpacing: "-0.025em", wordBreak: "keep-all", lineHeight: 1.2 }}>{it.t}</div>
                  {it.sub ? <div style={{ fontFamily: FONT.kr, fontWeight: 500, fontSize: 27, color: C.iceDim, marginTop: 4, wordBreak: "keep-all" }}>{it.sub}</div> : null}
                </div>
              </div>
            </Reveal>
          </div>
        );
      })}
    </>
  );
}
