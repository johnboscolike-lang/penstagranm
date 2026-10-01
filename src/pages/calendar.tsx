import { format } from "date-fns";
import type { GetServerSideProps, InferGetServerSidePropsType } from "next";

import { GameShell, TeacherShell } from "@/components/GameShell";
import { SchoolScene } from "@/components/scenes/SchoolScene";
import { TeacherScene } from "@/components/scenes/TeacherScene";
import { ScheduleCalendar } from "@/components/ScheduleCalendar";
import { getRequestSession } from "@/utils/auth-guard";
import { formatDateKey, parseMonthInput, parseSelectedDateInput, pickDefaultSelectedDay } from "@/utils/calendar";
import { getPageBase } from "@/utils/quest-repository";
import { getScheduleItemsForMonth } from "@/utils/repository";
import { countPendingReviews } from "@/utils/teacher-repository";
import type { HudView } from "@/utils/quest-types";
import type { ScheduleItemView } from "@/utils/types";

interface CalendarPageProps {
  viewer: { role: "student"; hud: HudView } | { role: "teacher"; name: string; pendingCount: number };
  currentMonthKey: string;
  selectedDateKey: string;
  items: ScheduleItemView[];
}

/**
 * Loads the current month and selected-day schedule data. Students and teachers both use the same calendar.
 */
export const getServerSideProps: GetServerSideProps<CalendarPageProps> = async (context) => {
  const session = getRequestSession(context.req);
  if (!session) {
    return { redirect: { destination: "/login", permanent: false } };
  }

  const monthDate = parseMonthInput(context.query.month);
  const selectedDate = parseSelectedDateInput(context.query.selectedDate, pickDefaultSelectedDay(monthDate));
  const items = await getScheduleItemsForMonth(monthDate);
  const viewer: CalendarPageProps["viewer"] =
    session.role === "teacher"
      ? { role: "teacher", name: session.name, pendingCount: await countPendingReviews() }
      : { role: "student", hud: (await getPageBase(session.studentId as string)).hud };

  return {
    props: {
      viewer,
      currentMonthKey: format(monthDate, "yyyy-MM"),
      selectedDateKey: formatDateKey(selectedDate),
      items,
    },
  };
};

/**
 * 학교 공간의 일정 달력: 날짜를 고르고 같은 화면에서 일정을 등록한다.
 */
export default function CalendarPage({
  viewer,
  currentMonthKey,
  selectedDateKey,
  items,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const calendar = <ScheduleCalendar currentMonthKey={currentMonthKey} items={items} selectedDateKey={selectedDateKey} />;

  if (viewer.role === "teacher") {
    return (
      <TeacherShell
        active="calendar"
        banner="우리반 일정 달력"
        pageTitle="일정 달력"
        pendingCount={viewer.pendingCount}
        scene={<TeacherScene bubble="이번 달 일정을 정리해 볼까요?" />}
        teacherName={viewer.name}
      >
        {calendar}
      </TeacherShell>
    );
  }

  return (
    <GameShell banner="우리반 일정 달력" hud={viewer.hud} pageTitle="일정 달력" scene={<SchoolScene hairKey={viewer.hud.hairKey} hatKey={viewer.hud.hatKey} petKey={viewer.hud.petKey} />} space="school" wide>
      {calendar}
    </GameShell>
  );
}
