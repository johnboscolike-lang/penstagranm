import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MAX_ACHIEVEMENT_TOASTS, parseHudSnapshot, planAchievementToasts, planHudEvents } from "@/utils/hud-events";
import { dismissToast, getServerToasts, getToasts, pushToast, resetToasts, subscribeToasts } from "@/utils/toast-store";

const base = { level: 3, coins: 20, streak: 1 };

describe("상단 정보 변화로 알림 만들기", () => {
  it("처음 방문이거나 그대로면 아무 알림도 없다", () => {
    expect(planHudEvents(null, base)).toEqual({ toasts: [], sounds: [] });
    expect(planHudEvents(base, base)).toEqual({ toasts: [], sounds: [] });
  });

  it("레벨이 오르면 축하 알림과 소리를 낸다", () => {
    const plan = planHudEvents(base, { ...base, level: 4 });

    expect(plan.toasts).toHaveLength(1);
    expect(plan.toasts[0]).toMatchObject({ kind: "levelup", title: "레벨 업! Lv.4" });
    expect(plan.sounds).toEqual(["levelup"]);
  });

  it("코인이 늘면 늘어난 만큼 알려 주고, 줄면(코인을 쓰면) 조용하다", () => {
    expect(planHudEvents(base, { ...base, coins: 28 }).toasts[0]).toMatchObject({ kind: "coin", title: "코인 +8" });
    expect(planHudEvents(base, { ...base, coins: 5 })).toEqual({ toasts: [], sounds: [] });
  });

  it("연속 실천은 2일부터 알리고, 고비 일수에는 더 크게 칭찬한다", () => {
    expect(planHudEvents({ ...base, streak: 0 }, { ...base, streak: 1 }).toasts).toEqual([]);
    expect(planHudEvents({ ...base, streak: 1 }, { ...base, streak: 2 }).toasts[0].body).toContain("내일도");
    expect(planHudEvents({ ...base, streak: 2 }, { ...base, streak: 3 }).toasts[0].body).toContain("대단해요");
  });

  it("한꺼번에 여러 일이 생기면 알림을 모두 만든다", () => {
    const plan = planHudEvents(base, { level: 4, coins: 40, streak: 3 });

    expect(plan.toasts.map((toast) => toast.kind)).toEqual(["levelup", "coin", "streak"]);
    expect(plan.sounds).toEqual(["levelup", "coin", "powerup"]);
  });
});

describe("저장한 상단 정보 읽기", () => {
  it("올바른 값만 읽고 깨진 값은 없는 것으로 본다", () => {
    expect(parseHudSnapshot(JSON.stringify(base))).toEqual(base);
    expect(parseHudSnapshot(null)).toBeNull();
    expect(parseHudSnapshot("not json")).toBeNull();
    expect(parseHudSnapshot(JSON.stringify({ level: "3" }))).toBeNull();
  });
});

describe("알림 저장소", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetToasts();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("알림을 띄우면 구독자에게 알리고 몇 초 뒤 저절로 사라진다", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToasts(listener);

    pushToast({ kind: "info", title: "안녕" });
    expect(getToasts()).toHaveLength(1);
    expect(listener).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(5000);
    expect(getToasts()).toHaveLength(0);
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
  });

  it("한꺼번에 세 개까지만 보이고 가장 오래된 것부터 밀려난다", () => {
    ["하나", "둘", "셋", "넷"].forEach((title) => pushToast({ kind: "info", title }));

    expect(getToasts().map((toast) => toast.title)).toEqual(["둘", "셋", "넷"]);
  });

  it("바뀌지 않았을 때는 같은 배열을 돌려주고, 이미 없는 알림을 치워도 조용하다", () => {
    const first = getToasts();
    const listener = vi.fn();
    const unsubscribe = subscribeToasts(listener);

    dismissToast(999);

    expect(getToasts()).toBe(first);
    expect(listener).not.toHaveBeenCalled();
    expect(getServerToasts()).toEqual([]);
    unsubscribe();
  });

  it("구독을 해제하면 더는 알리지 않는다", () => {
    const listener = vi.fn();
    subscribeToasts(listener)();

    pushToast({ kind: "info", title: "조용히" });

    expect(listener).not.toHaveBeenCalled();
  });
});

describe("새 업적 알림", () => {
  const item = (key: string, title: string) => ({ key, title, icon: "feather" as const, petName: "꼬꼬닭" });

  it("처음 방문이어도 아직 알리지 않은 업적은 알린다", () => {
    const plan = planHudEvents(null, base, [item("first-step", "첫걸음")]);

    expect(plan.toasts).toHaveLength(1);
    expect(plan.toasts[0]).toMatchObject({ kind: "achievement", title: "업적: 첫걸음", art: { kind: "items", name: "feather" } });
    expect(plan.toasts[0].body).toContain("꼬꼬닭");
    expect(plan.sounds).toEqual(["powerup"]);
  });

  it("업적이 없으면 아무것도 더하지 않는다", () => {
    expect(planHudEvents(null, base, [])).toEqual({ toasts: [], sounds: [] });
  });

  it("두 개까지는 따로 알리고, 그보다 많으면 한 장으로 묶는다", () => {
    expect(planAchievementToasts([item("a", "하나"), item("b", "둘")])).toHaveLength(MAX_ACHIEVEMENT_TOASTS);
    const many = planAchievementToasts([item("a", "하나"), item("b", "둘"), item("c", "셋"), item("d", "넷")]);

    expect(many).toHaveLength(1);
    expect(many[0].title).toBe("새 업적 4개!");
    expect(planAchievementToasts([])).toEqual([]);
  });

  it("레벨 업과 함께 오면 레벨 업 소리가 먼저 난다", () => {
    const plan = planHudEvents(base, { ...base, level: 4 }, [item("first-step", "첫걸음")]);

    expect(plan.toasts.map((toast) => toast.kind)).toEqual(["achievement", "levelup"]);
    expect(plan.sounds).toEqual(["levelup", "powerup"]);
  });
});
