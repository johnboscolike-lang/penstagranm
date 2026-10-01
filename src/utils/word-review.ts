import { createEmptyCard, fsrs, generatorParameters, Rating, State, type Card } from "ts-fsrs";

import { getKstDateKey } from "@/utils/kst";
import { CHOICE_COUNT, VOCABULARY, type PublicQuestion } from "@/utils/quiz-bank";
import { createSeededRng, hashSeed, shuffled } from "@/utils/rng";

/** 하루에 새로 만나는 단어 수 */
export const NEW_WORDS_PER_DAY = 4;
/** 하루에 복습할 단어 수의 상한 (새 단어 포함) */
export const MAX_WORDS_PER_DAY = 10;
/** 다음 복습까지 이 일수 이상 기억에 남으면 "익힌 단어"로 센다 */
export const MASTERED_DAYS = 7;

/**
 * 간격 반복 스케줄러(FSRS). 하루 단위 수업에 맞춰 분 단위 학습 단계는 끄고, 목표 기억률 90%, 최대 간격 180일로 둔다.
 * 날짜를 흩뜨리는 무작위(fuzz)는 꺼서 "내일 또 만나요" 같은 안내가 언제나 같게 한다.
 */
const scheduler = fsrs(generatorParameters({ enable_short_term: false, enable_fuzz: false, request_retention: 0.9, maximum_interval: 180 }));

/** DB에 저장하는 단어 카드의 모양 */
export interface StoredWordCard {
  word: string;
  due: Date;
  stability: number;
  difficulty: number;
  scheduledDays: number;
  learningSteps: number;
  reps: number;
  lapses: number;
  state: number;
  lastReview: Date | null;
}

export interface WordQuestion extends PublicQuestion {
  word: string;
  /** NEW: 처음 만나는 단어 / REVIEW: 다시 만나는 단어 */
  stage: "NEW" | "REVIEW";
}

export interface ReviewOutcome {
  card: StoredWordCard;
  /** 다음에 만나기까지 며칠 */
  intervalDays: number;
}

/**
 * 저장된 카드를 스케줄러가 쓰는 카드로 바꾼다.
 */
export function toSchedulerCard(row: StoredWordCard): Card {
  return {
    due: row.due,
    stability: row.stability,
    difficulty: row.difficulty,
    elapsed_days: 0,
    scheduled_days: row.scheduledDays,
    learning_steps: row.learningSteps,
    reps: row.reps,
    lapses: row.lapses,
    state: row.state as State,
    last_review: row.lastReview ?? undefined,
  };
}

/**
 * 스케줄러의 카드를 저장하는 모양으로 바꾼다.
 */
export function fromSchedulerCard(word: string, card: Card): StoredWordCard {
  return {
    word,
    due: card.due,
    stability: card.stability,
    difficulty: card.difficulty,
    scheduledDays: card.scheduled_days,
    learningSteps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    lastReview: card.last_review ?? null,
  };
}

/**
 * 단어 하나를 복습한 결과를 계산한다. 맞히면 Good(간격이 늘어남), 틀리면 Again(곧 다시 만남).
 * 저장된 카드가 없으면 처음 만난 단어로 시작한다.
 */
export function reviewWord(word: string, existing: StoredWordCard | null, correct: boolean, now: Date): ReviewOutcome {
  const base = existing ? toSchedulerCard(existing) : createEmptyCard(now);
  const { card } = scheduler.next(base, now, correct ? Rating.Good : Rating.Again);

  return { card: fromSchedulerCard(word, card), intervalDays: card.scheduled_days };
}

/**
 * 오늘 복습할 차례인지: 다시 만날 날(KST 날짜)이 오늘이거나 이미 지났다.
 */
export function isDueToday(card: Pick<StoredWordCard, "due">, todayKey: string): boolean {
  return getKstDateKey(card.due) <= todayKey;
}

/**
 * 오늘 이미 복습한 카드인지.
 */
export function reviewedToday(card: Pick<StoredWordCard, "lastReview">, todayKey: string): boolean {
  return card.lastReview !== null && getKstDateKey(card.lastReview) === todayKey;
}

/**
 * 기억이 오래 남을 만큼 익힌 단어인지.
 */
export function isMastered(card: Pick<StoredWordCard, "scheduledDays" | "state">): boolean {
  return card.state === State.Review && card.scheduledDays >= MASTERED_DAYS;
}

/**
 * 지금 이 단어가 기억에 남아 있을 확률(0~1). 처음 만난 카드는 0이다.
 */
