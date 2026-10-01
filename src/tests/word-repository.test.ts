// @vitest-environment node
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { NEW_WORDS_PER_DAY } from "@/utils/word-review";
import { VOCABULARY } from "@/utils/quiz-bank";
import { buildWordQuestion } from "@/utils/word-review";
import { createTempDatabase } from "./helpers/temp-db";

type Words = typeof import("@/utils/word-repository");
type Boss = typeof import("@/utils/boss-repository");
type Achievements = typeof import("@/utils/achievement-repository");
type PrismaModule = typeof import("@/utils/prisma");

let words: Words;
let boss: Boss;
let achievements: Achievements;
let prisma: PrismaModule["prisma"];
let disposeDatabase: () => Promise<void>;
const ids: Record<string, string> = {};

const DAY = 86_400_000;
const MONDAY = new Date("2026-10-05T03:00:00Z"); // 한국 시간 2026-10-05(월) 12:00
const MONDAY_KEY = "2026-10-05";

/**
 * 그 날짜에 서버가 낸 문제의 정답 위치를 같은 방법으로 다시 계산한다.
 */
function answerFor(student: string, word: string, dateKey: string): number {
  return buildWordQuestion(word, `${ids[student]}:${dateKey}`)!.answerIndex;
}

/**
 * 오늘 세션의 문제를 모두 풀고, 맞힌 척(true)이나 틀린 척(false) 한다.
 */
async function answerAll(student: string, now: Date, dateKey: string, correct = true): Promise<string[]> {
  const session = await words.getWordSession(ids[student], now);
  const done: string[] = [];
  for (const question of session.questions) {
    const right = answerFor(student, question.word, dateKey);
    await words.answerWord({ studentId: ids[student], word: question.word, choice: correct ? right : (right + 1) % 4, now });
    done.push(question.word);
  }

  return done;
}

beforeAll(async () => {
  disposeDatabase = (await createTempDatabase()).dispose;
  words = await import("@/utils/word-repository");
  boss = await import("@/utils/boss-repository");
  achievements = await import("@/utils/achievement-repository");
  ({ prisma } = await import("@/utils/prisma"));

  const team = await prisma.team.create({ data: { name: "빨강팀", emblem: "star" } });
  for (const [key, name] of [["a", "가온"], ["b", "나래"]] as const) {
    ids[key] = (await prisma.student.create({ data: { name, hairKey: "silver", teamId: team.id } })).id;
  }
});

afterEach(async () => {
  await prisma.wordCard.deleteMany();
  await prisma.achievement.deleteMany();
});

afterAll(async () => {
  await disposeDatabase();
});

describe("오늘의 복습 화면", () => {
  it("처음에는 새 단어만 정해진 개수만큼 나오고, 정답은 들어 있지 않다", async () => {
    const session = await words.getWordSession(ids.a, MONDAY);

    expect(session.todayKey).toBe(MONDAY_KEY);
    expect(session.questions).toHaveLength(NEW_WORDS_PER_DAY);
    session.questions.forEach((question) => {
      expect(question.stage).toBe("NEW");
      expect(question.choices).toHaveLength(4);
    });
    expect(JSON.stringify(session)).not.toContain("answerIndex");
    expect(session.stats).toEqual({ learning: 0, mastered: 0 });
    expect(session.book).toEqual([]);
  });

  it("새로 고쳐도 같은 단어와 같은 보기 순서가 나온다", async () => {
    const first = await words.getWordSession(ids.a, MONDAY);
    const second = await words.getWordSession(ids.a, new Date(MONDAY.getTime() + 3_600_000));

    expect(second.questions).toEqual(first.questions);
  });

  it("학생마다 다른 단어를 받는다", async () => {
    const a = (await words.getWordSession(ids.a, MONDAY)).questions.map((question) => question.word);
    const b = (await words.getWordSession(ids.b, MONDAY)).questions.map((question) => question.word);

    expect(a).not.toEqual(b);
  });
});

