import clsx from "clsx";

import { Cc0Sprite, PixelIcon } from "@/components/pixel/PixelSprite";
import type { AchievementBoardView } from "@/utils/achievement-types";

interface AchievementBoardProps {
  board: AchievementBoardView;
}

/**
 * 업적판: 이룬 업적과 얼마나 왔는지. 업적을 하나 이룰 때마다 동물 친구가 생기고, 친구는 옷장에서 만난다.
 * 남과 비교하지 않고 내 기록만 보여 준다.
 */
export function AchievementBoard({ board }: AchievementBoardProps) {
  return (
    <section aria-labelledby="ach-title" className="panel pf">
      <h2 className="panel__title" id="ach-title">
        <PixelIcon name="medal" />
        <span>
          <span className="panel__eyebrow">이룰 때마다 동물 친구가 생겨요</span>
          업적 {board.earnedCount} / {board.total}
        </span>
        <PixelIcon name="medal" />
      </h2>
      <ul className="ach-grid">
        {board.items.map((item) => (
          <li className={clsx("ach card pf", item.earned ? "ach--earned" : "ach--locked")} key={item.key}>
            <div className="ach__icon">
              <Cc0Sprite kind="items" name={item.icon} scale={1} ui />
            </div>
            <div className="ach__text">
              <strong>{item.title}</strong>
              <span className="muted">{item.hint}</span>
              {item.earned ? (
                <span className="tag tag--teal">
                  <PixelIcon name="check" /> {item.petName}을(를) 만났어요
                </span>
              ) : (
                <>
                  <div aria-label={`${item.title} 진행 ${item.value} / ${item.target}`} aria-valuemax={item.target} aria-valuemin={0} aria-valuenow={item.value} className="bar bar--thin" role="progressbar">
                    <div className="bar__fill" style={{ width: `${item.percent}%` }} />
                  </div>
                  <span className="muted ach__count">
                    {item.value} / {item.target}
                  </span>
                </>
              )}
            </div>
            <Cc0Sprite className={clsx("ach__pet", !item.earned && "closet__silhouette")} kind="creatures" label={item.earned ? item.petName : undefined} name={item.pet} scale={1.2} ui />
          </li>
        ))}
      </ul>
      <p className="panel__foot muted">업적은 나만의 기록이에요. 다른 친구와 비교하지 않아요.</p>
    </section>
  );
}
