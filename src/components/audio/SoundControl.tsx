import { useState, useSyncExternalStore } from "react";

import { PixelIcon } from "@/components/pixel/PixelSprite";
import { getAudioEngine } from "@/utils/audio/audio-engine";
import { DEFAULT_AUDIO_SETTINGS, type AudioSettings } from "@/utils/audio/audio-settings";

/**
 * 소리 설정의 현재 값을 읽는다. 서버에서는 기본값을 쓴다.
 */
function readSettings(): AudioSettings {
  return getAudioEngine()?.getSettings() ?? DEFAULT_AUDIO_SETTINGS;
}

/**
 * 소리 설정이 바뀌면 알려 달라고 신청한다.
 */
function subscribeSettings(listener: () => void): () => void {
  return getAudioEngine()?.subscribe(listener) ?? (() => undefined);
}

/**
 * 상단 도구 줄의 소리 버튼. 눌러서 배경음악·효과음을 켜고 끄고 크기를 고른다.
 */
export function SoundControl() {
  const settings = useSyncExternalStore(subscribeSettings, readSettings, () => DEFAULT_AUDIO_SETTINGS);
  const [open, setOpen] = useState(false);
  const allOff = !settings.musicOn && !settings.sfxOn;

  /**
   * 설정 일부를 바꾼다.
   */
  const update = (patch: Partial<AudioSettings>) => {
    const engine = getAudioEngine();
    void engine?.unlock().then(() => engine.setSettings(patch));
    engine?.setSettings(patch);
  };

  return (
    <div className="sound">
      <button
        aria-expanded={open}
        aria-label="소리 설정 열기"
        className="hud__tool pf"
        data-sfx={open ? "close" : "open"}
        onClick={() => setOpen((value) => !value)}
        title="배경음악과 효과음"
        type="button"
      >
        <PixelIcon name={allOff ? "mute" : "speaker"} />
        <span className="hud__tool-label">소리</span>
      </button>
      {open ? (
        <div aria-label="소리 설정" className="sound__panel pf" role="dialog">
          <div className="sound__row">
            <button
              aria-pressed={settings.musicOn}
              className="sound__switch"
              data-sfx="toggle"
              onClick={() => update({ musicOn: !settings.musicOn })}
              type="button"
            >
              <PixelIcon name="note" />
              <span>배경음악 {settings.musicOn ? "켬" : "끔"}</span>
            </button>
            <input
              aria-label="배경음악 크기"
              className="sound__range"
              data-sfx="none"
              max={100}
              min={0}
              onChange={(event) => update({ musicVolume: Number(event.target.value) / 100, musicOn: true })}
              type="range"
              value={Math.round(settings.musicVolume * 100)}
            />
          </div>
          <div className="sound__row">
            <button
              aria-pressed={settings.sfxOn}
              className="sound__switch"
              data-sfx="toggle"
              onClick={() => update({ sfxOn: !settings.sfxOn })}
              type="button"
            >
              <PixelIcon name="sparkle" />
              <span>효과음 {settings.sfxOn ? "켬" : "끔"}</span>
            </button>
            <input
              aria-label="효과음 크기"
              className="sound__range"
              data-sfx="none"
              max={100}
              min={0}
              onChange={(event) => update({ sfxVolume: Number(event.target.value) / 100, sfxOn: true })}
              type="range"
              value={Math.round(settings.sfxVolume * 100)}
            />
          </div>
          <p className="sound__hint">교실에서는 소리를 낮추거나 꺼 주세요.</p>
        </div>
      ) : null}
    </div>
  );
}
