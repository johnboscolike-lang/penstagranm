import { describe, expect, it } from "vitest";

import { CHOICE_COUNT, VOCABULARY, generateQuestions, isQuizCategory, toPublicQuestions } from "@/utils/quiz-bank";
import { createSeededRng, randomInt, shuffled } from "@/utils/rng";

/**
 * 수학 문제 글자에서 정답을 다시 계산한다. (÷ − × 도 처리)
 */
function solve(prompt: string): number {
  const match = prompt.match(/^(\d+) ([+−×÷]) (\d+) = \?$/);
  if (!match) {
    throw new Error(`알 수 없는 수학 문제: ${prompt}`);
  }
  const left = Number(match[1]);
  const right = Number(match[3]);

  return { "+": left + right, "−": left - right, "×": left * right, "÷": left / right }[match[2] as "+" | "−" | "×" | "÷"];
}

describe("난수와 섞기", () => {
  it("같은 시드면 같은 숫자 순서가 나온다", () => {
    const first = createSeededRng(7);
    const second = createSeededRng(7);

    expect([first(), first(), first()]).toEqual([second(), second(), second()]);
    expect(createSeededRng(8)()).not.toBe(createSeededRng(7)());
  });

  it("정수 뽑기는 범위 안이고, 섞어도 원본은 그대로이며 내용은 같다", () => {
    const rng = createSeededRng(3);
    for (let i = 0; i < 200; i += 1) {
      const value = randomInt(rng, 2, 9);

      expect(value).toBeGreaterThanOrEqual(2);
      expect(value).toBeLessThanOrEqual(9);
    }
    const original = [1, 2, 3, 4, 5];
    const result = shuffled(createSeededRng(5), original);

    expect(original).toEqual([1, 2, 3, 4, 5]);
    expect([...result].sort()).toEqual(original);
  });
});

describe("퀴즈 은행", () => {
  it("같은 시드는 같은 문제를, 다른 시드는 다른 문제를 만든다", () => {
    expect(generateQuestions("MIX", 123)).toEqual(generateQuestions("MIX", 123));
    expect(generateQuestions("MIX", 123)).not.toEqual(generateQuestions("MIX", 124));
  });

  it("분류에 맞게 문제를 만들고 섞어서에서는 수학과 영어가 번갈아 나온다", () => {
    expect(generateQuestions("MATH", 1).every((question) => question.kind === "MATH")).toBe(true);
    expect(generateQuestions("ENGLISH", 1).every((question) => question.kind === "ENGLISH")).toBe(true);
    expect(generateQuestions("MIX", 1).map((question) => question.kind)).toEqual(["MATH", "ENGLISH", "MATH", "ENGLISH", "MATH"]);
    expect(generateQuestions("MATH", 9, 8)).toHaveLength(8);
  });

  it.each(Array.from({ length: 60 }, (_, index) => index + 1))("시드 %i: 보기는 4개이고 겹치지 않으며 정답 위치가 맞다", (seed) => {
    generateQuestions("MIX", seed * 7919).forEach((question) => {
      expect(question.choices).toHaveLength(CHOICE_COUNT);
      expect(new Set(question.choices).size).toBe(CHOICE_COUNT);
      expect(question.answerIndex).toBeGreaterThanOrEqual(0);
      expect(question.answerIndex).toBeLessThan(CHOICE_COUNT);

      if (question.kind === "MATH") {
        expect(Number(question.choices[question.answerIndex])).toBe(solve(question.prompt));
        question.choices.forEach((choice) => expect(Number(choice)).toBeGreaterThan(0));
      }
    });
  });

  it("영어 문제의 정답은 실제 단어 뜻과 일치한다", () => {
    const meanings = new Map(VOCABULARY.map(([english, korean]) => [english, korean]));
    const reverse = new Map(VOCABULARY.map(([english, korean]) => [korean, english]));

    for (let seed = 1; seed <= 80; seed += 1) {
      generateQuestions("ENGLISH", seed).forEach((question) => {
        const answer = question.choices[question.answerIndex];
        const quoted = question.prompt.match(/^"(.+)" /)?.[1] ?? "";

        if (question.prompt.includes("의 뜻은")) {
          expect(meanings.get(quoted)).toBe(answer);
        } else {
          expect(reverse.get(quoted)).toBe(answer);
        }
      });
    }
  });

  it("단어장에 같은 영어 단어나 같은 뜻이 두 번 들어 있지 않다", () => {
    expect(new Set(VOCABULARY.map(([english]) => english)).size).toBe(VOCABULARY.length);
    expect(new Set(VOCABULARY.map(([, korean]) => korean)).size).toBe(VOCABULARY.length);
  });

  it("화면으로 보내는 문제에는 정답 위치가 들어 있지 않다", () => {
    toPublicQuestions(generateQuestions("MIX", 5)).forEach((question) => {
      expect(Object.keys(question).sort()).toEqual(["choices", "kind", "prompt"]);
    });
  });

  it("분류 이름을 검사한다", () => {
    expect(isQuizCategory("MATH")).toBe(true);
    expect(isQuizCategory("과학")).toBe(false);
  });
});
