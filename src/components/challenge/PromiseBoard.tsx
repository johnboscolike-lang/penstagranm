import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";
import clsx from "clsx";

import { PixelIcon } from "@/components/pixel/PixelSprite";
import { buildUnitLabel, getSubjectTone } from "@/utils/quest-plan";
import { calcDailyResult, calcPromiseRatio, MAX_DAILY_COINS, MAX_DAILY_XP, formatScore } from "@/utils/quest-rules";
import type { TodayView } from "@/utils/quest-types";
import { listUnitNumbers } from "@/utils/quest-plan";

interface PromiseBoardProps {
  today: TodayView;
}

const SUBJECT_ICONS: Record<string, string> = { rose: "book", sky: "triangle", leaf: "abc", sun: "play" };

/**
 * 오늘 약속 3칸. 쪽/단어 칸을 눌러 진도를 기록하고, 점수·XP·코인을 바로 다시 계산해 보여 준다.
 * 같은 칸을 여러 번 눌러도 한 번만 세고, 지난 날의 약속은 고칠 수 없다.
 */
export function PromiseBoard({ today }: PromiseBoardProps) {
  const router = useRouter();
  const [units, setUnits] = useState<Record<string, number[]>>(() =>
    Object.fromEntries(today.promises.map((promise) => [promise.id, promise.confirmedUnitNos])),
  );
  const [message, setMessage] = useState<string | null>(null);

  const progresses = today.promises.map((promise) => ({
    confirmedUnits: (units[promise.id] ?? []).length,
    plannedUnits: promise.unitCount,
  }));
  const result = calcDailyResult(progresses, today.reflected);

  /**
   * Flips one unit locally, saves it, and rolls back with a message when saving fails.
   */
  async function toggleUnit(promiseId: string, unitNo: number): Promise<void> {
    const before = units[promiseId] ?? [];
    const done = !before.includes(unitNo);
    const after = done ? [...before, unitNo] : before.filter((value) => value !== unitNo);
    setUnits((current) => ({ ...current, [promiseId]: after }));
    setMessage(null);

    try {
      const response = await fetch("/api/promise-units", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ promiseId, unitNo, done }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        setUnits((current) => ({ ...current, [promiseId]: before }));
        setMessage(payload?.message ?? "기록하지 못했어요. 잠시 뒤에 다시 눌러 주세요.");
        return;
      }
      void router.replace(router.asPath, undefined, { scroll: false });
    } catch {
      setUnits((current) => ({ ...current, [promiseId]: before }));
      setMessage("네트워크 연결을 확인하고 다시 눌러 주세요.");
    }
  }

  if (!today.isSchoolDay) {
    return (
      <div className="rest-note card card--mint pf">
        <PixelIcon name="sprout" scale={1.6} />
        <p>
          <strong>오늘은 쉬어가는 날이에요.</strong>
          <br />
          월요일 00:00에 새 주가 시작돼요. 내 레벨과 집은 그대로 남아요.
        </p>
      </div>
    );
  }

  return (
    <div className="promise-board">
      <div className="promise-summary">
        <div>
          <span className="muted">{today.label}</span>
          <strong className="promise-summary__score">
            오늘 점수 <em>{formatScore(result.score)}</em>
          </strong>
        </div>
        <span className={clsx("tag", result.stamp ? "tag--teal" : "")}>
          <PixelIcon name={result.stamp ? "check" : "star"} />
          {result.stamp ? "참여 도장 받음" : "약속 하나를 끝내면 도장"}
        </span>
      </div>

      <ul className="promise-list">
        {today.promises.map((promise) => {
          const tone = getSubjectTone(promise.subject);
          const confirmed = units[promise.id] ?? [];
          const ratio = calcPromiseRatio({ confirmedUnits: confirmed.length, plannedUnits: promise.unitCount });
          const isWord = promise.unitKind === "WORD";

          return (
            <li className="promise card pf" key={promise.id}>
              <div className="promise__head">
                <span className={clsx("subject-chip", `subject-chip--${tone}`)}>
                  <PixelIcon name={SUBJECT_ICONS[tone]} />
                  {promise.subject}
                </span>
                <span className="promise__title">{promise.title}</span>
                <span className="promise__range">
                  오늘 약속 <b>{promise.rangeLabel}</b>
                </span>
              </div>

              <div className={clsx("tile-grid", isWord && "tile-grid--small")} role="group" aria-label={`${promise.subject} ${promise.rangeLabel} 진도 칸`}>
                {listUnitNumbers(promise).map((unitNo) => {
                  const done = confirmed.includes(unitNo);
                  const label = buildUnitLabel(promise.unitKind, unitNo, promise.unitStart);

                  return (
                    <button
                      aria-label={`${label}${isWord ? "번 단어" : "쪽"} ${done ? "완료, 누르면 취소" : "기록하기"}`}
                      aria-pressed={done}
                      className={clsx("tile pf", done && "tile--done")}
                      key={unitNo}
                      onClick={() => void toggleUnit(promise.id, unitNo)}
                      type="button"
                    >
                      {done ? <PixelIcon name="check" /> : label}
                    </button>
                  );
                })}
              </div>

              <div className="promise__foot">
                <div
                  aria-valuemax={promise.unitCount}
                  aria-valuemin={0}
                  aria-valuenow={confirmed.length}
                  className="bar bar--thin"
                  role="progressbar"
                >
                  <div className="bar__fill" style={{ width: `${Math.round(ratio * 100)}%` }} />
                </div>
                <span className="promise__count">
                  {isWord ? "회상 완료" : "풀이·채점"} <b>{confirmed.length}</b> / {promise.unitCount}
                  {isWord ? "개" : "쪽"}
                </span>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="reward-strip card card--mint pf">
        <div className="reward-strip__item">
          <PixelIcon name="gem" scale={1.1} />
          <span>
            오늘 경험치 <b>{result.xp}</b> / {MAX_DAILY_XP} XP
          </span>
        </div>
        <div className="reward-strip__item">
          <PixelIcon name="coin" />
          <span>
            코인 <b>+{result.coins}</b> / {MAX_DAILY_COINS}
          </span>
        </div>
      </div>

      {message ? (
        <p className="msg msg--error" role="alert">
          {message}
        </p>
      ) : null}

      <Link className="btn btn--block" href="/record">
        <PixelIcon name="feather" />
        <span>오늘 기록하기 · 네 컷 올리기</span>
        <PixelIcon name="chevronLight" />
      </Link>
      <p className="panel__foot muted">
        {today.reflected ? "오늘 회고를 올렸어요. 하루 회고 +10 XP 적립 완료!" : "네 컷 기록을 올리면 하루 회고 +10 XP를 받아요."}
        <br />
        같은 칸을 여러 번 눌러도 한 번만 세요. 부분 수행도 점수에 반영돼요.
      </p>
    </div>
  );
}