describe("답 채점", () => {
  it("맞히면 카드가 생기고 다음 만남이 안내된다. 같은 단어는 오늘 다시 풀 수 없다", async () => {
    const [first] = (await words.getWordSession(ids.a, MONDAY)).questions;
    const right = answerFor("a", first.word, MONDAY_KEY);

    const result = await words.answerWord({ studentId: ids.a, word: first.word, choice: right, now: MONDAY });

    expect(result.correct).toBe(true);
    expect(result.answerIndex).toBe(right);
    expect(first.choices[right]).toBe(result.answerText);
    expect(result.intervalDays).toBeGreaterThanOrEqual(1);
    expect(result.nextLabel.length).toBeGreaterThan(0);
    expect(await prisma.wordCard.count({ where: { studentId: ids.a } })).toBe(1);

    await expect(words.answerWord({ studentId: ids.a, word: first.word, choice: right, now: MONDAY })).rejects.toMatchObject({ code: "LOCKED" });
    expect(await prisma.wordCard.count({ where: { studentId: ids.a } })).toBe(1);
  });

  it("틀리면 정답을 알려 주고 곧 다시 만나도록 일정이 잡힌다", async () => {
    const [first] = (await words.getWordSession(ids.a, MONDAY)).questions;
    const right = answerFor("a", first.word, MONDAY_KEY);

    const result = await words.answerWord({ studentId: ids.a, word: first.word, choice: (right + 1) % 4, now: MONDAY });

    expect(result.correct).toBe(false);
    expect(result.answerIndex).toBe(right);
    const meaning = new Map(VOCABULARY);
    expect([first.word, meaning.get(first.word)]).toContain(result.answerText);
    expect((await prisma.wordCard.findFirstOrThrow({ where: { studentId: ids.a } })).reps).toBe(1);
  });

  it("보기 번호가 잘못되었거나 없는 단어면 거절한다", async () => {
    const [first] = (await words.getWordSession(ids.a, MONDAY)).questions;

    for (const choice of [-1, 4, 1.5, Number.NaN]) {
      await expect(words.answerWord({ studentId: ids.a, word: first.word, choice, now: MONDAY })).rejects.toMatchObject({ code: "INVALID" });
    }
    await expect(words.answerWord({ studentId: ids.a, word: "zzz-not-a-word", choice: 0, now: MONDAY })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("오늘의 계획에 없는 단어는 풀 수 없다 (하루에 받는 새 단어 수를 지킨다)", async () => {
    const planned = new Set((await words.getWordSession(ids.a, MONDAY)).questions.map((question) => question.word));
    const outsider = VOCABULARY.map(([english]) => english).find((word) => !planned.has(word))!;

    await expect(words.answerWord({ studentId: ids.a, word: outsider, choice: 0, now: MONDAY })).rejects.toMatchObject({ code: "LOCKED" });
    expect(await prisma.wordCard.count()).toBe(0);
  });

  it("같은 단어에 답이 동시에 와도 한 번만 반영된다", async () => {
    const [first] = (await words.getWordSession(ids.a, MONDAY)).questions;
    const right = answerFor("a", first.word, MONDAY_KEY);

    const results = await Promise.allSettled(Array.from({ length: 4 }, () => words.answerWord({ studentId: ids.a, word: first.word, choice: right, now: MONDAY })));

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(await prisma.wordCard.count({ where: { studentId: ids.a } })).toBe(1);
    expect((await prisma.wordCard.findFirstOrThrow({ where: { studentId: ids.a } })).reps).toBe(1);
  });
});

describe("하루 한도와 다음 날 복습", () => {
  it("하루에 새 단어를 다 풀면 그날은 더 받지 않는다", async () => {
    const done = await answerAll("a", MONDAY, MONDAY_KEY);
    const after = await words.getWordSession(ids.a, MONDAY);

    expect(done).toHaveLength(NEW_WORDS_PER_DAY);
    expect(after.questions).toEqual([]);
    expect(after.doneToday).toBe(NEW_WORDS_PER_DAY);
    expect(after.newLeft).toBe(0);
    expect(after.stats.learning).toBe(NEW_WORDS_PER_DAY);
  });

  it("다음 날에는 다시 만날 단어가 먼저 나오고 새 단어가 이어진다", async () => {
    const monday = await answerAll("a", MONDAY, MONDAY_KEY, false); // 모두 틀려서 곧 다시 만난다
    const tuesday = new Date(MONDAY.getTime() + DAY);
    const session = await words.getWordSession(ids.a, tuesday);

    const review = session.questions.filter((question) => question.stage === "REVIEW").map((question) => question.word);
    expect(review.sort()).toEqual([...monday].sort());
    expect(session.questions.slice(0, review.length).every((question) => question.stage === "REVIEW")).toBe(true);
    expect(session.questions.some((question) => question.stage === "NEW")).toBe(true);
  });

  it("잘 익히면 단어장에서 익힌 단어로 세고, 간격이 길어져 며칠은 쉬어도 된다", async () => {
    let now = MONDAY;
    let dateKey = MONDAY_KEY;
    for (let round = 0; round < 6; round += 1) {
      await prisma.wordCard.updateMany({ data: { due: new Date(now.getTime() - 3_600_000) } }); // 계획을 빠르게 돌리려고 차례를 앞당긴다
      const wordsDone = await answerAll("a", now, dateKey);
      expect(wordsDone.length).toBeGreaterThan(0);
      now = new Date(now.getTime() + DAY);
      dateKey = new Date(now.getTime() + 9 * 3_600_000).toISOString().slice(0, 10);
    }
    const session = await words.getWordSession(ids.a, new Date(now.getTime() + DAY));

    expect(session.stats.learning).toBeGreaterThanOrEqual(NEW_WORDS_PER_DAY);
    expect(session.book.length).toBeGreaterThan(0);
    session.book.forEach((item) => {
      expect(item.strength).toBeGreaterThanOrEqual(0);
      expect(item.strength).toBeLessThanOrEqual(100);
      expect(item.meaning.length).toBeGreaterThan(0);
    });
  });

  it("다른 학생의 복습은 서로 영향을 주지 않는다", async () => {
    await answerAll("a", MONDAY, MONDAY_KEY);

    expect((await words.getWordSession(ids.b, MONDAY)).questions).toHaveLength(NEW_WORDS_PER_DAY);
    expect(await prisma.wordCard.count({ where: { studentId: ids.b } })).toBe(0);
  });
});

describe("보스와 업적 연동", () => {
  it("이번 주에 복습한 단어는 학급 보스에게 피해를 준다", async () => {
    const before = await boss.getRaidView(ids.a, MONDAY_KEY);
    await answerAll("a", MONDAY, MONDAY_KEY);
    const after = await boss.getRaidView(ids.a, MONDAY_KEY);

    expect(after.me.words).toBe(NEW_WORDS_PER_DAY);
    expect(after.damage - before.damage).toBe(NEW_WORDS_PER_DAY);
    expect(after.top.find((member) => member.isMe)?.words).toBe(NEW_WORDS_PER_DAY);
  });

  it("지난주에 복습한 단어는 이번 주 보스 피해에 들어가지 않는다", async () => {
    await answerAll("a", MONDAY, MONDAY_KEY);

    const nextWeek = await boss.getRaidView(ids.a, "2026-10-12");

    expect(nextWeek.me.words).toBe(0);
  });

  it("단어를 20개 만나면 단어 수집가 업적을 이룬다", async () => {
    await prisma.wordCard.createMany({
      data: VOCABULARY.slice(0, 20).map(([english]) => ({
        studentId: ids.a,
        word: english,
        due: MONDAY,
        stability: 3,
        difficulty: 5,
        scheduledDays: 3,
        reps: 1,
        lapses: 0,
        state: 2,
        lastReview: MONDAY,
      })),
    });

    const metrics = await achievements.collectMetrics(prisma, ids.a, 0);
    expect(metrics.wordsLearned).toBe(20);
    expect(metrics.wordsMastered).toBe(0);
    expect((await achievements.syncAchievements(prisma, ids.a, 0)).earned).toContain("word-collector");
  });

  it("다음 만남이 일주일 이상인 단어를 10개 익히면 단어 박사 업적을 이룬다", async () => {
    await prisma.wordCard.createMany({
      data: VOCABULARY.slice(0, 10).map(([english]) => ({
        studentId: ids.a,
        word: english,
        due: new Date(MONDAY.getTime() + 20 * DAY),
        stability: 20,
        difficulty: 4,
        scheduledDays: 20,
        reps: 4,
        lapses: 0,
        state: 2,
        lastReview: MONDAY,
      })),
    });

    expect((await achievements.collectMetrics(prisma, ids.a, 0)).wordsMastered).toBe(10);
    expect((await achievements.syncAchievements(prisma, ids.a, 0)).earned).toContain("word-master");
  });
});
