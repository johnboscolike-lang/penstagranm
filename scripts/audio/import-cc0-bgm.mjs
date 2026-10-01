/**
 * OpenGameArt의 CC0 배경 음악 3곡(배틀·보스·미니게임)을 받아 둔 원본 WAV에서 게임용 mp3로 바꾼다.
 * 사용법: node scripts/audio/import-cc0-bgm.mjs <원본 폴더> [출력 폴더(기본 public/game/bgm)] [곡 이름...]
 *   원본 폴더 안에 TRACKS 표의 `source` 경로(예: x_glizzy/Grizzly Dwarf Battle LOOP.wav)가 있어야 한다.
 * 변환 방식(make-bgm.mjs와 같은 ffmpeg/libmp3lame 계열):
 *   1. loudnorm 1패스로 원본의 통합 음량·트루피크를 잰다.
 *   2. loudnorm 2패스를 linear=true로 걸어 -19 LUFS / -2 dBTP 목표에 맞춘다.
 *      linear 모드는 파일 전체에 같은 이득만 곱하므로 앞뒤를 자르거나 페이드를 넣지 않는다(반복 이음새 보존).
 *      선형으로 맞출 수 없어 dynamic으로 바뀌면 이음새가 달라질 수 있어 오류로 멈춘다.
 *   3. 96 kbps 스테레오 44.1 kHz mp3로 저장한다. 태그는 지우고(-map_metadata -1, bitexact, ID3v2 헤더 없음),
 *      LAME 헤더(Info)는 남겨 브라우저가 인코더 지연을 보정(gapless)하게 한다.
 * ffmpeg가 필요하다. 라이선스: 모두 CC0 — 출처는 public/game/CREDITS.md에 남긴다.
 */
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

/** 변환 목표값. 앱의 BGM 기준은 통합 -19 LUFS 안팎이다. */
export const TARGET = {
  lufs: -19,
  truePeak: -2,
  lra: 11,
  bitrate: "96k",
  sampleRate: 44100,
  channels: 2,
};

/** 반복 이음새를 볼 때 쓰는 창 길이(초) */
export const SEAM_WINDOW_SECONDS = 0.05;

/** 이음새 앞뒤 소리 크기 차이가 이 값(dB)을 넘으면 끊김으로 본다. */
export const SEAM_MAX_JUMP_DB = 6;

/**
 * 게임 안 곡 이름 → 원본 파일(원본 폴더 기준 경로)과 출처.
 * `source`는 OpenGameArt에서 받은 압축 파일을 풀었을 때의 경로다.
 */
export const TRACKS = [
  {
    name: "battle",
    source: "x_glizzy/Grizzly Dwarf Battle LOOP.wav",
    title: "Grizzly Dwarf Battle (LOOP)",
    author: "Zane Little",
    license: "CC0",
    page: "https://opengameart.org/content/glizzy-elf-forest-rpg-music-pack",
    use: "대결(아레나) 전투 음악",
  },
  {
    name: "boss",
    source: "epic_boss.wav",
    title: "Epic Boss Battle [Seamlessly Looping]",
    author: "Juhani Junkala",
    license: "CC0",
    page: "https://opengameart.org/content/boss-battle-music",
    use: "주간 학급 보스 음악",
  },
  {
    name: "play",
    source: "x_chip5_action/Juhani Junkala [Retro Game Music Pack] Level 1.wav",
    title: "Level 1 (Retro Game Music Pack)",
    author: "Juhani Junkala",
    license: "CC0",
    page: "https://opengameart.org/content/5-chiptunes-action",
    use: "빠른 미니게임 음악",
  },
];

/**
 * loudnorm 필터 인자 문자열의 공통 목표 부분을 만든다.
 * @returns {string} 예: "I=-19:TP=-2:LRA=11"
 */
export function targetFilter() {
  return `I=${TARGET.lufs}:TP=${TARGET.truePeak}:LRA=${TARGET.lra}`;
}

/**
 * ffmpeg 출력(stderr)에서 loudnorm이 찍은 JSON 요약을 꺼낸다.
 * @param {string} stderr ffmpeg 표준 오류 출력
 * @returns {Record<string, string>} input_i, input_tp, input_lra, input_thresh, normalization_type, target_offset 등
 */
