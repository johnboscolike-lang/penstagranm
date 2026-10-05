import React from "react";
import type { TimelineProps } from "../content/types.ts";
import { Reveal } from "../components/Reveal.tsx";
import { mix, prog } from "../lib/anim.ts";
import { cueTime, useScene } from "../lib/clock.tsx";
import { C, FONT, toneColor } from "../theme.ts";

const SPACING = 560;

/**
 * 연표 장면. 말하는 사건이 화면 가운데로 미끄러져 오고, 지나온 사건은 흐려진다.
 * 같은 연표를 여러 장면이 이어 쓸 때 앞 장면의 마지막 위치에서 출발한다.
 * @param props 연표 장면 데이터
 * @returns 장면
 */
export function Timeline({ v }: { v: TimelineProps }) {
  const ctx = useScene();
  const { t, panel } = ctx;
  const times = v.events.map((e) => cueTime(ctx, e.at));
  const firstHere = times.findIndex((x) => Number.isFinite(x));
  const initial = Math.max(0, firstHere - 1);
  let focus = initial;
  for (let i = 0; i < times.length; i++) {
    if (Number.isFinite(times[i]) && t >= times[i] - 0.4) {
      focus = mix(focus, i, prog(t, times[i] - 0.4, 0.8));
    }
  }
  const lineY = panel.y + 230;
  const offset = 960 - (160 + focus * SPACING);
  let active = initial;
  times.forEach((x, i) => {
    if (Number.isFinite(x) && t >= x) active = i;
  });
  const exit = prog(t, ctx.exitAt, 0.38);
  const enter = ctx.prevKind === "timeline" ? 1 : prog(t, ctx.ps.start + 0.4, 0.6);
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", opacity: enter * (1 - exit), translate: `0 ${(1 - enter) * 20}px` }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: lineY, height: 2, background: "rgba(233,241,255,0.18)" }} />
      <div style={{ position: "absolute", left: offset - 400, top: 0, width: 160 + v.events.length * SPACING + 800, height: 1080 }}>
        {v.events.map((e, i) => {
          const x = 400 + 160 + i * SPACING;
          const here = Number.isFinite(times[i]);
          const lit = here ? prog(t, times[i], 0.5) : 0;
          const state = i === active ? 1 : i < active ? 0.62 : 0.3;
          const col = i === active && here ? toneColor(e.tone ?? "yellow") : C.ice;
          return (
            <div key={i} style={{ position: "absolute", left: x, top: 0, opacity: Math.max(state, lit * (i === active ? 1 : 0)) }}>
              <div style={{ position: "absolute", left: -11, top: lineY - 11, width: 22, height: 22, borderRadius: 11, background: col, boxShadow: i === active ? `0 0 0 8px rgba(255,200,61,0.16)` : undefined }} />
              <div style={{ position: "absolute", left: -2, top: lineY - 128, fontFamily: FONT.num, fontWeight: 700, fontSize: 64, color: col, letterSpacing: "-0.04em", whiteSpace: "nowrap" }}>
                {e.year}
              </div>
              <div style={{ position: "absolute", left: -2, top: lineY + 34, width: SPACING - 70 }}>
                <div style={{ fontFamily: FONT.kr, fontWeight: 800, fontSize: 42, color: C.ice, letterSpacing: "-0.035em", whiteSpace: "nowrap" }}>{e.t}</div>
                {e.sub ? <div style={{ fontFamily: FONT.kr, fontWeight: 500, fontSize: 27, color: C.iceDim, marginTop: 8, wordBreak: "keep-all", lineHeight: 1.3 }}>{e.sub}</div> : null}
              </div>
            </div>
          );
        })}
      </div>
      {v.notes?.length ? (
        <div style={{ position: "absolute", left: 120, right: 120, top: panel.y + panel.h - 132, display: "flex", gap: 16, flexWrap: "wrap" }}>
          {v.notes.map((n, i) => (
            <Reveal key={i} at={cueTime(ctx, n.at, i)} mode="rise">
              <div
                style={{
                  padding: "12px 22px",
                  borderRadius: 14,
                  background: n.tone === "yellow" ? "rgba(255,200,61,0.12)" : "rgba(6,12,32,0.55)",
                  border: `1.5px solid ${n.tone === "yellow" ? "rgba(255,200,61,0.7)" : "rgba(233,241,255,0.2)"}`,
                  color: toneColor(n.tone),
                  fontFamily: FONT.kr,
                  fontWeight: 700,
                  fontSize: 29,
                  letterSpacing: "-0.025em",
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
