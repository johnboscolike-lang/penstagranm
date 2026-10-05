import React from "react";
import type { MapProps } from "../content/types.ts";
import { Reveal } from "../components/Reveal.tsx";
import { ease, mix, prog } from "../lib/anim.ts";
import { cueTime, useScene } from "../lib/clock.tsx";
import { C, FONT } from "../theme.ts";

const QUESTIONS = ["왜 기르나", "무엇을 가르치나", "어떻게 가르치나", "잘 배웠나", "현장과 잇나"];
const AREAS: { t: string; q: number }[] = [
  { t: "공업교육 일반", q: 0 },
  { t: "공업 교육과정", q: 1 },
  { t: "공업 교수학습", q: 2 },
  { t: "실기지도법", q: 2 },
  { t: "공업교육 평가", q: 3 },
  { t: "산학협력", q: 4 },
  { t: "직업 진로 지도", q: 4 },
];
const LESSONS: { t: string; from: number; to: number; slot?: number }[] = [
  { t: "이론 1강", from: 0, to: 1 },
  { t: "이론 2강", from: 2, to: 2, slot: 0 },
  { t: "이론 3강", from: 2, to: 2, slot: 1 },
  { t: "이론 4강", from: 3, to: 4 },
];
const ORDER = ["epitome", "areas", "roadmap", "focus", "done"];

/**
 * 공업교육론 전체 지도: 기술인 한 명을 길러 내는 다섯 질문.
 * 단계(stage)가 올라갈수록 앞 단계의 요소는 처음부터 보인다.
 * @param props 지도 장면 데이터
 * @returns 장면
 */
