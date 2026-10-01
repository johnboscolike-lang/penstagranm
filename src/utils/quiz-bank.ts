import { createSeededRng, randomInt, shuffled } from "@/utils/rng";

export type QuizCategory = "MATH" | "ENGLISH" | "MIX";

export const QUIZ_CATEGORIES: readonly { key: QuizCategory; label: string; hint: string }[] = [
  { key: "MATH", label: "수학 계산", hint: "덧셈·뺄셈·곱셈·나눗셈" },
  { key: "ENGLISH", label: "영어 단어", hint: "뜻과 단어 맞히기" },
  { key: "MIX", label: "섞어서", hint: "수학과 영어를 골고루" },
];

export interface QuizQuestion {
  kind: "MATH" | "ENGLISH";
  prompt: string;
  choices: string[];
  answerIndex: number;
}

export interface PublicQuestion {
  kind: "MATH" | "ENGLISH";
  prompt: string;
  choices: string[];
}

export const CHOICE_COUNT = 4;

/** 초등 필수 영어 단어와 뜻 (약 100개) */
export const VOCABULARY: readonly (readonly [string, string])[] = [
  ["apple", "사과"], ["banana", "바나나"], ["grape", "포도"], ["orange", "오렌지"], ["strawberry", "딸기"],
  ["watermelon", "수박"], ["peach", "복숭아"], ["lemon", "레몬"], ["cat", "고양이"], ["dog", "강아지"],
  ["bird", "새"], ["fish", "물고기"], ["rabbit", "토끼"], ["tiger", "호랑이"], ["lion", "사자"],
  ["elephant", "코끼리"], ["monkey", "원숭이"], ["horse", "말"], ["cow", "소"], ["pig", "돼지"],
  ["duck", "오리"], ["chicken", "닭"], ["mouse", "쥐"], ["bear", "곰"], ["red", "빨강"],
  ["blue", "파랑"], ["yellow", "노랑"], ["green", "초록"], ["black", "검정"], ["white", "하양"],
  ["pink", "분홍"], ["purple", "보라"], ["brown", "갈색"], ["book", "책"], ["pencil", "연필"],
  ["eraser", "지우개"], ["desk", "책상"], ["chair", "의자"], ["bag", "가방"], ["ruler", "자"],
  ["school", "학교"], ["teacher", "선생님"], ["student", "학생"], ["friend", "친구"], ["mother", "어머니"],
  ["father", "아버지"], ["grandmother", "할머니"], ["grandfather", "할아버지"], ["baby", "아기"], ["one", "하나"],
  ["two", "둘"], ["three", "셋"], ["four", "넷"], ["five", "다섯"], ["six", "여섯"],
  ["seven", "일곱"], ["eight", "여덟"], ["nine", "아홉"], ["ten", "열"], ["big", "큰"],
  ["small", "작은"], ["happy", "행복한"], ["sad", "슬픈"], ["hot", "뜨거운"], ["cold", "차가운"],
  ["fast", "빠른"], ["slow", "느린"], ["run", "달리다"], ["jump", "뛰다"], ["eat", "먹다"],
  ["drink", "마시다"], ["sleep", "자다"], ["read", "읽다"], ["write", "쓰다"], ["sing", "노래하다"],
  ["dance", "춤추다"], ["swim", "수영하다"], ["water", "물"], ["milk", "우유"], ["bread", "빵"],
  ["rice", "밥"], ["sun", "해"], ["moon", "달"], ["star", "별"], ["rain", "비"],
  ["snow", "눈"], ["wind", "바람"], ["tree", "나무"], ["flower", "꽃"], ["house", "집"],
  ["door", "문"], ["window", "창문"], ["car", "자동차"], ["bus", "버스"], ["train", "기차"],
  ["ball", "공"], ["music", "음악"], ["morning", "아침"], ["night", "밤"],
];

