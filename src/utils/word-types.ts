import type { PublicQuestion } from "@/utils/quiz-bank";

export interface WordQuestionView extends PublicQuestion {
  word: string;
  stage: "NEW" | "REVIEW";
}

export interface WordBookItem {
  word: string;
  meaning: string;
  /** 지금 기억에 남아 있을 정도 (0~100) */
  strength: number;
  mastered: boolean;
  nextLabel: string;
}

export interface WordSessionView {
  todayKey: string;
  questions: WordQuestionView[];
  /** 오늘 이미 복습을 마친 단어 수 */
  doneToday: number;
  /** 오늘 더 받을 수 있는 새 단어 수 */
  newLeft: number;
  stats: { learning: number; mastered: number };
  /** 기억이 약해진 순서로 보여 주는 내 단어장 일부 */
  book: WordBookItem[];
}

export interface WordAnswerView {
  correct: boolean;
  answerIndex: number;
  answerText: string;
  intervalDays: number;
  nextLabel: string;
  mastered: boolean;
}
