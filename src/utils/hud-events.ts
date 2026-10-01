import type { AchievementToastView } from "@/utils/achievement-types";
import type { Toast } from "@/utils/toast-store";
import { isStreakMilestone } from "@/utils/streak";

export interface HudSnapshot {
  level: number;
  coins: number;
  streak: number;
}

/** 업적 알림을 한꺼번에 이만큼까지만 따로따로 띄우고, 더 많으면 한 장으로 묶어 알린다. */
export const MAX_ACHIEVEMENT_TOASTS = 2;

export interface HudEventPlan {
  toasts: Omit<Toast, "id">[];
  /** 소리로 알릴 효과음 이름들 (앞에서부터 하나만 울린다) */
  sounds: ("levelup" | "coin" | "powerup")[];
}

/**
 * 지난 화면과 지금 화면의 상단 정보를 비교해서, 축하할 일이 생겼는지 알려 준다.
 * 레벨이 오르거나, 코인이 늘거나(선생님 확인이 도착한 경우 등), 연속 실천이 이어지면 알림을 만든다.
 * 이전 기록이 없거나(처음 방문) 값이 줄었을 때는(코인을 쓴 경우) 아무것도 알리지 않는다.
 */
export function planHudEvents(previous: HudSnapshot | null, current: HudSnapshot, newAchievements: readonly AchievementToastView[] = []): HudEventPlan {
  const plan: HudEventPlan = { toasts: [], sounds: [] };
  // 새 업적은 지난 화면과 비교하지 않고, 아직 알리지 않은 것을 그대로 알린다. (처음 방문에도 알린다)
  plan.toasts.push(...planAchievementToasts(newAchievements));
  if (previous && current.level > previous.level) {
    plan.toasts.push({ kind: "levelup", title: `레벨 업! Lv.${current.level}`, body: "새로운 모험이 기다리고 있어요." });
    plan.sounds.push("levelup");
  }
  if (newAchievements.length > 0) {
    plan.sounds.push("powerup");
  }
  if (!previous) {
    return plan;
  }
  if (current.coins > previous.coins) {
    plan.toasts.push({ kind: "coin", title: `코인 +${current.coins - previous.coins}`, body: "옷장이나 앞마당을 꾸며 볼까요?" });
    plan.sounds.push("coin");
  }
  if (current.streak > previous.streak && current.streak >= 2) {
    const milestone = isStreakMilestone(current.streak);
    plan.toasts.push({
      kind: "streak",
      title: `${current.streak}일 연속 실천!`,
      body: milestone ? "대단해요! 꾸준함이 가장 큰 힘이에요." : "내일도 이어 가 볼까요?",
    });
    plan.sounds.push("powerup");
  }

  return plan;
}

/**
 * 새 업적 알림을 만든다. 많이 한꺼번에 이루면(예: 처음 열었을 때 쌓여 있던 기록) 한 장으로 묶어 화면을 덮지 않는다.
 */
export function planAchievementToasts(fresh: readonly AchievementToastView[]): Omit<Toast, "id">[] {
  if (fresh.length === 0) {
    return [];
  }
  if (fresh.length > MAX_ACHIEVEMENT_TOASTS) {
    return [{ kind: "achievement", title: `새 업적 ${fresh.length}개!`, body: "내공간에서 업적과 새 동물 친구를 확인해요.", art: { kind: "items", name: "goldCup" } }];
  }

  return fresh.map((item) => ({
    kind: "achievement" as const,
    title: `업적: ${item.title}`,
    body: `${item.petName}이(가) 친구가 되었어요!`,
    art: { kind: "items" as const, name: item.icon },
  }));
}

/**
 * 저장해 둔 문자열을 안전하게 읽는다. 깨진 값은 없는 것으로 본다.
 */
export function parseHudSnapshot(raw: string | null): HudSnapshot | null {
  if (!raw) {
    return null;
  }
  try {
    const value = JSON.parse(raw) as Partial<HudSnapshot>;

    return typeof value.level === "number" && typeof value.coins === "number" && typeof value.streak === "number"
      ? { level: value.level, coins: value.coins, streak: value.streak }
      : null;
  } catch {
    return null;
  }
}
