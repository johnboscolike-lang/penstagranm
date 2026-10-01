import Link from "next/link";
import { useRouter } from "next/router";
import { useRef, useState } from "react";
import clsx from "clsx";

import { PixelIcon } from "@/components/pixel/PixelSprite";
import { playSfx } from "@/utils/audio/audio-engine";
import { resizeImageFile } from "@/utils/image-resize";
import { buildUnitLabel, getSubjectTone, listUnitNumbers } from "@/utils/quest-plan";
import {
  canStudentEdit,
  checkCanSubmit,
  countsTowardScore,
  MAX_PROOFS_PER_CARD,
  needsReview,
  REVIEW_LABELS,
  type ReviewStatus,
} from "@/utils/quest-review";
import {
  calcDailyResult,
  calcPromiseRatio,
  calcWeeklyQuestReward,
  formatScore,
  MAX_DAILY_COINS,
  MAX_DAILY_XP,
  XP_PER_WEEKLY_QUEST,
  COIN_PER_WEEKLY_QUEST,
} from "@/utils/quest-rules";
import type { CardState, PromiseView, TodayView } from "@/utils/quest-types";

interface PromiseBoardProps {
  today: TodayView;
}

const SUBJECT_ICONS: Record<string, string> = { rose: "book", sky: "triangle", leaf: "abc", sun: "play" };

const STATUS_TONE: Record<ReviewStatus, string> = {
  NONE: "",
  OPEN: "tag--sky",
  SUBMITTED: "tag--gold",
  CONFIRMED: "tag--teal",
  RETRY: "tag--pink",
  HELP: "tag--pink",
};

/**
 * 오늘 약속 3칸과 주간 퀘스트. 쪽/단어 칸을 눌러 진도를 기록하고, 선생님 퀘스트는 사진 인증을 올려 제출한다.
 * 같은 칸을 여러 번 눌러도 한 번만 세고, 선생님이 확인한 퀘스트와 지난 날의 약속은 고칠 수 없다.
 */
