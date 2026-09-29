import { format } from "date-fns";
import type { GetServerSideProps, InferGetServerSidePropsType } from "next";

import { GameShell } from "@/components/GameShell";
import { SchoolScene } from "@/components/scenes/SchoolScene";
import { ScheduleCalendar } from "@/components/ScheduleCalendar";
import { formatDateKey, parseMonthInput, parseSelectedDateInput, pickDefaultSelectedDay } from "@/utils/calendar";
import { getPageBase } from "@/utils/quest-repository";
import { getScheduleItemsForMonth } from "@/utils/repository";
import type { HudView } from "@/utils/quest-types";
import type { ScheduleItemView } from "@/utils/types";

interface CalendarPageProps {
  hud: HudView;
  currentMonthKey: string;
  selectedDateKey: string;
  items: ScheduleItemView[];
}

/**
 * Loads the current month and selected-day schedule data from the database.
 */
export const getServerSideProps: GetServerSideProps<CalendarPageProps> = async (context) => {
  const monthDate = parseMonthInput(context.query.month);
  const selectedDate = parseSelectedDateInput(context.query.selectedDate, pickDefaultSelectedDay(monthDate));
  const [{ hud }, items] = await Promise.all([getPageBase(), getScheduleItemsForMonth(monthDate)]);

  return {
    props: {
      hud,
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
  hud,
  currentMonthKey,
  selectedDateKey,
  items,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (
    <GameShell
      banner="우리반 일정 달력"
      hud={hud}
      pageTitle="일정 달력"
      scene={<SchoolScene hairKey={hud.hairKey} />}
      space="school"
      wide
    >
      <ScheduleCalendar currentMonthKey={currentMonthKey} items={items} selectedDateKey={selectedDateKey} />
    </GameShell>
  );
}
