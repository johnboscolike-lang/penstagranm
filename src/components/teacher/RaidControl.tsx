import { useRouter } from "next/router";
import { useState } from "react";
import clsx from "clsx";

import { KenneySprite, PixelIcon } from "@/components/pixel/PixelSprite";
import { RAID_LEVELS, bossForWeek, type RaidLevelKey } from "@/utils/boss-rules";
import type { getRaidTeacherSummary } from "@/utils/boss-repository";

type RaidSummary = Awaited<ReturnType<typeof getRaidTeacherSummary>>;

interface RaidControlProps {
  summary: RaidSummary;
  weekKey: string;
}

/**
 * 선생님용 학급 보스 현황과 난이도 선택. 난이도는 학생 한 명당 체력이라 반 크기와 상관없이 쓸 수 있다.
 */
export function RaidControl({ summary, weekKey }: RaidControlProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const boss = bossForWeek(weekKey);

  /**
   * 난이도를 바꾸고 화면을 새로 읽는다.
   */
  async function choose(level: RaidLevelKey): Promise<void> {
    if (level === summary.level) {
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/teacher/raid-setting", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ level }) });
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      if (!response.ok) {
        setMessage(payload?.message ?? "저장하지 못했어요.");
        return;
      }
      void router.replace(router.asPath, undefined, { scroll: false });
    } catch {
      setMessage("네트워크 연결을 확인해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="raid-ctl" className="panel pf">
      <h2 className="panel__title" id="raid-ctl">
        <PixelIcon name="flame" />
        <span>
          <span className="panel__eyebrow">모두가 함께 무찌르는 이번 주 보스</span>
          학급 보스 · {boss.name}
        </span>
        <PixelIcon name="flame" />
      </h2>
      <div className="raid-ctl">
        <KenneySprite name={boss.sprite} scale={1.6} />
        <p>
          {summary.defeated ? "쓰러뜨렸어요!" : `체력 ${summary.hpLeft} / ${summary.maxHp} (${summary.percentLeft}%)`}
          <br />
          <span className="muted">
            보상을 받은 학생 {summary.claimedCount} / {summary.playerCount}명
          </span>
        </p>
      </div>
      <div aria-label="보스 난이도" className="raid-levels" role="radiogroup">
        {RAID_LEVELS.map((level) => (
          <button
            aria-checked={level.key === summary.level}
            className={clsx("raid-level", level.key === summary.level && "raid-level--on")}
            disabled={busy}
            key={level.key}
            onClick={() => void choose(level.key)}
            role="radio"
            type="button"
          >
            <strong>{level.label}</strong>
            <span className="muted">{level.hint}</span>
          </button>
        ))}
      </div>
      {message ? (
        <p className="msg msg--error" role="status">
          {message}
        </p>
      ) : null}
      <p className="panel__foot muted">칸이 확인되면 보스가 깎여요(잠정 포함). 학생 한 명당 체력이라서 반이 커져도 같은 난이도로 쓸 수 있어요. 난이도를 올리면 이미 쓰러진 보스가 다시 살아날 수 있어요.</p>
    </section>
  );
}
