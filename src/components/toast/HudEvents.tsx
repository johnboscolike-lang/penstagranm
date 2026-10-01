import { useEffect } from "react";

import { playSfx } from "@/utils/audio/audio-engine";
import { parseHudSnapshot, planHudEvents } from "@/utils/hud-events";
import type { HudView } from "@/utils/quest-types";
import { pushToast } from "@/utils/toast-store";

interface HudEventsProps {
  hud: HudView;
}

/**
 * 화면을 옮길 때마다 지난번과 비교해서, 레벨 업·코인 도착·연속 실천이 생겼으면 알림과 소리로 알려 준다.
 * 같은 브라우저 탭 안에서만 비교하고(sessionStorage), 학생마다 따로 저장한다.
 */
export function HudEvents({ hud }: HudEventsProps) {
  const { name, level, coins, streak } = hud;

  useEffect(() => {
    const storageKey = `penstagram-hud:${name}`;
    let previous = null;
    try {
      previous = parseHudSnapshot(window.sessionStorage.getItem(storageKey));
    } catch {
      previous = null;
    }
    const plan = planHudEvents(previous, { level, coins, streak });
    plan.toasts.forEach((toast) => pushToast(toast));
    if (plan.sounds.length > 0) {
      playSfx(plan.sounds[0]);
    }
    try {
      window.sessionStorage.setItem(storageKey, JSON.stringify({ level, coins, streak }));
    } catch {
      // 저장소가 막혀 있어도 알림 없이 그대로 쓸 수 있다.
    }
  }, [name, level, coins, streak]);

  return null;
}
