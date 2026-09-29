export const UNIT_KINDS = ["PAGE", "WORD", "LECTURE"] as const;

export type UnitKind = (typeof UNIT_KINDS)[number];

export interface PromiseTemplate {
  subject: string;
  title: string;
  unitKind: UnitKind;
  unitCount: number;
}

export interface PromiseRange {
  unitKind: UnitKind;
  unitStart: number;
  unitCount: number;
}

/**
 * 하루 약속 3칸의 기본 구성. 학생이 고르는 과목·분량의 데모용 기본값이다.
 */
export const DEFAULT_PROMISE_PLAN: readonly PromiseTemplate[] = [
  { subject: "국어", title: "예비 매3문", unitKind: "PAGE", unitCount: 6 },
  { subject: "수학", title: "올림포스", unitKind: "PAGE", unitCount: 4 },
  { subject: "영단어", title: "내가 고른 단어", unitKind: "WORD", unitCount: 15 },
] as const;

/**
 * 첫 약속에서 쓰는 시작 쪽수(국어 p.12, 수학 p.24).
 */
export const FIRST_PAGE_STARTS: readonly number[] = [12, 24, 1];

/**
 * Lists the absolute unit numbers (pages, words, lectures) covered by a promise range.
 */
export function listUnitNumbers(range: Pick<PromiseRange, "unitStart" | "unitCount">): number[] {
  return Array.from({ length: range.unitCount }, (_, index) => range.unitStart + index);
}

/**
 * Builds the short range label shown on the promise card (p.12~17, 15개, 3강).
 */
export function buildRangeLabel(range: PromiseRange): string {
  const last = range.unitStart + range.unitCount - 1;

  if (range.unitKind === "PAGE") {
    return range.unitCount === 1 ? `p.${range.unitStart}` : `p.${range.unitStart}~${last}`;
  }

  if (range.unitKind === "LECTURE") {
    return range.unitCount === 1 ? `${range.unitStart}강` : `${range.unitStart}~${last}강`;
  }

  return `${range.unitCount}개`;
}

/**
 * Returns the text printed on one unit square: the page number, or a running count for words.
 */
export function buildUnitLabel(kind: UnitKind, unitNo: number, unitStart: number): string {
  return kind === "PAGE" ? String(unitNo) : String(unitNo - unitStart + 1);
}

/**
 * Suggests the next range after a finished one: pages and lectures continue, words start over.
 */
export function suggestNextRange(previous: PromiseRange | null, template: PromiseTemplate, slotIndex: number): PromiseRange {
  if (template.unitKind === "WORD") {
    return { unitKind: "WORD", unitStart: 1, unitCount: template.unitCount };
  }

  const unitStart = previous ? previous.unitStart + previous.unitCount : (FIRST_PAGE_STARTS[slotIndex] ?? 1);

  return { unitKind: template.unitKind, unitStart, unitCount: template.unitCount };
}

/**
 * Picks the soft accent name used by the UI for a subject chip.
 */
export function getSubjectTone(subject: string): "rose" | "sky" | "leaf" | "sun" {
  if (subject.startsWith("국")) {
    return "rose";
  }

  if (subject.startsWith("수")) {
    return "sky";
  }

  if (subject.startsWith("영")) {
    return "leaf";
  }

  return "sun";
}
