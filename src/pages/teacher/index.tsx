import type { GetServerSideProps, InferGetServerSidePropsType } from "next";

import { TeacherShell } from "@/components/GameShell";
import { TeacherScene } from "@/components/scenes/TeacherScene";
import { ArenaControl } from "@/components/teacher/ArenaControl";
import { ClassOverview } from "@/components/teacher/ClassOverview";
import { PixelIcon } from "@/components/pixel/PixelSprite";
import { ReviewCard } from "@/components/teacher/ReviewCard";
import { getArenaTeacherSummary } from "@/utils/arena-repository";
import { guardPage } from "@/utils/auth-guard";
import { getKstDateKey } from "@/utils/kst";
import type { ReviewItemView, StudentOverviewView } from "@/utils/quest-types";
import { getClassOverview, listRecentReviews, listReviewQueue } from "@/utils/teacher-repository";

interface TeacherPageProps {
  teacherName: string;
  queue: ReviewItemView[];
  recent: ReviewItemView[];
  overview: StudentOverviewView[];
  arena: Awaited<ReturnType<typeof getArenaTeacherSummary>>;
}

/**
 * Loads the review queue, recent decisions, and today's class overview for the teacher.
 */
export const getServerSideProps: GetServerSideProps<TeacherPageProps> = async (context) => {
  const guard = guardPage(context, "teacher");
  if (!guard.ok) {
    return guard.result;
  }

  const todayKey = getKstDateKey();
  const [queue, recent, overview, arena] = await Promise.all([listReviewQueue(), listRecentReviews(), getClassOverview(todayKey), getArenaTeacherSummary(todayKey)]);

  return { props: { teacherName: guard.session.name, queue, recent, overview, arena } };
};

/**
 * 교무실 확인함: 제출된 퀘스트를 보고 수행 확인 / 다시 시도 / 도움 필요를 정한다.
 */
export default function TeacherPage({ teacherName, queue, recent, overview, arena }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (
    <TeacherShell
      active="review"
      banner="교무실 · 확인함"
      pageTitle="확인함"
      pendingCount={queue.length}
      scene={<TeacherScene bubble={queue.length > 0 ? `확인할 퀘스트가 ${queue.length}개 있어요.` : "제출된 퀘스트가 없어요. 잠시 쉬어요."} />}
      teacherName={teacherName}
    >
      <section aria-labelledby="queue-title" className="panel pf">
        <h2 className="panel__title" id="queue-title">
          <PixelIcon name="laurel" />
          <span>
            <span className="panel__eyebrow">학생이 제출한 순서대로</span>
            확인 기다리는 퀘스트 {queue.length}개
          </span>
          <PixelIcon name="laurel" />
        </h2>
        {queue.length === 0 ? (
          <p className="muted quest-empty">지금은 확인할 퀘스트가 없어요. 학생이 제출하면 여기에 나타나요.</p>
        ) : (
          <div className="review-list">
            {queue.map((item) => (
              <ReviewCard item={item} key={item.promiseId} />
            ))}
          </div>
        )}
        <p className="panel__foot muted">확인이 늦어져도 학생 점수는 0점이 되지 않아요. 잠정으로 보이다가 확인하면 확정돼요.</p>
      </section>

      <ClassOverview students={overview} />

      <ArenaControl {...arena} />

      {recent.length > 0 ? (
        <section aria-labelledby="recent-title" className="panel pf">
          <h2 className="panel__title" id="recent-title">
            <PixelIcon name="laurel" />
            <span>최근 확인한 기록</span>
            <PixelIcon name="laurel" />
          </h2>
          <div className="review-list">
            {recent.map((item) => (
              <ReviewCard compact item={item} key={item.promiseId} />
            ))}
          </div>
        </section>
      ) : null}
    </TeacherShell>
  );
}
