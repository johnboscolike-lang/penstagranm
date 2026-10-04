import React, { useLayoutEffect, useRef, useState } from "react";
import { asset } from "../lib/rt.ts";
import { ease, irisRadius, mix, prog } from "../lib/anim.ts";
import { C, FONT } from "../theme.ts";

/** 열린 아이리스가 화면을 다 덮는 반지름 */
export const FULL_R = Math.hypot(960, 540) + 40;
const DOT_R = 15;

export type IrisState = { r: number; cx: number; cy: number; outer: boolean };

type Word = { lettersX: number[]; periodLeft: number; periodX: number; periodY: number; ready: boolean };

/**
 * 오프닝: 글자가 마침표로 빨려 들어가고, 마침표가 가운데로 와서 아이리스처럼 열린다.
 * 클로징: 그 반대. 마지막 프레임은 오프닝 첫 프레임과 같다.
 * @param mode 오프닝/클로징
 * @param s 장면 안 경과 시간(초)
 * @param word 워드마크 위치 정보
 * @returns 아이리스 상태와 글자 진행도
 */
export function irisAt(mode: "opening" | "closing", s: number, word: Word): IrisState & { letters: number; dotMove: number } {
  if (mode === "opening") {
    const letters = prog(s, 0.45, 1.5);
    const dotMove = prog(s, 1.55, 0.8);
    const open = Math.max(0, Math.min(1, (s - 2.3) / 1.1));
    const cx = mix(word.periodX, 960, ease(dotMove));
    const cy = mix(word.periodY, 540, ease(dotMove));
    const r = s < 2.3 ? DOT_R * (1 + 0.4 * dotMove) : irisRadius(DOT_R * 1.4, FULL_R, open);
    return { r, cx, cy, outer: open < 1, letters, dotMove };
  }
  const close = Math.max(0, Math.min(1, (s - 2.5) / 1.15));
  const dotMove = prog(s, 3.75, 0.8);
  const letters = 1 - prog(s, 4.5, 1.1);
  const r = s < 3.65 ? irisRadius(FULL_R, DOT_R * 1.4, close) : DOT_R * (1 + 0.4 * (1 - dotMove));
  const cx = mix(960, word.periodX, ease(dotMove));
  const cy = mix(540, word.periodY, ease(dotMove));
  return { r, cx, cy, outer: close > 0, letters, dotMove };
}

/**
 * 워드마크 위치를 잰다(마침표 자리).
 * @returns 측정 결과와 ref
 */
export function useWordmark(text: string) {
  const ref = useRef<HTMLDivElement>(null);
  const [word, setWord] = useState<Word>({ lettersX: [], periodLeft: 1290, periodX: 1300, periodY: 600, ready: false });
  // 레이아웃이 자리 잡기 전 값이 들어오지 않도록 매번 재고, 값이 바뀐 경우에만 갱신한다.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const spans = Array.from(el.querySelectorAll("span"));
    const period = spans[spans.length - 1];
    if (!period || period.offsetWidth === 0) return;
    const next: Word = {
      lettersX: spans.slice(0, -1).map((sp) => el.offsetLeft + sp.offsetLeft),
      periodLeft: el.offsetLeft + period.offsetLeft,
      periodX: el.offsetLeft + period.offsetLeft + period.offsetWidth / 2,
      periodY: el.offsetTop + period.offsetTop + period.offsetHeight * 0.78,
      ready: true,
    };
    if (JSON.stringify(next) !== JSON.stringify(word)) setWord(next);
  });
  return { ref, word };
}

/**
 * 아이리스 바깥 세계: 종이 바탕 위의 검은 워드마크.
 * @param props 워드마크, 측정 ref, 글자 진행도(0=제자리, 1=마침표 속으로)
 * @returns 바깥 세계
 */
export function OuterWorld({
  text,
  wordRef,
  word,
  letters,
  showPeriod,
}: {
  text: string;
  wordRef: React.RefObject<HTMLDivElement | null>;
  word: Word;
  letters: number;
  showPeriod: boolean;
}) {
  const chars = [...text];
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <img alt="" src={asset("bg/paper.jpg")} style={{ position: "absolute", inset: 0, width: 1920, height: 1080 }} />
      <div
        ref={wordRef}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 380,
          display: "flex",
          justifyContent: "center",
          fontFamily: FONT.kr,
          fontWeight: 800,
          fontSize: 200,
          letterSpacing: "-0.06em",
          color: C.paperInk,
          lineHeight: 1.1,
        }}
      >
        <div style={{ display: "flex", overflow: "hidden", paddingRight: 4 }}>
          {chars.map((ch, i) => {
            const stagger = Math.max(0, Math.min(1, letters * 1.35 - (chars.length - 1 - i) * 0.08));
            const dx = word.ready ? (word.periodLeft - (word.lettersX[i] ?? 0)) * ease(stagger) : 0;
            return (
              <span key={i} style={{ display: "inline-block", translate: `${Math.max(0, dx)}px 0` }}>
                {ch}
              </span>
            );
          })}
        </div>
        <span style={{ display: "inline-block", color: showPeriod ? C.yellow : "transparent" }}>.</span>
      </div>
    </div>
  );
}
