import React from "react";
import type { ChunksProps } from "../content/types.ts";
import { Reveal } from "../components/Reveal.tsx";
import { easeOut, prog } from "../lib/anim.ts";
import { cueTime, useScene } from "../lib/clock.tsx";
import { C, FONT, toneColor } from "../theme.ts";

/**
 * 정의 문장을 덩어리로 분해하는 장면. 말에 맞춰 덩어리마다 색 밑줄이 그어지고, 아래 카드가 생긴다.
 * @param props 정의 장면 데이터
 * @returns 장면
 */
export function Chunks({ v }: { v: ChunksProps }) {
  const ctx = useScene();
  const { t, panel } = ctx;
  const chunkAt = Object.fromEntries(v.chunks.map((c) => [c.k, cueTime(ctx, c.at)]));
  const chunkTone = Object.fromEntries(v.chunks.map((c) => [c.k, c.tone]));
  const sentenceAt = ctx.ps.start + 0.45;
  const cardW = (panel.w - 192 - (v.chunks.length - 1) * 20) / v.chunks.length;
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <Reveal at={sentenceAt} mode="rise" style={{ position: "absolute", left: panel.x + 96, top: panel.y + 72, width: panel.w - 192 }}>
        <div style={{ fontFamily: FONT.kr, fontWeight: 700, fontSize: 46, lineHeight: 1.55, color: C.ice, letterSpacing: "-0.03em", wordBreak: "keep-all" }}>
          {v.parts.map((p, i) => {
            if (!p.k) return <span key={i} style={{ color: C.iceDim }}>{p.t}</span>;
            const pu = prog(t, chunkAt[p.k], 0.55, easeOut);
            const col = toneColor(chunkTone[p.k]);
            return (
              <span
                key={i}
                style={{
                  color: pu > 0 ? C.ice : C.iceDim,
                  backgroundImage: `linear-gradient(${col}, ${col})`,
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "0 92%",
                  backgroundSize: `${pu * 100}% 5px`,
                  paddingBottom: 4,
                }}
              >
                {p.t}
              </span>
            );
          })}
        </div>
      </Reveal>
      <div style={{ position: "absolute", left: panel.x + 96, top: panel.y + panel.h - (v.traps?.length ? 380 : 270), display: "flex", gap: 20 }}>
        {v.chunks.map((c, i) => (
          <Reveal key={c.k} at={chunkAt[c.k]} mode="rise">
            <div
              style={{
                width: cardW,
                height: 168,
                boxSizing: "border-box",
                borderRadius: 20,
                borderTop: `5px solid ${toneColor(c.tone)}`,
                background: "rgba(6,12,32,0.45)",
                padding: "22px 24px",
              }}
            >
              <div style={{ fontFamily: FONT.mono, fontSize: 19, color: toneColor(c.tone), letterSpacing: "0.04em" }}>{String(i + 1).padStart(2, "0")}</div>
              <div style={{ fontFamily: FONT.kr, fontWeight: 800, fontSize: 34, color: C.ice, marginTop: 6, letterSpacing: "-0.03em" }}>{c.label}</div>
              {c.sub ? <div style={{ fontFamily: FONT.kr, fontWeight: 500, fontSize: 25, color: C.iceDim, marginTop: 6, wordBreak: "keep-all" }}>{c.sub}</div> : null}
            </div>
          </Reveal>
        ))}
      </div>
      {v.traps?.length ? (
        <div style={{ position: "absolute", left: panel.x + 96, top: panel.y + panel.h - 176, display: "flex", flexDirection: "column", gap: 12 }}>
          {v.traps.map((tr, i) => (
            <Reveal key={i} at={cueTime(ctx, tr.at)} mode="rise">
              <div style={{ fontFamily: FONT.kr, fontWeight: 600, fontSize: 30, color: C.ice, display: "flex", gap: 14, alignItems: "center" }}>
                <span style={{ color: C.red, fontFamily: FONT.num, fontWeight: 700 }}>!</span>
                {tr.t}
              </div>
            </Reveal>
          ))}
        </div>
      ) : null}
    </div>
  );
}
