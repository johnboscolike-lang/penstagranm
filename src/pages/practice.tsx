import type { GetServerSideProps, InferGetServerSidePropsType } from "next";

import { GameShell } from "@/components/GameShell";
import { MonsterHunt } from "@/components/practice/MonsterHunt";
import { WordReview } from "@/components/practice/WordReview";
import { PracticeScene } from "@/components/scenes/PracticeScene";
import { guardPage } from "@/utils/auth-guard";
import { getMiniGameSummary } from "@/utils/minigame-repository";
import type { MiniGameSummary } from "@/utils/minigame-types";
import { getPageBase } from "@/utils/quest-repository";
import { prisma } from "@/utils/prisma";
import type { HudView } from "@/utils/quest-types";
import { getWordSession } from "@/utils/word-repository";
import type { WordSessionView } from "@/utils/word-types";

interface PracticePageProps {
  hud: HudView;
  words: WordSessionView;
  hunt: MiniGameSummary;
}

/**
 * 연습장: 오늘의 단어 복습을 읽어 온다.
 */
export const getServerSideProps: GetServerSideProps<PracticePageProps> = async (context) => {
  const guard = guardPage(context, "student");
  if (!guard.ok) {
    return guard.result;
  }

  const { hud, meId, todayKey } = await getPageBase(guard.session.studentId as string);
  const [words, hunt] = await Promise.all([getWordSession(meId), getMiniGameSummary(prisma, meId, todayKey)]);

  return { props: { hud, words, hunt } };
};

/**
 * 연습 공간: 점수 경쟁 없이 내 기억을 돕는 연습.
 */
export default function PracticePage({ hud, words, hunt }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const bubble = words.questions.length > 0 ? `오늘 만날 단어가 ${words.questions.length}개 있어!` : "오늘 복습은 끝났어. 내일 또 보자!";

  return (
    <GameShell banner="단어 연습장" hud={hud} pageTitle="연습" scene={<PracticeScene bubble={bubble} hairKey={hud.hairKey} hatKey={hud.hatKey} petKey={hud.petKey} />} space="practice">
      <WordReview session={words} />
      <MonsterHunt summary={hunt} />
    </GameShell>
  );
}
