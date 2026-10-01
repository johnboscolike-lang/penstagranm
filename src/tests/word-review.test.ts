import { describe, expect, it } from "vitest";

import { VOCABULARY } from "@/utils/quiz-bank";
import { hashSeed } from "@/utils/rng";
import {
  MASTERED_DAYS,
  MAX_WORDS_PER_DAY,
  NEW_WORDS_PER_DAY,
  buildWordQuestion,
  fromSchedulerCard,
  isDueToday,
  isMastered,
  memoryStrength,
  nextMeetLabel,
  planSession,
  reviewWord,
  reviewedToday,
  toSchedulerCard,
  type StoredWordCard,
} from "@/utils/word-review";

const DAY = 86_400_000;
const T0 = new Date("2026-10-01T05:00:00Z"); // 한국 시간 2026-10-01 14:00

/**
 * 테스트용 저장 카드를 만든다.
 */
function card(word: string, patch: Partial<StoredWordCard> = {}): StoredWordCard {
  return { word, due: new Date(T0.getTime() - DAY), stability: 3, difficulty: 5, scheduledDays: 3, learningSteps: 0, reps: 2, lapses: 0, state: 2, lastReview: new Date(T0.getTime() - 4 * DAY), ...patch };
}

describe("복습 결과 계산", () => {
  it("처음 만난 단어를 맞히면 며칠 뒤로, 틀리면 더 빨리 다시 만난다", () => {
    const good = reviewWord("apple", null, true, T0);
    const again = reviewWord("apple", null, false, T0);

    expect(good.card.reps).toBe(1);
    expect(good.intervalDays).toBeGreaterThanOrEqual(1);
    expect(again.intervalDays).toBeLessThan(good.intervalDays);
    expect(again.intervalDays).toBeGreaterThanOrEqual(1);
    expect(good.card.lastReview?.getTime()).toBe(T0.getTime());
    expect(good.card.due.getTime()).toBeGreaterThan(T0.getTime());
  });

  it("연속으로 맞히면 간격이 점점 길어지고, 틀리면 실수 횟수가 늘며 간격이 줄어든다", () => {
    let current = reviewWord("apple", null, true, T0);
    const intervals = [current.intervalDays];
    let now = current.card.due;
    for (let step = 0; step < 3; step += 1) {
      current = reviewWord("apple", current.card, true, now);
      intervals.push(current.intervalDays);
      now = current.card.due;
    }
    expect(intervals).toEqual([...intervals].sort((left, right) => left - right));
    expect(new Set(intervals).size).toBe(intervals.length);

    const slipped = reviewWord("apple", current.card, false, now);
    expect(slipped.card.lapses).toBe(1);
    expect(slipped.intervalDays).toBeLessThan(intervals[intervals.length - 1]);
  });

  it("아주 오래 맞혀도 간격은 최대 180일 언저리에서 멈춘다 (라이브러리가 단계 순서를 지키느라 하루 더하는 경우가 있다)", () => {
    let current = reviewWord("apple", null, true, T0);
    let now = current.card.due;
    for (let step = 0; step < 12; step += 1) {
      current = reviewWord("apple", current.card, true, now);
      now = current.card.due;
    }

    expect(current.intervalDays).toBeLessThanOrEqual(181);
    expect(current.intervalDays).toBeGreaterThan(100);
  });

  it("저장했다 불러온 카드로 이어서 계산해도 같은 결과가 나온다", () => {
    const first = reviewWord("apple", null, true, T0);
    const restored = fromSchedulerCard("apple", toSchedulerCard(JSON.parse(JSON.stringify(first.card), (key, value) => (key === "due" || key === "lastReview") && value ? new Date(value) : value)));

    expect(reviewWord("apple", restored, true, first.card.due).intervalDays).toBe(reviewWord("apple", first.card, true, first.card.due).intervalDays);
  });
});

