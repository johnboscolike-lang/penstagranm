import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { l01 } from "../content/l01/index.ts";
import { Stage } from "../Stage.tsx";
import { asset } from "../lib/rt.ts";
import { planLesson, type Plan, type VoiceTimeline } from "../timeline.ts";
import { C, FONT } from "../theme.ts";

type ChapterAudio = { id: string; title: string; no: number; start: number; end: number; file: string };

const params = new URLSearchParams(location.search);
const STILL = params.get("still") === "1";

/**
 * 강의 플레이어. 음성(챕터별 오디오)의 재생 시각을 t로 삼아 무대를 매 프레임 그린다.
 * 영상 파일을 만들지 않으므로 대본·음성만 바뀌면 즉시 반영된다.
 * @returns 플레이어
 */
function Player({ plan, chapters }: { plan: Plan; chapters: ChapterAudio[] }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [t, setT] = useState(() => Math.max(0, Number(params.get("t") ?? 0)));
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(STILL);
  const [rate, setRate] = useState(1);
  const [captions, setCaptions] = useState(params.get("cap") !== "0");
  const [scale, setScale] = useState(1);
  const [ui, setUi] = useState(true);
  const chIndex = useRef(0);
  const hideTimer = useRef<number | undefined>(undefined);

  const chapterAt = useCallback((time: number) => {
    let k = 0;
    chapters.forEach((c, i) => {
      if (time >= c.start) k = i;
    });
    return k;
  }, [chapters]);

  /** 절대 시각으로 이동한다(챕터 오디오를 바꿔 끼운다). */
  const seek = useCallback(
    (time: number, play = playing) => {
      const el = audio.current;
      const target = Math.min(Math.max(0, time), plan.total - 0.05);
      const k = chapterAt(target);
      setT(target);
      if (!el) return;
      const ch = chapters[k];
      const local = target - ch.start;
      if (chIndex.current !== k || !el.src.endsWith(ch.file)) {
        chIndex.current = k;
        el.src = asset(`audio/${ch.file}`);
        el.addEventListener(
          "loadedmetadata",
          () => {
            el.currentTime = local;
            el.playbackRate = rate;
            if (play) void el.play();
          },
          { once: true },
        );
        el.load();
      } else {
        el.currentTime = local;
        if (play) void el.play();
      }
    },
    [chapters, chapterAt, plan.total, playing, rate],
  );

  // 재생 중에는 매 프레임 오디오 시각을 읽어 t를 갱신한다.
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    const loop = () => {
      const el = audio.current;
      if (el) setT(chapters[chIndex.current].start + el.currentTime);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing, chapters]);

  useEffect(() => {
    const fit = () => setScale(Math.min(window.innerWidth / 1920, window.innerHeight / 1080));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  const toggle = useCallback(() => {
    const el = audio.current;
    if (!el) return;
    if (!started) {
      setStarted(true);
      seek(t, true);
      setPlaying(true);
      return;
    }
    if (el.paused) {
      void el.play();
      setPlaying(true);
    } else {
      el.pause();
      setPlaying(false);
    }
  }, [seek, started, t]);

  const onEnded = () => {
    const k = chIndex.current + 1;
    if (k < chapters.length) seek(chapters[k].start, true);
    else setPlaying(false);
  };

  const poke = () => {
    setUi(true);
    window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setUi(false), 2600);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === " ") {
        e.preventDefault();
        toggle();
      } else if (e.key === "ArrowRight") seek(t + 5);
      else if (e.key === "ArrowLeft") seek(t - 5);
      else if (e.key === "]") seek(chapters[Math.min(chapters.length - 1, chapterAt(t) + 1)].start);
      else if (e.key === "[") seek(chapters[Math.max(0, chapterAt(t) - (t - chapters[chapterAt(t)].start < 2 ? 1 : 0))].start);
      else if (e.key === "c") setCaptions((x) => !x);
      else return;
      poke();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const cur = chapters[chapterAt(t)];
  const showUi = !STILL && (ui || !playing);

  return (
    <div
      onMouseMove={poke}
      onTouchStart={poke}
      style={{ position: "fixed", inset: 0, background: "#000", overflow: "hidden", cursor: showUi ? "default" : "none" }}
    >
      <div
        onClick={toggle}
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: 1920,
          height: 1080,
          translate: "-50% -50%",
          scale: String(scale),
        }}
      >
        <Stage plan={plan} t={t} label="이론 1강" captions={captions} />
      </div>
      <audio ref={audio} preload="auto" onEnded={onEnded} />

      {!started ? (
        <button
          onClick={toggle}
          aria-label="재생"
          style={{
            position: "absolute",
            left: "50%",
            top: "72%",
            translate: "-50% -50%",
            padding: "18px 40px",
            borderRadius: 999,
            border: "none",
            background: C.ink,
            color: C.ice,
            fontFamily: FONT.kr,
            fontWeight: 700,
            fontSize: 22,
            cursor: "pointer",
            boxShadow: "0 12px 40px rgba(0,0,0,0.3)",
          }}
        >
          ▶ 강의 시작 · {fmt(plan.total)}
        </button>
      ) : null}

      {started && showUi ? (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            padding: "28px max(16px, env(safe-area-inset-right)) calc(14px + env(safe-area-inset-bottom, 0px)) max(16px, env(safe-area-inset-left))",
            background: "linear-gradient(transparent, rgba(0,0,0,0.75))",
            fontFamily: FONT.kr,
            color: C.ice,
          }}
        >
          <Scrubber plan={plan} chapters={chapters} t={t} onSeek={(x) => seek(x)} />
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, marginTop: 10, fontSize: 15 }}>
            <Btn onClick={toggle} label={playing ? "❚❚" : "▶"} />
            <span style={{ fontFamily: FONT.num, opacity: 0.85 }}>
              {fmt(t)} / {fmt(plan.total)}
            </span>
            <span style={{ opacity: 0.7, marginLeft: 6, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {String(cur.no).padStart(2, "0")} {cur.title}
            </span>
            <span style={{ flex: 1 }} />
            <select
              value={chapterAt(t)}
              onChange={(e) => seek(chapters[Number(e.target.value)].start)}
              style={selectStyle}
              aria-label="묶음 이동"
            >
              {chapters.map((c, i) => (
                <option key={c.id} value={i}>
                  {String(c.no).padStart(2, "0")} {c.title}
                </option>
              ))}
            </select>
            <select
              value={rate}
              onChange={(e) => {
                const r = Number(e.target.value);
                setRate(r);
                if (audio.current) audio.current.playbackRate = r;
              }}
              style={selectStyle}
              aria-label="속도"
            >
              {[0.9, 1, 1.15, 1.25, 1.5].map((r) => (
                <option key={r} value={r}>
                  {r}×
                </option>
              ))}
            </select>
            <Btn onClick={() => setCaptions((x) => !x)} label={captions ? "자막 켬" : "자막 끔"} />
            <Btn
              onClick={() => {
                const p = document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.();
                p?.catch(() => undefined);
              }}
              label="⛶"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.12)",
  color: "#fff",
  border: "1px solid rgba(255,255,255,0.2)",
  borderRadius: 8,
  padding: "6px 8px",
  fontSize: 14,
  fontFamily: "inherit",
};

