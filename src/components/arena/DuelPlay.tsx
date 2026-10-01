import { useCallback, useEffect, useRef, useState } from "react";
import clsx from "clsx";

import { ModalDialog } from "@/components/ModalDialog";
import { Cc0Sprite, PixelAvatar, PixelIcon } from "@/components/pixel/PixelSprite";
import { EMOTE_LABELS, EMOTE_NAMES, isEmoteName } from "@/utils/art/cc0";
import type { AnswerFeedback } from "@/utils/arena-repository";
import type { DuelResultView, DuelStartView } from "@/utils/arena-types";
import { getAudioEngine, playSfx } from "@/utils/audio/audio-engine";
import { bgmForSpace } from "@/utils/audio/sound-catalog";

const INTRO_MS = 1700;
const COUNT_STEP_MS = 700;
const REVEAL_MS = 1100;
const LABELS = ["①", "②", "③", "④"];

type Stage = "intro" | "countdown" | "question" | "reveal" | "result" | "error";

interface DuelPlayProps {
  start: DuelStartView;
  /** 닫을 때 화면 데이터를 새로 읽어야 하는지 */
  onClose: (changed: boolean) => void;
}

/**
 * 대결 진행 화면: VS 소개 → 3·2·1 → 문제 5개(제한 시간, 즉시 맞음/틀림) → 결과.
 * 답은 문제마다 서버에 잠기고, 정답은 낸 직후에 알려 준다.
 */
