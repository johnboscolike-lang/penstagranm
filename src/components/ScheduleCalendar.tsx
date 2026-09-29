import Link from "next/link";
import { addMonths, format } from "date-fns";
import clsx from "clsx";

import { PixelIcon } from "@/components/pixel/PixelSprite";
import { ScheduleForm } from "@/components/ScheduleForm";
import { formatKstTime } from "@/utils/kst";
import {
  buildMonthGrid,
  formatDateKey,
  formatMonthHeading,
  groupScheduleItemsByDate,
  parseMonthInput,
  WEEKDAY_LABELS,
} from "@/utils/calendar";
import type { ScheduleItemView } from "@/utils/types";

interface ScheduleCalendarProps {
  currentMonthKey: string;
  selectedDateKey: string;
  items: ScheduleItemView[];
}

/**
 * Shows a monthly classroom calendar with a selected-day detail panel.
 * 날짜 선택과 일정 등록이 한 페이지에서 모두 되도록 좌우로 나란히 둔다.
 */
export function ScheduleCalendar({ currentMonthKey, selectedDateKey, items }: ScheduleCalendarProps) {
  const monthDate = parseMonthInput(currentMonthKey);
  const calendarCells = buildMonthGrid(monthDate);
  const itemsByDate = groupScheduleItemsByDate(items);
  const selectedItems = itemsByDate[selectedDateKey] ?? [];
  const previousMonthKey = format(addMonths(monthDate, -1), "yyyy-MM");
  const nextMonthKey = format(addMonths(monthDate, 1), "yyyy-MM");

  return (
    <div className="calendar-layout">
      <section aria-labelledby="calendar-title" className="panel pf">
        <h2 className="panel__title" id="calendar-title">
          <PixelIcon name="laurel" />
          <span>
            <span className="panel__eyebrow">우리반 일정 달력</span>
            {formatMonthHeading(monthDate)}
          </span>
          <PixelIcon name="laurel" />
        </h2>

        <div className="calendar__nav">
          <Link className="btn btn--small btn--cream" href={`/calendar?month=${previousMonthKey}`}>
            <PixelIcon className="px--flip" name="chevron" />
            이전 달
          </Link>
          <Link className="btn btn--small btn--cream" href={`/calendar?month=${nextMonthKey}`}>
            다음 달
            <PixelIcon name="chevron" />
          </Link>
        </div>

        <div className="calendar-grid" role="grid" aria-label={`${formatMonthHeading(monthDate)} 달력`}>
          {WEEKDAY_LABELS.map((label, index) => (
            <div className={clsx("calendar-grid__weekday", index === 0 && "is-sun", index === 6 && "is-sat")} key={label} role="columnheader">
              {label}
            </div>
          ))}
          {calendarCells.map((cell) => {
            const dateKey = formatDateKey(cell.date);
            const dayItems = itemsByDate[dateKey] ?? [];
            const selected = dateKey === selectedDateKey;

            return (
              <Link
                aria-current={selected ? "date" : undefined}
                className={clsx(
                  "calendar-grid__cell",
                  !cell.isCurrentMonth && "is-muted",
                  cell.isToday && "is-today",
                  selected && "is-selected",
                )}
                href={`/calendar?month=${currentMonthKey}&selectedDate=${dateKey}`}
                key={dateKey}
                role="gridcell"
              >
                <span className="calendar-grid__day">
                  <b>{format(cell.date, "d")}</b>
                  {dayItems.length > 0 ? <span className="tag tag--gold">{dayItems.length}</span> : null}
                </span>
                {dayItems.slice(0, 2).map((item) => (
                  <span className="calendar-pill" key={item.id}>
                    {formatKstTime(item.scheduledFor)} {item.title}
                  </span>
                ))}
              </Link>
            );
          })}
        </div>
      </section>

      <aside aria-labelledby="agenda-title" className="panel pf">
        <h2 className="panel__title" id="agenda-title">
          <PixelIcon name="laurel" />
          <span>
            <span className="panel__eyebrow">선택한 날짜</span>
            {selectedDateKey}
          </span>
          <PixelIcon name="laurel" />
        </h2>
        <ul className="agenda">
          {selectedItems.map((item) => (
            <li className="agenda__item card pf" key={item.id}>
              <span className="tag tag--gold">{formatKstTime(item.scheduledFor)}</span>
              <strong>{item.title}</strong>
              {item.notes ? <span className="muted">{item.notes}</span> : null}
            </li>
          ))}
          {selectedItems.length === 0 ? <li className="muted agenda__empty">이 날짜에는 아직 일정이 없어요.</li> : null}
        </ul>
        <ScheduleForm selectedDateKey={selectedDateKey} />
      </aside>
    </div>
  );
}