export function PromiseBoard({ today }: PromiseBoardProps) {
  const router = useRouter();
  const [cards, setCards] = useState<Record<string, CardState>>(() =>
    Object.fromEntries(
      [...today.promises, ...today.weekly].map((promise) => [
        promise.id,
        { confirmedUnitNos: promise.confirmedUnitNos, reviewStatus: promise.reviewStatus, feedback: promise.feedback, proofs: promise.proofs },
      ]),
    ),
  );
  const [message, setMessage] = useState<string | null>(null);
  const [busyCard, setBusyCard] = useState<string | null>(null);

  const progresses = today.promises.map((promise) => {
    const state = cards[promise.id];
    const counted = countsTowardScore(state.reviewStatus);

    return { confirmedUnits: counted ? state.confirmedUnitNos.length : 0, plannedUnits: promise.unitCount };
  });
  const result = calcDailyResult(progresses, today.reflected);

  /**
   * Stores the server's latest state of a card and refreshes the page data (HUD, board) in the background.
   */
  function applyCardState(promiseId: string, card: CardState): void {
    setCards((current) => ({ ...current, [promiseId]: card }));
    void router.replace(router.asPath, undefined, { scroll: false });
  }

  /**
   * Reads an error message from a failed response.
   */
  async function readError(response: Response, fallback: string): Promise<string> {
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;

    return payload?.message ?? fallback;
  }

  /**
   * Flips one unit locally, saves it, and rolls back with a message when saving fails.
   */
  async function toggleUnit(promiseId: string, unitNo: number): Promise<void> {
    const before = cards[promiseId];
    const done = !before.confirmedUnitNos.includes(unitNo);
    const optimistic = done ? [...before.confirmedUnitNos, unitNo] : before.confirmedUnitNos.filter((value) => value !== unitNo);
    setCards((current) => ({ ...current, [promiseId]: { ...before, confirmedUnitNos: optimistic } }));
    setMessage(null);
    playSfx(done ? "tile" : "toggle");

    try {
      const response = await fetch("/api/promise-units", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ promiseId, unitNo, done }),
      });
      if (!response.ok) {
        setCards((current) => ({ ...current, [promiseId]: before }));
        setMessage(await readError(response, "기록하지 못했어요. 잠시 뒤에 다시 눌러 주세요."));
        playSfx("wrong");
        return;
      }
      const { card } = (await response.json()) as { card: CardState };
      applyCardState(promiseId, card);
      const planned = [...today.promises, ...today.weekly].find((promise) => promise.id === promiseId)?.unitCount ?? 0;
      if (done && planned > 0 && card.confirmedUnitNos.length >= planned) {
        playSfx("powerup");
      }
    } catch {
      setCards((current) => ({ ...current, [promiseId]: before }));
      setMessage("네트워크 연결을 확인하고 다시 눌러 주세요.");
    }
  }

  /**
   * Shrinks and uploads a proof photo for a card.
   */
  async function uploadProof(promiseId: string, file: File): Promise<void> {
    setBusyCard(promiseId);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append("promiseId", promiseId);
      formData.append("photo", await resizeImageFile(file));
      const response = await fetch("/api/proofs", { method: "POST", body: formData });
      if (!response.ok) {
        setMessage(await readError(response, "사진을 올리지 못했어요."));
        playSfx("wrong");
        return;
      }
      applyCardState(promiseId, ((await response.json()) as { card: CardState }).card);
      playSfx("pop");
    } catch {
      setMessage("네트워크 연결을 확인하고 다시 올려 주세요.");
    } finally {
      setBusyCard(null);
    }
  }

  /**
   * Removes one of the student's own proof photos.
   */
  async function deleteProof(promiseId: string, proofId: string): Promise<void> {
    setBusyCard(promiseId);
    setMessage(null);
    try {
      const response = await fetch("/api/proof-remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proofId }),
      });
      if (!response.ok) {
        setMessage(await readError(response, "사진을 지우지 못했어요."));
        return;
      }
      applyCardState(promiseId, ((await response.json()) as { card: CardState }).card);
    } catch {
      setMessage("네트워크 연결을 확인해 주세요.");
    } finally {
      setBusyCard(null);
    }
  }

  /**
   * Sends the card to the teacher for confirmation.
   */
  async function submit(promiseId: string): Promise<void> {
    setBusyCard(promiseId);
    setMessage(null);
    try {
      const response = await fetch("/api/card-submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ promiseId }),
      });
      if (!response.ok) {
        setMessage(await readError(response, "제출하지 못했어요."));
        playSfx("wrong");
        return;
      }
      applyCardState(promiseId, ((await response.json()) as { card: CardState }).card);
      playSfx("submit");
    } catch {
      setMessage("네트워크 연결을 확인하고 다시 눌러 주세요.");
    } finally {
      setBusyCard(null);
    }
  }

  const renderCard = (promise: PromiseView) => (
    <PromiseCardView
      busy={busyCard === promise.id}
      key={promise.id}
      onDeleteProof={(proofId) => void deleteProof(promise.id, proofId)}
      onSubmit={() => void submit(promise.id)}
      onToggle={(unitNo) => void toggleUnit(promise.id, unitNo)}
      onUploadProof={(file) => void uploadProof(promise.id, file)}
      promise={promise}
      state={cards[promise.id]}
    />
  );

  return (
    <div className="promise-board">
      {today.isSchoolDay ? (
        <>
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

          <ul className="promise-list">{today.promises.map(renderCard)}</ul>

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
        </>
      ) : (
        <div className="rest-note card card--mint pf">
          <PixelIcon name="sprout" scale={1.6} />
          <p>
            <strong>오늘은 쉬어가는 날이에요.</strong>
            <br />
            월요일 00:00에 새 주가 시작돼요. 내 레벨과 집은 그대로 남아요.
          </p>
        </div>
      )}

      {today.weekly.length > 0 ? (
        <>
          <h3 className="section-label">이번 주 퀘스트 · 선생님이 낸 주간 목표</h3>
          <ul className="promise-list">{today.weekly.map(renderCard)}</ul>
        </>
      ) : null}

      {message ? (
        <p className="msg msg--error" role="alert">
          {message}
        </p>
      ) : null}

      {today.isSchoolDay ? (
        <>
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
        </>
      ) : null}
    </div>
  );
}

