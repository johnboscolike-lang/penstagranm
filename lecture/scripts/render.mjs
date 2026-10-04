/**
 * 강의 영상을 묶음(챕터)별로 렌더하고, 이어 붙인 뒤 마스터 오디오를 합친다.
 * 이미 렌더된 묶음은 건너뛰어 중간에 끊겨도 이어서 할 수 있다.
 *
 * 사용:
 *   node --experimental-strip-types scripts/render.mjs              # 전체
 *   node --experimental-strip-types scripts/render.mjs --test 300   # 처음 300프레임만 속도 측정
 *   node --experimental-strip-types scripts/render.mjs --only c2,c3 # 지정 묶음만
 * 결과: out/t01/parts/*.mp4, out/t01/이론1강.mp4
 */
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { existsSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { ROOT, log } from "./lib.mjs";

const { l01 } = await import("../src/content/l01/index.ts");
const { planLesson } = await import("../src/timeline.ts");
const BROWSER = "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell";

const args = process.argv.slice(2);
const test = args.includes("--test") ? Number(args[args.indexOf("--test") + 1]) : 0;
const only = args.includes("--only") ? args[args.indexOf("--only") + 1].split(",") : null;
const concurrency = args.includes("--concurrency") ? Number(args[args.indexOf("--concurrency") + 1]) : 4;

const voice = JSON.parse(readFileSync(resolve(ROOT, "public/voice", l01.id, "timeline.json"), "utf8"));
const plan = planLesson(l01, voice);
const fps = 30;
const OUT = resolve(ROOT, "out", l01.id);
const PARTS = resolve(OUT, "parts");
mkdirSync(PARTS, { recursive: true });

log("번들 중…");
const serveUrl = await bundle({ entryPoint: resolve(ROOT, "src/index.ts"), publicDir: resolve(ROOT, "public") });
const inputProps = { lesson: l01, label: "이론 1강", voice, audio: false, captions: true };
const composition = await selectComposition({ serveUrl, id: "T01", inputProps, browserExecutable: BROWSER, chromeMode: "headless-shell" });
const last = composition.durationInFrames - 1;

/**
 * 프레임 구간 하나를 무음 mp4로 렌더한다.
 * @param {string} name 파일 이름
 * @param {[number, number]} range 시작·끝 프레임(포함)
 * @returns {Promise<string>} 결과 경로
 */
async function renderPart(name, range) {
  const out = resolve(PARTS, `${name}.mp4`);
  if (existsSync(out) && !test) {
    log(`  건너뜀 ${name}`);
    return out;
  }
  const started = Date.now();
  let lastLog = 0;
  await renderMedia({
    serveUrl,
    composition,
    inputProps,
    codec: "h264",
    crf: 20,
    x264Preset: "medium",
    pixelFormat: "yuv420p",
    muted: true,
    frameRange: range,
    outputLocation: `${out}.tmp.mp4`,
    concurrency,
    browserExecutable: BROWSER,
    chromeMode: "headless-shell",
    imageFormat: "jpeg",
    jpegQuality: 92,
    onProgress: ({ progress }) => {
      if (Date.now() - lastLog > 30000) {
        lastLog = Date.now();
        log(`    ${name} ${(progress * 100).toFixed(0)}%`);
      }
    },
  });
  execFileSync("mv", [`${out}.tmp.mp4`, out]);
  const sec = (Date.now() - started) / 1000;
  const frames = range[1] - range[0] + 1;
  log(`  ✓ ${name} ${frames}프레임 ${sec.toFixed(0)}초 (${(frames / sec).toFixed(1)} fps)`);
  return out;
}

if (test) {
  await renderPart("_test", [0, Math.min(test, last)]);
  process.exit(0);
}

const parts = [];
for (const c of plan.chapters) {
  const a = Math.round(c.start * fps);
  const b = Math.min(last, Math.round(c.end * fps) - 1);
  if (only && !only.includes(c.chapter.id)) continue;
  parts.push(await renderPart(c.chapter.id, [a, b]));
}
if (only) process.exit(0);

const list = resolve(PARTS, "list.txt");
writeFileSync(list, parts.map((p) => `file '${p}'`).join("\n"));
const silent = resolve(OUT, "video.mp4");
execFileSync("ffmpeg", ["-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", list, "-c", "copy", silent]);
const final = resolve(OUT, `이론${l01.no}강.mp4`);
execFileSync("ffmpeg", ["-v", "error", "-y", "-i", silent, "-i", resolve(OUT, "master.m4a"), "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "copy", "-movflags", "+faststart", "-shortest", final]);
log(`완성: ${final}`);
