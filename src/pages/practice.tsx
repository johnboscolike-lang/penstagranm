import type { GetServerSideProps, InferGetServerSidePropsType } from "next";

import { GameShell } from "@/components/GameShell";
import { WordReview } from "@/components/practice/WordReview";
import { PracticeScene } from "@/components/scenes/PracticeScene";
import { guardPage } from "@/utils/auth-guard";
import { getPageBase } from "@/utils/quest-repository";
import type { HudView } from "@/utils/quest-types";
import { getWordSession } from "@/utils/word-repository";
import type { WordSessionView } from "@/utils/word-types";

interface PracticePageProps {
  hud: HudView;
  words: WordSessionView;
}

/**
 * 연습장: 오늘의 단어 복습을 읽어 온다.
 */
export const getServerSideProps: GetServerSideProps<PracticePageProps> = async (context) => {
  const guard = guardPage(context, "student");
  if (!guard.ok) {
    return guard.result;
  }

  const { hud, meId } = await getPageBase(guard.session.studentId as string);

  return { props: { hud, words: await getWordSession(meId) } };
};

/**
 * 연습 공간: 점수 경쟁 없이 내 기억을 돕는 연습.
 */
export default function PracticePage({ hud, words }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const bubble = words.questions.length > 0 ? `오늘 만날 단어가 ${words.questions.length}개 있어!` : "오늘 복습은 끝났어. 내일 또 보자!";

  return (
    <GameShell banner="단어 연습장" hud={hud} pageTitle="연습" scene={<PracticeScene bubble={bubble} hairKey={hud.hairKey} hatKey={hud.hatKey} petKey={hud.petKey} />} space="practice">
      <WordReview session={words} />
    </GameShell>
  );
}
