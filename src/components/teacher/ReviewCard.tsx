import { useRouter } from "next/router";
import { useState } from "react";
import clsx from "clsx";

import { PixelAvatar, PixelIcon } from "@/components/pixel/PixelSprite";
import { playSfx } from "@/utils/audio/audio-engine";
import { buildUnitLabel } from "@/utils/quest-plan";
import { DECISION_LABELS, REVIEW_DECISIONS, REVIEW_LABELS, type ReviewDecision } from "@/utils/quest-review";
import { listUnitNumbers } from "@/utils/quest-plan";
import type { ReviewItemView } from "@/utils/quest-types";

interface ReviewCardProps {
  item: ReviewItemView;
  /** 이미 결정한 기록은 접어 두고, 필요하면 다시 열어 결정을 바꿀 수 있다. */
  compact?: boolean;
}

const DECISION_STYLE: Record<ReviewDecision, string> = {
  CONFIRMED: "",
  RETRY: "btn--cream",
  HELP: "btn--pink",
};

/**
 * 확인함 카드 한 장: 학생, 퀘스트, 진행 칸, 인증 사진, 그리고 수행 확인 / 다시 시도 / 도움 필요 버튼.
 * 다시 시도는 무엇을 다시 할지 한 줄 피드백이 꼭 필요하다.
 */
export function ReviewCard({ item, compact = false }: ReviewCardProps) {
  const router = useRouter();
  const [feedback, setFeedback] = useState(item.feedback);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const done = new Set(item.confirmedUnitNos);
  const decided = item.reviewStatus === "CONFIRMED" || item.reviewStatus === "RETRY" || item.reviewStatus === "HELP";

  /**
   * Sends the decision and refreshes the list.
   */
  async function decide(decision: ReviewDecision): Promise<void> {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/teacher/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ promiseId: item.promiseId, decision, feedback }),
      });
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      if (!response.ok) {
        setMessage(payload?.message ?? "저장하지 못했어요.");
        playSfx("wrong");
        return;
      }
      playSfx(decision === "CONFIRMED" ? "stamp" : "bell");
      void router.replace(router.asPath, undefined, { scroll: false });
    } catch {
      setMessage("네트워크 연결을 확인해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  const body = (
    <>
      <div className="review__tiles" aria-label="학생이 채운 칸">
        {listUnitNumbers(item).map((unitNo) => (
          <span className={clsx("mini-tile", done.has(unitNo) && "mini-tile--done")} key={unitNo}>
            {buildUnitLabel(item.unitKind, unitNo, item.unitStart)}
          </span>
        ))}
      </div>
      <p className="muted">
        {done.size} / {item.unitCount} 칸 완료{item.requireProof ? " · 사진 인증 필수" : ""}
      </p>

      {item.proofs.length > 0 ? (
        <ul className="proof-strip" aria-label="인증 사진">
          {item.proofs.map((proof) => (
            <li key={proof.id}>
              <a href={proof.imageUrl} rel="noreferrer" target="_blank">
                {/* eslint-disable-next-line @next/next/no-img-element -- 학생이 올린 인증 사진 원본을 그대로 보여 준다. */}
                <img alt={`${item.studentName} 인증 사진`} className="proof-strip__img" src={proof.imageUrl} />
              </a>
            </li>
          ))}
        </ul>
      ) : item.requireProof ? (
        <p className="msg msg--error">인증 사진이 아직 없어요.</p>
      ) : null}

      <label className="field">
        <span>피드백 (관찰한 과정과 다음 행동을 짧게)</span>
        <textarea
          className="textarea"
          maxLength={200}
          onChange={(event) => setFeedback(event.target.value)}
          placeholder="예: 막힌 곳을 잘 표시했구나! 다음엔 표시한 이유를 한 줄로 적어 보자."
          rows={2}
          value={feedback}
        />
      </label>

      <div className="review__actions">
        {REVIEW_DECISIONS.map((decision) => (
          <button className={clsx("btn btn--small", DECISION_STYLE[decision])} data-sfx="none" disabled={busy} key={decision} onClick={() => void decide(decision)} type="button">
            {decision === "CONFIRMED" ? <PixelIcon name="check" /> : null}
            {DECISION_LABELS[decision]}
          </button>
        ))}
      </div>
      {message ? (
        <p className="msg msg--error" role="alert">
          {message}
        </p>
      ) : null}
    </>
  );

  return (
    <article className="review card pf">
      <header className="review__head">
        <span className="review__face">
          <PixelAvatar hairKey={item.hairKey} scale={1.1} />
        </span>
        <div className="review__who">
          <strong>{item.studentName}</strong>
          <span className="muted">
            {item.teamName} · {item.dateLabel}
          </span>
        </div>
        <span className={clsx("tag", item.reviewStatus === "CONFIRMED" ? "tag--teal" : item.reviewStatus === "SUBMITTED" ? "tag--gold" : "tag--pink")}>
          {REVIEW_LABELS[item.reviewStatus]}
        </span>
      </header>
      <h3 className="review__title">
        <span className="tag tag--sky">{item.subject}</span> {item.title} <span className="muted">{item.rangeLabel}</span>
        {item.scope === "WEEK" ? <span className="tag">주간</span> : null}
      </h3>
      {item.questNote ? <p className="muted">메모: {item.questNote}</p> : null}

      {compact && decided ? (
        <details className="review__reopen">
          <summary>
            {item.feedback ? `피드백: ${item.feedback}` : "피드백 없음"} · 결정 바꾸기
          </summary>
          {body}
        </details>
      ) : (
        body
      )}
    </article>
  );
}
