import React, { useLayoutEffect, useRef, useState } from "react";
import type { ExamProps } from "../content/types.ts";
import { Pointer } from "../components/Pointer.tsx";
import { Reveal } from "../components/Reveal.tsx";
import { ease, easeOut, mix, prog } from "../lib/anim.ts";
import { cueTime, useScene } from "../lib/clock.tsx";
import { C, FONT } from "../theme.ts";

type Seg = { text: string; mark?: number; blank?: number };
type Pos = { x: number; y: number; w: number };

const MARK_COLOR: Record<string, string> = {
  hl: "rgba(255,200,61,0.62)",
  ul: "#3D40FE",
  box: "#3D40FE",
  strike: "#E5484D",
};

/**
 * 기출 지문 장면. 종이 위에 지문이 놓이고, 강사 시선 커서가 결정 단서로 이동해 표시를 남긴다.
 * 빈칸은 말에 맞춰 답으로 바뀐다.
 * @param props 기출 장면 데이터
 * @returns 장면
 */
export function Exam({ v }: { v: ExamProps }) {
  const ctx = useScene();
  const { t, panel } = ctx;
  const bodyRef = useRef<HTMLDivElement>(null);
  const markRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const blankRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const [pos, setPos] = useState<{ marks: Pos[]; blanks: Pos[] } | null>(null);

  // 빈칸이 답으로 바뀌면 줄바꿈이 달라질 수 있어 매 프레임 다시 재고, 바뀐 경우에만 갱신한다.
  useLayoutEffect(() => {
    const read = (el: HTMLSpanElement | null): Pos => (el ? { x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth } : { x: 0, y: 0, w: 0 });
    const next = { marks: markRefs.current.map(read), blanks: blankRefs.current.map(read) };
    if (!pos || JSON.stringify(next) !== JSON.stringify(pos)) setPos(next);
  });

  const lines = segment(v);
  const fs = v.body.join("").length > 420 ? 29 : 31;
  const markAt = v.marks.map((m) => cueTime(ctx, m.at));
  const blankAt = (v.blanks ?? []).map((b) => cueTime(ctx, b.at));
  const bodyLeft = panel.x + 72;
  const bodyTop = panel.y + 132;
  const exit = prog(t, ctx.exitAt, 0.38);
  let blankSeen = new Set<number>();

  // 커서 경로: 표시와 빈칸을 시각 순으로 방문한다.
  const stops: { at: number; x: number; y: number; w: number }[] = [];
  if (pos) {
    v.marks.forEach((_, i) => stops.push({ at: markAt[i], x: pos.marks[i].x, y: pos.marks[i].y + fs * 1.05, w: pos.marks[i].w }));
    (v.blanks ?? []).forEach((b, i) => {
      const k = firstBlankIndex(lines, i);
      const p = k >= 0 ? pos.blanks[k] : undefined;
      if (p) stops.push({ at: blankAt[i], x: p.x, y: p.y + fs * 1.05, w: 0 });
    });
  }
  stops.sort((a, b) => a.at - b.at);
  let cx = panel.w - 120;
  let cy = panel.h - 60;
  let press = 0;
  for (const s of stops) {
    const move = prog(t, s.at - 0.55, 0.5, ease);
    cx = mix(cx, s.x + 6, move);
    cy = mix(cy, s.y, move);
    const sweep = prog(t, s.at, 0.5, easeOut);
    cx += Math.min(s.w, 520) * sweep * 0.9;
    press = Math.max(press, prog(t, s.at - 0.05, 0.1) * (1 - prog(t, s.at + 0.1, 0.15)));
  }
  const cursorIn = prog(t, ctx.ps.start + 0.6, 0.4);
  const cursorOut = v.verdict ? prog(t, cueTime(ctx, v.verdict.at) + 0.6, 0.4) : 0;

  return (
    <div style={{ position: "absolute", inset: 0, opacity: 1 - exit }}>
      <Reveal at={ctx.ps.start + 0.35} style={{ position: "absolute", left: bodyLeft, top: panel.y + 52, width: panel.w - 144 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", borderBottom: "2px solid rgba(20,27,51,0.85)", paddingBottom: 14 }}>
          <div style={{ fontFamily: FONT.kr, fontWeight: 800, fontSize: 34, color: C.paperInk, letterSpacing: "-0.03em" }}>{v.meta}</div>
          {v.points ? <div style={{ fontFamily: FONT.kr, fontWeight: 700, fontSize: 26, color: "rgba(20,27,51,0.6)" }}>[{v.points}]</div> : null}
        </div>
      </Reveal>
      <div
        ref={bodyRef}
        style={{
          position: "absolute",
          left: bodyLeft,
          top: bodyTop,
          width: panel.w - 144,
          fontFamily: FONT.kr,
          fontWeight: 500,
          fontSize: fs,
          lineHeight: 1.62,
          color: C.paperInk,
          letterSpacing: "-0.02em",
          wordBreak: "keep-all",
          opacity: prog(t, ctx.ps.start + 0.45, 0.5),
        }}
      >
        {lines.map((segs, li) => (
          <div key={li} style={{ marginBottom: isHeader(v.body[li]) ? 2 : 10, fontWeight: isHeader(v.body[li]) ? 800 : 500 }}>
            {segs.map((s, si) => {
              if (s.blank !== undefined) {
                const b = v.blanks![s.blank];
                const occurrence = blankSeen.has(s.blank) ? 1 : 0;
                blankSeen.add(s.blank);
                const p = prog(t, blankAt[s.blank], 0.5, easeOut);
                return (
                  <span
                    key={si}
                    ref={(el) => {
                      if (occurrence === 0) blankRefs.current[globalBlankKey(lines, li, si)] = el;
                    }}
                    style={{
                      display: "inline-block",
                      padding: "0 12px",
                      margin: "0 2px",
                      borderRadius: 10,
                      border: `2px solid ${p > 0 ? C.green : "rgba(20,27,51,0.5)"}`,
                      background: p > 0 ? `rgba(43,213,118,${0.16 * p})` : "transparent",
                      color: p > 0 ? "#0B7A3E" : C.paperInk,
                      fontWeight: 800,
                      lineHeight: 1.3,
                    }}
                  >
                    {p > 0 ? `${b.mark} ${b.answer}` : `  ${b.mark}  `}
                  </span>
                );
              }
              if (s.mark !== undefined) {
                const m = v.marks[s.mark];
                const p = prog(t, markAt[s.mark], 0.55, easeOut);
                const col = MARK_COLOR[m.kind];
                const bg =
                  m.kind === "hl"
                    ? `linear-gradient(${col}, ${col})`
                    : m.kind === "strike"
                      ? `linear-gradient(transparent 50%, ${col} 50%, ${col} calc(50% + 3px), transparent calc(50% + 3px))`
                      : m.kind === "ul"
                        ? `linear-gradient(transparent 88%, ${col} 88%)`
                        : "none";
                return (
                  <span
                    key={si}
                    ref={(el) => {
                      if (markRefs.current[s.mark!] === undefined || markRefs.current[s.mark!] === null) markRefs.current[s.mark!] = el;
                    }}
                    style={{
                      backgroundImage: bg,
                      backgroundRepeat: "no-repeat",
                      backgroundSize: `${p * 100}% 100%`,
                      WebkitBoxDecorationBreak: "clone",
                      boxDecorationBreak: "clone",
                      outline: m.kind === "box" && p > 0 ? `2px solid ${col}` : undefined,
                      outlineOffset: 3,
                      borderRadius: 4,
                      fontWeight: p > 0 ? 700 : undefined,
                    }}
                  >
                    {s.text}
                  </span>
                );
              }
              return <span key={si}>{s.text}</span>;
            })}
          </div>
        ))}
        {pos ? (
          <Pointer x={cx} y={cy - fs * 0.55} press={press} opacity={cursorIn * (1 - cursorOut)} />
        ) : null}
      </div>
      {v.verdict ? (
        <Reveal at={cueTime(ctx, v.verdict.at)} mode="pop" style={{ position: "absolute", right: 1920 - panel.x - panel.w + 64, top: panel.y + panel.h - 112 }}>
          <div
            style={{
              padding: "12px 26px",
              borderRadius: 14,
              border: `3px solid ${v.verdict.tone === "red" ? "#E5484D" : "#0FA968"}`,
              color: v.verdict.tone === "red" ? "#D13440" : "#0B7A3E",
              fontFamily: FONT.kr,
              fontWeight: 800,
              fontSize: 32,
              rotate: "-2deg",
              background: "rgba(255,255,255,0.6)",
            }}
          >
            {v.verdict.t}
          </div>
        </Reveal>
      ) : null}
    </div>
  );
}

function isHeader(s: string): boolean {
  return /^\([가-힣]\)$/.test(s.trim());
}

/**
 * 지문 줄을 표시·빈칸 조각으로 자른다. 표시는 지문 전체에서 처음 나오는 곳 하나에만 건다.
 * @param v 기출 데이터
 * @returns 줄별 조각
 */
function segment(v: ExamProps): Seg[][] {
  const used = new Set<number>();
  return v.body.map((line) => {
    // 표시 구간 찾기
    const ranges: { s: number; e: number; mark: number }[] = [];
    v.marks.forEach((m, i) => {
      if (used.has(i)) return;
      const k = line.indexOf(m.q);
      if (k >= 0 && !ranges.some((r) => k < r.e && k + m.q.length > r.s)) {
        ranges.push({ s: k, e: k + m.q.length, mark: i });
        used.add(i);
      }
    });
    ranges.sort((a, b) => a.s - b.s);
    const segs: Seg[] = [];
    let cur = 0;
    for (const r of ranges) {
      if (r.s > cur) segs.push(...splitBlanks(line.slice(cur, r.s), v));
      for (const piece of splitBlanks(line.slice(r.s, r.e), v)) segs.push(piece.blank !== undefined ? piece : { ...piece, mark: r.mark });
      cur = r.e;
    }
    if (cur < line.length) segs.push(...splitBlanks(line.slice(cur), v));
    return segs;
  });
}

function splitBlanks(text: string, v: ExamProps): Seg[] {
  const blanks = v.blanks ?? [];
  if (!blanks.length) return [{ text }];
  const re = new RegExp(`\\( (${blanks.map((b) => b.mark).join("|")}) \\)`, "g");
  const out: Seg[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push({ text: text.slice(last, m.index) });
    out.push({ text: m[0], blank: blanks.findIndex((b) => b.mark === m![1]) });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last) });
  return out;
}

function globalBlankKey(lines: Seg[][], li: number, si: number): number {
  return li * 100 + si;
}

function firstBlankIndex(lines: Seg[][], blank: number): number {
  for (let li = 0; li < lines.length; li++) {
    for (let si = 0; si < lines[li].length; si++) if (lines[li][si].blank === blank) return globalBlankKey(lines, li, si);
  }
  return -1;
}
