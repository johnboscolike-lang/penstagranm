import React from "react";
import type { MetaphorProps, Side } from "../content/types.ts";
import { Icon } from "../components/Icon.tsx";
import { Reveal } from "../components/Reveal.tsx";
import { prog } from "../lib/anim.ts";
import { cueTime, useScene } from "../lib/clock.tsx";
import { C, FONT, toneColor } from "../theme.ts";

/**
 * 비유 장면: 왼쪽과 오른쪽 두 장면을 나란히 세우고, 말에 맞춰 항목이 붙는다.
 * @param props 비유 장면 데이터
 * @returns 장면
 */
export function Metaphor({ v }: { v: MetaphorProps }) {
  const ctx = useScene();
  const { panel } = ctx;
  const colW = (panel.w - 96 * 2 - 64) / 2;
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <SideCard side={v.left} x={panel.x + 96} y={panel.y + 80} w={colW} h={panel.h - 160} order={0} />
      <SideCard side={v.right} x={panel.x + 96 + colW + 64} y={panel.y + 80} w={colW} h={panel.h - 160} order={1} accent />
      {v.bridge ? (
        <Reveal at={cueTime(ctx, v.bridge.at)} mode="rise" style={{ position: "absolute", left: panel.x, width: panel.w, top: panel.y + panel.h - 70, textAlign: "center" }}>
          <div style={{ fontFamily: FONT.kr, fontWeight: 700, fontSize: 32, color: toneColor(v.bridge.tone) }}>{v.bridge.t}</div>
        </Reveal>
      ) : null}
    </div>
  );
}

function SideCard({ side, x, y, w, h, order, accent }: { side: Side; x: number; y: number; w: number; h: number; order: number; accent?: boolean }) {
  const ctx = useScene();
  const a = cueTime(ctx, side.at, order * 3);
  const pIn = prog(ctx.t, a, 0.7);
  const pOut = prog(ctx.t, ctx.exitAt, 0.38);
  const border = accent ? "rgba(255,200,61,0.55)" : "rgba(233,241,255,0.22)";
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        borderRadius: 28,
        border: `1.5px solid ${border}`,
        background: "rgba(6,12,32,0.38)",
        opacity: pIn * (1 - pOut),
        translate: `0 ${(1 - pIn) * 30}px`,
        padding: "56px 60px",
        boxSizing: "border-box",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
        <Icon name={side.icon} size={136} color={accent ? C.yellow : C.ice} draw={prog(ctx.t, a, 1.2)} />
        <div style={{ fontFamily: FONT.kr, fontWeight: 800, fontSize: 60, color: C.ice, letterSpacing: "-0.04em", wordBreak: "keep-all" }}>{side.title}</div>
      </div>
      <div style={{ marginTop: 52, display: "flex", flexDirection: "column", gap: 28 }}>
        {side.items.map((it, i) => (
          <Reveal key={i} at={cueTime(ctx, it.at, i)}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
              <span style={{ width: 10, height: 10, borderRadius: 5, background: toneColor(it.tone), flex: "none", translate: "0 -6px" }} />
              <span style={{ fontFamily: FONT.kr, fontWeight: 650, fontSize: 44, color: toneColor(it.tone), letterSpacing: "-0.025em", wordBreak: "keep-all" }}>
                {it.t}
              </span>
            </div>
          </Reveal>
        ))}
      </div>
    </div>
  );
}
