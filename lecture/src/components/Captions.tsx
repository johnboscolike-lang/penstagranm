import React from "react";
import type { PlannedScene, VoiceWord } from "../timeline.ts";
import { C, FONT } from "../theme.ts";

type Page = { words: VoiceWord[]; s: number; e: number };

/**
 * 단어 목록을 자막 한 줄 단위로 나눈다. 문장부호나 길이로 끊는다.
 * @param words 절대 시각 단어
 * @returns 자막 페이지
 */
export function paginate(words: VoiceWord[]): Page[] {
  const pages: Page[] = [];
  let cur: VoiceWord[] = [];
  let len = 0;
  const flush = () => {
    if (cur.length) pages.push({ words: cur, s: cur[0].s, e: cur[cur.length - 1].e });
    cur = [];
    len = 0;
  };
  for (const w of words) {
    if (len + w.w.length > 34 && cur.length) flush();
    cur.push(w);
    len += w.w.length + 1;
    if (/[.?!]$/.test(w.w) || (/[,]$/.test(w.w) && len > 18)) flush();
  }
  flush();
  return pages;
}

/**
 * 한 줄 자막. 이미 말한 단어는 밝게, 남은 단어는 흐리게.
 * @param props 장면과 현재 시각
 * @returns 자막
 */
export function Captions({ ps, t, pages }: { ps: PlannedScene | undefined; t: number; pages: Page[] }) {
  if (!ps || !pages.length) return null;
  let idx = -1;
  for (let i = 0; i < pages.length; i++) if (t >= pages[i].s - 0.12) idx = i;
  if (idx < 0) return null;
  const page = pages[idx];
  const nextS = pages[idx + 1]?.s ?? page.e + 0.6;
  if (t > Math.min(nextS, page.e + 0.6)) return null;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 62, display: "flex", justifyContent: "center" }}>
      <div
        style={{
          padding: "12px 28px 14px",
          borderRadius: 14,
          background: "rgba(6,12,32,0.66)",
          fontFamily: FONT.kr,
          fontWeight: 500,
          fontSize: 36,
          letterSpacing: "-0.015em",
          lineHeight: 1.25,
          whiteSpace: "nowrap",
        }}
      >
        {page.words.map((w, i) => (
          <span key={i} style={{ color: t >= w.s ? C.ice : "rgba(233,241,255,0.42)" }}>
            {w.w}
            {i < page.words.length - 1 ? " " : ""}
          </span>
        ))}
      </div>
    </div>
  );
}
