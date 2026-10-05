import React, { createContext, useContext } from "react";
import type { PlannedScene } from "../timeline.ts";
import type { Rect } from "./anim.ts";

export type SceneCtx = {
  /** 현재 절대 시각(초) */
  t: number;
  ps: PlannedScene;
  /** 이 장면의 패널(최종 위치) */
  panel: Rect;
  /** 장면이 닫히기 시작하는 시각 */
  exitAt: number;
  /** 앞 장면의 종류(같은 종류가 이어지면 등장 연출을 생략한다) */
  prevKind?: string;
};

const Ctx = createContext<SceneCtx | null>(null);

/**
 * 장면 컴포넌트에 시각과 시간표를 내려준다.
 * @param props value와 자식
 * @returns 공급자
 */
export function SceneProvider({ value, children }: { value: SceneCtx; children: React.ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/**
 * 현재 장면 문맥.
 * @returns 장면 문맥
 */
export function useScene(): SceneCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("SceneProvider 밖에서 useScene 사용");
  return v;
}

/** 패널이 자리를 잡고 내용이 나오기 시작하는 지연(초). */
export const CONTENT_DELAY = 0.42;

/**
 * 큐 이름을 절대 시각으로 바꾼다. 없는 큐는 장면 시작 직후로 본다.
 * zz로 시작하는 큐는 '이번 장면에서는 등장하지 않음'(무한대)으로 본다.
 * @param ctx 장면 문맥
 * @param cue 큐 이름
 * @param order 큐가 없을 때 순서별로 조금씩 늦춘다
 * @returns 초
 */
export function cueTime(ctx: SceneCtx, cue: string | undefined, order = 0): number {
  if (cue && cue.startsWith("zz")) return Number.POSITIVE_INFINITY;
  if (cue && cue in ctx.ps.cues) return ctx.ps.cues[cue];
  return ctx.ps.start + CONTENT_DELAY + order * 0.12;
}
