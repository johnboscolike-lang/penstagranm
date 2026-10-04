/**
 * 대본 → ElevenLabs 음성(글자별 타임스탬프 포함) → 큐 타임라인.
 *
 * 사용: node --experimental-strip-types scripts/voice.mjs [--only c2s1,c2s3] [--force]
 * 결과: public/voice/t01/<장면>.mp3, public/voice/t01/timeline.json
 * 같은 문장·목소리·설정이면 .cache 의 결과를 재사용해 다시 과금하지 않는다.
 */
import { existsSync, readFileSync, copyFileSync } from "node:fs";
import { resolve } from "node:path";
import { pickLesson, ROOT, loadEnv, log, hash, writeFile, mediaDuration, pool } from "./lib.mjs";

const l01 = await pickLesson();
const { parseSay } = await import("../src/content/parse.ts");

loadEnv();
const KEY = process.env.ELEVENLABS_API_KEY;
if (!KEY) throw new Error("ELEVENLABS_API_KEY 가 없습니다 (lecture/.env)");

export const VOICE = {
  id: "uyVNoMrnUku1dZyVEXwD",
  name: "Anna Kim",
  model: "eleven_v4",
  settings: { stability: 0.5, similarity_boost: 0.8, style: 0.15, use_speaker_boost: true, speed: 1.0 },
};

const args = process.argv.slice(2);
const only = args.includes("--only") ? args[args.indexOf("--only") + 1].split(",") : null;
const force = args.includes("--force");
const LESSON = l01.id;
const OUT = resolve(ROOT, "public/voice", LESSON);
const CACHE = resolve(ROOT, ".cache/voice");

/** 장면 목록을 순서대로 펼친다. */
const scenes = l01.chapters.flatMap((c) => c.scenes.map((s) => ({ ...s, chapter: c.id })));

/**
 * 한 장면의 음성과 정렬 정보를 받아 캐시에 저장한다.
 * @param {string} text TTS 문장
 * @param {string} prev 앞 장면 문장(억양 연결용)
 * @param {string} next 뒤 장면 문장(억양 연결용)
 * @returns {Promise<{ key: string, alignment: { characters: string[], character_start_times_seconds: number[], character_end_times_seconds: number[] } }>}
 */