export function parseLoudnormJson(stderr) {
  const matches = String(stderr).match(/\{[^{}]*"input_i"[^{}]*\}/g);
  if (!matches) {
    throw new Error("loudnorm 결과(JSON)를 찾지 못했다.");
  }

  return JSON.parse(matches[matches.length - 1]);
}

/**
 * 1패스(측정) ffmpeg 인자를 만든다.
 * @param {string} input 원본 WAV
 * @returns {string[]} ffmpeg 인자
 */
export function buildMeasureArgs(input) {
  return ["-hide_banner", "-nostats", "-i", input, "-af", `loudnorm=${targetFilter()}:print_format=json`, "-f", "null", "-"];
}

/**
 * 2패스(선형 보정 + mp3 인코딩) ffmpeg 인자를 만든다.
 * @param {string} input 원본 WAV
 * @param {string} output 저장할 mp3 경로
 * @param {Record<string, string>} measured 1패스 결과
 * @returns {string[]} ffmpeg 인자
 */
export function buildEncodeArgs(input, output, measured) {
  const filter = [
    `loudnorm=${targetFilter()}`,
    `measured_I=${measured.input_i}`,
    `measured_TP=${measured.input_tp}`,
    `measured_LRA=${measured.input_lra}`,
    `measured_thresh=${measured.input_thresh}`,
    `offset=${measured.target_offset}`,
    "linear=true",
    "print_format=json",
  ].join(":");

  return [
    "-hide_banner", "-nostats", "-y", "-i", input, "-vn",
    "-af", filter,
    "-map_metadata", "-1", "-fflags", "+bitexact", "-id3v2_version", "0",
    "-c:a", "libmp3lame", "-b:a", TARGET.bitrate,
    "-ar", String(TARGET.sampleRate), "-ac", String(TARGET.channels),
    output,
  ];
}

/**
 * ffmpeg를 실행하고 실패하면 오류를 던진다.
 * @param {string[]} args ffmpeg 인자
 * @returns {string} 표준 오류 출력(필터가 찍은 정보가 담겨 있다)
 */
