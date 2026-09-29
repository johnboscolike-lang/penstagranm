import { useState } from "react";
import clsx from "clsx";

import { PromiseBoard } from "@/components/challenge/PromiseBoard";
import { WeekBoardView } from "@/components/challenge/WeekBoardView";
import { PixelIcon } from "@/components/pixel/PixelSprite";
import type { WeekBoard } from "@/utils/quest-board";
import type { TodayView } from "@/utils/quest-types";

type TabKey = "today" | "week";

interface ChallengePanelProps {
  today: TodayView;
  board: WeekBoard;
  myTeamId: string | null;
  initialTab: TabKey;
}

/**
 * "이번 주 도전" 패널: 오늘 약속 3칸과 이번 주 순위를 탭으로 오간다.
 */
export function ChallengePanel({ today, board, myTeamId, initialTab }: ChallengePanelProps) {
  const [tab, setTab] = useState<TabKey>(initialTab);

  return (
    <section aria-labelledby="challenge-title" className="panel pf">
      <h2 className="panel__title" id="challenge-title">
        <PixelIcon name="laurel" />
        <span>이번 주 도전</span>
        <PixelIcon name="laurel" />
      </h2>

      <div aria-label="보기 전환" className="tabs" role="tablist">
        {(
          [
            ["today", "오늘"],
            ["week", "이번 주"],
          ] as const
        ).map(([key, label]) => (
          <button
            aria-selected={tab === key}
            className={clsx("tabs__tab", tab === key && "tabs__tab--on")}
            id={`tab-${key}`}
            key={key}
            onClick={() => setTab(key)}
            role="tab"
            type="button"
          >
            {label}
          </button>
        ))}
      </div>

      <div aria-labelledby={`tab-${tab}`} role="tabpanel">
        {tab === "today" ? (
          <PromiseBoard today={today} />
        ) : (
          <WeekBoardView board={board} myTeamId={myTeamId} onGoToday={() => setTab("today")} />
        )}
      </div>
    </section>
  );
}
