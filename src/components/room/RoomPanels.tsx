import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";
import clsx from "clsx";

import { PixelAvatar, PixelIcon, SceneSprite } from "@/components/pixel/PixelSprite";
import { playSfx } from "@/utils/audio/audio-engine";
import type { WeekNews } from "@/utils/quest-board";
import { formatScore } from "@/utils/quest-rules";
import type { HudView } from "@/utils/quest-types";
import { SHOP_ITEMS } from "@/utils/shop-items";
import type { WeeklyBadge } from "@/utils/quest-rules";

const EMBLEM_ICONS: Record<string, string> = { star: "star", sprout: "sprout", wave: "wave" };

const BADGE_COPY: Record<WeeklyBadge, { title: string; line: string; icon: string }> = {
  storm: { title: "폭풍성장상", line: "나의 지난 기록을 넘었어요", icon: "medal" },
  comeback: { title: "다시 시작 배지", line: "돌아온 도전도 배지로 인정해요", icon: "sprout" },
  firstStep: { title: "첫걸음 배지", line: "첫 주의 작은 약속을 해냈어요", icon: "star" },
  steady: { title: "꾸준한 도전 배지", line: "작은 약속을 꾸준히 실천했어요", icon: "heart" },
};

const SHOP_SPRITES: Record<string, string> = {
  lamp: "lantern",
  banner: "banner",
  flowerbed: "flowerbed",
  bench: "bench",
  bookshelf: "bookshelf",
  treebed: "treebed",
};

interface ProfileCardProps {
  hud: HudView;
  emblem: string;
}

/**
 * 내 정보 카드: 아바타, 팀, 레벨과 경험치, 코인 잔액.
 */
export function ProfileCard({ hud, emblem }: ProfileCardProps) {
  const percent = Math.round((hud.xpInLevel / hud.xpForNext) * 100);

  return (
    <section aria-labelledby="profile-title" className="panel pf">
      <h2 className="panel__title" id="profile-title">
        <PixelIcon name="laurel" />
        <span>내 정보</span>
        <PixelIcon name="laurel" />
      </h2>
      <div className="profile card card--mint pf">
        <div className="profile__face">
          <PixelAvatar hairKey={hud.hairKey} hatKey={hud.hatKey} label={`${hud.name} 아바타`} scale={2.2} />
        </div>
        <div className="profile__main">
          <strong className="profile__name">{hud.name}</strong>
          <span className="tag tag--teal">
            <PixelIcon name={EMBLEM_ICONS[emblem] ?? "star"} /> {hud.teamName}
          </span>
          <div className="profile__lv">
            <b>Lv.{hud.level}</b>
            <span className="muted">
              누적 {hud.totalXp} XP · 다음 레벨까지 {hud.xpForNext - hud.xpInLevel}
            </span>
          </div>
          <div className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={hud.xpForNext} aria-valuenow={hud.xpInLevel} aria-label="레벨 경험치">
            <div className="bar__fill" style={{ width: `${percent}%` }} />
          </div>
        </div>
      </div>
      <p className="panel__foot muted">
        <PixelIcon name="coin" /> 코인 {hud.coins}개 · 코인을 써도 XP와 레벨은 줄지 않아요
      </p>
    </section>
  );
}

interface WeekNewsCardProps {
  news: WeekNews;
}

/**
 * 지난주 성장 소식: 우편함에 도착한 배지와 주간 참여 보상. 공개하지 않고 나만 볼 수 있다.
 */