function Btn({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "rgba(255,255,255,0.12)",
        color: "#fff",
        border: "1px solid rgba(255,255,255,0.2)",
        borderRadius: 8,
        padding: "6px 12px",
        fontSize: 14,
        fontFamily: "inherit",
        cursor: "pointer",
        minWidth: 44,
      }}
    >
      {label}
    </button>
  );
}

/** 진행 막대: 클릭·드래그로 이동, 묶음 경계 표시. */
function Scrubber({ plan, chapters, t, onSeek }: { plan: Plan; chapters: ChapterAudio[]; t: number; onSeek: (t: number) => void }) {
  const bar = useRef<HTMLDivElement>(null);
  const at = (clientX: number) => {
    const r = bar.current!.getBoundingClientRect();
    return ((clientX - r.left) / r.width) * plan.total;
  };
  return (
    <div
      ref={bar}
      onPointerDown={(e) => {
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        onSeek(at(e.clientX));
      }}
      onPointerMove={(e) => {
        if (e.buttons) onSeek(at(e.clientX));
      }}
      style={{ position: "relative", height: 18, cursor: "pointer", touchAction: "none" }}
    >
      <div style={{ position: "absolute", left: 0, right: 0, top: 7, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.22)" }} />
      <div style={{ position: "absolute", left: 0, top: 7, height: 4, borderRadius: 2, width: `${(t / plan.total) * 100}%`, background: C.yellow }} />
      {chapters.slice(1).map((c) => (
        <div key={c.id} style={{ position: "absolute", left: `${(c.start / plan.total) * 100}%`, top: 4, width: 2, height: 10, background: "rgba(255,255,255,0.55)" }} />
      ))}
    </div>
  );
}

function fmt(s: number): string {
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${String(r).padStart(2, "0")}`;
}

/**
 * 시간표와 오디오 목록을 읽어 플레이어를 띄운다.
 * @returns 없음
 */
async function boot() {
  const voice: VoiceTimeline | null = await fetch(asset("timeline.json"))
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null);
  const chapters: ChapterAudio[] = await fetch(asset("chapters.json")).then((r) => r.json());
  await document.fonts.ready;
  const root = createRoot(document.getElementById("root")!);
  root.render(<App voice={voice} chapters={chapters} />);
}

function App({ voice, chapters }: { voice: VoiceTimeline | null; chapters: ChapterAudio[] }) {
  const plan = useMemo(() => planLesson(l01, voice), [voice]);
  useEffect(() => {
    (window as unknown as { __ready: boolean }).__ready = true;
  }, []);
  return <Player plan={plan} chapters={chapters} />;
}

void boot();
