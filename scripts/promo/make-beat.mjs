/**
 * 홍보 영상용 칩튠 비트를 순수 코드로 합성해 mp3로 저장한다. (외부 음원·샘플 없음)
 * 사용법: node scripts/promo/make-beat.mjs <출력 mp3 경로>
 * ffmpeg가 필요하다. 같은 입력이면 항상 같은 소리가 나온다.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { BAR_SECONDS, BEAT_SECONDS, CHORD_BY_BAR, DURATION_SECONDS, TOTAL_BARS, beatTime } from "./beat-grid.mjs";

const SR = 44100;
const TAIL_SECONDS = 2;
const TOTAL_SAMPLES = Math.ceil((DURATION_SECONDS + TAIL_SECONDS) * SR);
const SIXTEENTH = BEAT_SECONDS / 4;
const EIGHTH = BEAT_SECONDS / 2;

const NOTE = {
  A1: 55, F1: 43.65, C2: 65.41, G1: 49,
  F3: 174.61, G3: 196, A3: 220, B3: 246.94,
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392, A4: 440, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.26, F5: 698.46, G5: 783.99, A5: 880, B5: 987.77,
  C6: 1046.5, D6: 1174.66,
};

/** 코드별 베이스 근음, 아르페지오 음, 패드 음. */
const CHORDS = {
  Am: { root: NOTE.A1, arp: [NOTE.A3, NOTE.C4, NOTE.E4, NOTE.A4], pad: [NOTE.A3, NOTE.C4, NOTE.E4] },
  F: { root: NOTE.F1, arp: [NOTE.F3, NOTE.A3, NOTE.C4, NOTE.F4], pad: [NOTE.F3, NOTE.A3, NOTE.C4] },
  C: { root: NOTE.C2, arp: [NOTE.C4, NOTE.E4, NOTE.G4, NOTE.C5], pad: [NOTE.C4, NOTE.E4, NOTE.G4] },
  G: { root: NOTE.G1, arp: [NOTE.G3, NOTE.B3, NOTE.D4, NOTE.G4], pad: [NOTE.G3, NOTE.B3, NOTE.D4] },
};

/** 코드별 멜로디: [8분음표 위치, 음, 길이(8분음표 수)] */
const MELODY = {
  Am: [[0, NOTE.E5, 2], [2, NOTE.D5, 1], [3, NOTE.C5, 1], [4, NOTE.D5, 2], [6, NOTE.E5, 2]],
  F: [[0, NOTE.A5, 2], [2, NOTE.G5, 1], [3, NOTE.F5, 1], [4, NOTE.E5, 2], [6, NOTE.C5, 2]],
  C: [[0, NOTE.E5, 1], [1, NOTE.G5, 1], [2, NOTE.C6, 2], [4, NOTE.B5, 1], [5, NOTE.G5, 1], [6, NOTE.E5, 2]],
  G: [[0, NOTE.D5, 2], [2, NOTE.G5, 2], [4, NOTE.B5, 3], [7, NOTE.D6, 1]],
};

/** 마디 번호별 편성. */
const MELODY_BARS = new Set([4, 5, 6, 7, 8, 9, 10, 11, 13, 14, 15, 16, 17, 18, 19]);
const GROOVE_BARS = new Set([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 14, 15, 16, 17, 18, 19]);
const GAP_START = beatTime(12, 3.5);
const GAP_END = beatTime(13);
const FINAL_HIT = beatTime(19, 2);

/**
 * 같은 값이 나오는 난수 생성기 (mulberry32).
 * @param {number} seed 시작 값
 * @returns {() => number} 0~1 난수 함수
 */
