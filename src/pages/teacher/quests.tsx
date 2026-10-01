import type { GetServerSideProps, InferGetServerSidePropsType } from "next";

import { TeacherShell } from "@/components/GameShell";
import { TeacherScene } from "@/components/scenes/TeacherScene";
import { QuestForm } from "@/components/teacher/QuestForm";
import { QuestList } from "@/components/teacher/QuestList";
import { guardPage } from "@/utils/auth-guard";
import { getKstDateKey } from "@/utils/kst";
import type { QuestView } from "@/utils/quest-types";
import { countPendingReviews, listQuests, listStudentOptions, type StudentOption } from "@/utils/teacher-repository";

interface QuestsPageProps {
  teacherName: string;
  pendingCount: number;
  students: StudentOption[];
  quests: QuestView[];
  todayKey: string;
  studentFilter: string | null;
}

/**
 * Loads the student list, existing quests, and the optional ?student= filter.
 */
export const getServerSideProps: GetServerSideProps<QuestsPageProps> = async (context) => {
  const guard = guardPage(context, "teacher");
  if (!guard.ok) {
    return guard.result;
  }

  const [students, quests, pendingCount] = await Promise.all([listStudentOptions(), listQuests(), countPendingReviews()]);
  const requested = typeof context.query.student === "string" ? context.query.student : null;

  return {
    props: {
      teacherName: guard.session.name,
      pendingCount,
      students,
      quests,
      todayKey: getKstDateKey(),
      studentFilter: requested && students.some((student) => student.id === requested) ? requested : null,
    },
  };
};

/**
 * 퀘스트 편성: 학생별로 일일 반복·주간 목표 퀘스트를 만들고 관리한다.
 */
export default function TeacherQuestsPage({
  teacherName,
  pendingCount,
  students,
  quests,
  todayKey,
  studentFilter,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (
    <TeacherShell
      active="quests"
      banner="퀘스트 편성"
      pageTitle="퀘스트 편성"
      pendingCount={pendingCount}
      scene={<TeacherScene bubble="어떤 퀘스트를 낼까요?" />}
      teacherName={teacherName}
    >
      <QuestForm presetStudentId={studentFilter} students={students} todayKey={todayKey} />
      <QuestList quests={quests} studentFilter={studentFilter} />
    </TeacherShell>
  );
}
