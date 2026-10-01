import { createScopedLogger } from "@/utils/logger";
import {
  AUDIO_STORAGE_KEY,
  DEFAULT_AUDIO_SETTINGS,
  musicGainFor,
  normalizeAudioSettings,
  serializeAudioSettings,
  sfxGainFor,
  type AudioSettings,
} from "@/utils/audio/audio-settings";
import { JINGLES, SFX_TRIM, bgmUrl, sfxUrl, type BgmTrack, type SfxName } from "@/utils/audio/sound-catalog";

const logger = createScopedLogger("audio");

const FADE_IN_SECONDS = 0.9;
const FADE_OUT_SECONDS = 0.5;
const DUCK_LEVEL = 0.3;
const MAX_ACTIVE_SFX = 12;
const SAME_SFX_GAP_MS = 45;

interface ParamLike {
  value: number;
  cancelScheduledValues(time: number): void;
  setValueAtTime(value: number, time: number): void;
  linearRampToValueAtTime(value: number, time: number): void;
}

interface GainLike {
  gain: ParamLike;
  connect(target: unknown): void;
  disconnect(): void;
}

interface SourceLike {
  buffer: unknown;
  loop: boolean;
  playbackRate: { value: number };
  onended: (() => void) | null;
  connect(target: unknown): void;
  start(when?: number): void;
  stop(when?: number): void;
  disconnect(): void;
}

export interface AudioContextLike {
  currentTime: number;
  state: string;
  destination: unknown;
  resume(): Promise<void>;
  createGain(): GainLike;
  createBufferSource(): SourceLike;
  decodeAudioData(data: ArrayBuffer): Promise<unknown>;
}

export interface AudioEngineDeps {
  createContext: () => AudioContextLike;
  fetchData: (url: string) => Promise<ArrayBuffer>;
  readStored: () => string | null;
  writeStored: (value: string) => void;
  now?: () => number;
}

interface MusicVoice {
  track: BgmTrack;
  source: SourceLike;
  gain: GainLike;
}

/**
 * 게임 소리를 책임지는 엔진: 공간별 배경 음악(부드럽게 이어지는 반복)과 효과음, 음소거·볼륨 설정.
 * 브라우저 자동재생 정책 때문에 첫 손가락 터치(unlock) 뒤에 소리가 시작된다.
 * 의존성(오디오 컨텍스트, 파일 읽기, 저장소)을 밖에서 받아서 테스트할 수 있다.
 */
export class AudioEngine {
  private readonly deps: AudioEngineDeps;

  private settings: AudioSettings;

  private context: AudioContextLike | null = null;

  private unlocked = false;

  private wantedTrack: BgmTrack | null = null;

  private voice: MusicVoice | null = null;

  private duckUntil = 0;

  private activeSfx = 0;

  private readonly listeners = new Set<() => void>();

  private readonly buffers = new Map<string, Promise<unknown>>();

  private readonly lastPlayed = new Map<SfxName, number>();

  constructor(deps: AudioEngineDeps) {
    this.deps = deps;
    this.settings = normalizeAudioSettings(deps.readStored());
  }

  /**
   * 현재 소리 설정.
   */
  getSettings = (): AudioSettings => this.settings;

