/**
 * 효과음과 음악을 ElevenLabs로 만들고, 각 파일의 피크 위치를 잰다.
 * 피크 위치는 믹스할 때 이벤트 시각에 피크를 맞추는 데 쓴다.
 *
 * 사용: node scripts/sfx.mjs [--force]
 * 결과: public/sfx/*.mp3, public/music/*.mp3, public/sfx/peaks.json
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { ROOT, loadEnv, log, writeFile } from "./lib.mjs";

loadEnv();
const KEY = process.env.ELEVENLABS_API_KEY;
const force = process.argv.includes("--force");

export const SFX = {
  whoosh: { text: "very soft airy whoosh transition, subtle, clean, short, no reverb tail", dur: 0.9 },
  tick: { text: "soft minimal UI tick click, gentle, clean", dur: 0.5 },
  marker: { text: "highlighter marker pen swipe across paper, short, close", dur: 0.7 },
  pop: { text: "soft gentle UI pop confirm sound, warm, short", dur: 0.5 },
  chime: { text: "gentle bright two-note glass chime, correct answer, subtle and short", dur: 1.2 },
  irisOpen: { text: "soft deep cinematic whoosh swell opening, warm low tone, clean, short", dur: 1.8 },
  irisClose: { text: "soft cinematic reverse whoosh closing into silence, warm, short", dur: 1.6 },
  slide: { text: "quick soft paper swish slide", dur: 0.6 },
};

export const MUSIC = {
  opening: { prompt: "short modern minimal intro sting for an education lecture, warm synth swell rising into one soft confident piano chord, clean, no drums, no vocals", ms: 9000 },
  bed: { prompt: "very calm minimal ambient study background, soft warm electric piano and gentle synth pad, slow, steady, unobtrusive, no drums, no melody hooks, no vocals, 68 bpm", ms: 180000 },
  closing: { prompt: "short minimal outro sting for an education lecture, soft piano chord resolving with warm pad fade, calm, no drums, no vocals", ms: 7000 },
};

/**
 * 오디오 파일의 가장 큰 진폭 위치(초).
 * @param {string} p 파일 경로
 * @returns {number} 초
 */
function peakTime(p) {
  const raw = execFileSync("ffmpeg", ["-v", "error", "-i", p, "-ac", "1", "-ar", "24000", "-f", "s16le", "-"], { maxBuffer: 1 << 28 });
  let max = 0;
  let at = 0;
  for (let i = 0; i < raw.length; i += 2) {
    const v = Math.abs(raw.readInt16LE(i));
    if (v > max) {
      max = v;
      at = i / 2;
    }
  }
  return +(at / 24000).toFixed(3);
}

/**
 * ElevenLabs 요청 후 파일로 저장한다(있으면 건너뜀).
 * @param {string} url API 주소
 * @param {object} body 요청 본문
 * @param {string} out 저장 경로
 * @returns {Promise<void>}
 */
async function fetchAudio(url, body, out) {
  if (!force && existsSync(out)) return;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(url, { method: "POST", headers: { "xi-api-key": KEY, "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) {
      writeFile(out, Buffer.from(await res.arrayBuffer()));
      return;
    }
    log(`  재시도 ${attempt} ${res.status} ${(await res.text()).slice(0, 120)}`);
    await new Promise((r) => setTimeout(r, 3000 * attempt));
  }
  throw new Error(`생성 실패: ${out}`);
}

const peaks = {};
for (const [name, s] of Object.entries(SFX)) {
  const out = resolve(ROOT, "public/sfx", `${name}.mp3`);
  await fetchAudio("https://api.elevenlabs.io/v1/sound-generation", { text: s.text, duration_seconds: s.dur, prompt_influence: 0.6 }, out);
  peaks[name] = peakTime(out);
  log(`  ✓ sfx ${name} 피크 ${peaks[name]}s`);
}
for (const [name, m] of Object.entries(MUSIC)) {
  const out = resolve(ROOT, "public/music", `${name}.mp3`);
  await fetchAudio("https://api.elevenlabs.io/v1/music", { prompt: m.prompt, music_length_ms: m.ms }, out);
  peaks[`music:${name}`] = peakTime(out);
  log(`  ✓ music ${name} 피크 ${peaks[`music:${name}`]}s`);
}
writeFile(resolve(ROOT, "public/sfx/peaks.json"), JSON.stringify(peaks, null, 1));
log("peaks.json 저장");
