import { useRouter } from "next/router";
import { useState } from "react";
import clsx from "clsx";

import { PixelIcon } from "@/components/pixel/PixelSprite";
import { playSfx } from "@/utils/audio/audio-engine";
import type { WordAnswerView, WordSessionView } from "@/utils/word-types";

interface WordReviewProps {
  session: WordSessionView;
}

const LABELS = ["①", "②", "③", "④"];

/**
 * 오늘의 단어 복습: 한 문제씩 풀고, 고르는 즉시 서버가 채점해 정답과 다음 만남을 알려 준다.
 * 틀린 단어는 곧 다시 나오고, 잘 맞히는 단어는 점점 드물게 나온다(간격 반복). 점수 경쟁이 아니라 내 기억을 돕는 연습이다.
 */
export function WordReview({ session }: WordReviewProps) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<WordAnswerView | null>(null);
  const [results, setResults] = useState<boolean[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const total = session.questions.length;
  const question = session.questions[index];
  const finished = index >= total && total > 0;

  /**
   * 고른 보기를 서버에 보내 채점을 받는다.
   */
  async function choose(choice: number): Promise<void> {
    if (!question || busy || feedback) {
      return;
    }
    setBusy(true);
    setError("");
    setPicked(choice);
    try {
      const response = await fetch("/api/words/answer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ word: question.word, choice }) });
      const payload = (await response.json().catch(() => null)) as (WordAnswerView & { message?: string }) | null;
      if (!response.ok || !payload) {
        setError(payload?.message ?? "답을 보내지 못했어요. 잠시 뒤에 다시 눌러 주세요.");
        setPicked(null);
        playSfx("wrong");

        return;
      }
      setFeedback(payload);
      setResults((previous) => [...previous, payload.correct]);
      playSfx(payload.correct ? "correct" : "wrong");
    } catch {
      setError("네트워크 연결을 확인해 주세요.");
      setPicked(null);
    } finally {
      setBusy(false);
    }
  }

  /**
   * 다음 문제로 넘어가거나, 끝났으면 화면 데이터를 새로 읽는다.
   */
  function next(): void {
    const upcoming = index + 1;
    setIndex(upcoming);
    setPicked(null);
    setFeedback(null);
    if (upcoming >= total) {
      playSfx("submit");
      void router.replace(router.asPath, undefined, { scroll: false });
    }
  }

  const correctCount = results.filter(Boolean).length;

  return (
    <section aria-labelledby="words-title" className="panel pf words">
      <h2 className="panel__title" id="words-title">
        <PixelIcon name="book" />
        <span>
          <span className="panel__eyebrow">틀린 단어는 곧, 잘 아는 단어는 천천히 다시 만나요</span>
          오늘의 단어 복습
        </span>
        <PixelIcon name="book" />
      </h2>

      <div className="words__stats">
        <span className="tag tag--teal">만난 단어 {session.stats.learning}개</span>
        <span className="tag tag--gold">익힌 단어 {session.stats.mastered}개</span>
        <span className="tag tag--sky">오늘 한 것 {session.doneToday + results.length}개</span>
      </div>

      {total === 0 ? (
        <p className="words__empty">
          {session.doneToday > 0 ? "오늘 복습을 모두 마쳤어요! 내일 또 만나요." : "오늘은 복습할 단어가 없어요."}
        </p>
      ) : finished ? (
        <div className="words__done">
          <h3>오늘 복습 끝!</h3>
          <p>
            {total}개 중 <b>{correctCount}개</b>를 맞혔어요. 틀린 단어는 곧 다시 만나요.
          </p>
          <p className="muted">복습한 단어 하나가 학급 보스에게 피해 1을 줘요.</p>
        </div>
      ) : question ? (
        <div className="words__card">
          <div aria-label={`${index + 1} / ${total}번`} className="duel__dots" role="img">
            {session.questions.map((item, dotIndex) => (
              <span className={clsx("duel__dot", results[dotIndex] === true && "duel__dot--ok", results[dotIndex] === false && "duel__dot--no", dotIndex === index && "duel__dot--now")} key={item.word} />
            ))}
          </div>
          <p className="duel__kind">
            <PixelIcon name={question.stage === "NEW" ? "sprout" : "star"} /> {question.stage === "NEW" ? "처음 만나는 단어" : "다시 만난 단어"}
          </p>
          <h3 className="duel__prompt">{question.prompt}</h3>
          <div className="duel__choices">
            {question.choices.map((choice, choiceIndex) => {
              const isAnswer = feedback?.answerIndex === choiceIndex;
              const isWrongPick = feedback && picked === choiceIndex && !feedback.correct;

              return (
                <button
                  className={clsx("duel__choice", isAnswer && "duel__choice--right", isWrongPick && "duel__choice--wrong", feedback && !isAnswer && !isWrongPick && "duel__choice--dim")}
                  data-sfx="none"
                  disabled={busy || feedback !== null}
                  key={choice}
                  onClick={() => void choose(choiceIndex)}
                  type="button"
                >
                  <span className="duel__label">{LABELS[choiceIndex]}</span>
                  <span>{choice}</span>
                </button>
              );
            })}
          </div>
          <p aria-live="polite" className={clsx("duel__note", feedback && (feedback.correct ? "duel__note--ok" : "duel__note--no"))}>
            {feedback ? `${feedback.correct ? "정답! " : "아쉬워요! 정답은 초록색이에요. "}${feedback.nextLabel}` : " "}
          </p>
          {error ? (
            <p className="msg msg--error" role="alert">
              {error}
            </p>
          ) : null}
          {feedback ? (
            <button className="btn btn--gold" onClick={next} type="button">
              {index + 1 >= total ? "끝내기" : "다음 단어"}
            </button>
          ) : null}
        </div>
      ) : null}

      {session.book.length > 0 ? (
        <>
          <h3 className="arena-sub">내 단어장 (기억이 약해진 순서)</h3>
          <ul className="words__book">
            {session.book.map((item) => (
              <li className="words__word" key={item.word}>
                <strong>{item.word}</strong>
                <span className="muted">{item.meaning}</span>
                <div aria-label={`${item.word} 기억 ${item.strength}%`} aria-valuemax={100} aria-valuemin={0} aria-valuenow={item.strength} className="bar bar--thin" role="progressbar">
                  <div className="bar__fill" style={{ width: `${item.strength}%` }} />
                </div>
                <span className="muted words__next">{item.mastered ? "익힘 · " : ""}{item.nextLabel}</span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
      <p className="panel__foot muted">간격 반복(FSRS)으로 다음에 만날 날을 정해요. 하루에 새 단어 4개, 모두 10개까지만 해요.</p>
    </section>
  );
}