export function memoryStrength(card: StoredWordCard, now: Date): number {
  if (card.state === State.New || card.lastReview === null) {
    return 0;
  }

  return Math.max(0, Math.min(1, scheduler.get_retrievability(toSchedulerCard(card), now, false)));
}

/**
 * 영어 단어 문제를 하나 만든다. 같은 학생·같은 날·같은 단어면 언제나 똑같은 문제(보기 순서까지)가 되어,
 * 서버가 정답을 저장하지 않고도 다시 계산해서 채점할 수 있다. 방향(단어→뜻 / 뜻→단어)도 시드가 정한다.
 */
export function buildWordQuestion(word: string, seedText: string): (WordQuestion & { answerIndex: number }) | null {
  const entry = VOCABULARY.find(([english]) => english === word);
  if (!entry) {
    return null;
  }
  const [english, korean] = entry;
  const rng = createSeededRng(hashSeed(`${seedText}:${word}`));
  const toKorean = rng() < 0.5;
  const others = VOCABULARY.filter(([other]) => other !== english);
  const answer = toKorean ? korean : english;
  const pool = [...new Set(others.map(([otherEnglish, otherKorean]) => (toKorean ? otherKorean : otherEnglish)).filter((item) => item !== answer))];
  const choices = shuffled(rng, [answer, ...shuffled(rng, pool).slice(0, CHOICE_COUNT - 1)]);

  return {
    kind: "ENGLISH",
    word,
    stage: "REVIEW",
    prompt: toKorean ? `"${english}" 의 뜻은?` : `"${korean}" 을(를) 영어로 하면?`,
    choices,
    answerIndex: choices.indexOf(answer),
  };
}

export interface SessionPlan {
  /** 오늘 만날 단어 순서. 다시 만날 단어가 먼저, 새 단어가 뒤 */
  words: { word: string; stage: "NEW" | "REVIEW" }[];
  /** 오늘 이미 복습을 마친 단어 수 */
  doneToday: number;
  /** 아직 만나지 않은 새 단어 중 오늘 더 받을 수 있는 수 */
  newLeft: number;
}

/**
 * 오늘의 복습 계획을 세운다.
 * 1) 다시 만날 날이 된 단어(오래 미룬 것부터) → 2) 새 단어(하루 NEW_WORDS_PER_DAY개까지, 오늘 이미 만난 새 단어는 빼고)
 * 합쳐서 하루 MAX_WORDS_PER_DAY개를 넘기지 않는다. 새 단어는 학생·날짜마다 정해진 순서로 골라서 새로 고침해도 같다.
 */
export function planSession(cards: readonly StoredWordCard[], newToday: number, todayKey: string, studentSeed: string, vocabulary: readonly string[] = VOCABULARY.map(([english]) => english)): SessionPlan {
  const doneToday = cards.filter((card) => reviewedToday(card, todayKey)).length;
  const due = cards
    .filter((card) => !reviewedToday(card, todayKey) && isDueToday(card, todayKey))
    .sort((left, right) => left.due.getTime() - right.due.getTime() || left.word.localeCompare(right.word))
    .map((card) => ({ word: card.word, stage: "REVIEW" as const }));

  const room = Math.max(0, MAX_WORDS_PER_DAY - doneToday - due.length);
  const newAllowed = Math.max(0, Math.min(NEW_WORDS_PER_DAY - newToday, room));
  // 전체 단어를 학생마다 정해진 순서로 한 번만 섞어 두고, 그중 아직 모르는 단어를 앞에서부터 고른다.
  // (모르는 단어 목록만 매번 섞으면, 한 단어에 답하는 순간 남은 새 단어가 다른 단어로 바뀌어 버린다.)
  const known = new Set(cards.map((card) => card.word));
  const fresh = shuffled(createSeededRng(hashSeed(`${studentSeed}:new`)), vocabulary)
    .filter((word) => !known.has(word))
    .slice(0, newAllowed)
    .map((word) => ({ word, stage: "NEW" as const }));

  return { words: [...due, ...fresh].slice(0, Math.max(0, MAX_WORDS_PER_DAY - doneToday)), doneToday, newLeft: Math.max(0, NEW_WORDS_PER_DAY - newToday - fresh.length) };
}

/**
 * 다음에 만나기까지의 안내 문구.
 */
export function nextMeetLabel(intervalDays: number): string {
  if (intervalDays <= 1) {
    return "내일 또 만나요";
  }

  return `${intervalDays}일 뒤에 또 만나요`;
}
