import type { Outcome } from "@/utils/arena-rules";
import type { PublicQuestion, QuizCategory } from "@/utils/quiz-bank";

export interface LeagueView {
  key: string;
  name: string;
  icon: string;
}

export interface ArenaOpponentView {
  id: string;
  name: string;
  hairKey: string;
  teamName: string;
  rating: number;
  league: LeagueView;
  /** 지금은 도전할 수 없는 이유. 도전 가능하면 null */
  blockedReason: string | null;
}

export interface ArenaIncomingView {
  duelId: string;
  challengerName: string;
  hairKey: string;
  category: QuizCategory;
  categoryLabel: string;
  createdLabel: string;
}

export interface ArenaWaitingView {
  duelId: string;
  opponentName: string;
  hairKey: string;
  categoryLabel: string;
  /** CHALLENGER_TURN 이면 내가 이어서 풀어야 하는 대결 */
  resumable: boolean;
}

export interface ArenaResultView {
  duelId: string;
  opponentName: string;
  hairKey: string;
  categoryLabel: string;
  outcome: Outcome;
  myScore: number;
  theirScore: number;
  myCorrect: number;
  theirCorrect: number;
  ratingDelta: number;
  xp: number;
  coins: number;
  finishedLabel: string;
}

export interface ArenaRankRow {
  rank: number;
  studentId: string;
  name: string;
  hairKey: string;
  teamName: string;
  rating: number;
  league: LeagueView;
  isMe: boolean;
}

export interface ArenaTeamWins {
  teamName: string;
  wins: number;
}

export interface ArenaOverview {
  enabled: boolean;
  me: {
    rating: number;
    league: LeagueView;
    pointsToNext: number | null;
    nextLeagueName: string | null;
    wins: number;
    losses: number;
    draws: number;
    rank: number | null;
  };
  challengesLeft: number;
  incoming: ArenaIncomingView[];
  waiting: ArenaWaitingView[];
  results: ArenaResultView[];
  opponents: ArenaOpponentView[];
  leaderboard: ArenaRankRow[];
  teamWins: ArenaTeamWins[];
}

export interface DuelPlayer {
  name: string;
  hairKey: string;
}

export interface DuelStartView {
  duelId: string;
  category: QuizCategory;
  questions: PublicQuestion[];
  me: DuelPlayer;
  rival: DuelPlayer;
  /** 문제당 제한 시간(ms) */
  questionMs: number;
  /** 이미 낸 답의 수 (이어 풀기) */
  answered: number;
  /** 이미 낸 답이 맞았는지 */
  marks: boolean[];
}

export interface DuelSideResult {
  name: string;
  hairKey: string;
  correct: number;
  score: number;
  totalMs: number;
}

export interface DuelReviewItem {
  prompt: string;
  choices: string[];
  myChoice: number | null;
  answerIndex: number;
  correct: boolean;
}

export interface DuelResultView {
  duelId: string;
  /** WAITING: 상대가 아직 풀지 않음 / DONE: 승부가 났음 */
  state: "WAITING" | "DONE";
  me: DuelSideResult;
  rival: DuelSideResult | null;
  outcome: Outcome | null;
  ratingDelta: number;
  ratingAfter: number | null;
  leagueName: string;
  xp: number;
  coins: number;
  review: DuelReviewItem[] | null;
}
