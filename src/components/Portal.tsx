import { useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface PortalProps {
  children: ReactNode;
}

/**
 * 구독할 것이 없는 스토어. 서버와 브라우저의 렌더링 차이를 알려 주는 용도로만 쓴다.
 */
const subscribeNothing = (): (() => void) => () => undefined;

/**
 * 자식을 body 바로 아래에 그린다. 무대(stage)의 쌓임 순서 안에 갇히지 않아서
 * 대결 창 같은 전체 화면 팝업이 하단 독과 HUD 위에 온다. (서버 렌더링 중에는 아무것도 그리지 않는다)
 */
export function Portal({ children }: PortalProps) {
  const mounted = useSyncExternalStore(
    subscribeNothing,
    () => true,
    () => false,
  );

  return mounted ? createPortal(children, document.body) : null;
}
