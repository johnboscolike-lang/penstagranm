/**
 * 빌드된 HTML 플레이어를 열어 지정 시각의 화면을 캡처한다(영상 렌더 없이 검수).
 *
 * 사용:
 *   node --experimental-strip-types scripts/stills.mjs            # 모든 장면의 85% 지점
 *   node --experimental-strip-types scripts/stills.mjs c2s1 c4s3b@0.3 t=12.5
 * 결과: out/stills/*.jpg, out/stills/sheet.jpg
 */
import { chromium } from "playwright-core";
import { createServer } from "node:http";
import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, extname } from "node:path";
import { execFileSync } from "node:child_process";
import { ROOT, log } from "./lib.mjs";

const { l01 } = await import("../src/content/l01/index.ts");
const { planLesson } = await import("../src/timeline.ts");

const BROWSER = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const DIST = resolve(ROOT, "dist", l01.id);
if (!existsSync(resolve(DIST, "index.html"))) throw new Error("dist 가 없습니다. npm run build 먼저.");

const voice = JSON.parse(readFileSync(resolve(ROOT, "public/voice", l01.id, "timeline.json"), "utf8"));
const plan = planLesson(l01, voice);

const shots = [];
const pick = (id, ratio) => {
  const s = plan.scenes.find((x) => x.scene.id === id);
  if (!s) throw new Error(`장면 없음: ${id}`);
  const t = s.dur > 0 ? s.audioStart + s.dur * ratio : s.start + (s.end - s.start) * ratio;
  shots.push({ name: `${id}@${ratio}`, t });
};
const args = process.argv.slice(2);
if (!args.length) for (const s of plan.scenes) pick(s.scene.id, 0.85);
for (const a of args) {
  if (a.startsWith("t=")) shots.push({ name: a, t: Number(a.slice(2)) });
  else {
    const [id, r] = a.split("@");
    pick(id, r ? Number(r) : 0.85);
  }
}

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".woff2": "font/woff2", ".jpg": "image/jpeg", ".m4a": "audio/mp4" };
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

const out = resolve(ROOT, "out/stills");
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: BROWSER });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const files = [];
for (const s of shots) {
  await page.goto(`http://localhost:${port}/?still=1&t=${s.t.toFixed(3)}`);
  await page.waitForFunction(() => window.__ready === true);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(250);
  const file = resolve(out, `${s.name.replace(/[^a-z0-9@.=_-]/gi, "_")}.jpg`);
  await page.screenshot({ path: file, type: "jpeg", quality: 88 });
  files.push(file);
  log(`  ✓ ${s.name} (${s.t.toFixed(1)}s)`);
}
await browser.close();
server.close();

if (files.length > 1) {
  const cols = 4;
  const inputs = files.flatMap((f) => ["-i", f]);
  const layout = files.map((_, i) => `${(i % cols) * 480}_${Math.floor(i / cols) * 270}`).join("|");
  const scaled = files.map((_, i) => `[${i}:v]scale=480:270[s${i}]`).join(";");
  const refs = files.map((_, i) => `[s${i}]`).join("");
  execFileSync("ffmpeg", ["-v", "error", "-y", ...inputs, "-filter_complex", `${scaled};${refs}xstack=inputs=${files.length}:layout=${layout}:fill=black`, resolve(out, "sheet.jpg")]);
  log("모아 보기: out/stills/sheet.jpg");
}
