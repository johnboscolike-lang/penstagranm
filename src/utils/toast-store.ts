export type ToastKind = "levelup" | "coin" | "streak" | "info";

export interface Toast {
  id: number;
  kind: ToastKind;
  title: string;
  body?: string;
}

const LIFETIME_MS = 4200;
const MAX_TOASTS = 3;
const NO_TOASTS: readonly Toast[] = [];

let toasts: readonly Toast[] = NO_TOASTS;
let nextId = 1;
const listeners = new Set<() => void>();

/**
 * 목록이 바뀐 것을 화면에 알린다.
 */
function emit(): void {
  listeners.forEach((listener) => listener());
}

/**
 * 알림이 바뀔 때 부를 함수를 등록한다. 해제 함수를 돌려준다.
 */
export function subscribeToasts(listener: () => void): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

/**
 * 지금 떠 있는 알림들. (바뀌지 않았다면 같은 배열을 돌려준다)
 */
export function getToasts(): readonly Toast[] {
  return toasts;
}

/**
 * 서버 렌더링 때는 알림이 없다.
 */
export function getServerToasts(): readonly Toast[] {
  return NO_TOASTS;
}

/**
 * 알림을 하나 띄운다. 오래 두지 않고 몇 초 뒤에 저절로 사라지며, 한꺼번에 세 개까지만 보인다.
 */
export function pushToast(toast: Omit<Toast, "id">): number {
  const id = nextId;
  nextId += 1;
  toasts = [...toasts, { ...toast, id }].slice(-MAX_TOASTS);
  emit();
  setTimeout(() => dismissToast(id), LIFETIME_MS);

  return id;
}

/**
 * 알림을 치운다.
 */
export function dismissToast(id: number): void {
  if (!toasts.some((toast) => toast.id === id)) {
    return;
  }
  toasts = toasts.filter((toast) => toast.id !== id);
  emit();
}

/**
 * 모든 알림을 지우고 번호를 처음으로 돌린다. (테스트에서 쓴다)
 */
export function resetToasts(): void {
  toasts = NO_TOASTS;
  nextId = 1;
  emit();
}
