import { format } from "date-fns";
import type { GetServerSideProps, InferGetServerSidePropsType } from "next";

import { AppShell } from "@/components/AppShell";
import { ScheduleCalendar } from "@/components/ScheduleCalendar";
import { formatDateKey, parseMonthInput, parseSelectedDateInput } from "@/utils/calendar";
import { getScheduleItemsForMonth } from "@/utils/repository";
import type { ScheduleItemView } from "@/utils/types";

interface CalendarPageProps {
  currentMonthKey: string;
  selectedDateKey: string;
  items: ScheduleItemView[];
}

/**
 * Loads the current month and selected-day schedule data from the database.
 */
export const getServerSideProps: GetServerSideProps<CalendarPageProps> = async (context) => {
  const monthDate = parseMonthInput(context.query.month);
  const selectedDate = parseSelectedDateInput(context.query.selectedDate, monthDate);
  const items = await getScheduleItemsForMonth(monthDate);

  return {
    props: {
      currentMonthKey: format(monthDate, "yyyy-MM"),
      selectedDateKey: formatDateKey(selectedDate),
      items,
    },
  };
};

/**
 * Renders the classroom scheduling board with day selection and inline entry creation.
 */
export default function CalendarPage({
  currentMonthKey,
  selectedDateKey,
  items,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (
    <AppShell currentPath="calendar">
      <section className="hero-card hero-card--calendar">
        <p className="hero-card__eyebrow">CALENDAR MODE</p>
        <h2>날짜마다 일정을 남기는 교실형 캘린더 보드</h2>
        <p>날짜를 선택하면 오른쪽 패널에서 일정 목록과 신규 등록 폼을 바로 확인할 수 있습니다.</p>
      </section>
      <ScheduleCalendar currentMonthKey={currentMonthKey} items={items} selectedDateKey={selectedDateKey} />
    </AppShell>
  );
}