interface PromiseCardViewProps {
  promise: PromiseView;
  state: CardState;
  busy: boolean;
  onToggle(unitNo: number): void;
  onUploadProof(file: File): void;
  onDeleteProof(proofId: string): void;
  onSubmit(): void;
}

/**
 * One promise card: subject, tiles, progress, and — for teacher quests — proof photos, submit button, and feedback.
 */
function PromiseCardView({ promise, state, busy, onToggle, onUploadProof, onDeleteProof, onSubmit }: PromiseCardViewProps) {
  const cameraInput = useRef<HTMLInputElement>(null);
  const albumInput = useRef<HTMLInputElement>(null);
  const tone = getSubjectTone(promise.subject);
  const confirmed = state.confirmedUnitNos;
  const editable = canStudentEdit(state.reviewStatus);
  const isQuest = needsReview(state.reviewStatus);
  const smallTiles = promise.unitKind === "WORD" || promise.unitKind === "CHECK" || promise.unitCount > 8;
  const isWeekly = promise.scope === "WEEK";
  const ratio = calcPromiseRatio({ confirmedUnits: confirmed.length, plannedUnits: promise.unitCount });
  const submitCheck = checkCanSubmit({
    status: state.reviewStatus,
    confirmedUnits: confirmed.length,
    requireProof: promise.requireProof,
    proofCount: state.proofs.length,
  });
  const reward = calcWeeklyQuestReward({ confirmedUnits: confirmed.length, plannedUnits: promise.unitCount });
  const countLabel = promise.unitKind === "PAGE" ? "쪽" : promise.unitKind === "LECTURE" ? "강" : promise.unitKind === "CHECK" ? "회" : "개";

  return (
    <li className={clsx("promise card pf", isQuest && "promise--quest")}>
      <div className="promise__head">
        <span className={clsx("subject-chip", `subject-chip--${tone}`)}>
          <PixelIcon name={SUBJECT_ICONS[tone]} />
          {promise.subject}
        </span>
        <span className="promise__title">{promise.title}</span>
        {isQuest ? <span className="tag tag--gold">선생님 퀘스트</span> : null}
        <span className="promise__range">
          {isWeekly ? "이번 주 목표" : "오늘 약속"} <b>{promise.rangeLabel}</b>
        </span>
      </div>

      {promise.questNote ? <p className="muted">선생님 메모: {promise.questNote}</p> : null}

      <div className={clsx("tile-grid", smallTiles && "tile-grid--small")} role="group" aria-label={`${promise.subject} ${promise.rangeLabel} 진도 칸`}>
        {listUnitNumbers(promise).map((unitNo) => {
          const done = confirmed.includes(unitNo);
          const label = buildUnitLabel(promise.unitKind, unitNo, promise.unitStart);

          return (
            <button
              aria-label={`${label}${promise.unitKind === "PAGE" ? "쪽" : "번"} ${done ? "완료, 누르면 취소" : "기록하기"}`}
              aria-pressed={done}
              className={clsx("tile pf", done && "tile--done")}
              data-sfx="none"
              disabled={!editable}
              key={unitNo}
              onClick={() => onToggle(unitNo)}
              type="button"
            >
              {done ? <PixelIcon name="check" /> : label}
            </button>
          );
        })}
      </div>

      <div className="promise__foot">
        <div aria-valuemax={promise.unitCount} aria-valuemin={0} aria-valuenow={confirmed.length} className="bar bar--thin" role="progressbar">
          <div className="bar__fill" style={{ width: `${Math.round(ratio * 100)}%` }} />
        </div>
        <span className="promise__count">
          <b>{confirmed.length}</b> / {promise.unitCount}
          {countLabel}
        </span>
      </div>

      {isWeekly ? (
        <p className="muted">
          지금까지 보너스 <b>{reward.xp}</b> / {XP_PER_WEEKLY_QUEST} XP · 코인 <b>{reward.coins}</b> / {COIN_PER_WEEKLY_QUEST} (하루 점수에는 들어가지 않아요)
        </p>
      ) : null}

      {isQuest ? (
        <div className="proof">
          <div className="proof__status">
            <span className={clsx("tag", STATUS_TONE[state.reviewStatus])}>{REVIEW_LABELS[state.reviewStatus]}</span>
            {promise.requireProof ? <span className="tag tag--pink">사진 인증 필수</span> : <span className="tag">사진 인증 선택</span>}
          </div>

          {state.proofs.length > 0 ? (
            <ul className="proof-strip" aria-label="내가 올린 인증 사진">
              {state.proofs.map((proof) => (
                <li key={proof.id}>
                  <a href={proof.imageUrl} rel="noreferrer" target="_blank">
                    {/* eslint-disable-next-line @next/next/no-img-element -- 학생이 올린 인증 사진 원본을 그대로 보여 준다. */}
                    <img alt="인증 사진" className="proof-strip__img" src={proof.imageUrl} />
                  </a>
                  {editable ? (
                    <button aria-label="이 사진 지우기" className="proof-strip__remove" disabled={busy} onClick={() => onDeleteProof(proof.id)} type="button">
                      ×
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}

          {editable && state.proofs.length < MAX_PROOFS_PER_CARD ? (
            <div className="proof__buttons">
              <button className="btn btn--small btn--cream" disabled={busy} onClick={() => cameraInput.current?.click()} type="button">
                <PixelIcon name="heart" /> 사진 찍기
              </button>
              <button className="btn btn--small btn--cream" disabled={busy} onClick={() => albumInput.current?.click()} type="button">
                <PixelIcon name="book" /> 앨범에서 고르기
              </button>
              {[
                { ref: cameraInput, capture: "environment" as const, label: "카메라로 인증 사진 찍기" },
                { ref: albumInput, capture: undefined, label: "앨범에서 인증 사진 고르기" },
              ].map((input) => (
                <input
                  accept="image/*"
                  aria-label={input.label}
                  capture={input.capture}
                  className="sr-only"
                  key={input.label}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    if (file) {
                      onUploadProof(file);
                    }
                  }}
                  ref={input.ref}
                  type="file"
                />
              ))}
            </div>
          ) : null}

          {state.feedback ? (
            <p className="proof__feedback">
              <b>{promise.reviewedBy || "선생님"}</b> {state.feedback}
            </p>
          ) : null}

          {state.reviewStatus === "CONFIRMED" ? (
            <p className="msg msg--ok">선생님이 확인했어요. 잘했어요!</p>
          ) : state.reviewStatus === "SUBMITTED" ? (
            <p className="msg">제출했어요. 선생님이 확인하면 알려 드릴게요. 칸을 고치면 다시 제출해야 해요.</p>
          ) : (
            <>
              <button className="btn btn--block btn--gold" data-sfx="none" disabled={busy || !submitCheck.ok} onClick={onSubmit} type="button">
                <PixelIcon name="bell" />
                <span>{state.reviewStatus === "RETRY" ? "다시 제출하기" : "선생님께 제출하기"}</span>
              </button>
              {!submitCheck.ok ? <p className="muted">{submitCheck.reason}</p> : null}
            </>
          )}
        </div>
      ) : null}
    </li>
  );
}
