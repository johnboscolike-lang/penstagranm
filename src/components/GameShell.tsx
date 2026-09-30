import Head from "next/head";
import Link from "next/link";
import { useSyncExternalStore, type ReactNode } from "react";
import clsx from "clsx";

import { AudioBoot } from "@/components/audio/AudioBoot";
import { SoundControl } from "@/components/audio/SoundControl";
import { PixelAvatar, PixelIcon, PixelSprite } from "@/components/pixel/PixelSprite";
import { buildOwlHeadArt } from "@/utils/art/characters";
import type { SoundSpace } from "@/utils/audio/sound-catalog";
import type { HudView } from "@/utils/quest-types";

export type SpaceKey = "school" | "challenge" | "arena" | "room";
export type TeacherSpaceKey = "review" | "quests" | "calendar";

interface NavItem {
  key: string;
  href: string;
  label: string;
  icon: string;
  badge?: number;
}

/**
 * 학생용 하단 도크: 학교 · 주간도전 · 대결 · 내공간. 대결에는 받은 도전장 수가 배지로 붙는다.
 */
function studentNav(arenaInbox: number): NavItem[] {
  return [
    { key: "school", href: "/", label: "학교", icon: "school" },
    { key: "challenge", href: "/challenge", label: "주간도전", icon: "challenge" },
    { key: "arena", href: "/arena", label: "대결", icon: "arena", badge: arenaInbox },
    { key: "room", href: "/myroom", label: "내공간", icon: "room" },
  ];
}

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
 * Ends the session and goes back to the entrance screen.
 */
async function logout(): Promise<void> {
  try {
    await fetch("/api/auth/logout", { method: "POST" });
  } finally {
    window.location.href = "/login";
  }
}

interface ShellFrameProps {
  activeKey: string;
  nav: NavItem[];
  banner: string;
  pageTitle: string;
  scene: ReactNode;
  wide?: boolean;
  profile: ReactNode;
  coins?: number;
  spaceLabel: string;
  children: ReactNode;
}

/**
 * The shared frame of every screen: world scene, HUD (profile, banner, tools), stage, and bottom dock.
 * 게임 화면이 어려운 사용자를 위해 "간단히 보기"로 장면을 끄고 같은 기능을 목록으로 볼 수 있다.
 */
function ShellFrame({ activeKey, nav, banner, pageTitle, scene, wide, profile, coins, spaceLabel, children }: ShellFrameProps) {
  const simple = useSyncExternalStore(subscribeSimpleView, readSimpleView, () => false);

  return (
    <>
      <Head>
        <title>{`${pageTitle} · 우리반 퀘스트`}</title>
        <meta content="학교 소식을 확인하고, 내가 정한 작은 약속과 선생님이 낸 퀘스트를 실천하고, 친구들과 도전하며 내 공간을 키우는 우리반 퀘스트" name="description" />
        <meta content="width=device-width, initial-scale=1" name="viewport" />
        <link href="/favicon.svg" rel="icon" type="image/svg+xml" />
      </Head>
      <div className="game" data-simple={simple ? "true" : "false"} data-space={spaceLabel}>
        <AudioBoot space={spaceLabel as SoundSpace} />
        {scene}

        <header className="hud">
          {profile}

          <div className="hud__title pf">
            <PixelIcon name="laurel" />
            <h1>{banner}</h1>
            <PixelIcon name="laurel" />
          </div>

          <div className="hud__tools">
            {coins !== undefined ? (
              <div aria-label={`코인 ${coins}개`} className="hud__coin pf">
                <PixelIcon name="coin" scale={1.2} />
                <span>{coins} 코인</span>
              </div>
            ) : null}
            <SoundControl />
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
            <button className="hud__tool pf" onClick={() => void logout()} title="다른 사람으로 입장하기" type="button">
              <PixelIcon name="lock" />
              <span className="hud__tool-label">나가기</span>
            </button>
          </div>
        </header>

        <main className={clsx("stage", wide && "stage--wide")}>
          <div className="stage__col">{children}</div>
        </main>

        <nav aria-label="주요 이동" className="dock pf">
          {nav.map((item) => (
            <Link aria-current={item.key === activeKey ? "page" : undefined} className="dock__item" href={item.href} key={item.key}>
              <PixelIcon name={item.icon} scale={1.1} />
              <span>{item.label}</span>
              {item.badge ? <span className="dock__badge">{item.badge}</span> : null}
            </Link>
          ))}
        </nav>
      </div>
    </>
  );
}

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

/**
 * Student frame: profile capsule with level and XP, coins, and the school / weekly challenge / my room dock.
 */
export function GameShell({ space, banner, pageTitle, hud, scene, wide, children }: GameShellProps) {
  const xpPercent = Math.round((hud.xpInLevel / hud.xpForNext) * 100);

  const profile = (
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
  );

  return (
    <ShellFrame
      activeKey={space}
      banner={banner}
      coins={hud.coins}
      nav={studentNav(hud.arenaInbox)}
      pageTitle={pageTitle}
      profile={profile}
      scene={scene}
      spaceLabel={space}
      wide={wide}
    >
      {children}
    </ShellFrame>
  );
}

interface TeacherShellProps {
  active: TeacherSpaceKey;
  banner: string;
  pageTitle: string;
  teacherName: string;
  pendingCount: number;
  scene: ReactNode;
  wide?: boolean;
  children: ReactNode;
}

/**
 * Teacher frame: owl avatar, review inbox badge, and the review / quest planning / calendar dock.
 */
export function TeacherShell({ active, banner, pageTitle, teacherName, pendingCount, scene, wide = true, children }: TeacherShellProps) {
  const nav: NavItem[] = [
    { key: "review", href: "/teacher", label: "확인함", icon: "challenge", badge: pendingCount },
    { key: "quests", href: "/teacher/quests", label: "퀘스트", icon: "book" },
    { key: "calendar", href: "/calendar", label: "일정", icon: "calendar" },
  ];

  const profile = (
    <div className="hud__profile pf">
      <div className="hud__avatar">
        <PixelSprite art={buildOwlHeadArt()} label="선생님 아바타" scale={1.4} />
      </div>
      <div className="hud__info">
        <div className="hud__name">
          <span>{teacherName}</span>
        </div>
        <div className="hud__xp">교무실 · 확인 대기 {pendingCount}건</div>
      </div>
    </div>
  );

  return (
    <ShellFrame activeKey={active} banner={banner} nav={nav} pageTitle={pageTitle} profile={profile} scene={scene} spaceLabel="teacher" wide={wide}>
      {children}
    </ShellFrame>
  );
}

interface PublicShellProps {
  pageTitle: string;
  scene: ReactNode;
  children: ReactNode;
}

/**
 * Entrance frame: just the scene and a centered panel, no HUD or dock.
 */
export function PublicShell({ pageTitle, scene, children }: PublicShellProps) {
  return (
    <>
      <Head>
        <title>{`${pageTitle} · 우리반 퀘스트`}</title>
        <meta content="width=device-width, initial-scale=1" name="viewport" />
        <link href="/favicon.svg" rel="icon" type="image/svg+xml" />
      </Head>
      <div className="game" data-simple="false" data-space="public">
        <AudioBoot space="public" />
        <div className="hud hud--public">
          <div className="hud__tools">
            <SoundControl />
          </div>
        </div>
        {scene}
        <main className="stage stage--center">
          <div className="stage__col">{children}</div>
        </main>
      </div>
    </>
  );
}
