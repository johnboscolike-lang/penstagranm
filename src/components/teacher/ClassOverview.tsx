import Link from "next/link";
import clsx from "clsx";

import { PixelAvatar, PixelIcon } from "@/components/pixel/PixelSprite";
import { REVIEW_LABELS } from "@/utils/quest-review";
import { formatScore } from "@/utils/quest-rules";
import type { StudentOverviewView } from "@/utils/quest-types";

interface ClassOverviewProps {
  students: StudentOverviewView[];
}

const CHIP_TONE = {
  NONE: "",
  OPEN: "tag--sky",
  SUBMITTED: "tag--gold",
  CONFIRMED: "tag--teal",
  RETRY: "tag--pink",
  HELP: "tag--pink",
} as const;

/**
 * 오늘 학생 현황: 학생마다 오늘 점수와 카드별 진행·확인 상태를 한눈에 본다.
 */
export function ClassOverview({ students }: ClassOverviewProps) {
  return (
    <section aria-labelledby="overview-title" className="panel pf">
      <h2 className="panel__title" id="overview-title">
        <PixelIcon name="laurel" />
        <span>
          <span className="panel__eyebrow">오늘 진행 상황</span>
          학생 현황
        </span>
        <PixelIcon name="laurel" />
      </h2>
      <ul className="overview">
        {students.map((student) => (
          <li className="overview__row card pf" key={student.studentId}>
            <span className="overview__face">
              <PixelAvatar hairKey={student.hairKey} scale={1.1} />
            </span>
            <div className="overview__who">
              <strong>{student.name}</strong>
              <span className="muted">
                {student.teamName} · 오늘 {formatScore(student.todayScore)}점
              </span>
            </div>
            <ul className="overview__chips">
              {student.cards.map((card) => (
                <li
                  className={clsx("tag", CHIP_TONE[card.reviewStatus])}
                  key={card.id}
                  title={`${card.subject} ${card.title} · ${REVIEW_LABELS[card.reviewStatus]}`}
                >
                  {card.scope === "WEEK" ? "주 " : ""}
                  {card.subject} {card.confirmed}/{card.planned}
                </li>
              ))}
            </ul>
            <Link className="btn btn--small btn--cream" href={`/teacher/quests?student=${student.studentId}`}>
              퀘스트
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
