/**
 * HTML 플레이어를 프레임 단위로 그려 MP4로 묶는다(음성은 mix 결과를 그대로 입힌다).
 * 화면은 시각 t의 순수 함수라서 페이지 하나에서 시각만 바꿔 가며 캡처하고,
 * 구간을 나눠 여러 브라우저가 병렬로 그린 뒤 이어 붙인다.
 *
 * 사용: node --experimental-strip-types scripts/render-mp4.mjs --lesson t01
 *       옵션: --fps 30 --workers 4 --chunk 90 --from 400 --to 420(시험 렌더) --crf 21
 * 결과: out/mp4/t01.mp4 (시험 렌더는 out/mp4/t01-test.mp4)
 */
import { chromium } from "playwright-core";
import { createServer } from "node:http";
import { spawn, execFileSync } from "node:child_process";
import { readFileSync, existsSync, mkdirSync, writeFileSync, statSync, renameSync } from "node:fs";
import { resolve, extname } from "node:path";
import { pickLesson, ROOT, log } from "./lib.mjs";

const argv = process.argv.slice(2);
/**
 * 옵션 값을 읽는다.
 * @param {string} name 옵션 이름(--name)
 * @param {number} def 기본값
 * @returns {number} 옵션 값
 */
const opt = (name, def) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? Number(argv[i + 1]) : def;
};
const FPS = opt("fps", 30);
const WORKERS = opt("workers", 4);
const CHUNK = opt("chunk", 90);
const CRF = opt("crf", 21);
const FROM = opt("from", 0);
const TO = opt("to", Infinity);
const TEST = argv.includes("--from") || argv.includes("--to");

const lesson = await pickLesson();
const { planLesson } = await import("../src/timeline.ts");
const BROWSER = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const DIST = resolve(ROOT, "dist", lesson.id);
if (!existsSync(resolve(DIST, "index.html"))) throw new Error("dist 가 없습니다. npm run build 먼저.");
const voice = JSON.parse(readFileSync(resolve(ROOT, "public/voice", lesson.id, "timeline.json"), "utf8"));
const plan = planLesson(lesson, voice);
const master = resolve(ROOT, "out", lesson.id, "master.m4a");

const t0 = Math.max(0, FROM);
const t1 = Math.min(plan.total, TO);
const startFrame = Math.round(t0 * FPS);
const endFrame = Math.round(t1 * FPS);
const framesPerChunk = Math.round(CHUNK * FPS);
const work = resolve(ROOT, "out/mp4", `${lesson.id}${TEST ? "-test" : ""}.parts`);
mkdirSync(work, { recursive: true });

/** @type {{ idx: number, from: number, to: number, file: string }[]} */
const chunks = [];
for (let f = startFrame, i = 0; f < endFrame; f += framesPerChunk, i++) {
  chunks.push({ idx: i, from: f, to: Math.min(endFrame, f + framesPerChunk), file: resolve(work, `p${String(i).padStart(4, "0")}.mp4`) });
}
log(`${lesson.id}: ${(t1 - t0).toFixed(0)}초 · ${endFrame - startFrame}프레임 · 구간 ${chunks.length}개 · 병렬 ${WORKERS}`);

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".woff2": "font/woff2", ".jpg": "image/jpeg", ".mp3": "audio/mpeg" };
const server = createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  const file = resolve(DIST, "." + (path === "/" ? "/index.html" : path));
  if (!file.startsWith(DIST) || !existsSync(file)) {
    res.writeHead(404).end();
    return;
  }
  res.writeHead(200, { "Content-Type": TYPES[extname(file)] ?? "application/octet-stream" }).end(readFileSync(file));
});
await new Promise((r) => server.listen(0, r));
const port = server.address().port;

let done = 0;
const started = Date.now();

/**
 * 브라우저 하나로 구간들을 맡아 그려 부분 MP4로 저장한다.
 * @param {number} wid 작업자 번호
 * @param {typeof chunks} queue 남은 구간(공유)
 * @returns {Promise<void>} 끝나면 해소
 */
async function worker(wid, queue) {
  const browser = await chromium.launch({ executablePath: BROWSER, args: ["--disable-gpu"] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto(`http://localhost:${port}/?still=1&t=0`);
  await page.waitForFunction(() => window.__ready === true && typeof window.__setT === "function");
  await page.evaluate(() => document.fonts.ready);
  const cdp = await page.context().newCDPSession(page);
  for (let c = queue.shift(); c; c = queue.shift()) {
    if (existsSync(c.file) && statSync(c.file).size > 0) {
      done += c.to - c.from;
      continue;
    }
    const tmp = c.file + ".tmp.mp4";
    const ff = spawn(
      "ffmpeg",
      [
        "-v", "error", "-y",
        "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "mjpeg", "-i", "-",
        "-vf", "scale=in_range=pc:out_range=tv:out_color_matrix=bt709,format=yuv420p",
        "-c:v", "libx264", "-preset", "veryfast", "-crf", String(CRF), "-g", String(FPS * 5), "-threads", "2",
        "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709", "-color_range", "tv",
        "-an", tmp,
      ],
      { stdio: ["pipe", "inherit", "inherit"] },
    );
    const closed = new Promise((res, rej) => {
      ff.on("close", (code) => (code === 0 ? res() : rej(new Error(`ffmpeg 종료 코드 ${code}`))));
    });
    for (let f = c.from; f < c.to; f++) {
      await page.evaluate((x) => window.__setT(x), f / FPS);
      const { data } = await cdp.send("Page.captureScreenshot", { format: "jpeg", quality: 90 });
      if (!ff.stdin.write(Buffer.from(data, "base64"))) await new Promise((r) => ff.stdin.once("drain", r));
      done++;
      if (done % 900 === 0) {
        const sec = (Date.now() - started) / 1000;
        const total = endFrame - startFrame;
        log(`  ${((done / total) * 100).toFixed(1)}% · 경과 ${(sec / 60).toFixed(1)}분 · 남은 시간 약 ${(((total - done) * sec) / done / 60).toFixed(0)}분`);
      }
    }
    ff.stdin.end();
    await closed;
    renameSync(tmp, c.file);
  }
  await browser.close();
}

const queue = [...chunks];
await Promise.all(Array.from({ length: Math.min(WORKERS, chunks.length) }, (_, i) => worker(i, queue)));
server.close();

// 부분 파일 이어 붙이기 + 음성 입히기
const list = resolve(work, "list.txt");
writeFileSync(list, chunks.map((c) => `file '${c.file}'`).join("\n"));
const out = resolve(ROOT, "out/mp4", `${lesson.id}${TEST ? "-test" : ""}.mp4`);
const audioArgs = TEST ? ["-ss", String(t0), "-t", String(t1 - t0), "-i", master] : ["-i", master];
execFileSync("ffmpeg", ["-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", list, ...audioArgs, "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", out]);
const mb = (statSync(out).size / 1048576).toFixed(0);
log(`완성: ${out} (${mb}MB, ${((Date.now() - started) / 60000).toFixed(1)}분 소요)`);
