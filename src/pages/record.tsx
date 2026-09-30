import type { GetServerSideProps, InferGetServerSidePropsType } from "next";

import { GameShell } from "@/components/GameShell";
import { guardPage } from "@/utils/auth-guard";
import { PostComposer } from "@/components/PostComposer";
import { RecordScene } from "@/components/scenes/RecordScene";
import { getPageBase } from "@/utils/quest-repository";
import type { HudView } from "@/utils/quest-types";

interface RecordPageProps {
  hud: HudView;
}

/**
 * Loads only the HUD; the composer itself is entirely client-side.
 */
export const getServerSideProps: GetServerSideProps<RecordPageProps> = async (context) => {
  const guard = guardPage(context, "student");
  if (!guard.ok) {
    return guard.result;
  }

  const { hud } = await getPageBase(guard.session.studentId as string);

  return { props: { hud } };
};

/**
 * 오늘 기록하기: 준비·목표·필기·과제 네 컷과 한국어 전사를 올려 성장 기록으로 남긴다.
 */
export default function RecordPage({ hud }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (
    <GameShell
      banner="오늘 기록하기"
      hud={hud}
      pageTitle="오늘 기록하기"
      scene={<RecordScene hairKey={hud.hairKey} hatKey={hud.hatKey} petKey={hud.petKey} />}
      space="challenge"
    >
      <PostComposer />
    </GameShell>
  );
}