/**
 * 정답과 겹치지 않는 보기 여러 개를 채워 넣고 섞어서 [보기, 정답 위치]를 돌려준다.
 */
function buildChoices(rng: () => number, answer: string, distractors: readonly string[]): { choices: string[]; answerIndex: number } {
  const unique = [...new Set(distractors.filter((item) => item !== answer))];
  const picked = shuffled(rng, unique).slice(0, CHOICE_COUNT - 1);
  const choices = shuffled(rng, [answer, ...picked]);

  return { choices, answerIndex: choices.indexOf(answer) };
}

/**
 * 수학 문제 하나를 만든다: 덧셈·뺄셈·곱셈·나눗셈 중 하나.
 */
function makeMathQuestion(rng: () => number, index: number): QuizQuestion {
  const type = (index + randomInt(rng, 0, 3)) % 4;
  let prompt = "";
  let answer = 0;

  if (type === 0) {
    const left = randomInt(rng, 12, 68);
    const right = randomInt(rng, 11, 39);
    prompt = `${left} + ${right} = ?`;
    answer = left + right;
  } else if (type === 1) {
    const left = randomInt(rng, 40, 99);
    const right = randomInt(rng, 11, left - 5);
    prompt = `${left} − ${right} = ?`;
    answer = left - right;
  } else if (type === 2) {
    const left = randomInt(rng, 3, 9);
    const right = randomInt(rng, 3, 9);
    prompt = `${left} × ${right} = ?`;
    answer = left * right;
  } else {
    const divisor = randomInt(rng, 2, 9);
    const quotient = randomInt(rng, 3, 9);
    prompt = `${divisor * quotient} ÷ ${divisor} = ?`;
    answer = quotient;
  }

  const near = [1, 2, 3, 5, 10].flatMap((gap) => [answer + gap, answer - gap]).filter((value) => value > 0);
  const { choices, answerIndex } = buildChoices(rng, String(answer), near.map(String));

  return { kind: "MATH", prompt, choices, answerIndex };
}

/**
 * 영어 단어 문제 하나를 만든다: 단어→뜻 또는 뜻→단어.
 */
function makeEnglishQuestion(rng: () => number, index: number): QuizQuestion {
  const [english, korean] = VOCABULARY[randomInt(rng, 0, VOCABULARY.length - 1)];
  const others = VOCABULARY.filter(([word]) => word !== english);

  if ((index + randomInt(rng, 0, 1)) % 2 === 0) {
    const { choices, answerIndex } = buildChoices(rng, korean, others.map(([, meaning]) => meaning));

    return { kind: "ENGLISH", prompt: `"${english}" 의 뜻은?`, choices, answerIndex };
  }

  const { choices, answerIndex } = buildChoices(rng, english, others.map(([word]) => word));

  return { kind: "ENGLISH", prompt: `"${korean}" 을(를) 영어로 하면?`, choices, answerIndex };
}

/**
 * 시드에서 같은 문제 세트를 언제나 똑같이 만든다. 대결하는 두 사람이 같은 문제를 푼다.
 */
export function generateQuestions(category: QuizCategory, seed: number, count = 5): QuizQuestion[] {
  const rng = createSeededRng(seed);

  return Array.from({ length: count }, (_, index) => {
    const kind = category === "MIX" ? (index % 2 === 0 ? "MATH" : "ENGLISH") : category;

    return kind === "MATH" ? makeMathQuestion(rng, index) : makeEnglishQuestion(rng, index);
  });
}

/**
 * 정답 위치를 빼고 화면에 보낼 수 있는 모양으로 바꾼다.
 */
export function toPublicQuestions(questions: readonly QuizQuestion[]): PublicQuestion[] {
  return questions.map(({ kind, prompt, choices }) => ({ kind, prompt, choices }));
}

/**
 * 분류 이름이 올바른지 확인한다.
 */
export function isQuizCategory(value: string): value is QuizCategory {
  return QUIZ_CATEGORIES.some((category) => category.key === value);
}
