import React from "react";
import { Composition, staticFile, type CalculateMetadataFunction } from "remotion";
import { l01 } from "./content/l01/index.ts";
import { Lesson, type LessonProps } from "./Lesson.tsx";
import { VIDEO } from "./theme.ts";
import { planLesson, type VoiceTimeline } from "./timeline.ts";

/**
 * 음성 타임라인을 읽어 강의 길이를 정한다. 음성이 없으면 글자 수로 어림한다.
 * @param args 기본 props
 * @returns 길이와 props
 */
const calc: CalculateMetadataFunction<LessonProps> = async ({ props }) => {
  let voice: VoiceTimeline | null = null;
  try {
    const res = await fetch(staticFile(`voice/${props.lesson.id}/timeline.json`));
    if (res.ok) voice = await res.json();
  } catch {
    voice = null;
  }
  const plan = planLesson(props.lesson, voice);
  return { durationInFrames: Math.ceil(plan.total * VIDEO.fps), props: { ...props, voice } };
};

/**
 * Remotion 루트: 강의마다 컴포지션 하나.
 * @returns 컴포지션 목록
 */
export function Root() {
  return (
    <Composition
      id="T01"
      component={Lesson}
      width={VIDEO.width}
      height={VIDEO.height}
      fps={VIDEO.fps}
      durationInFrames={300}
      defaultProps={{ lesson: l01, label: "이론 1강", voice: null, audio: true, captions: true }}
      calculateMetadata={calc}
    />
  );
}
