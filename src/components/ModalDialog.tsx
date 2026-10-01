import { useEffect, useRef, type ReactNode } from "react";

interface ModalDialogProps {
  /** 화면 읽기 프로그램이 읽어 줄 창 이름 */
  label: string;
  /** Esc 키를 눌렀을 때 할 일. 없으면 Esc로는 닫히지 않는다. (대결 도중처럼 실수로 닫으면 안 되는 창) */
  onRequestClose?: () => void;
  children: ReactNode;
}

/**
 * 네이티브 <dialog>로 만든 모달 창. 열리면 배경 전체가 비활성(inert)이 되고 Tab 키가 창 안에서만 돌며,
 * Esc를 처리하고, 닫히면 창을 연 버튼으로 포커스가 돌아간다. 브라우저가 맨 위 층(top layer)에 올려 주어서
 * 아래쪽 도크·상단 표시줄이 가리지도 않는다.
 */
export function ModalDialog({ label, onRequestClose, children }: ModalDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const closeRef = useRef(onRequestClose);

  useEffect(() => {
    closeRef.current = onRequestClose;
  }, [onRequestClose]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) {
      return undefined;
    }
    // 요청을 보내는 동안 버튼이 비활성화되면 포커스가 body로 빠져 있을 수 있다. body는 "연 요소"로 치지 않는다.
    const active = document.activeElement;
    const opener = active instanceof HTMLElement && active !== document.body ? active : null;
    if (!dialog.open) {
      dialog.showModal();
    }

    return () => {
      if (dialog.open) {
        dialog.close();
      }
      // 닫힌 뒤 포커스가 문서 맨 위로 날아가지 않게 창을 연 요소로 돌려보낸다.
      // 창을 연 버튼이 사라졌으면(예: 받은 도전장을 풀고 나면 그 줄이 없어진다) 본문 영역으로 보낸다.
      if (opener?.isConnected) {
        opener.focus();
      } else {
        const main = document.querySelector<HTMLElement>("main");
        main?.setAttribute("tabindex", "-1");
        main?.focus({ preventScroll: true });
      }
    };
  }, []);

  return (
    <dialog
      aria-label={label}
      className="duel"
      onCancel={(event) => {
        event.preventDefault();
        closeRef.current?.();
      }}
      ref={ref}
    >
      {children}
    </dialog>
  );
}
