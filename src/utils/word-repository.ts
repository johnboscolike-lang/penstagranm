import { Prisma } from "@prisma/client";

import type { WordAnswerView, WordBookItem, WordSessionView } from "@/utils/word-types";
import { getKstDateKey } from "@/utils/kst";
import { prisma } from "@/utils/prisma";
import { QuestError, type DbClient } from "@/utils/quest-repository";
import { CHOICE_COUNT, VOCABULARY } from "@/utils/quiz-bank";
import {
  buildWordQuestion,
  isMastered,
  memoryStrength,
  nextMeetLabel,
  planSession,
  reviewWord,
  reviewedToday,
  type StoredWordCard,
} from "@/utils/word-review";

const BOOK_SIZE = 12;

interface CardRow extends StoredWordCard {
  id: string;
  createdAt: Date;
}

/**
 * 그 학생의 단어 카드를 모두 읽는다.
 */
async function loadCards(client: DbClient, studentId: string): Promise<CardRow[]> {
  return client.wordCard.findMany({ where: { studentId } });
}

/**
 * 문제와 계획이 같은 값에서 나오도록 학생과 날짜를 합친 시드 글자.
 */
function seedTextFor(studentId: string, todayKey: string): string {
  return `${studentId}:${todayKey}`;
}

/**
 * 오늘 처음 만난 새 단어 수.
 */
function countNewToday(cards: readonly CardRow[], todayKey: string): number {
  return cards.filter((card) => getKstDateKey(card.createdAt) === todayKey).length;
}

/**
 * 학생의 단어 복습 화면 데이터: 오늘의 문제(정답 없이), 진행 정도, 내 단어장.
 */
export async function getWordSession(studentId: string, now: Date = new Date()): Promise<WordSessionView> {
  const todayKey = getKstDateKey(now);
  const cards = await loadCards(prisma, studentId);
  const plan = planSession(cards, countNewToday(cards, todayKey), todayKey, studentId);
  const seed = seedTextFor(studentId, todayKey);

  const questions = plan.words.flatMap((item) => {
    const question = buildWordQuestion(item.word, seed);
    if (!question) {
      return [];
    }
    const { answerIndex: hidden, ...visible } = question;
    void hidden;

    return [{ ...visible, stage: item.stage }];
  });

  const meaning = new Map(VOCABULARY);
  const book: WordBookItem[] = cards
    .map((card) => ({ card, strength: memoryStrength(card, now) }))
    .sort((left, right) => left.strength - right.strength || left.card.word.localeCompare(right.card.word))
    .slice(0, BOOK_SIZE)
    .map(({ card, strength }) => ({
      word: card.word,
      meaning: meaning.get(card.word) ?? "",
      strength: Math.round(strength * 100),
      mastered: isMastered(card),
      nextLabel: reviewedToday(card, todayKey) ? nextMeetLabel(card.scheduledDays) : "오늘 만나요",
    }));

  return {
    todayKey,
    questions,
    doneToday: plan.doneToday,
    newLeft: plan.newLeft,
    stats: { learning: cards.length, mastered: cards.filter((card) => isMastered(card)).length },
    book,
  };
}

/**
 * 단어 문제 하나의 답을 채점하고 복습 일정을 갱신한다.
 * 정답은 저장하지 않고 학생·날짜·단어로 문제를 다시 만들어 비교하므로 응답을 훔쳐볼 수 없다.
 * 오늘의 계획에 없는 단어(이미 복습했거나 오늘 차례가 아님)는 받지 않아 점수 놀이를 막는다.
 */
export async function answerWord(input: { studentId: string; word: string; choice: number; now?: Date }): Promise<WordAnswerView> {
  const now = input.now ?? new Date();
  const todayKey = getKstDateKey(now);
  if (!Number.isInteger(input.choice) || input.choice < 0 || input.choice >= CHOICE_COUNT) {
    throw new QuestError("INVALID", "보기에서 하나를 골라 주세요.");
  }

  const cards = await loadCards(prisma, input.studentId);
  const existing = cards.find((card) => card.word === input.word) ?? null;
  const question = buildWordQuestion(input.word, seedTextFor(input.studentId, todayKey));
  if (!question) {
    throw new QuestError("NOT_FOUND", "없는 단어예요.");
  }
  if (existing && reviewedToday(existing, todayKey)) {
    throw new QuestError("LOCKED", "이 단어는 오늘 이미 복습했어요.");
  }
  const plan = planSession(cards, countNewToday(cards, todayKey), todayKey, input.studentId);
  if (!plan.words.some((item) => item.word === input.word)) {
    throw new QuestError("LOCKED", "오늘 복습할 단어가 아니에요.");
  }

  const correct = input.choice === question.answerIndex;
  const outcome = reviewWord(input.word, existing, correct, now);
  const data = {
    due: outcome.card.due,
    stability: outcome.card.stability,
    difficulty: outcome.card.difficulty,
    scheduledDays: outcome.card.scheduledDays,
    learningSteps: outcome.card.learningSteps,
    reps: outcome.card.reps,
    lapses: outcome.card.lapses,
    state: outcome.card.state,
    lastReview: outcome.card.lastReview,
  };

  try {
    if (existing) {
      // 같은 단어에 답이 동시에 두 번 오면 마지막 복습 시각이 달라져 한 번만 반영된다.
      const updated = await prisma.wordCard.updateMany({ where: { id: existing.id, lastReview: existing.lastReview }, data });
      if (updated.count === 0) {
        throw new QuestError("LOCKED", "이 단어는 오늘 이미 복습했어요.");
      }
    } else {
      await prisma.wordCard.create({ data: { studentId: input.studentId, word: input.word, createdAt: now, ...data } });
    }
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new QuestError("LOCKED", "이 단어는 오늘 이미 복습했어요.");
    }
    throw error;
  }

  return {
    correct,
    answerIndex: question.answerIndex,
    answerText: question.choices[question.answerIndex],
    intervalDays: outcome.intervalDays,
    nextLabel: nextMeetLabel(outcome.intervalDays),
    mastered: isMastered(outcome.card),
  };
}
