import { useRouter } from "next/router";
import { useState } from "react";
import clsx from "clsx";

import { DuelPlay, DuelResultPanel } from "@/components/arena/DuelPlay";
import { LeagueBadge } from "@/components/arena/LeagueBadge";
import { Portal } from "@/components/Portal";
import { Cc0Sprite, PixelAvatar, PixelIcon } from "@/components/pixel/PixelSprite";
import { EMOTE_LABELS, isEmoteName } from "@/utils/art/cc0";
import type { ArenaOverview, DuelResultView, DuelStartView } from "@/utils/arena-types";
import { MAX_CHALLENGES_PER_DAY, QUESTION_COUNT } from "@/utils/arena-rules";
import { QUIZ_CATEGORIES, type QuizCategory } from "@/utils/quiz-bank";

interface ArenaPanelProps {
  overview: ArenaOverview;
}

/**
 * 서버에 JSON을 보내고 결과를 돌려받는다. 실패하면 서버가 준 한국어 메시지를 던진다.
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
 * 대결장 본문: 내 리그, 받은 도전장, 새 대결 신청, 최근 결과, 순위표와 이번 주 팀 승수.
 */
export function ArenaPanel({ overview }: ArenaPanelProps) {
  const router = useRouter();
  const [category, setCategory] = useState<QuizCategory>("MIX");
  const [playing, setPlaying] = useState<DuelStartView | null>(null);
  const [reviewing, setReviewing] = useState<DuelResultView | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const { me } = overview;
  const totalGames = me.wins + me.losses + me.draws;

  /**
   * 요청을 실행하고 실패 메시지를 화면에 보여 준다.
   */
  async function run(key: string, task: () => Promise<void>): Promise<void> {
    setBusy(key);
    setMessage(null);
    try {
      await task();
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "잠시 후 다시 해 주세요." });
    } finally {
      setBusy(null);
    }
  }

  /**
   * 화면 데이터를 새로 읽는다. (코인·경험치·도전장 수가 바뀐다)
   */
  function refresh(): void {
    void router.replace(router.asPath, undefined, { scroll: false });
  }

  const challenge = (opponentId: string) => run(`c-${opponentId}`, async () => setPlaying(await postJson<DuelStartView>("/api/arena/challenge", { opponentId, category })));
  const accept = (duelId: string) => run(`a-${duelId}`, async () => setPlaying(await postJson<DuelStartView>("/api/arena/start", { duelId })));
  const decline = (duelId: string) =>
    run(`d-${duelId}`, async () => {
      await postJson("/api/arena/decline", { duelId });
      setMessage({ tone: "ok", text: "도전장을 정중히 거절했어요. 언제든 다시 겨룰 수 있어요." });
      refresh();
    });
  const review = (duelId: string) => run(`r-${duelId}`, async () => setReviewing(await postJson<DuelResultView>("/api/arena/result", { duelId })));

  return (
    <>
      <section aria-labelledby="arena-me" className="panel pf">
        <h2 className="panel__title" id="arena-me">
          <PixelIcon name="laurel" />
          <span>나의 리그</span>
          <PixelIcon name="laurel" />
        </h2>
        <div className="arena-me card card--mint pf">
          <LeagueBadge league={me.league} />
          <div className="arena-me__rating">
            <strong>{me.rating}</strong>
            <span className="muted">점</span>
          </div>
          <p className="muted">
            {me.pointsToNext !== null ? `${me.nextLeagueName}까지 ${me.pointsToNext}점 남았어요` : "가장 높은 별 리그예요!"}
          </p>
          <p className="arena-me__record">
            {totalGames === 0 ? "아직 대결 기록이 없어요. 첫 도전을 해 볼까요?" : `${me.wins}승 ${me.draws}무 ${me.losses}패${me.rank ? ` · 교실 ${me.rank}위` : ""}`}
          </p>
          <p className="arena-me__quota">
            <PixelIcon name="bell" /> 오늘 낼 수 있는 도전장 <b>{overview.challengesLeft}</b> / {MAX_CHALLENGES_PER_DAY}
          </p>
        </div>
        {!overview.enabled ? (
          <p className="msg msg--error" role="status">
            지금은 선생님이 대결을 잠시 닫아 두었어요. 열리면 다시 겨룰 수 있어요.
          </p>
        ) : null}
        {message ? (
          <p className={clsx("msg", message.tone === "error" ? "msg--error" : "msg--ok")} role="status">
            {message.text}
          </p>
        ) : null}
      </section>

      {overview.incoming.length > 0 ? (
        <section aria-labelledby="arena-in" className="panel pf">
          <h2 className="panel__title" id="arena-in">
            <PixelIcon name="mail" />
            <span>도전장이 왔어요!</span>
            <PixelIcon name="mail" />
          </h2>
          <ul className="arena-list">
            {overview.incoming.map((item) => (
              <li className="arena-row card pf" key={item.duelId}>
                <PixelAvatar hairKey={item.hairKey} scale={1.6} />
                <div className="arena-row__main">
                  <strong>{item.challengerName}</strong>
                  <span className="muted">
                    {item.categoryLabel} · {item.createdLabel}
                  </span>
                </div>
                <div className="arena-row__actions">
                  <button className="btn btn--small btn--gold" data-sfx="whoosh" disabled={busy !== null || !overview.enabled} onClick={() => void accept(item.duelId)} type="button">
                    겨루기
                  </button>
                  <button className="btn btn--small" disabled={busy !== null} onClick={() => void decline(item.duelId)} type="button">
                    다음에
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {overview.waiting.length > 0 ? (
        <section aria-labelledby="arena-wait" className="panel pf">
          <h2 className="panel__title" id="arena-wait">
            <PixelIcon name="laurel" />
            <span>내가 낸 도전장</span>
            <PixelIcon name="laurel" />
          </h2>
          <ul className="arena-list">
            {overview.waiting.map((item) => (
              <li className="arena-row card pf" key={item.duelId}>
                <PixelAvatar hairKey={item.hairKey} scale={1.6} />
                <div className="arena-row__main">
                  <strong>{item.opponentName}</strong>
                  <span className="muted">{item.resumable ? `${item.categoryLabel} · 아직 다 풀지 않았어요` : `${item.categoryLabel} · 친구의 답을 기다려요`}</span>
                </div>
                {item.resumable ? (
                  <button className="btn btn--small btn--gold" data-sfx="whoosh" disabled={busy !== null} onClick={() => void accept(item.duelId)} type="button">
                    이어서 풀기
                  </button>
                ) : (
                  <span className="tag tag--teal">
                    <PixelIcon name="check" /> 제출 완료
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="arena-new" className="panel pf">
        <h2 className="panel__title" id="arena-new">
          <PixelIcon name="arena" />
          <span>새 대결 신청</span>
          <PixelIcon name="arena" />
        </h2>
        <fieldset className="arena-cats">
          <legend className="muted">어떤 퀴즈로 겨룰까요? (문제 {QUESTION_COUNT}개)</legend>
          {QUIZ_CATEGORIES.map((item) => (
            <label className={clsx("arena-cat", category === item.key && "arena-cat--on")} data-sfx="toggle" key={item.key}>
              <input checked={category === item.key} name="category" onChange={() => setCategory(item.key)} type="radio" />
              <strong>{item.label}</strong>
              <span className="muted">{item.hint}</span>
            </label>
          ))}
        </fieldset>
        <ul className="arena-list">
          {overview.opponents.map((opponent) => (
            <li className="arena-row card pf" key={opponent.id}>
              <PixelAvatar hairKey={opponent.hairKey} scale={1.6} />
              <div className="arena-row__main">
                <strong>{opponent.name}</strong>
                <span className="muted">
                  {opponent.teamName} · {opponent.rating}점
                </span>
                <LeagueBadge compact league={opponent.league} />
              </div>
              <button
                className="btn btn--small btn--gold"
                data-sfx="whoosh"
                disabled={busy !== null || opponent.blockedReason !== null}
                onClick={() => void challenge(opponent.id)}
                title={opponent.blockedReason ?? `${opponent.name}에게 도전하기`}
                type="button"
              >
                도전!
              </button>
              {opponent.blockedReason && overview.enabled ? <span className="arena-row__why muted">{opponent.blockedReason}</span> : null}
            </li>
          ))}
        </ul>
        <p className="panel__foot muted">이기든 지든 참여 보상이 있고, 하루에 받을 수 있는 횟수가 정해져 있어요. 결과는 친구를 놀리는 데 쓰지 않기로 해요.</p>
      </section>

      <section aria-labelledby="arena-res" className="panel pf">
        <h2 className="panel__title" id="arena-res">
          <PixelIcon name="laurel" />
          <span>최근 결과</span>
          <PixelIcon name="laurel" />
        </h2>
        {overview.results.length === 0 ? (
          <p className="muted arena-empty">아직 끝난 대결이 없어요.</p>
        ) : (
          <ul className="arena-list">
            {overview.results.map((item) => (
              <li className={clsx("arena-row card pf", `arena-row--${item.outcome.toLowerCase()}`)} key={item.duelId}>
                <PixelAvatar hairKey={item.hairKey} scale={1.6} />
                <div className="arena-row__main">
                  <strong>
                    {item.outcome === "WIN" ? "승리" : item.outcome === "LOSE" ? "패배" : "무승부"} · {item.opponentName}
                  </strong>
                  <span className="muted">
                    {item.categoryLabel} · {item.myScore}점 대 {item.theirScore}점 · 점수 {item.ratingDelta >= 0 ? "+" : ""}
                    {item.ratingDelta}
                  </span>
                </div>
                {isEmoteName(item.rivalEmote) ? <Cc0Sprite className="arena-row__emote" kind="emotes" label={`${item.opponentName}의 응원: ${EMOTE_LABELS[item.rivalEmote]}`} name={item.rivalEmote} scale={0.9} ui /> : null}
                <button className="btn btn--small" disabled={busy !== null} onClick={() => void review(item.duelId)} type="button">
                  정답 보기
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="arena-rank" className="panel pf">
        <h2 className="panel__title" id="arena-rank">
          <PixelIcon name="trophy" />
          <span>교실 순위표</span>
          <PixelIcon name="trophy" />
        </h2>
        {overview.leaderboard.length === 0 ? (
          <p className="muted arena-empty">대결을 하면 순위표에 이름이 올라가요.</p>
        ) : (
          <ol className="arena-rank">
            {overview.leaderboard.map((row) => (
              <li className={clsx("arena-rank__row", row.isMe && "arena-rank__row--me")} key={row.studentId}>
                <span className="arena-rank__no">{row.rank}</span>
                <PixelAvatar hairKey={row.hairKey} scale={1.3} />
                <span className="arena-rank__name">
                  {row.name}
                  <span className="muted"> {row.teamName}</span>
                </span>
                <LeagueBadge compact league={row.league} />
                <b>{row.rating}</b>
              </li>
            ))}
          </ol>
        )}
        <h3 className="arena-sub">이번 주 팀 승수</h3>
        <ul className="arena-teams">
          {overview.teamWins.map((team) => (
            <li className="tag tag--teal" key={team.teamName}>
              {team.teamName} <b>{team.wins}승</b>
            </li>
          ))}
        </ul>
        <p className="panel__foot muted">순위표는 리그 점수만 보여 줘요. 월요일마다 새로 시작하는 주간 도전 순위와는 따로예요.</p>
      </section>

      {playing ? (
        <Portal>
          <DuelPlay
            key={playing.duelId}
            onClose={(changed) => {
              setPlaying(null);
              if (changed) {
                refresh();
              }
            }}
            start={playing}
          />
        </Portal>
      ) : null}

      {reviewing ? (
        <Portal>
          <div aria-label="대결 결과" aria-modal="true" className="duel" role="dialog">
            <div className="duel__card pf">
              <DuelResultPanel onClose={() => setReviewing(null)} result={reviewing} />
            </div>
          </div>
        </Portal>
      ) : null}
    </>
  );
}
