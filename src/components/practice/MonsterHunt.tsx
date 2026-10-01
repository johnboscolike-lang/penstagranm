import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import { useCallback, useEffect, useRef, useState } from "react";
import clsx from "clsx";

import { Cc0Sprite, KenneySprite, PixelIcon } from "@/components/pixel/PixelSprite";
import { getAudioEngine, playSfx } from "@/utils/audio/audio-engine";
import { bgmForSpace } from "@/utils/audio/sound-catalog";
import type { MiniGameFinish, MiniGameStart, MiniGameSummary } from "@/utils/minigame-types";
import { GAME_SECONDS, MAX_REWARDED_RUNS_PER_DAY, REWARD_TIERS, type RunResult } from "@/utils/minigame-rules";

const MonsterGameCanvas = dynamic(() => import("@/components/practice/MonsterGameCanvas"), {
  ssr: false,
  loading: () => <p className="hunt__loading">게임을 불러오는 중…</p>,
});

interface MonsterHuntProps {
  summary: MiniGameSummary;
}

type Phase = "idle" | "loading" | "playing" | "sending" | "result" | "error";

/**
 * 서버에 JSON을 보내고 결과를 받는다. 실패하면 서버가 준 한국어 안내를 던진다.
 */
async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const payload = (await response.json().catch(() => null)) as (T & { message?: string }) | null;
  if (!response.ok || !payload) {
    throw new Error(payload?.message ?? "잠시 후 다시 해 주세요.");
  }

  return payload;
}

/**
 * 몬스터 사냥 미니게임: 30초 동안 위에 나온 뜻과 같은 영어 단어를 든 몬스터를 눌러 잡는다.
 * 게임은 브라우저 안에서 돌아가고, 끝나면 서버가 결과를 확인해 작은 보상을 준다.
 * 하루에 시작할 수 있는 판과 보상 받는 판이 정해져 있다.
 */
