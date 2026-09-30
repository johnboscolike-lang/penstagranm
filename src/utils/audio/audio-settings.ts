export interface AudioSettings {
  musicOn: boolean;
  sfxOn: boolean;
  /** 0~1 */
  musicVolume: number;
  /** 0~1 */
  sfxVolume: number;
}

export const AUDIO_STORAGE_KEY = "penstagram-audio";

export const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
  musicOn: true,
  sfxOn: true,
  musicVolume: 0.5,
  sfxVolume: 0.8,
};

/**
 * 볼륨 값을 0~1 사이로 맞춘다. 숫자가 아니면 기본값을 쓴다.
 */
export function clampVolume(value: unknown, fallback: number): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return fallback;
  }

  return Math.min(1, Math.max(0, Math.round(value * 100) / 100));
}

/**
 * 저장돼 있던 값(문자열이나 객체)을 안전한 소리 설정으로 바꾼다. 깨진 값은 기본값으로 대신한다.
 */
export function normalizeAudioSettings(raw: unknown): AudioSettings {
  let source: unknown = raw;
  if (typeof raw === "string") {
    try {
      source = JSON.parse(raw);
    } catch {
      return { ...DEFAULT_AUDIO_SETTINGS };
    }
  }
  if (typeof source !== "object" || source === null) {
    return { ...DEFAULT_AUDIO_SETTINGS };
  }
  const record = source as Record<string, unknown>;

  return {
    musicOn: typeof record.musicOn === "boolean" ? record.musicOn : DEFAULT_AUDIO_SETTINGS.musicOn,
    sfxOn: typeof record.sfxOn === "boolean" ? record.sfxOn : DEFAULT_AUDIO_SETTINGS.sfxOn,
    musicVolume: clampVolume(record.musicVolume, DEFAULT_AUDIO_SETTINGS.musicVolume),
    sfxVolume: clampVolume(record.sfxVolume, DEFAULT_AUDIO_SETTINGS.sfxVolume),
  };
}

/**
 * 소리 설정을 저장용 문자열로 바꾼다.
 */
export function serializeAudioSettings(settings: AudioSettings): string {
  return JSON.stringify(normalizeAudioSettings(settings));
}

/**
 * 배경 음악 실제 재생 볼륨(0~1). 효과음이 묻히지 않게 사용자 볼륨의 절반 정도로 낮춘다.
 */
export function musicGainFor(settings: AudioSettings): number {
  return settings.musicOn ? settings.musicVolume * 0.5 : 0;
}

/**
 * 효과음 실제 재생 볼륨(0~1).
 */
export function sfxGainFor(settings: AudioSettings, trim = 1): number {
  return settings.sfxOn ? Math.min(1, settings.sfxVolume * trim) : 0;
}
