import { useRouter } from "next/router";
import { useState } from "react";
import clsx from "clsx";

import { KenneySprite, PixelAvatar, PixelIcon } from "@/components/pixel/PixelSprite";
import { playSfx } from "@/utils/audio/audio-engine";
import type { RaidRewardView, RaidView } from "@/utils/boss-types";

interface BossPanelProps {
  raid: RaidView;
}

const MOOD_LINE = {
  fresh: "아직 쌩쌩해요. 첫 칸을 채워서 첫 공격을 날려 볼까요?",
  hurt: "효과가 있어요! 계속 몰아쳐요.",
  weak: "비틀비틀! 조금만 더 힘을 모으면 쓰러져요!",
  down: "쓰러졌어요! 모두 정말 잘했어요!",
} as const;

/**
 * 이번 주 학급 보스: 교실 전체가 채운 칸과 끝낸 대결이 보스의 체력을 깎는다. 쓰러뜨리면 참여한 학생이 보상을 한 번씩 받는다.
 */
export function BossPanel({ raid }: BossPanelProps) {
  const router = useRouter();
  const [busyWeek, setBusyWeek] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  /**
   * 보상을 받고 화면을 새로 읽는다. (경험치·코인이 위쪽 표시줄에 반영된다)
   */
  async function claim(reward: RaidRewardView): Promise<void> {
    setBusyWeek(reward.weekKey);
    setMessage(null);
    try {
      const response = await fetch("/api/boss/claim", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ weekKey: reward.weekKey }) });
      const payload = (await response.json().catch(() => null)) as { xp?: number; coins?: number; message?: string } | null;
      if (!response.ok) {
        playSfx("wrong");
        setMessage({ tone: "error", text: payload?.message ?? "보상을 받지 못했어요." });
        return;
      }
      playSfx("levelup");
      setMessage({ tone: "ok", text: `${reward.bossName} 처치 보상! 경험치 +${payload?.xp ?? reward.xp}, 코인 +${payload?.coins ?? reward.coins}` });
      void router.replace(router.asPath, undefined, { scroll: false });
    } catch {
      setMessage({ tone: "error", text: "네트워크 연결을 확인해 주세요." });
    } finally {
      setBusyWeek(null);
    }
  }

  const claimable = raid.rewards.filter((reward) => reward.blockedReason === null);
  const claimed = raid.rewards.find((reward) => reward.isCurrentWeek && reward.claimed);

  return (
    <section aria-labelledby="boss-title" className={clsx("panel pf boss", `boss--${raid.mood}`)}>
      <h2 className="panel__title" id="boss-title">
        <PixelIcon name="flame" />
        <span>
          <span className="panel__eyebrow">이번 주 학급 보스</span>
          {raid.bossName}
        </span>
        <PixelIcon name="flame" />
      </h2>

      <div className="boss__stage">
        <div className="boss__monster" aria-hidden="true">
          <KenneySprite className="boss__sprite" name={raid.bossSprite} scale={2.8} />
          <span className="boss__shadow" />
          {raid.defeated ? <span className="boss__stars">★ ★ ★</span> : null}
        </div>
        <p className="boss__intro">{raid.bossIntro}</p>
      </div>

      <div
        aria-label={`${raid.bossName} 남은 체력 ${raid.percentLeft}%`}
        aria-valuemax={raid.maxHp}
        aria-valuemin={0}
        aria-valuenow={raid.hpLeft}
        className="boss__hp"
        role="progressbar"
      >
        <div className="boss__hp-fill" style={{ width: `${raid.percentLeft}%` }} />
        <span className="boss__hp-text">
          체력 {raid.hpLeft} / {raid.maxHp}
        </span>
      </div>
      <p className="boss__mood">
        {MOOD_LINE[raid.mood]}
        {!raid.defeated && raid.schoolDaysLeft > 0 ? (
          <>
            {" "}
            <b>오늘부터 하루 {raid.neededPerDay}점</b>씩 모으면 이번 주 안에 쓰러뜨려요.
          </>
        ) : null}
      </p>

      <p className="boss__how muted">칸 1개 = 피해 1 · 끝낸 대결 1판 = 피해 4. 선생님이 확인 중인 칸도 먼저 세어 줘요.</p>

      {raid.top.length > 0 ? (
        <ol className="boss__top" aria-label="이번 주 활약 순위">
          {raid.top.map((member, index) => (
            <li className={clsx("boss__member", member.isMe && "boss__member--me")} key={member.studentId}>
              <span className="boss__rank">{index + 1}</span>
              <PixelAvatar hairKey={member.hairKey} scale={1.2} />
              <span className="boss__name">{member.name}</span>
              <span className="muted boss__detail">
                칸 {member.units}
                {member.duels > 0 ? ` · 대결 ${member.duels}판` : ""}
              </span>
              <b>{member.damage}</b>
            </li>
          ))}
        </ol>
      ) : null}
      <p className="boss__me">
        <PixelIcon name="arena" /> 내가 준 피해 <b>{raid.me.damage}</b>
        {raid.me.rank ? ` · 활약 ${raid.me.rank}위` : " · 첫 칸을 채워서 공격해요!"}
      </p>

      {claimable.map((reward) => (
        <button
          className="btn btn--gold btn--block"
          data-sfx="none"
          disabled={busyWeek !== null}
          key={reward.weekKey}
          onClick={() => void claim(reward)}
          type="button"
        >
          <PixelIcon name="gift" /> {reward.isCurrentWeek ? "" : "지난주 "}
          {reward.bossName} 처치 보상 받기 (경험치 +{reward.xp} · 코인 +{reward.coins})
        </button>
      ))}
      {claimed ? (
        <p className="tag tag--teal">
          <PixelIcon name="check" /> 이번 주 보스 보상을 받았어요
        </p>
      ) : null}
      {message ? (
        <p className={clsx("msg", message.tone === "error" ? "msg--error" : "msg--ok")} role="status">
          {message.text}
        </p>
      ) : null}
    </section>
  );
}
