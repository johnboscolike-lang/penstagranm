import { useSyncExternalStore } from "react";
import clsx from "clsx";

import { Portal } from "@/components/Portal";
import { Cc0Sprite, PixelIcon } from "@/components/pixel/PixelSprite";
import { dismissToast, getServerToasts, getToasts, subscribeToasts, type ToastKind } from "@/utils/toast-store";

const ICONS: Record<ToastKind, string> = { levelup: "star", coin: "coin", streak: "flame", achievement: "medal", info: "bell" };
const CONFETTI_COLORS = ["#f2c14e", "#e0605a", "#66dcc4", "#5a9fe0", "#f7a6c0", "#9be36b"];

/**
 * 레벨 업 때 화면 위에서 살랑살랑 떨어지는 색종이. 움직임을 줄인 환경에서는 CSS가 멈춘다.
 */
function Confetti() {
  return (
    <div aria-hidden className="confetti">
      {Array.from({ length: 28 }, (_, index) => (
        <span
          className="confetti__piece"
          key={index}
          style={{
            left: `${(index * 37) % 100}%`,
            background: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
            animationDelay: `${(index % 7) * 0.12}s`,
            animationDuration: `${1.8 + (index % 5) * 0.25}s`,
          }}
        />
      ))}
    </div>
  );
}

/**
 * 화면 아래쪽(독 위)에 잠깐 떠서 축하와 안내를 전하는 알림들.
 */
export function ToastHost() {
  const toasts = useSyncExternalStore(subscribeToasts, getToasts, getServerToasts);

  return (
    <Portal>
      {toasts.some((toast) => toast.kind === "levelup") ? <Confetti /> : null}
      <div aria-live="polite" className="toasts" role="status">
        {toasts.map((toast) => (
          <button className={clsx("toast pf", `toast--${toast.kind}`)} data-sfx="none" key={toast.id} onClick={() => dismissToast(toast.id)} type="button">
            {toast.art ? <Cc0Sprite kind={toast.art.kind} name={toast.art.name} scale={1} ui /> : <PixelIcon name={ICONS[toast.kind]} scale={1.6} />}
            <span className="toast__text">
              <strong>{toast.title}</strong>
              {toast.body ? <small>{toast.body}</small> : null}
            </span>
          </button>
        ))}
      </div>
    </Portal>
  );
}
