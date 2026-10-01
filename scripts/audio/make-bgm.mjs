/**
 * 공간별 배경 음악(반복 재생용 mp3)을 코드로 합성한다. 외부 음원·샘플을 쓰지 않는다.
 * 사용법: node scripts/audio/make-bgm.mjs [출력 폴더(기본 public/game/bgm)] [곡 이름...]
 * ffmpeg가 필요하다. 같은 악보면 항상 같은 소리가 나온다.
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { SAMPLE_RATE, createBench, createInstruments, midiToFreq, noteToMidi, pingPong, toWav } from "./synth.mjs";
import { BASS_ROOT, CHORD_TABLE, TRACKS, parseMelodyBar } from "./tracks.mjs";

const TARGET_LUFS = -19;

/**
 * 곡 하나를 스테레오 PCM(16비트)으로 합성한다.
 * @param {(typeof TRACKS)[number]} track 악보
 * @returns {{pcm: Int16Array, seconds: number}} 반복 한 바퀴의 소리
 */
export function renderTrack(track) {
  const beat = 60 / track.bpm;
  const bar = beat * 4;
  const eighth = beat / 2;
  const sixteenth = beat / 4;
  const bars = track.chords.length;
  const total = Math.round(bars * bar * SAMPLE_RATE);
  const bench = createBench(total, 7 + track.bpm);
  const inst = createInstruments(bench);
  const drums = bench.createBus();
  const lows = bench.createBus();
  const comp = bench.createBus();
  const lead = bench.createBus();
  const pads = bench.createBus();
  const levels = track.drumLevels;

  /**
   * 홀수 번째 칸을 살짝 늦춰 흔들리는 느낌(스윙)을 준다.
   * @param {number} slot 칸 번호
   * @param {number} unit 한 칸의 길이(초)
   * @returns {number} 늦춤(초)
   */
  const swing = (slot, unit) => (slot % 2 === 1 ? track.swing * unit : 0);

  track.chords.forEach((chordName, barIndex) => {
    const start = barIndex * bar;
    const tones = CHORD_TABLE[chordName].map((name) => midiToFreq(noteToMidi(name)));
    const root = midiToFreq(noteToMidi(BASS_ROOT[chordName]));

    // 패드
    if (track.pad > 0) {
      inst.pad(pads, start, tones.slice(0, 3), bar + 0.05, track.pad);
    }

    // 드럼: [킥, 스네어, 하이햇, (마디 4번째마다 쓰는 킥 변형)]
    if (track.drums.length >= 3) {
      const kickLayer = track.drums.length > 3 && barIndex % 4 === 3 ? track.drums[3] : track.drums[0];
      for (let step = 0; step < 16; step += 1) {
        const time = start + step * sixteenth + swing(step, sixteenth);
        if (kickLayer[step] === "x") inst.kick(drums, time, levels.kick);
        if (track.drums[1][step] === "s") inst.snare(drums, time, levels.snare);
        const hatChar = track.drums[2][step];
        if (hatChar === "h" || hatChar === "o") inst.hat(drums, time, hatChar === "o", levels.hat, step % 2 ? 0.3 : -0.3);
      }
    }

    // 베이스
    for (let slot = 0; slot < 8; slot += 1) {
      const kind = track.bassPattern[slot];
      if (kind === "." || kind === undefined) continue;
      const freq = kind === "5" ? root * 1.5 : kind === "8" ? root * 2 : root;
      inst.bass(lows, start + slot * eighth + swing(slot, eighth), freq, eighth * 0.9, { saw: Boolean(track.sawBass), level: 0.9 });
    }

    // 반주(플럭·종)
    const compSteps = track.compPattern.length;
    const compUnit = bar / compSteps;
    for (let step = 0; step < compSteps; step += 1) {
      const pick = track.compPattern[step];
      if (pick === ".") continue;
      const freq = tones[Number(pick) % tones.length];
      const time = start + step * compUnit + swing(step, compUnit);
      if (track.comp.kind === "bell") {
        inst.bell(comp, time, freq, 1.4, { level: track.comp.level, pan: step % 2 ? 0.3 : -0.3, decay: track.comp.decay });
      } else {
        inst.pulse(comp, time, freq, compUnit * 1.6, { duty: track.comp.duty, decay: track.comp.decay, level: track.comp.level, pan: step % 2 ? 0.35 : -0.35 });
      }
    }

    // 멜로디
    let slot = 0;
    parseMelodyBar(track.melody[barIndex]).forEach(({ note, units }) => {
      if (note) {
        const freq = midiToFreq(noteToMidi(note));
        const time = start + slot * eighth + swing(slot, eighth);
        if (track.lead.kind === "bell") {
          inst.bell(lead, time, freq, Math.max(units * eighth, 0.9), { level: track.lead.level, decay: track.lead.decay });
        } else {
          inst.pulse(lead, time, freq, units * eighth * 0.96, { duty: track.lead.duty, decay: track.lead.decay, level: track.lead.level, vibrato: track.lead.vibrato ?? 0 });
        }
      }
      slot += units;
    });
  });

  pingPong(lead, beat * 0.75, 0.28);
  pingPong(comp, beat * 0.75, 0.22);

  const mix = [[drums, 0.9], [lows, 0.85], [comp, 0.75], [lead, 0.9], [pads, 0.8]];
  const left = new Float32Array(total);
  const right = new Float32Array(total);
  let peak = 0;
  for (let i = 0; i < total; i += 1) {
    let l = 0;
    let r = 0;
    mix.forEach(([bus, level]) => {
      l += bus.l[i] * level;
      r += bus.r[i] * level;
    });
    left[i] = Math.tanh(l * 1.2);
    right[i] = Math.tanh(r * 1.2);
    peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
  }
  const pcm = new Int16Array(total * 2);
  const scale = 0.7 / peak;
  for (let i = 0; i < total; i += 1) {
    pcm[i * 2] = Math.round(left[i] * scale * 32767);
    pcm[i * 2 + 1] = Math.round(right[i] * scale * 32767);
  }

  return { pcm, seconds: total / SAMPLE_RATE };
}

