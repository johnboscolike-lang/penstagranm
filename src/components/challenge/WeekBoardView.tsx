import clsx from "clsx";

import { PixelIcon } from "@/components/pixel/PixelSprite";
import { PixelAvatar } from "@/components/pixel/PixelSprite";
import type { IndividualRow, WeekBoard } from "@/utils/quest-board";
import { formatScore, STAMP_TARGET } from "@/utils/quest-rules";

interface WeekBoardViewProps {
  board: WeekBoard;
  myTeamId: string | null;
  onGoToday(): void;
}

const EMBLEM_ICONS: Record<string, string> = { star: "star", sprout: "sprout", wave: "wave" };

const STATUS_COPY: Record<WeekBoard["status"], { label: string; tone: string }> = {
  none: { label: "아직 기록이 없어요", tone: "" },
  collecting: { label: "기록 모으는 중", tone: "tag--sky" },
  provisional: { label: "잠정 집계", tone: "tag--gold" },
  waiting: { label: "집계 대기", tone: "tag--gold" },
  final: { label: "확정", tone: "tag--teal" },
};

/**
 * Formats the change from last week as "+12.3" or "-4.0" (rounded only for display).
 */
function formatDelta(delta: number | null): string {
  if (delta === null) {
    return "지난주 기록 없음";
  }

  const rounded = delta.toFixed(1);

  return `지난주보다 ${delta >= 0 ? "+" : ""}${rounded}`;
}

/**
 * 이번 주 탭: 팀 모험 순위, 개인전 상위 묶음, 내 주간 점수와 보상권 진행.
 * 동점은 공동 순위로 묶고, 순위와 참여 보상은 서로 영향을 주지 않는다.
 */
export function WeekBoardView({ board, myTeamId, onGoToday }: WeekBoardViewProps) {
  const status = STATUS_COPY[board.status];
  const stampCount = board.myStats?.stampCount ?? 0;
  const voucherEarned = board.myStats?.voucherEarned ?? false;
  const stampTarget = board.myStats?.voucherTarget ?? STAMP_TARGET;
  const remaining = Math.max(0, stampTarget - stampCount);

  return (
    <div className="week-board">
      <div className="week-board__status">
        <span className={clsx("tag", status.tone)}>{status.label}</span>
        <span className="muted">
          {board.status === "waiting"
            ? `선생님 확인 ${board.pendingReviewCount}건을 기다려요`
            : board.closed
              ? "이번 주가 끝났어요"
              : `오늘까지 ${board.eligibleDayKeys.length}일 집계`}
        </span>
      </div>

      <h3 className="section-label">팀 모험 · 도서관 다리 복구</h3>
      <ol className="rank-list">
        {board.teams.map((team) => (
          <li className={clsx("rank-row card pf", team.teamId === myTeamId && "rank-row--mine")} key={team.teamId}>
            <PixelIcon className="rank-row__medal" medalRank={Math.min(team.rank, 3) as 1 | 2 | 3} name="medal" scale={1.1} />
            <span className="rank-row__rank">{team.rank}</span>
            <div className="rank-row__main">
              <strong>
                <PixelIcon name={EMBLEM_ICONS[team.emblem] ?? "star"} /> {team.name}
              </strong>
              <span className="rank-row__faces">
                {team.memberHairKeys.map((hairKey, index) => (
                  <PixelAvatar hairKey={hairKey} key={`${team.teamId}-${index}`} label={team.memberNames[index]} scale={0.9} />
                ))}
              </span>
            </div>
            <span className="rank-row__score">{formatScore(team.score)}</span>
          </li>
        ))}
      </ol>

      <h3 className="section-label">개인전 상위</h3>
      <ol className="rank-list rank-list--solo">
        {board.topGroups.map((group) => (
          <li className="rank-group" key={group.rank}>
            {group.rows.length === 1 ? (
              <IndividualLine mine={group.rows[0].studentId === board.me?.studentId} row={group.rows[0]} />
            ) : (
              <details className="rank-group__tie">
                <summary>
                  <span className="rank-row__rank">{group.rank}</span>
                  <span>
                    <b>공동 {group.rank}위</b> · {group.rows.length}명
                  </span>
                  <span className="rank-row__score">{formatScore(group.rows[0].score)}</span>
                </summary>
                <ul>
                  {group.rows.map((row) => (
                    <li key={row.studentId}>
                      <IndividualLine mine={row.studentId === board.me?.studentId} row={row} />
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </li>
        ))}
      </ol>

      {board.me ? (
        <div className="my-week card card--mint pf">
          <div className="my-week__top">
            <PixelAvatar hairKey={board.me.hairKey} scale={1.1} />
            <div>
              <span className="muted">내 주간 점수</span>
              <strong className="my-week__score">{formatScore(board.me.score)}</strong>
            </div>
            <div className="my-week__rank">
              <b>{board.me.rank}위</b>
              <small>{formatDelta(board.deltaFromPreviousWeek)}</small>
            </div>
          </div>

          <div className="stamp-row" role="img" aria-label={`참여 도장 ${stampCount}개, 목표 ${stampTarget}개`}>
            {Array.from({ length: stampTarget }, (_, index) => (
              <span className={clsx("stamp", index < stampCount && "stamp--on")} key={index}>
                <PixelIcon name={index < stampCount ? "star" : "lock"} scale={1.2} />
              </span>
            ))}
            <span className="stamp-row__text">
              {voucherEarned ? (
                <>
                  <PixelIcon name="icecream" /> <b>아이스크림 교환권 1장 획득!</b>
                </>
              ) : (
                <>
                  서로 다른 <b>{stampTarget}일</b>에 약속 하나씩 끝내면 교환권 · <b>{remaining}일</b> 남았어요
                </>
              )}
            </span>
          </div>
        </div>
      ) : null}

      <button className="btn btn--block" onClick={onGoToday} type="button">
        <PixelIcon name="check" />
        <span>오늘 약속 채우러 가기</span>
        <PixelIcon name="chevronLight" />
      </button>
      <p className="panel__foot muted">
        순위는 매주 월요일에 새로 시작해요. 순위가 낮아도 3일 실천하면 같은 보상권을 받아요. 레벨·집·진도는 그대로 남아요.
      </p>
    </div>
  );
}

interface IndividualLineProps {
  row: IndividualRow;
  mine: boolean;
}

/**
 * One line of the solo ranking: rank, face, name with team, score.
 */
function IndividualLine({ row, mine }: IndividualLineProps) {
  return (
    <div className={clsx("rank-row card pf", mine && "rank-row--mine")}>
      <span className="rank-row__rank">{row.rank}</span>
      <PixelAvatar hairKey={row.hairKey} scale={1} />
      <div className="rank-row__main">
        <strong>{row.name}</strong>
        <span className="muted">{row.teamName}</span>
      </div>
      <span className="rank-row__score">{formatScore(row.score)}</span>
    </div>
  );
}
