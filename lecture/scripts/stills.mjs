/**
 * 대표 프레임을 정지 이미지로 뽑아 확인한다.
 *
 * 사용:
 *   node --experimental-strip-types scripts/stills.mjs            # 모든 장면의 85% 지점
 *   node --experimental-strip-types scripts/stills.mjs c2s1 c4s3b  # 지정 장면
 *   node --experimental-strip-types scripts/stills.mjs c2s1@0.3    # 장면 30% 지점
 *   node --experimental-strip-types scripts/stills.mjs t=12.5      # 절대 시각(초)
 * 결과: out/stills/*.jpg 와 out/stills/sheet.jpg(모아 보기)
 */
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { ROOT, log } from "./lib.mjs";

const { l01 } = await import("../src/content/l01/index.ts");
const { planLesson } = await import("../src/timeline.ts");

export const BROWSER = "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell";

const voicePath = resolve(ROOT, "public/voice", l01.id, "timeline.json");
const voice = existsSync(voicePath) ? JSON.parse(readFileSync(voicePath, "utf8")) : null;
const plan = planLesson(l01, voice);
const fps = 30;

const args = process.argv.slice(2);
/** @type {{ name: string, frame: number }[]} */
const shots = [];
const pick = (id, ratio) => {
  const s = plan.scenes.find((x) => x.scene.id === id);
  if (!s) throw new Error(`장면 없음: ${id}`);
  const t = s.dur > 0 ? s.audioStart + s.dur * ratio : s.start + (s.end - s.start) * ratio;
  shots.push({ name: `${id}@${ratio}`, frame: Math.round(t * fps) });
};
if (!args.length) for (const s of plan.scenes) pick(s.scene.id, 0.85);
for (const a of args) {
  if (a.startsWith("t=")) shots.push({ name: a, frame: Math.round(Number(a.slice(2)) * fps) });
  else {
    const [id, r] = a.split("@");
    pick(id, r ? Number(r) : 0.85);
  }
}

const out = resolve(ROOT, "out/stills");
mkdirSync(out, { recursive: true });
log("번들 중…");
const serveUrl = await bundle({ entryPoint: resolve(ROOT, "src/index.ts"), publicDir: resolve(ROOT, "public") });
const inputProps = { lesson: l01, label: "이론 1강", voice, audio: false, captions: true };
const composition = await selectComposition({ serveUrl, id: "T01", inputProps, browserExecutable: BROWSER, chromeMode: "headless-shell" });
const files = [];
for (const s of shots) {
  const file = resolve(out, `${s.name.replace(/[^a-z0-9@.=_-]/gi, "_")}.jpg`);
  await renderStill({ serveUrl, composition, frame: Math.min(s.frame, composition.durationInFrames - 1), output: file, inputProps, imageFormat: "jpeg", jpegQuality: 88, browserExecutable: BROWSER, chromeMode: "headless-shell" });
  files.push(file);
  log(`  ✓ ${s.name} (프레임 ${s.frame})`);
}
if (files.length > 1) {
  const cols = 4;
  const inputs = files.flatMap((f) => ["-i", f]);
  const n = files.length;
  const layout = files.map((_, i) => `${(i % cols) * 480}_${Math.floor(i / cols) * 270}`).join("|");
  const scaled = files.map((_, i) => `[${i}:v]scale=480:270[s${i}]`).join(";");
  const refs = files.map((_, i) => `[s${i}]`).join("");
  execFileSync("ffmpeg", ["-v", "error", "-y", ...inputs, "-filter_complex", `${scaled};${refs}xstack=inputs=${n}:layout=${layout}:fill=black`, resolve(out, "sheet.jpg")]);
  log("모아 보기: out/stills/sheet.jpg");
}
