import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ModalDialog } from "@/components/ModalDialog";

/**
 * jsdom 에는 <dialog> 의 showModal/close 가 없어서 열림 상태만 흉내 낸다.
 */
function stubDialog(): { showModal: ReturnType<typeof vi.fn>; close: ReturnType<typeof vi.fn> } {
  const showModal = vi.fn(function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  });
  const close = vi.fn(function (this: HTMLDialogElement) {
    this.removeAttribute("open");
  });
  HTMLDialogElement.prototype.showModal = showModal as unknown as typeof HTMLDialogElement.prototype.showModal;
  HTMLDialogElement.prototype.close = close as unknown as typeof HTMLDialogElement.prototype.close;

  return { showModal, close };
}

describe("모달 창", () => {
  let stub: ReturnType<typeof stubDialog>;

  beforeEach(() => {
    stub = stubDialog();
    document.body.innerHTML = "";
  });

  afterEach(() => {
    cleanup();
  });

  it("열리면 showModal 로 맨 위 층에 올리고 창 이름을 단다", () => {
    render(
      <ModalDialog label="퀴즈 대결">
        <button type="button">확인</button>
      </ModalDialog>,
    );

    expect(stub.showModal).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("dialog", { name: "퀴즈 대결" })).toBeInTheDocument();
  });

  it("Esc(cancel)를 누르면 기본 닫힘을 막고 알려 준 함수를 부른다", () => {
    const onRequestClose = vi.fn();
    render(
      <ModalDialog label="결과" onRequestClose={onRequestClose}>
        <p>내용</p>
      </ModalDialog>,
    );
    const dialog = screen.getByRole("dialog", { name: "결과" });
    const event = new Event("cancel", { cancelable: true });

    act(() => {
      dialog.dispatchEvent(event);
    });

    expect(event.defaultPrevented).toBe(true);
    expect(onRequestClose).toHaveBeenCalledTimes(1);
  });

  it("닫는 함수를 주지 않으면 Esc로는 닫히지 않는다 (대결 도중)", () => {
    render(
      <ModalDialog label="대결">
        <p>문제</p>
      </ModalDialog>,
    );
    const dialog = screen.getByRole("dialog", { name: "대결" });
    const event = new Event("cancel", { cancelable: true });

    act(() => {
      dialog.dispatchEvent(event);
    });

    expect(event.defaultPrevented).toBe(true);
    expect(dialog).toHaveAttribute("open");
  });

  it("닫히면 창을 연 버튼으로 포커스를 돌려준다", () => {
    const opener = document.createElement("button");
    document.body.appendChild(opener);
    opener.focus();

    const { unmount } = render(
      <ModalDialog label="창">
        <p>내용</p>
      </ModalDialog>,
    );
    (document.activeElement as HTMLElement | null)?.blur();
    unmount();

    expect(stub.close).toHaveBeenCalled();
    expect(document.activeElement).toBe(opener);
  });

  it("창을 연 버튼이 사라졌으면 본문 영역으로 포커스를 보낸다", () => {
    const main = document.createElement("main");
    document.body.appendChild(main);
    const opener = document.createElement("button");
    document.body.appendChild(opener);
    opener.focus();

    const { unmount } = render(
      <ModalDialog label="창">
        <p>내용</p>
      </ModalDialog>,
    );
    opener.remove();
    unmount();

    expect(document.activeElement).toBe(main);
    expect(main).toHaveAttribute("tabindex", "-1");
  });

  it("포커스가 body 에 있었으면 연 요소가 없다고 보고 본문 영역으로 보낸다", () => {
    const main = document.createElement("main");
    document.body.appendChild(main);

    const { unmount } = render(
      <ModalDialog label="창">
        <p>내용</p>
      </ModalDialog>,
    );
    unmount();

    expect(document.activeElement).toBe(main);
  });

  it("이벤트 연결만 확인: 클릭은 창 안 요소에 정상 전달된다", () => {
    const onClick = vi.fn();
    render(
      <ModalDialog label="창">
        <button onClick={onClick} type="button">
          확인
        </button>
      </ModalDialog>,
    );

    fireEvent.click(screen.getByRole("button", { name: "확인" }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