function runFfmpeg(args) {
  const result = spawnSync("ffmpeg", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (result.error || result.status !== 0) {
    throw new Error(`ffmpeg 실패: ${result.error?.message ?? result.stderr}`);
  }

  return String(result.stderr);
}

/**
 * 곡 하나를 변환한다(측정 → 선형 보정 → mp3).
 * @param {string} input 원본 WAV
 * @param {string} output 저장할 mp3 경로
 * @returns {{measured: Record<string, string>, applied: Record<string, string>}} 원본 측정값과 2패스 결과
 */
export function convertTrack(input, output) {
  const measured = parseLoudnormJson(runFfmpeg(buildMeasureArgs(input)));
  const applied = parseLoudnormJson(runFfmpeg(buildEncodeArgs(input, output, measured)));
  if (applied.normalization_type !== "linear") {
    throw new Error(`${path.basename(input)}: linear 보정이 불가능해 dynamic으로 바뀌었다. 반복 이음새가 달라질 수 있어 중단한다.`);
  }

  return { measured, applied };
}

/**
 * 파일을 스테레오 float PCM(44.1 kHz)으로 풀어 읽는다. mp3는 인코더 지연이 보정된 채로 풀린다.
 * @param {string} file 소리 파일
 * @returns {Float32Array} 좌우가 번갈아 놓인 샘플
 */
export function decodePcm(file) {
  const result = spawnSync(
    "ffmpeg",
    ["-v", "error", "-i", file, "-f", "f32le", "-ac", "2", "-ar", String(TARGET.sampleRate), "-"],
    { maxBuffer: 1024 * 1024 * 1024 },
  );
  if (result.error || result.status !== 0) {
    throw new Error(`디코딩 실패: ${result.error?.message ?? result.stderr}`);
  }
  const bytes = result.stdout;

  return new Float32Array(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
}

/**
 * 구간의 RMS를 dBFS로 구한다.
 * @param {Float32Array} pcm 좌우가 번갈아 놓인 샘플
 * @param {number} startFrame 시작 프레임
 * @param {number} frames 프레임 수
 * @returns {number} dBFS (무음이면 -120)
 */
export function rmsDb(pcm, startFrame, frames) {
  let sum = 0;
  for (let i = startFrame * 2; i < (startFrame + frames) * 2; i += 1) {
    sum += pcm[i] * pcm[i];
  }
  const rms = Math.sqrt(sum / (frames * 2));

  return rms > 0 ? 20 * Math.log10(rms) : -120;
}

/**
 * 반복 이음새(끝 50 ms → 처음 50 ms)의 소리 크기 차이를 잰다.
 * @param {Float32Array} pcm 좌우가 번갈아 놓인 샘플
 * @returns {{headDb: number, tailDb: number, jumpDb: number, frames: number, seconds: number}} 처음·끝 RMS(dBFS), 차이의 절댓값, 프레임 수, 길이(초)
 */
export function measureSeam(pcm) {
  const total = Math.floor(pcm.length / 2);
  const window = Math.round(TARGET.sampleRate * SEAM_WINDOW_SECONDS);
  const headDb = rmsDb(pcm, 0, window);
  const tailDb = rmsDb(pcm, total - window, window);

  return { headDb, tailDb, jumpDb: Math.abs(tailDb - headDb), frames: total, seconds: total / TARGET.sampleRate };
}

/**
 * 완성한 파일의 통합 음량(LUFS)과 트루피크(dBTP)를 ebur128로 잰다.
 * @param {string} file 소리 파일
 * @returns {{integrated: number, truePeak: number}} LUFS, dBTP
 */
export function measureEbur128(file) {
  const stderr = runFfmpeg(["-hide_banner", "-nostats", "-i", file, "-af", "ebur128=peak=true", "-f", "null", "-"]);
  const summary = stderr.split("Summary:")[1] ?? "";
  const integrated = summary.match(/I:\s+(-?[\d.]+) LUFS/)?.[1];
  const truePeak = summary.match(/True peak:[\s\S]*?Peak:\s+(-?[\d.]+) dBFS/)?.[1];
  if (integrated === undefined || truePeak === undefined) {
    throw new Error(`${path.basename(file)}: ebur128 요약을 읽지 못했다.`);
  }

  return { integrated: Number(integrated), truePeak: Number(truePeak) };
}

/**
 * 진입점: 표에 있는 곡을 변환해 출력 폴더에 저장하고 한 줄 요약을 찍는다.
 */
function main() {
  const sourceDir = process.argv[2];
  if (!sourceDir) {
    throw new Error("사용법: node scripts/audio/import-cc0-bgm.mjs <원본 폴더> [출력 폴더] [곡 이름...]");
  }
  const outDir = path.resolve(process.argv[3] ?? "public/game/bgm");
  const only = process.argv.slice(4);
  mkdirSync(outDir, { recursive: true });
  const work = mkdtempSync(path.join(tmpdir(), "cc0-bgm-"));
  try {
    for (const track of TRACKS) {
      if (only.length > 0 && !only.includes(track.name)) continue;
      const input = path.resolve(sourceDir, track.source);
      if (!existsSync(input)) {
        process.stderr.write(`건너뜀: ${track.name} — 원본이 없다 (${input})\n`);
        continue;
      }
      const staged = path.join(work, `${track.name}.mp3`);
      convertTrack(input, staged);
      const output = path.join(outDir, `${track.name}.mp3`);
      copyFileSync(staged, output);
      const { integrated, truePeak } = measureEbur128(output);
      const seam = measureSeam(decodePcm(output));
      const drift = seam.frames - measureSeam(decodePcm(input)).frames;
      const flags = `${seam.jumpDb > SEAM_MAX_JUMP_DB ? " 경고: 이음새 차이가 크다" : ""}${drift === 0 ? "" : ` 참고: 원본보다 ${drift} 샘플 ${drift > 0 ? "길다" : "짧다"}`}`;
      process.stdout.write(
        `${track.name}.mp3  ${(statSync(output).size / 1024).toFixed(0)} KB  ${seam.seconds.toFixed(2)} s  ${integrated.toFixed(1)} LUFS  ${truePeak.toFixed(1)} dBTP  이음새 ${seam.jumpDb.toFixed(2)} dB${flags}\n`,
      );
    }
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
