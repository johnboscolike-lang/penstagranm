import type { GetServerSideProps, InferGetServerSidePropsType } from "next";

import { ChallengePanel } from "@/components/challenge/ChallengePanel";
import { GameShell } from "@/components/GameShell";
import { ChallengeScene } from "@/components/scenes/ChallengeScene";
import { getLatestTeacherComment } from "@/utils/repository";
import { getPageBase, getTodayView, getWeekBoardView, loadRoster } from "@/utils/quest-repository";
import type { WeekBoard } from "@/utils/quest-board";
import type { HudView, TodayView } from "@/utils/quest-types";

const BRIDGE_TILES = 8;
const DEFAULT_FEEDBACK = { who: "국어 선생님", text: "막힌 곳을 표시한 점이 좋아요!" };

interface ChallengePageProps {
  hud: HudView;
  today: TodayView;
  board: WeekBoard;
  myTeamId: string | null;
  litTiles: number;
  feedback: { who: string; text: string };
  initialTab: "today" | "week";
}

/**
 * Loads today's promises, the weekly boards, and the newest teacher feedback for the owl's speech bubble.
 */
export const getServerSideProps: GetServerSideProps<ChallengePageProps> = async (context) => {
  const { hud, meId, todayKey } = await getPageBase();
  const [today, board, roster, comment] = await Promise.all([
    getTodayView(meId, todayKey),
    getWeekBoardView(todayKey),
    loadRoster(),
    getLatestTeacherComment(),
  ]);
  const myTeamId = roster.me.teamId;
  const myTeamScore = board.teams.find((team) => team.teamId === myTeamId)?.score ?? 0;

  return {
    props: {
      hud,
      today,
      board,
      myTeamId,
      litTiles: Math.round((myTeamScore / 100) * BRIDGE_TILES),
      feedback: comment ? { who: comment.who, text: comment.body } : DEFAULT_FEEDBACK,
      initialTab: context.query.tab === "week" ? "week" : "today",
    },
  };
};

/**
 * 주간도전 공간: 오늘 약속 3칸, 이번 주 개인·팀 순위, 참여 보상 진행.
 */
export default function ChallengePage({
  hud,
  today,
  board,
  myTeamId,
  litTiles,
  feedback,
  initialTab,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (
    <GameShell
      banner="매주 월요일 새 출발"
      hud={hud}
      pageTitle="주간도전"
      scene={<ChallengeScene bubble={feedback} hairKey={hud.hairKey} litTiles={litTiles} teamName={hud.teamName} totalTiles={BRIDGE_TILES} />}
      space="challenge"
    >
      <ChallengePanel board={board} initialTab={initialTab} myTeamId={myTeamId} today={today} />
    </GameShell>
  );
}
