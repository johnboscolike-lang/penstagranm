import type { Lesson } from "./types.ts";
import { l01 } from "./l01/index.ts";
import { l02 } from "./l02/index.ts";
import { l03 } from "./l03/index.ts";
import { l04 } from "./l04/index.ts";

/** 만들어진 강의 목록. 새 강을 만들면 여기에 등록한다. */
export const LESSONS: Record<string, Lesson> = { [l01.id]: l01, [l02.id]: l02, [l03.id]: l03, [l04.id]: l04 };

/**
 * 강의 id로 대본을 찾는다.
 * @param id 강의 id (예: t01)
 * @returns 강의 대본
 */
export function getLesson(id: string): Lesson {
  const l = LESSONS[id];
  if (!l) throw new Error(`없는 강의: ${id} (있는 강의: ${Object.keys(LESSONS).join(", ")})`);
  return l;
}