  /**
   * 설정이 바뀔 때 알림을 받는다. 해제 함수를 돌려준다.
   */
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  };

  /**
   * 소리를 쓸 수 있는 상태인지(첫 터치가 있었는지).
   */
  isUnlocked(): boolean {
    return this.unlocked;
  }

  /**
   * 설정 일부를 바꾸고 저장한 뒤 바로 반영한다.
   */
  setSettings(patch: Partial<AudioSettings>): void {
    this.settings = normalizeAudioSettings({ ...this.settings, ...patch });
    try {
      this.deps.writeStored(serializeAudioSettings(this.settings));
    } catch (error) {
      logger.warn("소리 설정을 저장하지 못했어요", error);
    }
    this.applyMusic();
    this.listeners.forEach((listener) => listener());
  }

  /**
   * 첫 사용자 동작에서 부른다. 오디오 컨텍스트를 깨우고 기다리던 배경 음악을 시작한다.
   */
  async unlock(): Promise<void> {
    if (this.unlocked) {
      return;
    }
    try {
      this.context = this.context ?? this.deps.createContext();
      await this.context.resume();
      this.unlocked = true;
      this.applyMusic();
    } catch (error) {
      logger.warn("소리를 켜지 못했어요", error);
    }
  }

  /**
   * 지금 공간에 어울리는 배경 음악을 정한다. 같은 곡이면 이어서 계속 재생한다.
   */
  setTrack(track: BgmTrack | null): void {
    this.wantedTrack = track;
    this.applyMusic();
  }

  /**
   * 효과음을 한 번 울린다. 소리가 꺼져 있거나 아직 unlock 전이면 조용히 넘어간다.
   */
  playSfx(name: SfxName): void {
    if (!this.unlocked || !this.context || sfxGainFor(this.settings) === 0) {
      return;
    }
    const now = (this.deps.now ?? Date.now)();
    const last = this.lastPlayed.get(name) ?? 0;
    if (now - last < SAME_SFX_GAP_MS || this.activeSfx >= MAX_ACTIVE_SFX) {
      return;
    }
    this.lastPlayed.set(name, now);

    const context = this.context;
    void this.loadBuffer(sfxUrl(name)).then((buffer) => {
      if (!buffer || !this.settings.sfxOn) {
        return;
      }
      const source = context.createBufferSource();
      const gain = context.createGain();
      source.buffer = buffer;
      gain.gain.value = sfxGainFor(this.settings, SFX_TRIM[name] ?? 1);
      source.connect(gain);
      gain.connect(context.destination);
      this.activeSfx += 1;
      source.onended = () => {
        this.activeSfx = Math.max(0, this.activeSfx - 1);
        source.disconnect();
        gain.disconnect();
      };
      source.start();
      if (JINGLES.includes(name)) {
        this.duckMusic((buffer as { duration?: number }).duration ?? 1);
      }
    });
  }

  /**
   * 자주 쓰는 효과음을 미리 받아 둔다. (첫 재생 지연을 없앤다)
   */
  preload(names: readonly SfxName[]): void {
    names.forEach((name) => {
      void this.loadBuffer(sfxUrl(name));
    });
  }

  /**
   * 배경 음악을 잠깐 낮춘다. 팡파르가 묻히지 않게 한다.
   */
  duckMusic(seconds: number): void {
    if (!this.context || !this.voice) {
      return;
    }
    const now = this.context.currentTime;
    const target = musicGainFor(this.settings);
    const gain = this.voice.gain.gain;
    gain.cancelScheduledValues(now);
    gain.setValueAtTime(gain.value, now);
    gain.linearRampToValueAtTime(target * DUCK_LEVEL, now + 0.08);
    gain.linearRampToValueAtTime(target, now + 0.08 + seconds + 0.3);
    this.duckUntil = now + seconds + 0.4;
  }

  /**
   * 음악 볼륨·켜짐 상태·곡 선택을 실제 소리에 반영한다.
   */
  private applyMusic(): void {
    if (!this.unlocked || !this.context) {
      return;
    }
    const target = musicGainFor(this.settings);
    const wanted = this.settings.musicOn ? this.wantedTrack : null;

    if (this.voice && this.voice.track === wanted) {
      const now = this.context.currentTime;
      if (now >= this.duckUntil) {
        this.voice.gain.gain.cancelScheduledValues(now);
        this.voice.gain.gain.setValueAtTime(this.voice.gain.gain.value, now);
        this.voice.gain.gain.linearRampToValueAtTime(target, now + 0.15);
      }

      return;
    }

    this.stopVoice(this.voice);
    this.voice = null;
    if (!wanted) {
      return;
    }
    void this.startVoice(wanted);
  }

  /**
   * 곡을 받아 서서히 커지며 반복 재생한다.
   */
  private async startVoice(track: BgmTrack): Promise<void> {
    const context = this.context;
    if (!context) {
      return;
    }
    const buffer = await this.loadBuffer(bgmUrl(track));
    const stillWanted = this.settings.musicOn && this.wantedTrack === track && !this.voice;
    if (!buffer || !stillWanted) {
      return;
    }
    const source = context.createBufferSource();
    const gain = context.createGain();
    source.buffer = buffer;
    source.loop = true;
    gain.gain.value = 0;
    source.connect(gain);
    gain.connect(context.destination);
    const now = context.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(musicGainFor(this.settings), now + FADE_IN_SECONDS);
    source.start();
    this.voice = { track, source, gain };
  }

  /**
   * 재생 중인 곡을 서서히 줄이며 멈춘다.
   */
  private stopVoice(voice: MusicVoice | null): void {
    if (!voice || !this.context) {
      return;
    }
    const now = this.context.currentTime;
    voice.gain.gain.cancelScheduledValues(now);
    voice.gain.gain.setValueAtTime(voice.gain.gain.value, now);
    voice.gain.gain.linearRampToValueAtTime(0, now + FADE_OUT_SECONDS);
    try {
      voice.source.stop(now + FADE_OUT_SECONDS + 0.05);
    } catch (error) {
      logger.warn("음악을 멈추지 못했어요", error);
    }
  }

  /**
   * 소리 파일을 받아 해독해서 보관한다. 같은 파일은 한 번만 받는다.
   */
  private loadBuffer(url: string): Promise<unknown> {
    const cached = this.buffers.get(url);
    if (cached) {
      return cached;
    }
    const context = this.context;
    const loading = (async () => {
      if (!context) {
        return null;
      }
      try {
        return await context.decodeAudioData(await this.deps.fetchData(url));
      } catch (error) {
        logger.warn("소리 파일을 불러오지 못했어요", { url, error });
        this.buffers.delete(url);

        return null;
      }
    })();
    this.buffers.set(url, loading);

    return loading;
  }
}

/**
 * 브라우저용 진짜 의존성으로 엔진을 만든다.
 */
export function createBrowserEngine(): AudioEngine {
  const AudioContextClass = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

  return new AudioEngine({
    createContext: () => new AudioContextClass() as unknown as AudioContextLike,
    fetchData: async (url) => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`${url} → ${response.status}`);
      }

      return response.arrayBuffer();
    },
    readStored: () => {
      try {
        return window.localStorage.getItem(AUDIO_STORAGE_KEY);
      } catch {
        return null;
      }
    },
    writeStored: (value) => {
      try {
        window.localStorage.setItem(AUDIO_STORAGE_KEY, value);
      } catch {
        // 저장소가 막혀 있어도 이 탭에서는 그대로 쓴다.
      }
    },
  });
}

let sharedEngine: AudioEngine | null = null;

/**
 * 브라우저에서 하나만 만들어 함께 쓰는 엔진. 서버 렌더링 중에는 null.
 */
export function getAudioEngine(): AudioEngine | null {
  if (typeof window === "undefined") {
    return null;
  }
  if (!sharedEngine) {
    sharedEngine = createBrowserEngine();
  }

  return sharedEngine;
}

/**
 * 어디서든 효과음을 한 줄로 울린다. (서버·소리 꺼짐이면 아무 일도 없다)
 */
export function playSfx(name: SfxName): void {
  getAudioEngine()?.playSfx(name);
}

export { DEFAULT_AUDIO_SETTINGS };