export function DuelPlay({ start, onClose }: DuelPlayProps) {
  const [stage, setStage] = useState<Stage>(start.answered >= start.questions.length ? "result" : "intro");
  const [index, setIndex] = useState(start.answered);
  const [marks, setMarks] = useState<boolean[]>(start.marks);
  const [count, setCount] = useState(3);
  const [remaining, setRemaining] = useState(start.questionMs);
  const [picked, setPicked] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ correct: boolean; answerIndex: number } | null>(null);
  const [result, setResult] = useState<DuelResultView | null>(null);
  const [error, setError] = useState("");
  const startedAt = useRef(0);
  const busy = useRef(false);
  const lastTick = useRef(4);
  const question = start.questions[index];

  /**
   * 문제 하나의 답을 서버에 내고, 맞았는지 보여 준 뒤 다음으로 넘어간다.
   */
  const submitAnswer = useCallback(
    async (choice: number | null) => {
      if (busy.current) {
        return;
      }
      busy.current = true;
      const ms = Math.min(start.questionMs, Math.round(performance.now() - startedAt.current));
      setPicked(choice);
      try {
        const response = await fetch("/api/arena/answer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ duelId: start.duelId, index, choice, ms: choice === null ? start.questionMs : ms }),
        });
        const payload = (await response.json().catch(() => null)) as (AnswerFeedback & { message?: string }) | null;
        if (!response.ok || !payload) {
          setError(payload?.message ?? "답을 보내지 못했어요.");
          setStage("error");
          return;
        }
        setFeedback({ correct: payload.correct, answerIndex: payload.answerIndex });
        setMarks((previous) => [...previous, payload.correct]);
        playSfx(payload.correct ? "correct" : "wrong");
        setStage("reveal");
        window.setTimeout(() => {
          busy.current = false;
          if (payload.result) {
            setResult(payload.result);
            playSfx(payload.result.outcome === "WIN" ? "win" : payload.result.outcome === "LOSE" ? "lose" : payload.result.outcome === "DRAW" ? "draw" : "submit");
            setStage("result");
            return;
          }
          setIndex((value) => value + 1);
          setPicked(null);
          setFeedback(null);
          setRemaining(start.questionMs);
          setStage("question");
        }, REVEAL_MS);
      } catch {
        busy.current = false;
        setError("네트워크 연결을 확인해 주세요.");
        setStage("error");
      }
    },
    [index, start.duelId, start.questionMs],
  );

  useEffect(() => {
    if (stage !== "result" || result || start.answered < start.questions.length) {
      return undefined;
    }
    // 이미 다 풀어 낸 대결을 다시 열었을 때는 결과를 서버에서 읽는다.
    let cancelled = false;
    void fetch("/api/arena/result", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ duelId: start.duelId }) })
      .then((response) => response.json())
      .then((payload: DuelResultView) => {
        if (!cancelled) {
          setResult(payload);
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [result, stage, start.answered, start.duelId, start.questions.length]);

  useEffect(() => {
    // 대결이 시작되면 로비의 신나는 전투 음악 대신 긴장감 있는 곡으로 바꾸고, 닫으면 로비 음악으로 돌아간다.
    const engine = getAudioEngine();
    engine?.setTrack("arena");

    return () => engine?.setTrack(bgmForSpace("arena"));
  }, []);

  useEffect(() => {
    if (stage !== "intro") {
      return undefined;
    }
    playSfx("whoosh");
    const timer = window.setTimeout(() => {
      setCount(3);
      setStage("countdown");
    }, INTRO_MS);

    return () => window.clearTimeout(timer);
  }, [stage]);

  useEffect(() => {
    if (stage !== "countdown") {
      return undefined;
    }
    playSfx("tick");
    let value = 3;
    const timer = window.setInterval(() => {
      value -= 1;
      if (value <= 0) {
        window.clearInterval(timer);
        playSfx("pop");
        setRemaining(start.questionMs);
        setStage("question");
        return;
      }
      setCount(value);
      playSfx("tick");
    }, COUNT_STEP_MS);

    return () => window.clearInterval(timer);
  }, [stage, start.questionMs]);

  useEffect(() => {
    if (stage !== "question") {
      return undefined;
    }
    startedAt.current = performance.now();
    lastTick.current = 4;
    const timer = window.setInterval(() => {
      const left = Math.max(0, start.questionMs - (performance.now() - startedAt.current));
      setRemaining(left);
      const second = Math.ceil(left / 1000);
      if (second <= 3 && second < lastTick.current && second > 0) {
        lastTick.current = second;
        playSfx("tick");
      }
      if (left <= 0) {
        window.clearInterval(timer);
        void submitAnswer(null);
      }
    }, 100);

    return () => window.clearInterval(timer);
  }, [stage, index, start.questionMs, submitAnswer]);

  useEffect(() => {
    /**
     * 숫자 키 1~4로도 고를 수 있다.
     */
    const onKey = (event: KeyboardEvent) => {
      if (stage !== "question") {
        return;
      }
      const number = Number(event.key);
      if (number >= 1 && number <= 4) {
        void submitAnswer(number - 1);
      }
    };
    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
  }, [stage, submitAnswer]);

  const percent = Math.round((remaining / start.questionMs) * 100);

  return (
    <ModalDialog label="퀴즈 대결" onRequestClose={stage === "result" || stage === "error" ? () => onClose(true) : undefined}>
      <div className="duel__card pf">
        <header className="duel__players">
          <div className="duel__player">
            <PixelAvatar hairKey={start.me.hairKey} scale={1.6} />
            <strong>{start.me.name}</strong>
          </div>
          <div aria-label={`${marks.length}문제 진행`} className="duel__dots" role="img">
            {start.questions.map((_, dotIndex) => (
              <span
                className={clsx(
                  "duel__dot",
                  marks[dotIndex] === true && "duel__dot--ok",
                  marks[dotIndex] === false && "duel__dot--no",
                  dotIndex === index && stage !== "result" && "duel__dot--now",
                )}
                key={dotIndex}
              />
            ))}
          </div>
          <div className="duel__player duel__player--rival">
            <strong>{start.rival.name}</strong>
            <PixelAvatar hairKey={start.rival.hairKey} scale={1.6} />
          </div>
        </header>

        {stage === "intro" ? (
          <div className="duel__intro">
            <span className="duel__vs">VS</span>
            <p>
              {start.me.name} 대 {start.rival.name}
            </p>
            <p className="muted">같은 문제 {start.questions.length}개를 풀어요. 문제마다 {Math.round(start.questionMs / 1000)}초!</p>
          </div>
        ) : null}

        {stage === "countdown" ? (
          <div aria-live="assertive" className="duel__intro">
            <span className="duel__count">{count}</span>
          </div>
        ) : null}

        {(stage === "question" || stage === "reveal") && question ? (
          <div className="duel__body">
            <div
              aria-label={`남은 시간 ${Math.ceil(remaining / 1000)}초`}
              aria-valuemax={100}
              aria-valuemin={0}
              aria-valuenow={percent}
              className={clsx("duel__timer", percent <= 33 && "duel__timer--low")}
              role="progressbar"
            >
              <div className="duel__timer-fill" style={{ width: `${percent}%` }} />
            </div>
            <p className="duel__kind">
              <PixelIcon name={question.kind === "MATH" ? "triangle" : "abc"} /> {index + 1} / {start.questions.length}번 · {question.kind === "MATH" ? "수학" : "영어"}
            </p>
            <h2 className="duel__prompt">{question.prompt}</h2>
            <div className="duel__choices">
              {question.choices.map((choice, choiceIndex) => {
                const isAnswer = feedback?.answerIndex === choiceIndex;
                const isWrongPick = feedback && picked === choiceIndex && !feedback.correct;

                return (
                  <button
                    className={clsx("duel__choice", isAnswer && "duel__choice--right", isWrongPick && "duel__choice--wrong", feedback && !isAnswer && !isWrongPick && "duel__choice--dim")}
                    data-sfx="none"
                    disabled={stage !== "question"}
                    key={choice}
                    onClick={() => void submitAnswer(choiceIndex)}
                    type="button"
                  >
                    <span className="duel__label">{LABELS[choiceIndex]}</span>
                    <span>{choice}</span>
                  </button>
                );
              })}
            </div>
            <p aria-live="polite" className={clsx("duel__note", feedback && (feedback.correct ? "duel__note--ok" : "duel__note--no"))}>
              {feedback ? (feedback.correct ? "정답! 잘했어요" : "아쉬워요! 정답은 초록색이에요") : picked === null ? "숫자 키 1~4로도 고를 수 있어요" : " "}
            </p>
          </div>
        ) : null}

        {stage === "result" ? (
          result ? (
            <DuelResultPanel onClose={() => onClose(true)} result={result} />
          ) : (
            <div className="duel__intro">
              <p>결과를 불러오는 중…</p>
            </div>
          )
        ) : null}

        {stage === "error" ? (
          <div className="duel__intro">
            <p className="msg msg--error" role="alert">
              {error}
            </p>
            <button className="btn" onClick={() => onClose(true)} type="button">
              대결장으로 돌아가기
            </button>
          </div>
        ) : null}
      </div>
    </ModalDialog>
  );
}

interface DuelResultPanelProps {
  result: DuelResultView;
  onClose: () => void;
}

const OUTCOME_COPY = {
  WIN: { title: "승리!", line: "멋진 실력이에요!", tone: "win" },
  LOSE: { title: "아쉬워요", line: "다음에는 더 잘할 수 있어요. 틀린 문제를 확인해 봐요!", tone: "lose" },
  DRAW: { title: "무승부!", line: "막상막하였어요!", tone: "draw" },
} as const;

/**
 * 끝난 대결에서 친구에게 응원 이모트를 보내는 줄. 응원·칭찬이 되는 이모트만 있다.
 */
function EmoteBar({ duelId, rivalName, mine, theirs }: { duelId: string; rivalName: string; mine: string | null; theirs: string | null }) {
  const [sent, setSent] = useState<string | null>(mine);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  /**
   * 이모트를 서버에 보내고, 성공하면 고른 것을 표시한다.
   */
  async function send(emote: string): Promise<void> {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/arena/react", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ duelId, emote }) });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        setError(payload?.message ?? "이모트를 보내지 못했어요.");
        playSfx("wrong");

        return;
      }
      setSent(emote);
      playSfx("pop");
    } catch {
      setError("네트워크 연결을 확인해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="emote-bar">
      {isEmoteName(theirs) ? (
        <p className="emote-bar__got">
          <Cc0Sprite kind="emotes" label={EMOTE_LABELS[theirs]} name={theirs} scale={1} ui /> {rivalName}이(가) 응원을 보냈어요!
        </p>
      ) : null}
      <p className="muted emote-bar__title">{rivalName}에게 응원을 보내요</p>
      <div aria-label="응원 이모트" className="emote-bar__row" role="group">
        {EMOTE_NAMES.map((name) => (
          <button
            aria-label={EMOTE_LABELS[name]}
            aria-pressed={sent === name}
            className={clsx("emote-bar__btn", sent === name && "emote-bar__btn--on")}
            data-sfx="none"
            disabled={busy}
            key={name}
            onClick={() => void send(name)}
            title={EMOTE_LABELS[name]}
            type="button"
          >
            <Cc0Sprite kind="emotes" name={name} scale={1} ui />
          </button>
        ))}
      </div>
      {error ? (
        <p className="msg msg--error" role="status">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/**
 * 대결 결과: 점수, 레이팅 변화, 받은 보상, 응원 이모트, 문제별 정답 풀이.
 */
export function DuelResultPanel({ result, onClose }: DuelResultPanelProps) {
  const copy = result.outcome ? OUTCOME_COPY[result.outcome] : null;

  return (
    <div className="duel__result">
      {copy ? (
        <>
          <h2 className={clsx("duel__outcome", `duel__outcome--${copy.tone}`)}>{copy.title}</h2>
          <p>{copy.line}</p>
        </>
      ) : (
        <>
          <h2 className="duel__outcome duel__outcome--wait">제출 완료!</h2>
          <p>친구가 풀면 결과가 나와요. 대결장에서 알려 줄게요.</p>
        </>
      )}

      <div className="duel__scores">
        <div className="duel__score">
          <span className="muted">{result.me.name}</span>
          <strong>{result.me.score}점</strong>
          <span className="muted">
            {result.me.correct}개 정답 · {(result.me.totalMs / 1000).toFixed(1)}초
          </span>
        </div>
        <div className="duel__score duel__score--rival">
          <span className="muted">{result.rival?.name ?? "친구"}</span>
          <strong>{result.rival ? `${result.rival.score}점` : "기다리는 중"}</strong>
          {result.rival ? (
            <span className="muted">
              {result.rival.correct}개 정답 · {(result.rival.totalMs / 1000).toFixed(1)}초
            </span>
          ) : null}
        </div>
      </div>

      {result.state === "DONE" ? (
        <ul className="duel__rewards">
          <li>
            <PixelIcon name="trophy" /> {result.leagueName} · 점수 {result.ratingAfter} ({result.ratingDelta >= 0 ? "+" : ""}
            {result.ratingDelta})
          </li>
          <li>
            <PixelIcon name="gem" /> 경험치 +{result.xp}
          </li>
          <li>
            <PixelIcon name="coin" /> 코인 +{result.coins}
          </li>
        </ul>
      ) : null}
      {result.state === "DONE" && result.xp === 0 && result.coins === 0 ? <p className="muted">오늘 받을 수 있는 대결 보상은 다 받았어요. 점수는 그대로 반영돼요.</p> : null}

      {result.state === "DONE" && result.rival ? <EmoteBar duelId={result.duelId} mine={result.myEmote} rivalName={result.rival.name} theirs={result.rivalEmote} /> : null}

      {result.review ? (
        <ol className="duel__review">
          {result.review.map((item, itemIndex) => (
            <li className={clsx(item.correct ? "duel__review--ok" : "duel__review--no")} key={itemIndex}>
              <span className="duel__review-mark">{item.correct ? "○" : "×"}</span>
              <span>
                {item.prompt} <b>{item.choices[item.answerIndex]}</b>
                {!item.correct && item.myChoice !== null ? <span className="muted"> (내 답: {item.choices[item.myChoice]})</span> : null}
                {!item.correct && item.myChoice === null ? <span className="muted"> (시간 초과)</span> : null}
              </span>
            </li>
          ))}
        </ol>
      ) : null}

      <button className="btn btn--gold" onClick={onClose} type="button">
        대결장으로
      </button>
    </div>
  );
}
