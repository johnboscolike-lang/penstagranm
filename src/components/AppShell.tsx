import Head from "next/head";
import Link from "next/link";
import type { ReactNode } from "react";

interface AppShellProps {
  currentPath: "feed" | "calendar";
  children: ReactNode;
}

/**
 * Wraps each page with the shared header, brand, and primary navigation.
 */
export function AppShell({ currentPath, children }: AppShellProps) {
  return (
    <>
      <Head>
        <title>pen스타그램</title>
        <meta
          content="수업 준비, 목표, 필기, 과제를 네 컷으로 기록하는 교실형 인스타그램"
          name="description"
        />
      </Head>
      <div className="app-shell">
        <header className="app-header">
          <div className="app-header__brand">
            <p className="app-header__eyebrow">CLASSROOM SOCIAL ARCHIVE</p>
            <h1>pen스타그램</h1>
            <p className="app-header__summary">
              수업 장면을 네 컷으로 남기고 댓글과 일정, 한국어 전사까지 함께 기록하는 교실형
              인스타그램
            </p>
          </div>
          <nav aria-label="주요 이동" className="app-header__nav">
            <Link
              className={currentPath === "feed" ? "nav-link nav-link--active" : "nav-link"}
              href="/"
            >
              피드
            </Link>
            <Link
              className={currentPath === "calendar" ? "nav-link nav-link--active" : "nav-link"}
              href="/calendar"
            >
              일정 캘린더
            </Link>
          </nav>
        </header>
        <main className="app-main">{children}</main>
      </div>
    </>
  );
}
