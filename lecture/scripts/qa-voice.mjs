/**
 * 생성된 음성을 다시 받아쓰기(ElevenLabs Scribe)해 대본과 비교한다.
 * 한글만 남겨 비교하고, 일치율이 낮은 장면을 보고서로 남긴다.
 *
 * 사용: node --experimental-strip-types scripts/qa-voice.mjs
 * 결과: .cache/qa-voice.json
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ROOT, loadEnv, log, hash, writeFile, pool } from "./lib.mjs";

loadEnv();
const KEY = process.env.ELEVENLABS_API_KEY;
const { l01 } = await import("../src/content/l01/index.ts");
const { parseSay } = await import("../src/content/parse.ts");

/**
 * 비교용 정규화: 한글만 남긴다.
 * @param s 문장
 * @returns 한글 문자열
 */
function norm(s) {
  return s.replace(/[^가-힣]/g, "");
}

/**
 * 두 문자열의 편집 거리 기반 일치율.
 * @param a 기준
 * @param b 비교
 * @returns 0~1
 */
function similarity(a, b) {
  const n = a.length;
  const m = b.length;
  if (!n && !m) return 1;
  let prev = Array.from({ length: m + 1 }, (_, j) => j);
  for (let i = 1; i <= n; i++) {
    const cur = [i];
    for (let j = 1; j <= m; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return 1 - prev[m] / Math.max(n, m);
}

const scenes = l01.chapters.flatMap((c) => c.scenes).filter((s) => s.say);
const cacheDir = resolve(ROOT, ".cache/stt");
const results = await pool(scenes, 4, async (s) => {
  const p = parseSay(s.say);
  const mp3 = resolve(ROOT, "public/voice", l01.id, `${s.id}.mp3`);
  const key = hash(readFileSync(mp3));
  const cached = resolve(cacheDir, `${key}.json`);
  let text;
  if (existsSync(cached)) text = JSON.parse(readFileSync(cached, "utf8")).text;
  else {
    const fd = new FormData();
    fd.append("model_id", "scribe_v1");
    fd.append("language_code", "kor");
    fd.append("file", new Blob([readFileSync(mp3)]), `${s.id}.mp3`);
    const res = await fetch("https://api.elevenlabs.io/v1/speech-to-text", { method: "POST", headers: { "xi-api-key": KEY }, body: fd });
    const d = await res.json();
    text = d.text ?? "";
    writeFile(cached, JSON.stringify({ text }));
  }
  const score = similarity(norm(p.spoken), norm(text));
  log(`${s.id} ${score.toFixed(3)}`);
  return { id: s.id, score: +score.toFixed(3), spoken: p.spoken, heard: text };
});
results.sort((a, b) => a.score - b.score);
writeFile(resolve(ROOT, ".cache/qa-voice.json"), JSON.stringify(results, null, 1));
log(`가장 낮은 5개: ${results.slice(0, 5).map((r) => `${r.id}=${r.score}`).join(", ")}`);
