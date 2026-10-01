import { useEffect } from "react";

import { getAudioEngine } from "@/utils/audio/audio-engine";
import { bgmForSpace, isSfxName, type SoundSpace } from "@/utils/audio/sound-catalog";

const CLICK_TARGETS = "[data-sfx], button, a[href], [role='tab'], [role='button'], summary, label[for]";

interface AudioBootProps {
  space: SoundSpace;
}

/**
 * 화면이 열릴 때 그 공간의 배경 음악을 고르고, 첫 터치에서 소리를 켜고, 버튼을 누를 때마다 눌림 소리를 낸다.
 * 특정 효과음이 필요한 요소는 data-sfx="coin" 처럼 이름을 적고, 소리를 없애려면 data-sfx="none"을 적는다.
 */
export function AudioBoot({ space }: AudioBootProps) {
  useEffect(() => {
    const engine = getAudioEngine();
    if (!engine) {
      return;
    }
    engine.setTrack(bgmForSpace(space));
    // 브라우저가 허락하면 바로 시작하고, 아니면 첫 터치에서 시작한다.
    void engine.unlock();
    engine.preload(["click", "tile", "coin", "pop", "open", "close", "toggle", "submit"]);
  }, [space]);

  useEffect(() => {
    const engine = getAudioEngine();
    if (!engine) {
      return undefined;
    }

    /**
     * 첫 사용자 동작에서 소리를 켠다.
     */
    const unlockOnce = () => {
      void engine.unlock();
    };

    /**
     * 버튼·링크를 누를 때 알맞은 효과음을 낸다.
     */
    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest(CLICK_TARGETS) : null;
      if (!target || target.hasAttribute("disabled") || target.getAttribute("aria-disabled") === "true") {
        return;
      }
      const wanted = target.getAttribute("data-sfx") ?? "click";
      if (wanted === "none" || !isSfxName(wanted)) {
        void engine.unlock();

        return;
      }
      void engine.unlock().then(() => engine.playSfx(wanted));
    };

    window.addEventListener("pointerdown", unlockOnce, { once: true, capture: true });
    window.addEventListener("keydown", unlockOnce, { once: true, capture: true });
    document.addEventListener("click", onClick, true);

    return () => {
      window.removeEventListener("pointerdown", unlockOnce, true);
      window.removeEventListener("keydown", unlockOnce, true);
      document.removeEventListener("click", onClick, true);
    };
  }, []);

  return null;
}
