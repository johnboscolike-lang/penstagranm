import { describe, expect, it } from "vitest";

import {
  DEFAULT_AUDIO_SETTINGS,
  clampVolume,
  musicGainFor,
  normalizeAudioSettings,
  serializeAudioSettings,
  sfxGainFor,
} from "@/utils/audio/audio-settings";

describe("소리 설정", () => {
  it("깨진 값이나 비어 있는 값은 기본값으로 대신한다", () => {
    expect(normalizeAudioSettings(null)).toEqual(DEFAULT_AUDIO_SETTINGS);
    expect(normalizeAudioSettings("{망가진 json")).toEqual(DEFAULT_AUDIO_SETTINGS);
    expect(normalizeAudioSettings(42)).toEqual(DEFAULT_AUDIO_SETTINGS);
  });

  it("볼륨은 0~1 사이로 맞추고 숫자가 아니면 기본값을 쓴다", () => {
    expect(clampVolume(1.7, 0.5)).toBe(1);
    expect(clampVolume(-3, 0.5)).toBe(0);
    expect(clampVolume("큼", 0.5)).toBe(0.5);
    expect(clampVolume(Number.NaN, 0.4)).toBe(0.4);
    expect(clampVolume(0.333, 0.5)).toBe(0.33);
  });

  it("저장했다가 다시 읽어도 같은 값이다", () => {
    const settings = { musicOn: false, sfxOn: true, musicVolume: 0.2, sfxVolume: 0.9 };

    expect(normalizeAudioSettings(serializeAudioSettings(settings))).toEqual(settings);
  });

  it("일부만 저장돼 있으면 나머지는 기본값이다", () => {
    expect(normalizeAudioSettings({ musicOn: false })).toEqual({ ...DEFAULT_AUDIO_SETTINGS, musicOn: false });
  });

  it("꺼져 있으면 실제 재생 볼륨이 0이고, 켜져 있으면 배경 음악은 사용자 볼륨보다 작다", () => {
    expect(musicGainFor({ ...DEFAULT_AUDIO_SETTINGS, musicOn: false })).toBe(0);
    expect(sfxGainFor({ ...DEFAULT_AUDIO_SETTINGS, sfxOn: false })).toBe(0);
    expect(musicGainFor({ ...DEFAULT_AUDIO_SETTINGS, musicVolume: 1 })).toBeLessThan(1);
    expect(sfxGainFor({ ...DEFAULT_AUDIO_SETTINGS, sfxVolume: 1 }, 5)).toBe(1);
  });
});
