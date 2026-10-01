import Link from "next/link";
import { useState } from "react";
import clsx from "clsx";

import { PixelIcon } from "@/components/pixel/PixelSprite";
import type { SchoolPanelData } from "@/utils/school-view";

type RowKey = "class" | "meal" | "notice" | "schedule";

interface SchoolPanelProps {
  data: SchoolPanelData;
}

/**
 * "오늘의 학교" 패널. 수업·급식·공지·일정을 한 줄씩 보여 주고, 눌러서 자세히 펼친다.
 * 필수 학교 정보는 게임 성과 없이 바로 확인할 수 있어야 하므로 잠금이나 점수가 없다.
 */
export function SchoolPanel({ data }: SchoolPanelProps) {
  const [openRow, setOpenRow] = useState<RowKey | null>(null);

  /**
   * Opens one row and closes the others; pressing the open row again closes it.
   */
  function toggleRow(key: RowKey): void {
    setOpenRow((current) => (current === key ? null : key));
  }

  const rows: { key: RowKey; icon: string; label: string; value: string; hint?: string }[] = [
    { key: "class", icon: "book", label: "다음 수업", value: data.nextClass.headline, hint: data.nextClass.detail },
    { key: "meal", icon: "bowl", label: "급식", value: data.meal.summary },
    { key: "notice", icon: "megaphone", label: "공지", value: data.noticeHeadline },
    { key: "schedule", icon: "calendar", label: "일정", value: data.scheduleHeadline },
  ];

  return (
    <section aria-labelledby="school-panel-title" className="panel pf">
      <h2 className="panel__title" id="school-panel-title">
        <PixelIcon name="laurel" />
        <span>
          <span className="panel__eyebrow">{data.dateLabel}</span>
          오늘의 학교
        </span>
        <PixelIcon name="laurel" />
      </h2>

      <ul className="info-list">
        {rows.map((row) => {
          const open = openRow === row.key;

          return (
            <li className="info-row card pf" key={row.key}>
              <button
                aria-controls={`info-${row.key}`}
                aria-expanded={open}
                className="info-row__head"
                onClick={() => toggleRow(row.key)}
                type="button"
              >
                <PixelIcon name={row.icon} scale={0.9} />
                <span className="info-row__label">{row.label}</span>
                <span className="info-row__value">
                  {row.value}
                  {row.hint ? <small>{row.hint}</small> : null}
                </span>
                <PixelIcon className={clsx("info-row__chevron", open && "info-row__chevron--open")} name="chevron" />
              </button>

              {open ? (
                <div className="info-row__body" id={`info-${row.key}`}>
                  {row.key === "class" ? (
                    <>
                      <h3>{data.timetableTitle}</h3>
                      <ol className="timetable">
                        {data.timetable.map((period) => (
                          <li className={clsx(period.isNext && "timetable__next")} key={period.period}>
                            <span className="timetable__period">{period.period}교시</span>
                            <strong>{period.subject}</strong>
                            <span className="muted">
                              {period.time} · {period.room}
                            </span>
                            {period.isNext ? <span className="tag tag--teal">다음</span> : null}
                          </li>
                        ))}
                      </ol>
                    </>
                  ) : null}

                  {row.key === "meal" ? (
                    <>
                      <h3>{data.meal.title}</h3>
                      <ul className="chip-list">
                        {data.meal.menu.map((dish) => (
                          <li className="tag" key={dish}>
                            {dish}
                          </li>
                        ))}
                      </ul>
                      <p className="muted">알레르기 정보: {data.meal.allergyNumbers.join(", ")}</p>
                    </>
                  ) : null}

                  {row.key === "notice" ? (
                    <ul className="notice-list">
                      {data.notices.map((notice) => (
                        <li key={notice.id}>
                          <div className="notice-list__head">
                            <span className={clsx("tag", notice.importance === "중요" ? "tag--pink" : "tag--sky")}>
                              {notice.importance}
                            </span>
                            <strong>{notice.title}</strong>
                          </div>
                          <p>{notice.body}</p>
                          <p className="muted">
                            {notice.source} · 대상 {notice.target} · {notice.postedOn}
                          </p>
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  {row.key === "schedule" ? (
                    <>
                      {data.schedule.length > 0 ? (
                        <ul className="notice-list">
                          {data.schedule.map((item) => (
                            <li key={item.id}>
                              <div className="notice-list__head">
                                <span className="tag tag--gold">{item.whenLabel}</span>
                                <strong>{item.title}</strong>
                              </div>
                              {item.notes ? <p>{item.notes}</p> : null}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="muted">등록된 일정이 없어요. 달력에서 새 일정을 남겨 보세요.</p>
                      )}
                      <Link className="btn btn--small btn--cream" href="/calendar">
                        달력에서 날짜 고르고 일정 남기기
                      </Link>
                    </>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>

      <Link className="btn btn--block" href="/calendar">
        <PixelIcon name="calendar" />
        <span>일정 달력 열기</span>
        <PixelIcon name="chevronLight" />
      </Link>
      <p className="panel__foot muted">
        {data.source} · {data.checkedAt}
      </p>
    </section>
  );
}
