import type { Chapter, Lesson, Scene } from "./content/types.ts";
import { GAP, VIDEO } from "./theme.ts";

export type VoiceWord = { w: string; s: number; e: number };
export type VoiceScene = {
  id: string;
  chapter: string;
  audio: string | null;
  dur: number;
  cues: Record<string, number>;
  words: VoiceWord[];
  text: string;
};
export type VoiceTimeline = { lesson: string; voice: string; model: string; scenes: VoiceScene[] };

/** 화면만 있는 장면(오프닝·클로징)의 길이(초). */
const SILENT_DUR: Record<string, number> = { opening: 7.2, closing: 6.0 };

export type PlannedScene = {
  scene: Scene;
  chapter: Chapter;
  index: number;
  /** 화면이 열리는 시각 */
  start: number;
  /** 음성이 시작하는 시각 */
  audioStart: number;
  /** 음성 길이 */
  dur: number;
  /** 다음 장면이 열리는 시각 */
  end: number;
  audio: string | null;
  /** 큐 → 절대 시각(초) */
  cues: Record<string, number>;
  /** 자막 단어(절대 시각) */
  words: VoiceWord[];
};

export type Plan = { scenes: PlannedScene[]; total: number; chapters: { chapter: Chapter; start: number; end: number }[] };

/**
 * 대본과 음성 타임라인으로 장면별 절대 시간표를 만든다.
 * 음성이 없는 장면은 글자 수로 길이를 어림해 미리보기가 가능하게 한다.
 * @param lesson 강의 대본
 * @param voice 음성 타임라인(없으면 추정)
 * @returns 시간표
 */
export function planLesson(lesson: Lesson, voice: VoiceTimeline | null): Plan {
  const byId = new Map((voice?.scenes ?? []).map((s) => [s.id, s]));
  const scenes: PlannedScene[] = [];
  const chapters: Plan["chapters"] = [];
  let t = 0;
  let index = 0;
  for (const chapter of lesson.chapters) {
    const cStart = t;
    for (const scene of chapter.scenes) {
      const v = byId.get(scene.id);
      const silent = !scene.say;
      const kind = scene.v.kind;
      let dur: number;
      let cues: Record<string, number> = {};
      let words: VoiceWord[] = [];
      let audio: string | null = null;
      if (silent) {
        dur = SILENT_DUR[kind] ?? 4;
      } else if (v && v.audio && v.dur > 0) {
        dur = v.dur;
        cues = v.cues;
        words = v.words;
        audio = v.audio;
      } else {
        dur = estimate(scene.say);
        cues = estimateCues(scene.say, dur);
      }
      const lead = silent ? 0 : GAP.lead;
      const tail = silent ? 0 : GAP.tail;
      const start = t;
      const audioStart = start + lead;
      const end = audioStart + dur + tail;
      scenes.push({
        scene,
        chapter,
        index: index++,
        start,
        audioStart,
        dur,
        end,
        audio,
        cues: Object.fromEntries(Object.entries(cues).map(([k, s]) => [k, audioStart + s])),
        words: words.map((w) => ({ w: w.w, s: audioStart + w.s, e: audioStart + w.e })),
      });
      t = end;
    }
    chapters.push({ chapter, start: cStart, end: t });
  }
  return { scenes, total: t, chapters };
}

/** 음성이 아직 없을 때 쓰는 대략 길이(초). */
function estimate(say: string): number {
  return Math.max(3, clean(say).length / 7.2);
}

function clean(say: string): string {
  return say.replace(/\{[^}]+\}/g, "").replace(/\[([^|\]]*)\|([^\]]*)\]/g, "$2");
}

/** 음성이 없을 때 글자 위치 비율로 큐 시각을 어림한다. */
function estimateCues(say: string, dur: number): Record<string, number> {
  const out: Record<string, number> = {};
  const total = clean(say).length || 1;
  let pos = 0;
  let i = 0;
  while (i < say.length) {
    if (say[i] === "{") {
      const end = say.indexOf("}", i);
      out[say.slice(i + 1, end)] = (pos / total) * dur;
      i = end + 1;
    } else if (say[i] === "[") {
      const end = say.indexOf("]", i);
      const bar = say.indexOf("|", i);
      pos += end - bar - 1;
      i = end + 1;
    } else {
      pos++;
      i++;
    }
  }
  return out;
}

/** 초 → 프레임 */
export const sec = (s: number) => Math.round(s * VIDEO.fps);
