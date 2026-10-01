import { useRouter } from "next/router";
import { useState } from "react";

import { PixelIcon } from "@/components/pixel/PixelSprite";

interface ArenaControlProps {
  enabled: boolean;
  duelsThisWeek: number;
  players: number;
  pending: number;
}

/**
 * 선생님용 대결장 현황과 열기/닫기 스위치. 닫아도 기록과 순위는 그대로 남는다.
 */
export function ArenaControl({ enabled, duelsThisWeek, players, pending }: ArenaControlProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  /**
   * 대결장을 열거나 닫고 화면을 새로 읽는다.
   */
  async function toggle(): Promise<void> {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/teacher/arena-setting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !enabled }),
      });
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
    <section aria-labelledby="arena-ctl" className="panel pf">
      <h2 className="panel__title" id="arena-ctl">
        <PixelIcon name="arena" />
        <span>
          <span className="panel__eyebrow">학생끼리 겨루는 퀴즈 대결</span>
          대결장 {enabled ? "열림" : "닫힘"}
        </span>
        <PixelIcon name="arena" />
      </h2>
      <ul className="arena-stats">
        <li className="tag tag--teal">
          이번 주 대결 <b>{duelsThisWeek}판</b>
        </li>
        <li className="tag tag--teal">
          참여 학생 <b>{players}명</b>
        </li>
        <li className="tag tag--teal">
          답 기다리는 도전장 <b>{pending}장</b>
        </li>
      </ul>
      <button aria-pressed={enabled} className={enabled ? "btn btn--cream" : "btn btn--gold"} disabled={busy} onClick={() => void toggle()} type="button">
        {enabled ? "대결장 잠시 닫기" : "대결장 다시 열기"}
      </button>
      {message ? (
        <p className="msg msg--error" role="status">
          {message}
        </p>
      ) : null}
      <p className="panel__foot muted">닫으면 학생은 새 대결을 시작할 수 없어요. 이미 쌓인 점수와 순위는 그대로 남아요. 수업 시간에는 닫아 두어도 좋아요.</p>
    </section>
  );
}
