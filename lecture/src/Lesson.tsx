import React, { useMemo, useState } from "react";
import { AbsoluteFill, Img, Sequence, continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Audio } from "@remotion/media";
import type { Lesson as LessonData, Visual } from "./content/types.ts";
import { Captions, paginate } from "./components/Captions.tsx";
import { Hud } from "./components/Hud.tsx";
import { FULL_R, OuterWorld, irisAt, useWordmark } from "./components/Iris.tsx";
import { Panel } from "./components/Panel.tsx";
import { Reveal } from "./components/Reveal.tsx";
import { fontsReady } from "./fonts.ts";
import { panelFor } from "./layout.ts";
import { mix, mixRect, prog } from "./lib/anim.ts";
import { SceneProvider, useScene, type SceneCtx } from "./lib/clock.tsx";
import { Chunks } from "./scenes/Chunks.tsx";
import { Exam } from "./scenes/Exam.tsx";
import { Grid } from "./scenes/Grid.tsx";
import { List } from "./scenes/List.tsx";
import { MapScene } from "./scenes/MapScene.tsx";
import { Metaphor } from "./scenes/Metaphor.tsx";
import { Recap } from "./scenes/Recap.tsx";
import { Statement } from "./scenes/Statement.tsx";
import { Table } from "./scenes/Table.tsx";
import { Timeline } from "./scenes/Timeline.tsx";
import { C, FONT } from "./theme.ts";
import { planLesson, sec, type VoiceTimeline } from "./timeline.ts";

export type LessonProps = {
  lesson: LessonData;
  label: string;
  voice: VoiceTimeline | null;
  /** Studio 미리듣기용 음성 포함 여부(최종 렌더는 따로 믹스해 합친다) */
  audio: boolean;
  captions: boolean;
};

const EXIT = 0.4;

/**
 * 강의 한 편 전체. 아이리스 안의 세계에서 패널 하나가 장면마다 모프되고,
 * 장면 내용은 발화 큐에 맞춰 나타난다.
 * @param props 강의 데이터와 음성 타임라인
 * @returns 컴포지션
 */
export function Lesson({ lesson, label, voice, audio, captions }: LessonProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const [fontHandle] = useState(() => delayRender("폰트"));
  useState(() => fontsReady.then(() => continueRender(fontHandle)));

  const plan = useMemo(() => planLesson(lesson, voice), [lesson, voice]);
  const pages = useMemo(() => plan.scenes.map((s) => paginate(s.words)), [plan]);
  const { ref: wordRef, word } = useWordmark("공업교육론");

  let i = 0;
  for (let k = 0; k < plan.scenes.length; k++) if (plan.scenes[k].start <= t) i = k;
  const cur = plan.scenes[i];
  const prev = plan.scenes[i - 1];

  // 패널 모프
  const specCur = panelFor(cur.scene.v);
  const specPrev = prev ? panelFor(prev.scene.v) : specCur;
  const p = prog(t, cur.start, 0.8);
  const rect = mixRect(specPrev.rect, specCur.rect, p);
  const pres = (m: string) => (m === "none" ? 0 : 1);
  const presence = mix(pres(specPrev.material), pres(specCur.material), p);
  const paper = mix(specPrev.material === "paper" ? 1 : 0, specCur.material === "paper" ? 1 : 0, p);

  // 아이리스
  const first = plan.scenes[0];
  const last = plan.scenes[plan.scenes.length - 1];
  let iris = { r: FULL_R, cx: 960, cy: 540, outer: false, letters: 1, dotMove: 1 };
  let mode: "opening" | "closing" | null = null;
  if (first.scene.v.kind === "opening" && t < first.end) {
    mode = "opening";
    iris = irisAt("opening", t - first.start, word);
  } else if (last.scene.v.kind === "closing" && t >= last.start) {
    mode = "closing";
    iris = irisAt("closing", t - last.start, word);
  }
  const openP = mode === "opening" ? prog(t, first.start + 2.3, 1.1) : mode === "closing" ? 1 - prog(t, last.start + 2.5, 1.15) : 1;
  const hudVis = Math.min(prog(t, first.end - 0.6, 0.8), 1 - prog(t, last.start, 0.6));

  const visible = plan.scenes.filter((s, k) => k === i || (k === i - 1 && t < cur.start + EXIT));
  const clip = iris.r < FULL_R - 1 ? `circle(${iris.r}px at ${iris.cx}px ${iris.cy}px)` : undefined;

  return (
    <AbsoluteFill style={{ background: C.paper }}>
      {mode ? (
        <OuterWorld text="공업교육론" wordRef={wordRef} word={word} letters={iris.letters} showPeriod={mode === "opening" ? iris.dotMove <= 0 : iris.dotMove >= 1} />
      ) : (
        <div style={{ position: "absolute", visibility: "hidden" }}>
          <OuterWorld text="공업교육론" wordRef={wordRef} word={word} letters={0} showPeriod />
        </div>
      )}
      <AbsoluteFill style={{ clipPath: clip, background: C.navy }}>
        <Img src={staticFile("bg/stage.jpg")} style={{ position: "absolute", inset: 0, width: 1920, height: 1080 }} />
        <Panel rect={rect} paper={paper} presence={presence} />
        {visible.map((s) => {
          const next = plan.scenes[s.index + 1];
          const ctx: SceneCtx = { t, ps: s, panel: panelFor(s.scene.v).rect, exitAt: next ? next.start : Number.POSITIVE_INFINITY, prevKind: plan.scenes[s.index - 1]?.scene.v.kind };
          return (
            <SceneProvider key={s.scene.id} value={ctx}>
              <SceneView v={s.scene.v} />
            </SceneProvider>
          );
        })}
        <Hud plan={plan} t={t} lessonLabel={label} visible={hudVis} />
        {captions ? <Captions ps={cur} t={t} pages={pages[i]} /> : null}
      </AbsoluteFill>
      {mode && iris.r < FULL_R - 1 ? (
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
          {openP <= 0 ? (
            <circle cx={iris.cx} cy={iris.cy} r={iris.r} fill={C.yellow} />
          ) : (
            <circle cx={iris.cx} cy={iris.cy} r={iris.r} fill="none" stroke={C.yellow} strokeWidth={6 * (1 - openP)} opacity={1 - openP} />
          )}
        </svg>
      ) : null}
      {audio
        ? plan.scenes
            .filter((s) => s.audio)
            .map((s) => (
              <Sequence key={s.scene.id} from={sec(s.audioStart)} durationInFrames={sec(s.dur) + 6} premountFor={fps}>
                <Audio src={staticFile(s.audio!)} />
              </Sequence>
            ))
        : null}
    </AbsoluteFill>
  );
}