export function MapScene({ v }: { v: MapProps }) {
  const ctx = useScene();
  const { t, panel, exitAt } = ctx;
  const stage = ORDER.indexOf(v.stage);
  const at = v.at ?? {};
  const base = ctx.ps.start + 0.3;
  const nodeW = 300;
  const gap = (panel.w - 160 - nodeW * 5) / 4;
  const lineY = panel.y + 390;
  const nx = (i: number) => panel.x + 80 + i * (nodeW + gap);
  const exit = prog(t, exitAt, 0.38);

  const nodeAt = (i: number) => (stage === 0 ? cueTime(ctx, at[`q${i}`], i) : base - 1);
  const areaAt = (i: number) => (stage === 1 ? cueTime(ctx, at[`a${i}`], i) : stage > 1 ? base - 1 : Infinity);
  const lessonAt = (i: number) => (stage === 2 ? cueTime(ctx, at[`l${i + 1}`], i) : stage > 2 ? base - 1 : Infinity);

  // 이동하는 점: 지금까지 나타난 마지막 질문 위치로 미끄러진다.
  let last = -1;
  for (let i = 0; i < 5; i++) if (t >= nodeAt(i)) last = i;
  let travel = 0;
  for (let i = 1; i <= last; i++) travel = i - 1 + prog(t, nodeAt(i), 0.8);
  if (last >= 0 && stage > 0) travel = 4;
  const lineP = stage === 0 ? Math.max(0, travel) / 4 : 1;

  const focusP = v.stage === "focus" ? prog(t, cueTime(ctx, at.f, 0), 0.9) : 0;
  const done = v.stage === "done";
  const litP = done ? prog(t, cueTime(ctx, at.lit, 0), 0.7) : 0;

  return (
    <div style={{ position: "absolute", inset: 0, opacity: 1 - exit * 0.9 }}>
      <Reveal at={base - (stage > 0 ? 1 : 0)} style={{ position: "absolute", left: panel.x + 80, top: panel.y + 64 }}>
        <div style={{ fontFamily: FONT.mono, fontSize: 22, color: C.yellow, letterSpacing: "0.06em" }}>공업교육론 전체 지도</div>
        <div style={{ fontFamily: FONT.kr, fontWeight: 800, fontSize: 60, color: C.ice, letterSpacing: "-0.04em", marginTop: 10 }}>
          기술인 한 명을 길러 내는 다섯 질문
        </div>
      </Reveal>

      {/* 공정 라인 */}
      <div
        style={{
          position: "absolute",
          left: nx(0) + nodeW / 2,
          top: lineY,
          width: (nx(4) - nx(0)) * lineP,
          height: 3,
          background: `linear-gradient(90deg, ${C.blueSoft}, ${C.ice})`,
          opacity: 0.55,
        }}
      />
      {last >= 0 && stage === 0 ? (
        <div
          style={{
            position: "absolute",
            left: mix(nx(0), nx(4), Math.max(0, travel) / 4) + nodeW / 2 - 11,
            top: lineY - 10,
            width: 22,
            height: 22,
            borderRadius: 11,
            background: C.yellow,
            boxShadow: "0 0 0 6px rgba(255,200,61,0.18)",
          }}
        />
      ) : null}

      {QUESTIONS.map((q, i) => {
        const a = nodeAt(i);
        const pIn = prog(t, a, 0.7);
        const isFocus = v.focus === i;
        const dim = focusP > 0 && !isFocus ? 1 - 0.65 * focusP : 1;
        const scale = isFocus ? 1 + 0.12 * ease(focusP) : 1;
        const lit = done && v.lit?.includes(i);
        const nextUp = done && isFocus;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: nx(i),
              top: lineY - 74,
              width: nodeW,
              height: 148,
              borderRadius: 26,
              background: lit ? `rgba(255,200,61,${0.12 * litP})` : "rgba(10,20,48,0.72)",
              border: `2px solid ${lit ? C.yellow : isFocus && focusP > 0 ? C.yellow : "rgba(233,241,255,0.28)"}`,
              opacity: pIn * dim,
              translate: `0 ${(1 - pIn) * 24}px`,
              scale: String(scale),
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              paddingLeft: 28,
              boxShadow: nextUp ? `0 0 0 ${6 + 4 * Math.sin(t * 3)}px rgba(124,130,255,0.25)` : undefined,
            }}
          >
            <div style={{ fontFamily: FONT.mono, fontSize: 20, color: lit ? C.yellow : C.iceDim }}>
              {String(i + 1).padStart(2, "0")}
              {lit ? "  ✓" : ""}
            </div>
            <div style={{ fontFamily: FONT.kr, fontWeight: 800, fontSize: 40, color: C.ice, letterSpacing: "-0.035em", marginTop: 6 }}>{q}</div>
          </div>
        );
      })}

      {AREAS.map((ar, i) => {
        const a = areaAt(i);
        const pIn = prog(t, a, 0.6);
        const sameBefore = AREAS.slice(0, i).filter((x) => x.q === ar.q).length;
        const dim = focusP > 0 && v.focus !== ar.q ? 1 - 0.65 * focusP : 1;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: nx(ar.q) + 14,
              top: lineY + 108 + sameBefore * 66,
              padding: "10px 18px",
              borderRadius: 12,
              background: "rgba(61,64,254,0.16)",
              border: "1.5px solid rgba(124,130,255,0.55)",
              fontFamily: FONT.kr,
              fontWeight: 650,
              fontSize: 30,
              color: C.ice,
              opacity: pIn * dim,
              translate: `0 ${(1 - pIn) * -18}px`,
            }}
          >
            {ar.t}
          </div>
        );
      })}

      {LESSONS.map((l, i) => {
        const a = lessonAt(i);
        const pIn = prog(t, a, 0.6);
        const x0 = nx(l.from) + (l.slot !== undefined ? l.slot * (nodeW / 2 + 4) : 0);
        const w = l.slot !== undefined ? nodeW / 2 - 4 : nx(l.to) + nodeW - nx(l.from);
        const dim = focusP > 0 && !(v.focus! >= l.from && v.focus! <= l.to) ? 1 - 0.65 * focusP : 1;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x0,
              top: lineY - 170,
              width: w,
              height: 56,
              borderRadius: 14,
              background: "rgba(255,200,61,0.12)",
              border: `1.5px solid ${C.yellow}`,
              color: C.yellow,
              fontFamily: FONT.kr,
              fontWeight: 700,
              fontSize: 26,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: pIn * dim,
              translate: `0 ${(1 - pIn) * 18}px`,
            }}
          >
            {l.t}
          </div>
        );
      })}

      {v.stage === "areas" && at.k ? (
        <Reveal at={cueTime(ctx, at.k)} mode="rise" style={{ position: "absolute", right: panel.x + 80, top: panel.y + 84 }}>
          <div style={{ fontFamily: FONT.kr, fontWeight: 700, fontSize: 30, color: C.yellow }}>어느 질문인가 → 열 서랍이 정해진다</div>
        </Reveal>
      ) : null}
      {v.stage === "roadmap" ? (
        <Reveal at={cueTime(ctx, at.l4) + 1.2} mode="rise" style={{ position: "absolute", right: panel.x + 80, top: panel.y + 84 }}>
          <div style={{ fontFamily: FONT.kr, fontWeight: 700, fontSize: 30, color: C.ice }}>
            이론 4시간 <span style={{ color: C.iceDim }}>+</span> <span style={{ color: C.yellow }}>기출 4시간</span>
          </div>
        </Reveal>
      ) : null}
    </div>
  );
}
