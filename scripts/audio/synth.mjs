/**
 * 배경 음악용 작은 합성기. 외부 음원 없이 파형을 직접 계산한다.
 * 소리는 마디 길이 안에서 끝점을 감아(wrap) 쓰기 때문에, 결과물을 반복 재생해도 끊기지 않는다.
 */

export const SAMPLE_RATE = 44100;

const NOTE_INDEX = { C: 0, "C#": 1, D: 2, "D#": 3, E: 4, F: 5, "F#": 6, G: 7, "G#": 8, A: 9, "A#": 10, B: 11 };

/**
 * "C5", "F#4" 같은 음 이름을 MIDI 번호로 바꾼다.
 * @param {string} name 음 이름
 * @returns {number} MIDI 번호 (C4 = 60)
 */
export function noteToMidi(name) {
  const match = /^([A-G]#?)(-?\d)$/.exec(name);
  if (!match) {
    throw new Error(`알 수 없는 음 이름: ${name}`);
  }

  return NOTE_INDEX[match[1]] + (Number(match[2]) + 1) * 12;
}

/**
 * MIDI 번호를 주파수(Hz)로 바꾼다.
 * @param {number} midi MIDI 번호
 * @returns {number} 주파수
 */
export function midiToFreq(midi) {
  return 440 * 2 ** ((midi - 69) / 12);
}

/**
 * 같은 값이 나오는 난수 생성기 (mulberry32).
 * @param {number} seed 시작 값
 * @returns {() => number} 0~1 난수 함수
 */
export function createRandom(seed) {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 한 극 저역 통과 필터.
 * @param {number} cutoff 차단 주파수(Hz)
 * @returns {(x: number, cutoffNow?: number) => number} 필터 함수
 */
export function lowpass(cutoff) {
  let y = 0;

  return (x, cutoffNow = cutoff) => {
    y += (1 - Math.exp((-2 * Math.PI * cutoffNow) / SAMPLE_RATE)) * (x - y);

    return y;
  };
}

/**
 * 짧은 어택이 있는 지수 감쇠 엔벨로프.
 * @param {number} t 경과 시간(초)
 * @param {number} decay 감쇠 속도
 * @param {number} [attack] 어택 시간(초)
 * @returns {number} 0~1
 */
export function envelope(t, decay, attack = 0.003) {
  return Math.min(1, t / attack) * Math.exp(-t * decay);
}

/**
 * 좌우 버퍼 한 쌍을 가진 작업대를 만든다. 모든 쓰기는 길이 안에서 감긴다.
 * @param {number} totalSamples 반복 한 바퀴의 샘플 수
 * @param {number} seed 노이즈 시드
 */
export function createBench(totalSamples, seed = 1) {
  const random = createRandom(seed);
  const createBus = () => ({ l: new Float32Array(totalSamples), r: new Float32Array(totalSamples) });

  /**
   * 소리 하나를 그려 버스에 더한다. 끝이 길이를 넘으면 처음으로 돌아가 이어 쓴다.
   * @param {{l: Float32Array, r: Float32Array}} bus 목적지
   * @param {number} start 시작 시각(초)
   * @param {number} length 길이(초)
   * @param {(t: number) => number} voice 경과 시간을 받아 샘플을 돌려주는 함수
   * @param {number} [pan] -1~1
   * @param {number} [level] 볼륨
   */
  function play(bus, start, length, voice, pan = 0, level = 1) {
    const from = Math.floor(start * SAMPLE_RATE);
    const count = Math.floor(length * SAMPLE_RATE);
    const left = Math.cos(((pan + 1) * Math.PI) / 4);
    const right = Math.sin(((pan + 1) * Math.PI) / 4);
    for (let k = 0; k < count; k += 1) {
      const index = (((from + k) % totalSamples) + totalSamples) % totalSamples;
      const sample = voice(k / SAMPLE_RATE) * level;
      bus.l[index] += sample * left;
      bus.r[index] += sample * right;
    }
  }

  return { random, createBus, play };
}

/**
 * 악기 모음. 작업대를 받아 킥·스네어·하이햇·베이스·펄스·종·패드를 돌려준다.
 * @param {ReturnType<typeof createBench>} bench 작업대
 */
export function createInstruments(bench) {
  const { play, random } = bench;

  return {
    /** 킥: 사인 스윕 */
    kick(bus, time, level = 1) {
      let phase = 0;
      play(bus, time, 0.4, (t) => {
        phase += (48 + 110 * Math.exp(-t * 32)) / SAMPLE_RATE;

        return Math.sin(2 * Math.PI * phase) * Math.exp(-t * 9);
      }, 0, level);
    },
    /** 스네어: 고음 노이즈 + 몸통 */
    snare(bus, time, level = 1) {
      const smooth = lowpass(2200);
      let phase = 0;
      play(bus, time, 0.25, (t) => {
        const noise = random() * 2 - 1;
        phase += (200 - 50 * Math.min(1, t * 10)) / SAMPLE_RATE;

        return (noise - smooth(noise)) * envelope(t, 18) * 0.7 + Math.sin(2 * Math.PI * phase) * envelope(t, 26) * 0.4;
      }, 0.05, level);
    },
    /** 하이햇 */
    hat(bus, time, open = false, level = 1, pan = 0.3) {
      const smooth = lowpass(6500);
      play(bus, time, open ? 0.25 : 0.07, (t) => {
        const noise = random() * 2 - 1;

        return (noise - smooth(noise)) * envelope(t, open ? 14 : 70, 0.001) * 0.3;
      }, pan, level);
    },
    /** 부드러운 베이스: 삼각파 + 서브 사인 (또는 톱니파) */
    bass(bus, time, freq, length, { saw = false, level = 1 } = {}) {
      const smooth = lowpass(saw ? 900 : 520);
      let phase = 0;
      play(bus, time, length, (t) => {
        phase = (phase + freq / SAMPLE_RATE) % 1;
        const tone = saw ? (phase * 2 - 1) * 0.55 + Math.sin(2 * Math.PI * phase) * 0.6 : (Math.abs(phase * 4 - 2) - 1) * 0.6 + Math.sin(2 * Math.PI * phase) * 0.5;

        return smooth(tone, saw ? 500 + 900 * Math.exp(-t * 12) : 700) * envelope(t, 3, 0.006);
      }, 0, level * 0.9);
    },
    /** 펄스파 한 음 (멜로디·아르페지오) */
    pulse(bus, time, freq, length, { duty = 0.5, decay = 4, level = 1, pan = 0, vibrato = 0 } = {}) {
      let phase = 0;
      const smooth = lowpass(7000);
      play(bus, time, length, (t) => {
        const bend = 1 + vibrato * Math.sin(2 * Math.PI * 5.2 * Math.max(0, t - 0.1));
        phase = (phase + (freq * bend) / SAMPLE_RATE) % 1;

        return smooth((phase < duty ? 1 : -1) * envelope(t, decay, 0.004));
      }, pan, level * 0.5);
    },
    /** 오르골 종소리: 배음 여러 개 */
    bell(bus, time, freq, length, { level = 1, pan = 0, decay = 2.6 } = {}) {
      play(bus, time, length, (t) => {
        const tone = Math.sin(2 * Math.PI * freq * t) + 0.45 * Math.sin(2 * Math.PI * freq * 2.005 * t) + 0.18 * Math.sin(2 * Math.PI * freq * 3.01 * t);

        return tone * envelope(t, decay, 0.002);
      }, pan, level * 0.32);
    },
    /** 패드: 살짝 어긋난 삼각파 세 겹 */
    pad(bus, time, freqs, length, level = 1) {
      freqs.forEach((freq, index) => {
        const phases = [0, 0.3, 0.6];
        const detunes = [0.997, 1, 1.003];
        const smooth = lowpass(1500);
        play(bus, time, length, (t) => {
          let sum = 0;
          for (let v = 0; v < 3; v += 1) {
            phases[v] = (phases[v] + (freq * detunes[v]) / SAMPLE_RATE) % 1;
            sum += Math.abs(phases[v] * 4 - 2) - 1;
          }
          const swell = Math.min(1, t / 0.3) * Math.min(1, (length - t) / 0.4);

          return smooth(sum / 3) * swell;
        }, (index - 1) * 0.5, level * 0.5);
      });
    },
  };
}

/**
 * 좌우로 튕기는 딜레이. 반복 한 바퀴를 감아서 처리한다.
 * @param {{l: Float32Array, r: Float32Array}} bus 처리할 버스
 * @param {number} seconds 딜레이 시간
 * @param {number} feedback 되먹임
 */
export function pingPong(bus, seconds, feedback) {
  const size = bus.l.length;
  const delay = Math.round(seconds * SAMPLE_RATE);
  for (let pass = 0; pass < 2; pass += 1) {
    for (let i = 0; i < size; i += 1) {
      const from = (i - delay + size) % size;
      bus.l[i] += bus.r[from] * feedback;
      bus.r[i] += bus.l[from] * feedback;
    }
  }
}

/**
 * 스테레오 PCM(16비트)을 WAV 바이트로 감싼다.
 * @param {Int16Array} pcm 좌우가 번갈아 담긴 PCM
 * @returns {Buffer} WAV 바이트
 */
export function toWav(pcm) {
  const data = Buffer.from(pcm.buffer, pcm.byteOffset, pcm.byteLength);
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVEfmt ", 8);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(2, 22);
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(SAMPLE_RATE * 4, 28);
  header.writeUInt16LE(4, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(data.length, 40);

  return Buffer.concat([header, data]);
}