function createRandom(seed) {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const random = createRandom(20260930);

/**
 * 좌우 버퍼 한 쌍을 만든다.
 * @returns {{l: Float32Array, r: Float32Array}} 스테레오 버스
 */
function createBus() {
  return { l: new Float32Array(TOTAL_SAMPLES), r: new Float32Array(TOTAL_SAMPLES) };
}

/**
 * 한 소리를 시작 시각부터 샘플 단위로 그려 버스에 더한다.
 * @param {{l: Float32Array, r: Float32Array}} bus 목적지 버스
 * @param {number} start 시작 시각(초)
 * @param {number} length 길이(초)
 * @param {(t: number) => number} voice 시작 후 경과 시간을 받아 샘플을 돌려주는 함수
 * @param {number} pan -1(왼쪽)~1(오른쪽)
 * @param {(time: number) => number} [gain] 시각별 추가 볼륨 (사이드체인 등)
 */
function play(bus, start, length, voice, pan = 0, gain = () => 1) {
  const from = Math.max(0, Math.floor(start * SR));
  const to = Math.min(TOTAL_SAMPLES, Math.floor((start + length) * SR));
  const left = Math.cos(((pan + 1) * Math.PI) / 4);
  const right = Math.sin(((pan + 1) * Math.PI) / 4);

  for (let i = from; i < to; i += 1) {
    const time = i / SR;
    const sample = voice(time - start) * gain(time);
    bus.l[i] += sample * left;
    bus.r[i] += sample * right;
  }
}

/**
 * 한 극 저역 통과 필터를 만든다.
 * @param {number} cutoff 차단 주파수(Hz)
 * @returns {(x: number, cutoffNow?: number) => number} 필터 함수
 */
function lowpass(cutoff) {
  let y = 0;

  return (x, cutoffNow = cutoff) => {
    y += (1 - Math.exp((-2 * Math.PI * cutoffNow) / SR)) * (x - y);

    return y;
  };
}

/**
 * 지수 감쇠 엔벨로프 (짧은 어택 포함).
 * @param {number} t 경과 시간
 * @param {number} decay 감쇠 속도
 * @param {number} [attack] 어택 시간
 * @returns {number} 0~1
 */
function envelope(t, decay, attack = 0.002) {
  return Math.min(1, t / attack) * Math.exp(-t * decay);
}

/**
 * 킥 드럼: 사인 스윕 + 클릭.
 * @param {{l: Float32Array, r: Float32Array}} bus 드럼 버스
 * @param {number} time 시작 시각
 * @param {number} [level] 세기
 */
function kick(bus, time, level = 1) {
  let phase = 0;
  play(bus, time, 0.5, (t) => {
    phase += (46 + 120 * Math.exp(-t * 30)) / SR;
    const click = t < 0.004 ? (random() * 2 - 1) * 0.35 : 0;

    return (Math.sin(2 * Math.PI * phase) * Math.exp(-t * 8) + click) * 1.05 * level;
  });
}

/**
 * 스네어: 고음 노이즈 + 몸통 톤.
 * @param {{l: Float32Array, r: Float32Array}} bus 드럼 버스
 * @param {number} time 시작 시각
 * @param {number} [level] 세기
 */
function snare(bus, time, level = 1) {
  const smooth = lowpass(2200);
  let phase = 0;
  play(bus, time, 0.3, (t) => {
    const noise = random() * 2 - 1;
    const bright = noise - smooth(noise);
    phase += (210 - 60 * Math.min(1, t * 10)) / SR;

    return (bright * envelope(t, 17) * 0.75 + Math.sin(2 * Math.PI * phase) * envelope(t, 26) * 0.45) * level;
  }, 0.05);
}

/**
 * 박수 소리: 짧은 노이즈 세 번.
 * @param {{l: Float32Array, r: Float32Array}} bus 드럼 버스
 * @param {number} time 시작 시각
 * @param {number} [level] 세기
 */
function clap(bus, time, level = 1) {
  const smooth = lowpass(1500);
  play(bus, time, 0.28, (t) => {
    const burst = t < 0.03 ? envelope(t % 0.011, 300, 0.0005) : envelope(t - 0.03, 20);
    const noise = random() * 2 - 1;

    return (noise - smooth(noise)) * burst * 0.5 * level;
  }, -0.08);
}

/**
 * 하이햇.
 * @param {{l: Float32Array, r: Float32Array}} bus 드럼 버스
 * @param {number} time 시작 시각
 * @param {boolean} open 열린 소리인지
 * @param {number} [level] 세기
 * @param {number} [pan] 좌우 위치
 */
function hat(bus, time, open, level = 1, pan = 0.3) {
  const smooth = lowpass(6500);
  play(bus, time, open ? 0.3 : 0.08, (t) => {
    const noise = random() * 2 - 1;

    return (noise - smooth(noise)) * envelope(t, open ? 14 : 70, 0.001) * 0.32 * level;
  }, pan);
}

/**
 * 크래시 심벌.
 * @param {{l: Float32Array, r: Float32Array}} bus 드럼 버스
 * @param {number} time 시작 시각
 * @param {number} [length] 울림 길이
 */
function crash(bus, time, length = 1.8) {
  const smooth = lowpass(3500);
  play(bus, time, length, (t) => {
    const noise = random() * 2 - 1;

    return (noise - smooth(noise)) * envelope(t, 2.6, 0.002) * 0.45;
  }, 0);
}

/**
 * 올라가는 소리(라이저): 노이즈 필터가 점점 열리고 커진다.
 * @param {{l: Float32Array, r: Float32Array}} bus 라이저 버스
 * @param {number} start 시작 시각
 * @param {number} end 끝 시각
 */
function riser(bus, start, end) {
  const filter = lowpass(300);
  const span = end - start;
  play(bus, start, span, (t) => {
    const progress = t / span;
    const noise = random() * 2 - 1;

    return filter(noise, 300 + 9000 * progress * progress) * (0.06 + 0.55 * progress * progress);
  }, 0);
}

/**
 * 스네어 롤: 박자가 점점 촘촘해지고 커진다.
 * @param {{l: Float32Array, r: Float32Array}} bus 드럼 버스
 * @param {number} start 시작 시각
 * @param {number} end 끝 시각
 */
function snareRoll(bus, start, end) {
  const span = end - start;
  let cursor = start;
  while (cursor < end - 0.001) {
    const progress = (cursor - start) / span;
    snare(bus, cursor, 0.35 + 0.65 * progress);
    cursor += progress < 0.5 ? EIGHTH : SIXTEENTH;
  }
}

/**
 * 킥이 울릴 때마다 볼륨이 눌렸다 올라오는 효과 (사이드체인 느낌).
 * @param {number} time 절대 시각
 * @returns {number} 0.25~1 배율
 */
function pump(time) {
  const kicking = time >= beatTime(2) && time < FINAL_HIT && !(time >= beatTime(12) && time < GAP_END);
  if (!kicking) {
    return 1;
  }
  const sincePulse = (time - beatTime(2)) % BEAT_SECONDS;

  return 1 - 0.72 * Math.exp(-sincePulse / 0.11);
}

/**
 * 갑자기 조용해지는 구간(드롭 직전 정적)에 속하는지.
 * @param {number} time 시각
 * @returns {boolean} 정적 구간이면 true
 */
function inGap(time) {
  return time >= GAP_START && time < GAP_END;
}

/**
 * 베이스 한 음: 톱니파 + 서브 사인, 저역 통과.
 * @param {{l: Float32Array, r: Float32Array}} bus 베이스 버스
 * @param {number} time 시작 시각
 * @param {number} freq 주파수
 * @param {number} length 길이
 */
function bass(bus, time, freq, length) {
  const smooth = lowpass(700);
  let saw = 0;
  let sub = 0;
  play(bus, time, length, (t) => {
    saw = (saw + freq / SR) % 1;
    sub += freq / SR;
    const tone = (saw * 2 - 1) * 0.5 + Math.sin(2 * Math.PI * sub) * 0.7;

    return smooth(tone, 500 + 900 * Math.exp(-t * 14)) * envelope(t, 3.5, 0.004) * 0.55;
  }, 0, pump);
}

/**
 * 펄스파 한 음 (아르페지오/멜로디용).
 * @param {{l: Float32Array, r: Float32Array}} bus 목적지 버스
 * @param {number} time 시작 시각
 * @param {number} freq 주파수
 * @param {number} length 길이
 * @param {object} options 옵션
 * @param {number} options.duty 펄스 폭 (0.125~0.5)
 * @param {number} options.decay 감쇠 속도
 * @param {number} options.level 볼륨
 * @param {number} options.pan 좌우 위치
 * @param {number} [options.vibrato] 비브라토 깊이
 * @param {(time: number) => number} [options.cutoff] 시각별 저역 통과 차단 주파수
 * @param {boolean} [options.pumped] 사이드체인 적용 여부
 */
function pulseNote(bus, time, freq, length, options) {
  const { duty, decay, level, pan, vibrato = 0, cutoff, pumped = false } = options;
  const smooth = lowpass(9000);
  let phase = 0;
  play(bus, time, length, (t) => {
    const bend = 1 + vibrato * Math.sin(2 * Math.PI * 5.5 * Math.max(0, t - 0.08));
    phase = (phase + (freq * bend) / SR) % 1;
    const raw = (phase < duty ? 1 : -1) * envelope(t, decay, 0.003) * level;

    return cutoff ? smooth(raw, cutoff(time + t)) : raw;
  }, pan, pumped ? pump : undefined);
}

/**
 * 패드: 살짝 어긋난 톱니파 세 겹을 길게 깐다.
 * @param {{l: Float32Array, r: Float32Array}} bus 패드 버스
 * @param {number} time 시작 시각
 * @param {number[]} freqs 코드 음들
 * @param {number} length 길이
 * @param {number} level 볼륨
 */
function pad(bus, time, freqs, length, level) {
  freqs.forEach((freq, index) => {
    const smooth = lowpass(1400);
    const phases = [0, 0.33, 0.66];
    const detunes = [0.996, 1, 1.004];
    play(bus, time, length, (t) => {
      const mix = phases.reduce((sum, _p, i) => {
        phases[i] = (phases[i] + (freq * detunes[i]) / SR) % 1;

        return sum + (phases[i] * 2 - 1);
      }, 0) / 3;
      const swell = Math.min(1, t / 0.25) * Math.min(1, (length - t) / 0.35);

      return smooth(mix) * swell * level;
    }, (index - 1) * 0.5, pump);
  });
}

/**
 * 좌우로 튕기는 딜레이 (점 8분음표).
 * @param {{l: Float32Array, r: Float32Array}} bus 처리할 버스 (제자리 수정)
 * @param {number} seconds 딜레이 시간
 * @param {number} feedback 되먹임 (0~1)
 */
function pingPong(bus, seconds, feedback) {
  const delay = Math.round(seconds * SR);
  for (let i = delay; i < TOTAL_SAMPLES; i += 1) {
    bus.l[i] += bus.r[i - delay] * feedback;
    bus.r[i] += bus.l[i - delay] * feedback;
  }
}

const drums = createBus();
const lows = createBus();
const arps = createBus();
const leads = createBus();
const pads = createBus();
const fx = createBus();

/**
 * 마디마다 편성표대로 악기를 배치한다.
 */
function arrange() {
  for (let bar = 0; bar < TOTAL_BARS; bar += 1) {
    const chord = CHORDS[CHORD_BY_BAR[bar]];
    const barStart = beatTime(bar);
    const grooving = GROOVE_BARS.has(bar);
    const beforeFinal = (time) => time < FINAL_HIT - 0.001;

    // 패드: 인트로·전 구간 깔기 (정적 구간과 마지막 타격 뒤는 제외)
    const padLength = bar === 12 ? BAR_SECONDS - 0.5 : BAR_SECONDS + 0.05;
    pad(pads, barStart, chord.pad, padLength, bar < 2 ? 0.1 : 0.085);

    // 아르페지오 16분음표
    const arpPattern = [0, 1, 2, 3, 2, 1, 2, 3, 0, 1, 2, 3, 2, 1, 3, 2];
    for (let step = 0; step < 16; step += 1) {
      const time = barStart + step * SIXTEENTH;
      if (inGap(time) || !beforeFinal(time)) {
        continue;
      }
      const intro = bar < 2;
      pulseNote(arps, time, chord.arp[arpPattern[step]] * (step % 8 === 7 ? 2 : 1), SIXTEENTH * 1.6, {
        duty: 0.25,
        decay: 16,
        level: intro ? 0.17 : 0.2,
        pan: step % 2 === 0 ? -0.35 : 0.35,
        pumped: true,
        cutoff: intro ? (at) => 380 + 7000 * Math.min(1, at / beatTime(2)) ** 2 : undefined,
      });
    }

    // 킥·스네어·하이햇
    if (bar === 0) {
      kick(drums, barStart, 1);
    }
    if (grooving) {
      for (let beat = 0; beat < 4; beat += 1) {
        const time = barStart + beat * BEAT_SECONDS;
        if (time >= FINAL_HIT - 0.001) {
          continue;
        }
        kick(drums, time, beat === 0 ? 1.08 : 1);
        if (beat % 2 === 1) {
          snare(drums, time, 0.9);
          if (bar >= 8) {
            clap(drums, time, 0.75);
          }
        }
      }
      const fast = bar >= 4;
      for (let step = 0; step < (fast ? 16 : 8); step += 1) {
        const time = barStart + step * (fast ? SIXTEENTH : EIGHTH);
        if (time >= FINAL_HIT - 0.001) {
          break;
        }
        const offBeat = fast ? step % 4 === 2 : step % 2 === 1;
        hat(drums, time, offBeat, offBeat ? 0.95 : 0.55, step % 2 === 0 ? -0.3 : 0.3);
      }
    }

    // 베이스 8분음표
    if (grooving) {
      const rhythm = [1, 1, 2, 1, 1, 2, 1, 2];
      for (let step = 0; step < 8; step += 1) {
        const time = barStart + step * EIGHTH;
        if (!beforeFinal(time)) {
          continue;
        }
        bass(lows, time, chord.root * rhythm[step], EIGHTH * 0.92);
      }
    }

    // 멜로디 (콘솔 게임 주제곡 느낌)
    if (MELODY_BARS.has(bar)) {
      MELODY[CHORD_BY_BAR[bar]].forEach(([slot, freq, units]) => {
        const time = barStart + slot * EIGHTH;
        if (!beforeFinal(time)) {
          return;
        }
        const options = { duty: 0.5, decay: 2.6, level: 0.24, pan: 0.05, vibrato: 0.004 };
        pulseNote(leads, time, freq, units * EIGHTH * 0.98, options);
        if (bar >= 8) {
          pulseNote(leads, time, freq / 2, units * EIGHTH * 0.98, { ...options, duty: 0.25, level: 0.13, pan: -0.1 });
        }
      });
    }
  }

  // 전환 효과
  riser(fx, beatTime(1), beatTime(2));
  riser(fx, beatTime(12), GAP_END);
  snareRoll(drums, beatTime(1, 2), beatTime(2));
  snareRoll(drums, beatTime(12), GAP_START);
  for (let step = 0; step < 4; step += 1) {
    snare(drums, beatTime(11, 3) + step * SIXTEENTH, 0.6 + step * 0.12);
  }
  for (let step = 0; step < 8; step += 1) {
    snare(drums, beatTime(17, 3) + step * (SIXTEENTH / 2), 0.5 + step * 0.07);
  }

  // 크래시
  [beatTime(2), beatTime(4), beatTime(8), beatTime(13), beatTime(16), beatTime(18)].forEach((time) => crash(drums, time, 1.6));
  crash(drums, FINAL_HIT, 2.2);
  kick(drums, FINAL_HIT, 1.2);

  // 마지막 한 방: 화음을 한꺼번에
  [NOTE.A3, NOTE.C4, NOTE.E4, NOTE.A4, NOTE.C5, NOTE.E5, NOTE.A5].forEach((freq, index) => {
    pulseNote(leads, FINAL_HIT, freq, 1.4, { duty: index % 2 ? 0.25 : 0.5, decay: 2.4, level: 0.13, pan: (index - 3) * 0.16 });
  });
  bass(lows, FINAL_HIT, NOTE.A1, 1.4);
  bass(lows, FINAL_HIT, NOTE.A1 * 2, 1.4);
}

arrange();
pingPong(arps, EIGHTH * 1.5, 0.38);
pingPong(leads, EIGHTH * 1.5, 0.22);

/**
 * 버스들을 섞고 마스터 처리(소프트 클리핑, 정규화, 끝 페이드)를 해 16비트 PCM으로 돌려준다.
 * @returns {Int16Array} 좌우가 번갈아 담긴 PCM
 */
function mixdown() {
  const mix = { l: new Float32Array(TOTAL_SAMPLES), r: new Float32Array(TOTAL_SAMPLES) };
  const levels = [[drums, 0.9], [lows, 0.85], [arps, 0.9], [leads, 0.9], [pads, 0.95], [fx, 0.5]];
  let peak = 0;
  for (let i = 0; i < TOTAL_SAMPLES; i += 1) {
    const time = i / SR;
    const mute = inGap(time) ? 0.0 : 1;
    let l = 0;
    let r = 0;
    levels.forEach(([bus, level]) => {
      const gate = bus === fx ? 1 : mute;
      l += bus.l[i] * level * gate;
      r += bus.r[i] * level * gate;
    });
    l = Math.tanh(l * 1.35);
    r = Math.tanh(r * 1.35);
    mix.l[i] = l;
    mix.r[i] = r;
    peak = Math.max(peak, Math.abs(l), Math.abs(r));
  }

  const pcm = new Int16Array(TOTAL_SAMPLES * 2);
  const scale = 0.5 / peak;
  const fadeStart = DURATION_SECONDS + TAIL_SECONDS - 0.4;
  for (let i = 0; i < TOTAL_SAMPLES; i += 1) {
    const time = i / SR;
    const fade = time > fadeStart ? Math.max(0, 1 - (time - fadeStart) / 0.4) : 1;
    pcm[i * 2] = Math.round(mix.l[i] * scale * fade * 32767);
    pcm[i * 2 + 1] = Math.round(mix.r[i] * scale * fade * 32767);
  }

  return pcm;
}

/**
 * 16비트 스테레오 PCM을 WAV 파일 바이트로 감싼다.
 * @param {Int16Array} pcm 좌우 번갈아 담긴 PCM
 * @returns {Buffer} WAV 바이트
 */
function toWav(pcm) {
  const data = Buffer.from(pcm.buffer, pcm.byteOffset, pcm.byteLength);
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVEfmt ", 8);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(2, 22);
  header.writeUInt32LE(SR, 24);
  header.writeUInt32LE(SR * 4, 28);
  header.writeUInt16LE(4, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(data.length, 40);

  return Buffer.concat([header, data]);
}

/**
 * 진입점: 합성 → WAV → mp3.
 */
function main() {
  const output = process.argv[2];
  if (!output) {
    throw new Error("사용법: node scripts/promo/make-beat.mjs <출력 mp3 경로>");
  }

  const workDir = mkdtempSync(path.join(tmpdir(), "promo-beat-"));
  const wavPath = path.join(workDir, "beat.wav");
  try {
    writeFileSync(wavPath, toWav(mixdown()));
    mkdirSync(path.dirname(path.resolve(output)), { recursive: true });
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", wavPath, "-c:a", "libmp3lame", "-b:a", "160k", output]);
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
}

main();
