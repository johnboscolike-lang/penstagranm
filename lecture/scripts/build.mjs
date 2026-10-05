/**
 * HTML 강의 플레이어를 만든다. 영상 렌더 없이 음성 재생 시각으로 화면을 그린다.
 *
 * 사용: node --experimental-strip-types scripts/build.mjs
 * 필요: public/voice/t01/timeline.json, out/t01/master.m4a (npm run voice, npm run mix)
 * 결과: dist/t01/ (index.html, app.js, assets/…) — 정적 파일이라 어디서든 열린다.
 */
import { build } from "esbuild";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { pickLesson, ROOT, log } from "./lib.mjs";

const l01 = await pickLesson();
const { planLesson } = await import("../src/timeline.ts");

const LESSON = l01.id;
const DIST = resolve(ROOT, "dist", LESSON);
const ASSETS = resolve(DIST, "assets");
const timelinePath = resolve(ROOT, "public/voice", LESSON, "timeline.json");
const master = resolve(ROOT, "out", LESSON, "master.m4a");
if (!existsSync(timelinePath) || !existsSync(master)) throw new Error("timeline.json 또는 master.m4a 가 없습니다. npm run voice && npm run mix 먼저.");

const keepAudio = process.argv.includes("--keep-audio") && existsSync(resolve(ASSETS, "audio"));
if (!keepAudio) rmSync(DIST, { recursive: true, force: true });
mkdirSync(resolve(ASSETS, "audio"), { recursive: true });

await build({
  entryPoints: [resolve(ROOT, "src/player/main.tsx")],
  bundle: true,
  minify: true,
  format: "esm",
  target: "es2020",
  jsx: "automatic",
  outfile: resolve(DIST, "app.js"),
  define: { "process.env.NODE_ENV": '"production"', __LESSON__: JSON.stringify(LESSON) },
  logLevel: "warning",
});
log("app.js 번들 완료");

cpSync(resolve(ROOT, "public/fonts"), resolve(ASSETS, "fonts"), { recursive: true });
cpSync(resolve(ROOT, "public/bg"), resolve(ASSETS, "bg"), { recursive: true });
const voice = JSON.parse(readFileSync(timelinePath, "utf8"));
writeFileSync(resolve(ASSETS, "timeline.json"), JSON.stringify(voice));

// 마스터 오디오를 묶음별로 나눈다(파일 하나가 너무 커지지 않게).
const plan = planLesson(l01, voice);
const chapters = plan.chapters.map((c) => ({
  id: c.chapter.id,
  no: c.chapter.no,
  title: c.chapter.title,
  start: +c.start.toFixed(3),
  end: +c.end.toFixed(3),
  file: `${c.chapter.id}.mp3`,
}));
for (const c of chapters) {
  const out = resolve(ASSETS, "audio", c.file);
  if (keepAudio && existsSync(out)) continue;
  execFileSync("ffmpeg", ["-v", "error", "-y", "-ss", String(c.start), "-to", String(c.end), "-i", master, "-c:a", "libmp3lame", "-b:a", "128k", out]);
}
writeFileSync(resolve(ASSETS, "chapters.json"), JSON.stringify(chapters));
log(`묶음 오디오 ${chapters.length}개`);

const fontFaces = [
  ["Pretendard", "Pretendard-Regular", 400],
  ["Pretendard", "Pretendard-Medium", 500],
  ["Pretendard", "Pretendard-SemiBold", 600],
  ["Pretendard", "Pretendard-Bold", 700],
  ["Pretendard", "Pretendard-ExtraBold", 800],
  ["Geist", "Geist-Regular", 400],
  ["Geist", "Geist-Medium", 500],
  ["Geist", "Geist-SemiBold", 600],
  ["Geist", "Geist-Bold", 700],
  ["Geist Mono", "GeistMono-Regular", 400],
  ["Geist Mono", "GeistMono-Medium", 500],
]
  .map(([f, file, w]) => `@font-face{font-family:"${f}";src:url(assets/fonts/${file}.woff2) format("woff2");font-weight:${w};font-display:block}`)
  .join("\n");

// 공유용 페이지 본문(문서 골격 없이): 아티팩트 게시에 쓴다.
writeFileSync(
  resolve(DIST, "page.html"),
  `<title>공업교육론 이론 ${l01.no}강</title>
<style>
${fontFaces}
:root{color-scheme:dark}
html,body{height:100%;background:#000;overflow:hidden}
body{-webkit-font-smoothing:antialiased;font-family:Pretendard,sans-serif;color:#E9F1FF}
#root{height:100%}
</style>
<div id="root"></div>
<script type="module" src="app.js"></script>
`,
);
writeFileSync(
  resolve(DIST, "index.html"),
  `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>공업교육론 이론 ${l01.no}강</title>
<style>
${fontFaces}
html,body{margin:0;height:100%;background:#000;overflow:hidden}
body{-webkit-font-smoothing:antialiased;font-family:Pretendard,sans-serif}
#root{height:100%}
</style>
<link rel="preload" href="assets/fonts/Pretendard-ExtraBold.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="assets/fonts/Pretendard-Bold.woff2" as="font" type="font/woff2" crossorigin>
</head>
<body>
<div id="root"></div>
<script type="module" src="app.js"></script>
</body>
</html>
`,
);
const size = execFileSync("du", ["-sh", DIST]).toString().split("\t")[0];
log(`완성: ${DIST} (${size})`);
