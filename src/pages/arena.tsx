import type { GetServerSideProps, InferGetServerSidePropsType } from "next";

import { ArenaPanel } from "@/components/arena/ArenaPanel";
import { GameShell } from "@/components/GameShell";
import { ArenaScene } from "@/components/scenes/ArenaScene";
import { getArenaOverview } from "@/utils/arena-repository";
import type { ArenaOverview } from "@/utils/arena-types";
import { guardPage } from "@/utils/auth-guard";
import { getPageBase } from "@/utils/quest-repository";
import type { HudView } from "@/utils/quest-types";

interface ArenaPageProps {
  hud: HudView;
  overview: ArenaOverview;
}

/**
 * 대결장: 내 리그와 도전장, 새 대결 신청, 최근 결과, 순위표를 읽어 온다.
 */
export const getServerSideProps: GetServerSideProps<ArenaPageProps> = async (context) => {
  const guard = guardPage(context, "student");
  if (!guard.ok) {
    return guard.result;
  }

  const { hud, meId, todayKey } = await getPageBase(guard.session.studentId as string);

  return { props: { hud, overview: await getArenaOverview(meId, todayKey) } };
};

/**
 * 대결 공간: 친구와 같은 문제를 풀어 겨루는 퀴즈 배틀.
 */
export default function ArenaPage({ hud, overview }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (
    <GameShell banner="퀴즈 대결장" hud={hud} pageTitle="대결" scene={<ArenaScene hairKey={hud.hairKey} />} space="arena">
      <ArenaPanel overview={overview} />
    </GameShell>
  );
}