describe("오늘 차례인지 판단", () => {
  it("다시 만날 날(KST)이 오늘이거나 지났으면 오늘 차례다", () => {
    expect(isDueToday({ due: new Date("2026-10-01T14:59:00Z") }, "2026-10-01")).toBe(true); // 한국 시간 10월 1일 23:59
    expect(isDueToday({ due: new Date("2026-10-01T15:00:00Z") }, "2026-10-01")).toBe(false); // 한국 시간 10월 2일 00:00
    expect(isDueToday({ due: new Date("2026-09-20T00:00:00Z") }, "2026-10-01")).toBe(true);
  });

  it("오늘 아침에 복습 시각이 늦어도 같은 날이면 오늘 복습할 수 있다", () => {
    const due = new Date("2026-10-01T09:00:00Z"); // 한국 시간 오후 6시
    expect(isDueToday({ due }, "2026-10-01")).toBe(true);
  });

  it("오늘 복습했는지는 마지막 복습의 한국 날짜로 본다", () => {
    expect(reviewedToday({ lastReview: new Date("2026-09-30T15:30:00Z") }, "2026-10-01")).toBe(true);
    expect(reviewedToday({ lastReview: new Date("2026-09-30T14:30:00Z") }, "2026-10-01")).toBe(false);
    expect(reviewedToday({ lastReview: null }, "2026-10-01")).toBe(false);
  });
});

describe("익힌 단어와 기억 정도", () => {
  it("다음 만남이 기준 일수 이상일 때만 익힌 단어다", () => {
    expect(isMastered({ scheduledDays: MASTERED_DAYS, state: 2 })).toBe(true);
    expect(isMastered({ scheduledDays: MASTERED_DAYS - 1, state: 2 })).toBe(false);
    expect(isMastered({ scheduledDays: 30, state: 0 })).toBe(false);
  });

  it("기억 정도는 시간이 지날수록 낮아지고, 처음 만난 카드는 0이다", () => {
    const stored = reviewWord("apple", null, true, T0).card;
    const soon = memoryStrength(stored, new Date(T0.getTime() + DAY));
    const later = memoryStrength(stored, new Date(T0.getTime() + 30 * DAY));

    expect(soon).toBeGreaterThan(later);
    expect(soon).toBeLessThanOrEqual(1);
    expect(later).toBeGreaterThanOrEqual(0);
    expect(memoryStrength(card("apple", { state: 0, lastReview: null }), T0)).toBe(0);
  });

  it("다음 만남 안내 문구", () => {
    expect(nextMeetLabel(1)).toBe("내일 또 만나요");
    expect(nextMeetLabel(0)).toBe("내일 또 만나요");
    expect(nextMeetLabel(14)).toBe("14일 뒤에 또 만나요");
  });
});

