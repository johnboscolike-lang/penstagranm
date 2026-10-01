import { CHOICE_COUNT, VOCABULARY } from "@/utils/quiz-bank";
import { createSeededRng, shuffled } from "@/utils/rng";

/** 한 판의 길이(초) */
export const GAME_SECONDS = 30;
/** 결과를 받으려면 시작한 지 적어도 이만큼은 지나 있어야 한다 (게임이 끝나기 전에 보내는 결과를 막는다) */
export const MIN_FINISH_SECONDS = 26;
/** 시작한 뒤 이 시간이 지나면 결과를 받지 않는다 */
export const MAX_FINISH_SECONDS = 600;
/** 한 번 맞히면 받는 기본 점수 */
export const POINTS_PER_HIT = 10;
/** 연속으로 맞힐 때마다 더해지는 점수와 그 한도 */
export const COMBO_STEP = 2;
export const COMBO_MAX_STEPS = 5;
/** 한 번 맞혀서 받을 수 있는 가장 큰 점수 */
export const MAX_POINTS_PER_HIT = POINTS_PER_HIT + COMBO_STEP * COMBO_MAX_STEPS;
/** 사람이 한 문제를 보고 몬스터를 누르는 데 걸리는 가장 짧은 시간(초). 이보다 빠른 기록은 믿지 않는다 */
export const MIN_ROUND_SECONDS = 0.7;
/** 하루에 시작할 수 있는 판 수 */
export const MAX_RUNS_PER_DAY = 6;
/** 하루에 보상을 받는 판 수 */
export const MAX_REWARDED_RUNS_PER_DAY = 2;
/** 한 판에 몬스터가 등장하는 수 */
export const MONSTERS_PER_ROUND = 4;

/** 점수 구간별 보상. 놀이가 공부보다 커지지 않도록 아주 작게 둔다. */
export const REWARD_TIERS: readonly { min: number; xp: number; coins: number }[] = [
  { min: 140, xp: 4, coins: 2 },
  { min: 60, xp: 2, coins: 1 },
];

export interface RoundSetup {
  /** 화면 위에 보여 줄 한국어 뜻 */
  prompt: string;
  /** 정답 영어 단어 */
  answer: string;
  /** 몬스터가 들고 나오는 영어 단어들 (정답 포함, 섞여 있음) */
  options: string[];
}

export interface RunResult {
  score: number;
  hits: number;
  misses: number;
}

/**
 * 연속 적중 수(combo)를 보고 이번 적중의 점수를 계산한다.
 */
export function hitPoints(combo: number): number {
  return POINTS_PER_HIT + COMBO_STEP * Math.min(Math.max(0, Math.floor(combo)), COMBO_MAX_STEPS);
}

/**
 * 점수에 맞는 보상.
 */
export function rewardForScore(score: number): { xp: number; coins: number } {
  const tier = REWARD_TIERS.find((item) => score >= item.min);

  return tier ? { xp: tier.xp, coins: tier.coins } : { xp: 0, coins: 0 };
}

/**
 * 걸린 시간 안에 낼 수 있는 가장 큰 점수. 이보다 높은 기록은 믿지 않는다.
 */
export function maxPlausibleScore(elapsedSeconds: number): number {
  return Math.floor(Math.min(elapsedSeconds, GAME_SECONDS + 5) / MIN_ROUND_SECONDS) * MAX_POINTS_PER_HIT;
}

/**
 * 게임이 보낸 결과가 앞뒤가 맞는지 확인하고, 안 맞으면 이유를 알려 준다.
 * 점수는 적중 수에서 정해지고(한 번에 10~20점), 적중과 실수의 합은 걸린 시간 안에 가능한 판 수를 넘을 수 없다.
 */
export function explainResultProblem(result: RunResult, elapsedSeconds: number): string | null {
  const numbers = [result.score, result.hits, result.misses];
  if (numbers.some((value) => !Number.isInteger(value) || value < 0)) {
    return "게임 결과가 올바르지 않아요.";
  }
  if (elapsedSeconds < MIN_FINISH_SECONDS) {
    return "게임이 아직 끝나지 않았어요.";
  }
  if (elapsedSeconds > MAX_FINISH_SECONDS) {
    return "시간이 너무 지나서 이 판의 결과는 받을 수 없어요.";
  }
  const rounds = result.hits + result.misses;
  if (rounds > Math.floor((GAME_SECONDS + 5) / MIN_ROUND_SECONDS)) {
    return "게임 결과가 올바르지 않아요.";
  }
  if (result.score < result.hits * POINTS_PER_HIT || result.score > result.hits * MAX_POINTS_PER_HIT) {
    return "게임 결과가 올바르지 않아요.";
  }
  if (result.score > maxPlausibleScore(elapsedSeconds)) {
    return "게임 결과가 올바르지 않아요.";
  }

  return null;
}

/**
 * 오늘 몇 판을 더 시작할 수 있는지, 보상은 몇 번 더 받을 수 있는지.
 */
export function runsLeft(startedToday: number, rewardedToday: number): { runs: number; rewards: number } {
  return { runs: Math.max(0, MAX_RUNS_PER_DAY - startedToday), rewards: Math.max(0, MAX_REWARDED_RUNS_PER_DAY - rewardedToday) };
}

/**
 * 한 판에 쓸 라운드들을 시드에서 만든다. 라운드마다 영어 단어 4개 중 하나가 정답이고, 같은 단어가 연달아 정답이 되지 않는다.
 */
export function buildRounds(seed: number, count: number, vocabulary: readonly (readonly [string, string])[] = VOCABULARY): RoundSetup[] {
  const rng = createSeededRng(seed);
  const order = shuffled(rng, vocabulary);
  const rounds: RoundSetup[] = [];

  for (let index = 0; index < count; index += 1) {
    const [answer, prompt] = order[index % order.length];
    const others = shuffled(rng, vocabulary.filter(([word]) => word !== answer)).slice(0, MONSTERS_PER_ROUND - 1).map(([word]) => word);
    rounds.push({ prompt, answer, options: shuffled(rng, [answer, ...others]) });
  }

  return rounds;
}

export { CHOICE_COUNT };
