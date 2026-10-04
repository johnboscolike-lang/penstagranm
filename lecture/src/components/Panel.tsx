import React from "react";
import { Img, staticFile } from "remotion";
import type { Rect } from "../lib/anim.ts";
import { C } from "../theme.ts";

type Props = {
  rect: Rect;
  /** 0 = 유리, 1 = 종이 */
  paper: number;
  /** 0이면 패널이 보이지 않는다 */
  presence: number;
};

/**
 * 장면을 받치는 단 하나의 패널. 유리 재질은 배경의 사전 블러 사본을 패널 모양으로 잘라 쓰고,
 * 틴트와 테두리 림을 얹는다. 그림자는 패널 높이에 비례해 커진다.
 * @param props 위치·재질·존재감
 * @returns 패널
 */
export function Panel({ rect, paper, presence }: Props) {
  if (presence <= 0.001) return null;
  const shadow = 18 + rect.h * 0.05;
  return (
    <div
      style={{
        position: "absolute",
        left: rect.x,
        top: rect.y,
        width: rect.w,
        height: rect.h,
        borderRadius: rect.r,
        overflow: "hidden",
        opacity: presence,
        boxShadow: `0 ${shadow * 0.5}px ${shadow * 2}px rgba(0,0,0,${0.35 + paper * 0.1})`,
      }}
    >
      <Img
        src={staticFile("bg/stage-blur.jpg")}
        style={{ position: "absolute", left: -rect.x, top: -rect.y, width: 1920, height: 1080 }}
      />
      <div style={{ position: "absolute", inset: 0, background: "rgba(40,56,130,0.20)" }} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(180deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.0) 38%)",
        }}
      />
      {paper > 0 ? (
        <Img
          src={staticFile("bg/paper.jpg")}
          style={{ position: "absolute", left: -rect.x, top: -rect.y, width: 1920, height: 1080, opacity: paper }}
        />
      ) : null}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: rect.r,
          border: `1.5px solid rgba(${paper > 0.5 ? "20,27,51,0.12" : "233,241,255,0.16"})`,
          boxShadow: `inset 0 1px 0 rgba(255,255,255,${0.18 * (1 - paper)})`,
        }}
      />
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 2, background: C.iceFaint, opacity: 1 - paper }} />
    </div>
  );
}
