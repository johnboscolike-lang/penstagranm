import type { RoundSetup } from "@/utils/minigame-rules";

export interface MiniGameSummary {
  /** 오늘 시작한 판 수 */
  startedToday: number;
  /** 오늘 더 시작할 수 있는 판 수 */
  runsLeft: number;
  /** 오늘 보상을 더 받을 수 있는 판 수 */
  rewardsLeft: number;
  bestScore: number;
  totalPlays: number;
}

export interface MiniGameStart {
  runId: string;
  rounds: RoundSetup[];
  summary: MiniGameSummary;
}

export interface MiniGameFinish {
  score: number;
  hits: number;
  misses: number;
  xp: number;
  coins: number;
  /** 이번 판이 내 최고 점수인지 */
  newBest: boolean;
  summary: MiniGameSummary;
}
