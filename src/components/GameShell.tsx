import Head from "next/head";
import Link from "next/link";
import { useSyncExternalStore, type ReactNode } from "react";
import clsx from "clsx";

import { PixelAvatar, PixelIcon } from "@/components/pixel/PixelSprite";
import type { HudView } from "@/utils/quest-types";

export type SpaceKey = "school" | "challenge" | "room";

interface GameShellProps {
  /** 하단 도크에서 강조할 공간 */
  space: SpaceKey;
  /** 상단 타이틀 배너 문구 */
  banner: string;
  /** 브라우저 탭 제목 */
  pageTitle: string;
  hud: HudView;
  scene: ReactNode;
  wide?: boolean;
  children: ReactNode;
}

const NAV_ITEMS: { key: SpaceKey; href: string; label: string; icon: string }[] = [
  { key: "school", href: "/", label: "학교", icon: "school" },
  { key: "challenge", href: "/challenge", label: "주간도전", icon: "challenge" },
  { key: "room", href: "/myroom", label: "내공간", icon: "room" },
];

const SIMPLE_KEY = "penstagram-simple-view";
const simpleListeners = new Set<() => void>();
let simpleCache: boolean | null = null;

/**
 * Reads the saved "simple view" choice. Storage can be blocked, so a memory copy is the fallback.
 */
function readSimpleView(): boolean {
  if (simpleCache !== null) {
    return simpleCache;
  }

  try {
    simpleCache = window.localStorage.getItem(SIMPLE_KEY) === "1";
  } catch {
    simpleCache = false;
  }

  return simpleCache;
}

/**
 * Saves the "simple view" choice and tells every subscribed component.
 */
function writeSimpleView(value: boolean): void {
  simpleCache = value;
  try {
    window.localStorage.setItem(SIMPLE_KEY, value ? "1" : "0");
  } catch {
    // 저장소를 쓸 수 없어도 현재 탭에서는 그대로 동작한다.
  }
  simpleListeners.forEach((listener) => listener());
}

/**
 * Subscribes React to simple-view changes made in this tab or another tab.
 */
function subscribeSimpleView(listener: () => void): () => void {
  simpleListeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === SIMPLE_KEY) {
      simpleCache = event.newValue === "1";
      listener();
    }
  };
  window.addEventListener("storage", onStorage);

  return () => {
    simpleListeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/**
 * Wraps every page with the world scene, the HUD (profile, banner, coins), and the bottom dock.
 * 게임 화면이 어려운 학생을 위해 "간단히 보기"로 장면을 끄고 같은 기능을 목록으로 볼 수 있다.
 */
export function GameShell({ space, banner, pageTitle, hud, scene, wide, children }: GameShellProps) {
  const simple = useSyncExternalStore(subscribeSimpleView, readSimpleView, () => false);
  const xpPercent = Math.round((hud.xpInLevel / hud.xpForNext) * 100);

  return (
    <>
      <Head>
        <title>{`${pageTitle} · 우리반 퀘스트`}</title>
        <meta content="학교 소식을 확인하고, 내가 정한 작은 약속을 실천하고, 친구들과 도전하며 내 공간을 키우는 우리반 퀘스트" name="description" />
        <meta content="width=device-width, initial-scale=1" name="viewport" />
        <link href="/favicon.svg" rel="icon" type="image/svg+xml" />
      </Head>
      <div className="game" data-simple={simple ? "true" : "false"} data-space={space}>
        {scene}

        <header className="hud">
          <div className="hud__profile pf">
            <div className="hud__avatar">
              <PixelAvatar hairKey={hud.hairKey} label={`${hud.name} 아바타`} scale={1.4} />
            </div>
            <div className="hud__info">
              <div className="hud__name">
                <span>{hud.name}</span>
                <span className="hud__lv">Lv.{hud.level}</span>
              </div>
              <div
                aria-label={`경험치 ${hud.xpInLevel} / ${hud.xpForNext}`}
                aria-valuemax={hud.xpForNext}
                aria-valuemin={0}
                aria-valuenow={hud.xpInLevel}
                className="bar bar--thin"
                role="progressbar"
              >
                <div className="bar__fill" style={{ width: `${xpPercent}%` }} />
              </div>
              <div className="hud__xp">
                {hud.xpInLevel} / {hud.xpForNext} XP
              </div>
            </div>
          </div>

          <div className="hud__title pf">
            <PixelIcon name="laurel" />
            <h1>{banner}</h1>
            <PixelIcon name="laurel" />
          </div>

          <div className="hud__tools">
            <div aria-label={`코인 ${hud.coins}개`} className="hud__coin pf">
              <PixelIcon name="coin" scale={1.2} />
              <span>{hud.coins} 코인</span>
            </div>
            <button
              aria-pressed={simple}
              className="hud__tool pf"
              onClick={() => writeSimpleView(!simple)}
              title="장면 없이 목록으로만 보기"
              type="button"
            >
              <PixelIcon name="book" />
              <span className="hud__tool-label">{simple ? "장면 켜기" : "간단히 보기"}</span>
            </button>
          </div>
        </header>

        <main className={clsx("stage", wide && "stage--wide")}>
          <div className="stage__col">{children}</div>
        </main>

        <nav aria-label="주요 이동" className="dock pf">
          {NAV_ITEMS.map((item) => (
            <Link aria-current={item.key === space ? "page" : undefined} className="dock__item" href={item.href} key={item.key}>
              <PixelIcon name={item.icon} scale={1.1} />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </>
  );
}