export function MonsterHunt({ summary: initial }: MonsterHuntProps) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [summary, setSummary] = useState(initial);
  const [run, setRun] = useState<MiniGameStart | null>(null);
  const [result, setResult] = useState<MiniGameFinish | null>(null);
  const [error, setError] = useState("");
  const runRef = useRef<MiniGameStart | null>(null);
  const [calm] = useState(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  useEffect(() => {
    setSummary(initial);
  }, [initial]);

  // 게임 중에는 빠른 음악으로 바꾸고, 끝나면 이 공간의 음악으로 돌아간다.
  useEffect(() => {
    if (phase !== "playing") {
      return undefined;
    }
    const engine = getAudioEngine();
    engine?.setTrack("play");

    return () => engine?.setTrack(bgmForSpace("practice"));
  }, [phase]);

  /**
   * 한 판을 시작한다: 서버에서 판과 문제를 받은 뒤 게임을 연다.
   */
  async function start(): Promise<void> {
    setPhase("loading");
    setError("");
    setResult(null);
    try {
      const started = await postJson<MiniGameStart>("/api/minigame/start", {});
      runRef.current = started;
      setRun(started);
      setSummary(started.summary);
      setPhase("playing");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "잠시 후 다시 해 주세요.");
      setPhase("error");
    }
  }

  /**
   * 게임이 끝나면 결과를 서버에 보내 보상을 받는다.
   */
  const finish = useCallback(
    async (outcome: RunResult): Promise<void> => {
      const current = runRef.current;
      if (!current) {
        return;
      }
      setPhase("sending");
      try {
        const done = await postJson<MiniGameFinish>("/api/minigame/finish", { runId: current.runId, ...outcome });
        setResult(done);
        setSummary(done.summary);
        setPhase("result");
        playSfx(done.coins > 0 ? "levelup" : "submit");
        // 코인·경험치가 위쪽 표시줄에 반영되고, 알림이 뜨도록 화면 데이터를 새로 읽는다.
        void router.replace(router.asPath, undefined, { scroll: false });
      } catch (failure) {
        setError(failure instanceof Error ? failure.message : "결과를 보내지 못했어요.");
        setPhase("error");
      }
    },
    [router],
  );

  const canStart = summary.runsLeft > 0 && phase !== "loading" && phase !== "playing" && phase !== "sending";

  return (
    <section aria-labelledby="hunt-title" className="panel pf hunt">
      <h2 className="panel__title" id="hunt-title">
        <KenneySprite name="slime" scale={0.9} />
        <span>
          <span className="panel__eyebrow">{GAME_SECONDS}초 동안 단어 몬스터를 잡아요</span>
          몬스터 사냥
        </span>
        <KenneySprite flip name="bat" scale={0.9} />
      </h2>

      {phase === "playing" && run ? (
        <div className="hunt__stage">
          <MonsterGameCanvas calm={calm} onFinish={(outcome) => void finish(outcome)} rounds={run.rounds} />
        </div>
      ) : null}

      {phase === "sending" ? <p className="hunt__loading">결과를 확인하는 중…</p> : null}

      {phase === "result" && result ? (
        <div className="hunt__result">
          <h3>{result.score}점!</h3>
          <p>
            {result.hits}마리 잡고 {result.misses}번 놓쳤어요.
            {result.newBest ? " 내 최고 기록이에요! 🎉" : ""}
          </p>
          {result.coins > 0 || result.xp > 0 ? (
            <ul className="duel__rewards">
              <li>
                <PixelIcon name="gem" /> 경험치 +{result.xp}
              </li>
              <li>
                <PixelIcon name="coin" /> 코인 +{result.coins}
              </li>
            </ul>
          ) : (
            <p className="muted">{summary.rewardsLeft <= 0 && result.score >= REWARD_TIERS[REWARD_TIERS.length - 1].min ? "오늘 받을 수 있는 보상은 다 받았어요." : `${REWARD_TIERS[REWARD_TIERS.length - 1].min}점부터 보상이 있어요.`}</p>
          )}
        </div>
      ) : null}

      {phase === "error" ? (
        <p className="msg msg--error" role="alert">
          {error}
        </p>
      ) : null}

      {phase !== "playing" && phase !== "sending" ? (
        <div className="hunt__intro">
          <div className="hunt__cast" aria-hidden="true">
            {(["slime", "ghost", "imp", "wolf"] as const).map((name) => (
              <KenneySprite className="hunt__cast-item" key={name} name={name} scale={1.4} />
            ))}
          </div>
          <p className="muted">
            위에 나온 우리말 뜻과 같은 <b>영어 단어</b>를 든 몬스터를 눌러요. 연속으로 잡으면 점수가 더 올라가요!
          </p>
          <div className="words__stats">
            <span className="tag tag--gold">
              <Cc0Sprite kind="items" name="goldCup" scale={0.5} ui /> 최고 {summary.bestScore}점
            </span>
            <span className="tag tag--teal">오늘 남은 판 {summary.runsLeft}번</span>
            <span className={clsx("tag", summary.rewardsLeft > 0 ? "tag--sky" : "tag--pink")}>
              보상 {summary.rewardsLeft}/{MAX_REWARDED_RUNS_PER_DAY}번 남음
            </span>
          </div>
          <button className="btn btn--gold btn--block" data-sfx="whoosh" disabled={!canStart} onClick={() => void start()} type="button">
            {summary.runsLeft <= 0 ? "오늘은 충분히 놀았어요" : phase === "loading" ? "준비 중…" : phase === "result" ? "한 판 더!" : "사냥 시작!"}
          </button>
        </div>
      ) : null}
      <p className="panel__foot muted">점수 {REWARD_TIERS[REWARD_TIERS.length - 1].min}점부터 작은 보상이 있어요. 하루에 보상은 {MAX_REWARDED_RUNS_PER_DAY}번까지예요. 공부가 더 큰 보상이에요!</p>
    </section>
  );
}