/**
 * 장면 종류에 맞는 화면을 고른다.
 * @param props 장면 시각 데이터
 * @returns 장면 화면
 */
function SceneView({ v }: { v: Visual }) {
  switch (v.kind) {
    case "statement":
      return <Statement v={v} />;
    case "map":
      return <MapScene v={v} />;
    case "metaphor":
      return <Metaphor v={v} />;
    case "chunks":
      return <Chunks v={v} />;
    case "table":
      return <Table v={v} />;
    case "grid":
      return <Grid v={v} />;
    case "list":
      return <List v={v} />;
    case "timeline":
      return <Timeline v={v} />;
    case "exam":
      return <Exam v={v} />;
    case "recap":
      return <Recap v={v} />;
    case "opening":
      return <OpeningTitle title={v.title} sub={v.sub} />;
    case "closing":
      return <ClosingTitle next={v.next} />;
  }
}

/** 아이리스 안쪽에 올라오는 강 제목. */
function OpeningTitle({ title, sub }: { title: string; sub: string }) {
  return (
    <TitleBlock
      lines={[
        { t: sub, at: 3.0, style: { fontFamily: FONT.mono, fontSize: 30, color: C.yellow, letterSpacing: "0.08em" } },
        { t: title, at: 3.3, style: { fontFamily: FONT.kr, fontWeight: 800, fontSize: 92, color: C.ice, letterSpacing: "-0.045em" } },
      ]}
    />
  );
}

/** 클로징에서 다음 강을 알리는 제목. */
function ClosingTitle({ next }: { next: string }) {
  return (
    <TitleBlock
      lines={[
        { t: "다음 시간", at: 0.6, style: { fontFamily: FONT.mono, fontSize: 30, color: C.yellow, letterSpacing: "0.08em" } },
        { t: next, at: 0.85, style: { fontFamily: FONT.kr, fontWeight: 800, fontSize: 80, color: C.ice, letterSpacing: "-0.045em" } },
      ]}
    />
  );
}

function TitleBlock({ lines }: { lines: { t: string; at: number; style: React.CSSProperties }[] }) {
  const { ps } = useScene();
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 420, display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
      {lines.map((l, i) => (
        <Reveal key={i} at={ps.start + l.at} dur={0.8}>
          <div style={l.style}>{l.t}</div>
        </Reveal>
      ))}
    </div>
  );
}
