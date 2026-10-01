export const QUESTION_COUNT = 5;
export const QUESTION_MS = 12000;
export const START_RATING = 1000;
export const RATING_FLOOR = 800;
export const K_FACTOR = 24;
export const MAX_CHALLENGES_PER_DAY = 3;
export const MAX_PAIR_DUELS_PER_DAY = 2;
export const MAX_REWARDED_DUELS_PER_DAY = 5;
export const BASE_POINTS = 100;
export const MAX_SPEED_BONUS = 20;
export const EXPIRE_DAYS = 3;

export type Outcome = "WIN" | "LOSE" | "DRAW";

export interface League {
  key: "seed" | "sprout" | "flower" | "fruit" | "star";
  name: string;
  min: number;
  icon: string;
}

/** 리그(티어). 모두 자연 이름이라 순위가 낮아도 부담 없이 "자라는 중"으로 읽힌다. */
export const LEAGUES: readonly League[] = [
  { key: "seed", name: "씨앗 리그", min: 0, icon: "sprout" },
  { key: "sprout", name: "새싹 리그", min: 1000, icon: "sprout" },
  { key: "flower", name: "꽃 리그", min: 1080, icon: "gift" },
  { key: "fruit", name: "열매 리그", min: 1180, icon: "medal" },
  { key: "star", name: "별 리그", min: 1300, icon: "star" },
];

/**
 * 레이팅에 맞는 리그를 찾는다.
 */
export function leagueFor(rating: number): League {
  return [...LEAGUES].reverse().find((league) => rating >= league.min) ?? LEAGUES[0];
}

/**
 * 다음 리그까지 남은 점수. 마지막 리그면 null.
 */
export function pointsToNextLeague(rating: number): number | null {
  const next = LEAGUES.find((league) => league.min > rating);

  return next ? next.min - rating : null;
}

/**
 * 내가 이길 것으로 기대되는 확률 (0~1, Elo 공식).
 */
export function expectedScore(mine: number, theirs: number): number {
  return 1 / (1 + 10 ** ((theirs - mine) / 400));
}

/**
 * 한 판이 끝난 뒤 두 사람의 새 레이팅과 도전자의 변화량을 계산한다. 레이팅은 바닥(800) 아래로 내려가지 않는다.
 */
export function applyElo(challenger: number, opponent: number, outcome: Outcome): { challenger: number; opponent: number; delta: number } {
  const actual = outcome === "WIN" ? 1 : outcome === "DRAW" ? 0.5 : 0;
  const rawDelta = Math.round(K_FACTOR * (actual - expectedScore(challenger, opponent)));
  const nextChallenger = Math.max(RATING_FLOOR, challenger + rawDelta);
  const nextOpponent = Math.max(RATING_FLOOR, opponent - rawDelta);

  return { challenger: nextChallenger, opponent: nextOpponent, delta: nextChallenger - challenger };
}

export interface AnswerInput {
  choice: number | null;
  ms: number;
}

export interface ScoreResult {
  correct: number;
  score: number;
  totalMs: number;
  marks: boolean[];
}

/**
 * 답안을 채점한다. 맞으면 100점 + 빠를수록 최대 20점, 틀리거나 시간 초과면 0점.
 */
export function scoreAnswers(answerIndexes: readonly number[], answers: readonly AnswerInput[]): ScoreResult {
  let score = 0;
  let correct = 0;
  let totalMs = 0;
  const marks = answerIndexes.map((answerIndex, index) => {
    const answer = answers[index];
    const ms = Math.min(QUESTION_MS, Math.max(0, Math.round(answer?.ms ?? QUESTION_MS)));
    totalMs += ms;
    const isCorrect = answer?.choice === answerIndex && ms < QUESTION_MS;
    if (isCorrect) {
      correct += 1;
      score += BASE_POINTS + Math.floor(((QUESTION_MS - ms) / QUESTION_MS) * MAX_SPEED_BONUS);
    }

    return isCorrect;
  });

  return { correct, score, totalMs, marks };
}

/**
 * 답안이 올바른 모양인지 확인한다. (길이, 보기 번호, 시간)
 */
export function isValidAnswerSet(value: unknown, questionCount: number, choiceCount: number): value is AnswerInput[] {
  if (!Array.isArray(value) || value.length !== questionCount) {
    return false;
  }

  return value.every((item) => {
    if (typeof item !== "object" || item === null) {
      return false;
    }
    const { choice, ms } = item as Record<string, unknown>;
    const choiceOk = choice === null || (Number.isInteger(choice) && (choice as number) >= 0 && (choice as number) < choiceCount);

    return choiceOk && typeof ms === "number" && Number.isFinite(ms);
  });
}

/**
 * 두 점수를 비교해 도전자 기준 결과를 정한다.
 */
export function decideOutcome(challengerScore: number, opponentScore: number): Outcome {
  if (challengerScore === opponentScore) {
    return "DRAW";
  }

  return challengerScore > opponentScore ? "WIN" : "LOSE";
}

/**
 * 결과를 상대 입장에서 본 결과로 뒤집는다.
 */
export function flipOutcome(outcome: Outcome): Outcome {
  return outcome === "WIN" ? "LOSE" : outcome === "LOSE" ? "WIN" : "DRAW";
}

/**
 * 하루에 받을 수 있는 보상 횟수를 넘기면 0. 이기든 지든 참여 보상이 있다.
 */
export function rewardFor(outcome: Outcome, rewardedToday: number): { xp: number; coins: number } {
  if (rewardedToday >= MAX_REWARDED_DUELS_PER_DAY) {
    return { xp: 0, coins: 0 };
  }
  if (outcome === "WIN") {
    return { xp: 6, coins: 3 };
  }

  return outcome === "DRAW" ? { xp: 4, coins: 2 } : { xp: 3, coins: 1 };
}

export interface ChallengeCheck {
  enabled: boolean;
  isSelf: boolean;
  challengesToday: number;
  pairDuelsToday: number;
  openBetweenPair: boolean;
}

/**
 * 도전장을 낼 수 있는지 확인하고, 안 되면 학생에게 보여 줄 이유를 돌려준다.
 */
export function explainChallengeBlock(check: ChallengeCheck): string | null {
  if (!check.enabled) {
    return "지금은 선생님이 대결을 잠시 닫아 두었어요.";
  }
  if (check.isSelf) {
    return "나 자신과는 대결할 수 없어요. 친구를 골라 보세요.";
  }
  if (check.openBetweenPair) {
    return "이 친구와는 아직 끝나지 않은 대결이 있어요.";
  }
  if (check.challengesToday >= MAX_CHALLENGES_PER_DAY) {
    return `도전장은 하루에 ${MAX_CHALLENGES_PER_DAY}번까지 낼 수 있어요. 내일 또 도전해요!`;
  }
  if (check.pairDuelsToday >= MAX_PAIR_DUELS_PER_DAY) {
    return "오늘은 이 친구와 충분히 겨뤘어요. 다른 친구에게 도전해 보세요.";
  }

  return null;
}