describe("오늘의 복습 계획", () => {
  const today = "2026-10-01";

  it("카드가 없으면 새 단어만 정해진 개수만큼 고른다", () => {
    const plan = planSession([], 0, today, "학생1");

    expect(plan.words).toHaveLength(NEW_WORDS_PER_DAY);
    plan.words.forEach((item) => expect(item.stage).toBe("NEW"));
    expect(new Set(plan.words.map((item) => item.word)).size).toBe(NEW_WORDS_PER_DAY);
    expect(plan.doneToday).toBe(0);
    expect(plan.newLeft).toBe(0);
  });

  it("다시 만날 단어가 먼저, 오래 미룬 것부터 나온다", () => {
    const cards = [
      card("cat", { due: new Date("2026-09-29T05:00:00Z") }),
      card("dog", { due: new Date("2026-09-25T05:00:00Z") }),
      card("bird", { due: new Date("2026-10-10T05:00:00Z") }),
    ];
    const plan = planSession(cards, 0, today, "학생1");

    expect(plan.words.slice(0, 2)).toEqual([
      { word: "dog", stage: "REVIEW" },
      { word: "cat", stage: "REVIEW" },
    ]);
    expect(plan.words.map((item) => item.word)).not.toContain("bird");
    expect(plan.words.slice(2).every((item) => item.stage === "NEW")).toBe(true);
  });

  it("하루 총량을 넘기지 않고, 다시 만날 단어가 많으면 새 단어는 줄어든다", () => {
    const many = VOCABULARY.slice(0, 20).map(([english]) => card(english));
    const plan = planSession(many, 0, today, "학생1");

    expect(plan.words).toHaveLength(MAX_WORDS_PER_DAY);
    expect(plan.words.every((item) => item.stage === "REVIEW")).toBe(true);
  });

  it("오늘 이미 복습한 단어는 빠지고, 오늘 만난 새 단어 수만큼 새 단어가 줄어든다", () => {
    const doneCard = card("cat", { lastReview: new Date("2026-10-01T01:00:00Z"), due: new Date("2026-10-04T01:00:00Z"), reps: 1 });
    const plan = planSession([doneCard], 1, today, "학생1");

    expect(plan.doneToday).toBe(1);
    expect(plan.words.map((item) => item.word)).not.toContain("cat");
    expect(plan.words).toHaveLength(NEW_WORDS_PER_DAY - 1);
    expect(MAX_WORDS_PER_DAY - plan.doneToday).toBeGreaterThanOrEqual(plan.words.length);
  });

  it("이미 카드가 있는 단어는 새 단어로 다시 나오지 않는다", () => {
    const known = VOCABULARY.slice(0, 90).map(([english]) => card(english, { due: new Date("2027-01-01T00:00:00Z") }));
    const plan = planSession(known, 0, today, "학생1");
    const knownSet = new Set(known.map((item) => item.word));

    plan.words.forEach((item) => expect(knownSet.has(item.word)).toBe(false));
    expect(plan.words.length).toBeLessThanOrEqual(VOCABULARY.length - 90);
  });

  it("새 단어에 하나씩 답해 가도 남은 새 단어는 처음 보여 준 그대로다", () => {
    const first = planSession([], 0, today, "학생1").words.map((item) => item.word);
    const answered: StoredWordCard[] = [];

    first.forEach((word, index) => {
      answered.push(card(word, { lastReview: new Date("2026-10-01T05:00:00Z"), due: new Date("2026-10-04T05:00:00Z"), reps: 1 }));
      const rest = planSession(answered, index + 1, today, "학생1").words.map((item) => item.word);

      expect(rest).toEqual(first.slice(index + 1));
    });
  });

  it("같은 학생·같은 날이면 새로 고쳐도 같은 계획이고, 학생마다 다르게 고른다", () => {
    const first = planSession([], 0, today, "학생1");

    expect(planSession([], 0, today, "학생1")).toEqual(first);
    expect(planSession([], 0, today, "학생2").words.map((item) => item.word)).not.toEqual(first.words.map((item) => item.word));
  });
});

describe("단어 문제 만들기", () => {
  it("같은 시드면 문제와 보기 순서가 언제나 같고 정답 위치가 맞다", () => {
    const seed = "학생1:2026-10-01";
    const first = buildWordQuestion("apple", seed);

    expect(first).not.toBeNull();
    expect(buildWordQuestion("apple", seed)).toEqual(first);
    expect(first!.choices).toHaveLength(4);
    expect(new Set(first!.choices).size).toBe(4);
    const [english, korean] = VOCABULARY.find(([word]) => word === "apple")!;
    expect([english, korean]).toContain(first!.choices[first!.answerIndex]);
  });

  it("정답이 영어 단어이거나 뜻이며, 단어에 따라 두 방향이 모두 나온다", () => {
    const directions = new Set<string>();
    VOCABULARY.slice(0, 40).forEach(([english, korean]) => {
      const question = buildWordQuestion(english, "학생1:2026-10-01")!;
      const answer = question.choices[question.answerIndex];
      directions.add(answer === korean ? "toKorean" : "toEnglish");
      expect([english, korean]).toContain(answer);
      expect(question.prompt).toContain(answer === korean ? english : korean);
    });

    expect(directions.size).toBe(2);
  });

  it("날짜나 학생이 달라지면 보기 순서가 달라질 수 있다", () => {
    const orders = new Set(["2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04", "2026-10-05"].map((day) => buildWordQuestion("apple", `학생1:${day}`)!.choices.join("|")));

    expect(orders.size).toBeGreaterThan(1);
  });

  it("없는 단어는 만들지 않는다", () => {
    expect(buildWordQuestion("zzz-not-a-word", "시드")).toBeNull();
  });

  it("시드 해시는 같은 글자에 같은 숫자를 주고 다른 글자에는 보통 다른 숫자를 준다", () => {
    expect(hashSeed("abc")).toBe(hashSeed("abc"));
    expect(hashSeed("abc")).not.toBe(hashSeed("abd"));
    expect(hashSeed("")).toBe(0x811c9dc5);
  });
});