/**
 * WAV의 통합 음량(LUFS)을 잰다.
 * @param {string} wavPath WAV 경로
 * @returns {number} LUFS
 */
function measureLufs(wavPath) {
  const result = spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-i", wavPath, "-af", "ebur128=peak=true", "-f", "null", "-"], { encoding: "utf8" });
  const summary = String(result.stderr).split("Summary:")[1] ?? "";
  const value = summary.match(/I:\s+(-?[\d.]+) LUFS/)?.[1];

  return value ? Number(value) : TARGET_LUFS;
}

/**
 * 진입점: 곡을 합성해 음량을 맞춘 mp3로 저장한다.
 */
function main() {
  const outDir = path.resolve(process.argv[2] ?? "public/game/bgm");
  const only = process.argv.slice(3);
  mkdirSync(outDir, { recursive: true });
  const work = mkdtempSync(path.join(tmpdir(), "bgm-"));
  try {
    TRACKS.filter((track) => only.length === 0 || only.includes(track.name)).forEach((track) => {
      const { pcm } = renderTrack(track);
      const wav = path.join(work, `${track.name}.wav`);
      writeFileSync(wav, toWav(pcm));
      const gain = TARGET_LUFS - measureLufs(wav);
      const out = path.join(outDir, `${track.name}.mp3`);
      const encoded = spawnSync("ffmpeg", ["-y", "-loglevel", "error", "-i", wav, "-af", `volume=${gain.toFixed(2)}dB,alimiter=limit=0.85`, "-b:a", "80k", out], { encoding: "utf8" });
      if (encoded.status !== 0) {
        throw new Error(`${track.name} 인코딩 실패: ${encoded.stderr}`);
      }
    });
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