async function synth(text, prev, next) {
  const key = hash({ text, v: VOICE.id, m: VOICE.model, s: VOICE.settings });
  const jsonPath = resolve(CACHE, `${key}.json`);
  const mp3Path = resolve(CACHE, `${key}.mp3`);
  if (!force && existsSync(jsonPath) && existsSync(mp3Path)) {
    return { key, alignment: JSON.parse(readFileSync(jsonPath, "utf8")) };
  }
  const body = {
    text,
    model_id: VOICE.model,
    voice_settings: VOICE.settings,
    previous_text: prev || undefined,
    next_text: next || undefined,
  };
  for (let attempt = 1; attempt <= 4; attempt++) {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE.id}/with-timestamps?output_format=mp3_44100_192`,
      { method: "POST", headers: { "xi-api-key": KEY, "Content-Type": "application/json" }, body: JSON.stringify(body) },
    );
    if (res.ok) {
      const d = await res.json();
      writeFile(mp3Path, Buffer.from(d.audio_base64, "base64"));
      writeFile(jsonPath, JSON.stringify(d.alignment));
      return { key, alignment: d.alignment };
    }
    const msg = await res.text();
    log(`  재시도 ${attempt} (${res.status}) ${msg.slice(0, 160)}`);
    if (res.status === 400 && (body.previous_text || body.next_text)) {
      delete body.previous_text;
      delete body.next_text;
    }
    await new Promise((r) => setTimeout(r, 2000 * attempt));
  }
  throw new Error(`TTS 실패: ${text.slice(0, 40)}`);
}

/**
 * 글자 위치의 시작 시각. 공백·문장부호면 다음 글자의 시각을 쓴다.
 * @param {{ character_start_times_seconds: number[], characters: string[] }} a 정렬 정보
 * @param {number} i 글자 위치
 * @returns {number} 초
 */
function startAt(a, i) {
  const n = a.characters.length;
  let k = Math.min(Math.max(0, i), n - 1);
  while (k < n - 1 && /\s/.test(a.characters[k])) k++;
  return a.character_start_times_seconds[k];
}

/**
 * 글자 위치의 끝 시각.
 * @param {{ character_end_times_seconds: number[], characters: string[] }} a 정렬 정보
 * @param {number} i 글자 위치
 * @returns {number} 초
 */
function endAt(a, i) {
  const n = a.characters.length;
  return a.character_end_times_seconds[Math.min(Math.max(0, i), n - 1)];
}

const work = scenes.map((s, i) => ({ s, i })).filter(({ s }) => s.say && (!only || only.includes(s.id)));
log(`음성 생성 ${work.length}장면 · ${VOICE.name} · ${VOICE.model}`);

const parsed = scenes.map((s) => (s.say ? parseSay(s.say) : null));
await pool(work, 4, async ({ s, i }) => {
  const p = parsed[i];
  const prev = parsed[i - 1]?.spoken ?? "";
  const next = parsed[i + 1]?.spoken ?? "";
  const r = await synth(p.spoken, prev.slice(-300), next.slice(0, 300));
  copyFileSync(resolve(CACHE, `${r.key}.mp3`), resolve(OUT, `${s.id}.mp3`));
  log(`  ✓ ${s.id} (${p.spoken.length}자)`);
});

/** 전체 타임라인을 다시 계산한다(캐시된 장면 포함). */
const timeline = { lesson: LESSON, voice: VOICE.name, model: VOICE.model, scenes: [] };
for (let i = 0; i < scenes.length; i++) {
  const s = scenes[i];
  const p = parsed[i];
  if (!p) {
    timeline.scenes.push({ id: s.id, chapter: s.chapter, audio: null, dur: 0, cues: {}, words: [], text: "" });
    continue;
  }
  const key = hash({ text: p.spoken, v: VOICE.id, m: VOICE.model, s: VOICE.settings });
  const jsonPath = resolve(CACHE, `${key}.json`);
  if (!existsSync(jsonPath)) {
    log(`  (음성 없음) ${s.id}`);
    timeline.scenes.push({ id: s.id, chapter: s.chapter, audio: null, dur: 0, cues: {}, words: [], text: p.display, missing: true });
    continue;
  }
  const a = JSON.parse(readFileSync(jsonPath, "utf8"));
  if (a.characters.length !== p.spoken.length) log(`  경고 ${s.id}: 정렬 글자 수 ${a.characters.length} ≠ ${p.spoken.length}`);
  const mp3 = resolve(OUT, `${s.id}.mp3`);
  if (!existsSync(mp3)) copyFileSync(resolve(CACHE, `${key}.mp3`), mp3);
  const dur = mediaDuration(mp3);
  const cues = Object.fromEntries(Object.entries(p.cues).map(([k, idx]) => [k, +startAt(a, idx).toFixed(3)]));
  const words = [];
  const re = /\S+/g;
  let m;
  while ((m = re.exec(p.display))) {
    const a0 = p.displayToSpoken[m.index];
    const a1 = p.displayToSpoken[m.index + m[0].length - 1];
    words.push({ w: m[0], s: +startAt(a, a0).toFixed(3), e: +endAt(a, a1).toFixed(3) });
  }
  timeline.scenes.push({ id: s.id, chapter: s.chapter, audio: `voice/${LESSON}/${s.id}.mp3`, dur: +dur.toFixed(3), cues, words, text: p.display });
}
writeFile(resolve(OUT, "timeline.json"), JSON.stringify(timeline, null, 1));
const total = timeline.scenes.reduce((t, s) => t + s.dur, 0);
log(`타임라인 저장 · 발화 합계 ${(total / 60).toFixed(1)}분`);
