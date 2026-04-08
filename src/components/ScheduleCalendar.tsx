import Link from "next/link";
import { addMonths, format } from "date-fns";

import { ScheduleForm } from "@/components/ScheduleForm";
import {
  buildMonthGrid,
  formatDateKey,
  formatMonthHeading,
  groupScheduleItemsByDate,
  parseMonthInput,
} from "@/utils/calendar";
import type { ScheduleItemView } from "@/utils/types";

interface ScheduleCalendarProps {
  currentMonthKey: string;
  selectedDateKey: string;
  items: ScheduleItemView[];
}

/**
 * Shows a monthly classroom calendar with a selected-day detail panel.
 */
export function ScheduleCalendar({
  currentMonthKey,
  selectedDateKey,
  items,
}: ScheduleCalendarProps) {
  const monthDate = parseMonthInput(currentMonthKey);
  const calendarCells = buildMonthGrid(monthDate);
  const itemsByDate = groupScheduleItemsByDate(items);
  const selectedItems = itemsByDate[selectedDateKey] ?? [];
  const previousMonthKey = format(addMonths(monthDate, -1), "yyyy-MM");
  const nextMonthKey = format(addMonths(monthDate, 1), "yyyy-MM");

  return (
    <section className="calendar-layout">
      <div className="panel">
        <div className="calendar-toolbar">
          <div>
            <p className="section-heading__eyebrow">SCHEDULE BOARD</p>
            <h2>{formatMonthHeading(monthDate)}</h2>
          </div>
          <div className="calendar-toolbar__buttons">
            <Link className="ghost-button" href={`/calendar?month=${previousMonthKey}`}>
              이전 달
            </Link>
            <Link className="ghost-button" href={`/calendar?month=${nextMonthKey}`}>
              다음 달
            </Link>
          </div>
        </div>

        <div className="calendar-grid">
          {["일", "월", "화", "수", "목", "금", "토"].map((label) => (
            <div className="calendar-grid__weekday" key={label}>
              {label}
            </div>
          ))}
          {calendarCells.map((cell) => {
            const dateKey = formatDateKey(cell.date);
            const dayItems = itemsByDate[dateKey] ?? [];

            return (
              <Link
                className={[
                  "calendar-grid__cell",
                  cell.isCurrentMonth ? "" : "calendar-grid__cell--muted",
                  cell.isToday ? "calendar-grid__cell--today" : "",
                  dateKey === selectedDateKey ? "calendar-grid__cell--selected" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                href={`/calendar?month=${currentMonthKey}&selectedDate=${dateKey}`}
                key={dateKey}
              >
                <div className="calendar-grid__cell-header">
                  <strong>{format(cell.date, "d")}</strong>
                  <span>{dayItems.length}개</span>
                </div>
                <div className="calendar-grid__cell-items">
                  {dayItems.slice(0, 2).map((item) => (
                    <span className="calendar-pill" key={item.id}>
                      {format(new Date(item.scheduledFor), "HH:mm")} {item.title}
                    </span>
                  ))}
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      <aside className="panel panel--sidebar">
        <div className="section-heading">
          <div>
            <p className="section-heading__eyebrow">SELECTED DAY</p>
            <h3>{selectedDateKey}</h3>
          </div>
        </div>
        <ul className="agenda-list">
          {selectedItems.map((item) => (
            <li className="agenda-item" key={item.id}>
              <strong>{format(new Date(item.scheduledFor), "HH:mm")}</strong>
              <p>{item.title}</p>
              {item.notes ? <span>{item.notes}</span> : null}
            </li>
          ))}
          {selectedItems.length === 0 ? (
            <li className="agenda-item agenda-item--empty">선택한 날짜에 등록된 일정이 없습니다.</li>
          ) : null}
        </ul>
        <ScheduleForm selectedDateKey={selectedDateKey} />
      </aside>
    </section>
  );
}