export function WeekNewsCard({ news }: WeekNewsCardProps) {
  const badge = news.badge ? BADGE_COPY[news.badge] : null;

  return (
    <section aria-labelledby="news-title" className="panel pf" id="mailbox">
      <h2 className="panel__title" id="news-title">
        <PixelIcon name="laurel" />
        <span>지난주 성장 소식</span>
        <PixelIcon name="laurel" />
      </h2>
      <div className="news">
        {badge ? (
          <div className="news__badge card pf">
            <PixelIcon medalRank={1} name={badge.icon} scale={2.2} />
            <div>
              <strong>{badge.title}</strong>
              <p>{badge.line}</p>
              <p className="muted">
                지난주 {formatScore(news.score)}점
                {news.baseline !== null ? ` · 기준선 ${formatScore(news.baseline)}점` : ""}
              </p>
            </div>
          </div>
        ) : (
          <div className="news__badge card pf">
            <PixelIcon name="sprout" scale={2} />
            <div>
              <strong>이번 주는 다시 새 출발!</strong>
              <p>지난주 도장 {news.stampCount}개. 월요일마다 순위가 새로 시작하고 내 집과 레벨은 그대로예요.</p>
            </div>
          </div>
        )}
        <div className="news__reward card card--mint pf">
          <PixelIcon name="icecream" scale={1.6} />
          <div>
            <span className="muted">주간 참여 보상</span>
            <strong>{news.voucherEarned ? "아이스크림 교환권 1장" : "이번 주에 3일 실천하면 받아요"}</strong>
            <span className="muted">서로 다른 3일에 작은 약속 실천 · 모든 경로를 합쳐 주 1장</span>
          </div>
        </div>
      </div>
    </section>
  );
}

interface YardShopProps {
  coins: number;
  ownedItemKeys: string[];
}

/**
 * 앞마당 꾸미기 상점. 코인으로만 사고, 경쟁 점수나 능력치에는 영향을 주지 않는다.
 */
export function YardShop({ coins, ownedItemKeys }: YardShopProps) {
  const router = useRouter();
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  /**
   * Buys an item and refreshes the page so the yard and coin count update.
   */
  async function buy(itemKey: string, name: string): Promise<void> {
    setBusyKey(itemKey);
    setMessage(null);
    try {
      const response = await fetch("/api/shop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemKey }),
      });
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      if (!response.ok) {
        setMessage({ tone: "error", text: payload?.message ?? "구매하지 못했어요." });
        playSfx("wrong");
        return;
      }
      playSfx("buy");
      setMessage({ tone: "ok", text: `${name}을(를) 앞마당에 놓았어요!` });
      void router.replace(router.asPath, undefined, { scroll: false });
    } catch {
      setMessage({ tone: "error", text: "네트워크 연결을 확인해 주세요." });
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <section aria-labelledby="shop-title" className="panel pf">
      <h2 className="panel__title" id="shop-title">
        <PixelIcon name="laurel" />
        <span>앞마당 꾸미기</span>
        <PixelIcon name="laurel" />
      </h2>
      <ul className="shop">
        {SHOP_ITEMS.map((item) => {
          const owned = ownedItemKeys.includes(item.key);
          const affordable = coins >= item.cost;

          return (
            <li className={clsx("shop__item card pf", owned && "shop__item--owned")} key={item.key}>
              <div className="shop__thumb">
                <SceneSprite name={SHOP_SPRITES[item.key]} scale={item.key === "bookshelf" || item.key === "treebed" ? 1.1 : 1.5} />
              </div>
              <strong>{item.name}</strong>
              <span className="muted">{item.description}</span>
              {owned ? (
                <span className="tag tag--teal">
                  <PixelIcon name="check" /> 배치됨
                </span>
              ) : (
                <button
                  className="btn btn--small btn--gold btn--block"
                  data-sfx="none"
                  disabled={!affordable || busyKey !== null}
                  onClick={() => void buy(item.key, item.name)}
                  type="button"
                >
                  <PixelIcon name="coin" /> {item.cost}
                  {affordable ? " 사기" : " · 코인 부족"}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {message ? (
        <p className={clsx("msg", message.tone === "error" ? "msg--error" : "msg--ok")} role="status">
          {message.text}
        </p>
      ) : null}
      <p className="panel__foot muted">꾸미기는 코인으로만 살 수 있고, 주간 순위에는 영향이 없어요.</p>
    </section>
  );
}

/**
 * Small heading row that sits above the growth-record feed.
 */
export function RecordsHeader({ count }: { count: number }) {
  return (
    <div className="records-header">
      <h2>
        <PixelIcon name="book" /> 성장 기록 <span className="muted">{count}장</span>
      </h2>
      <Link className="btn btn--small" href="/record">
        <PixelIcon name="feather" />
        <span>오늘 기록하기</span>
      </Link>
    </div>
  );
}
