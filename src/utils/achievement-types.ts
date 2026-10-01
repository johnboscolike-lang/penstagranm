import type { CreatureName, ItemName } from "@/utils/art/cc0";

/** 방금 이룬 업적을 알리는 알림에 필요한 정보 */
export interface AchievementToastView {
  key: string;
  title: string;
  icon: ItemName;
  petName: string;
}

export interface AchievementBoardItem {
  key: string;
  title: string;
  hint: string;
  icon: ItemName;
  pet: CreatureName;
  petName: string;
  earned: boolean;
  value: number;
  target: number;
  percent: number;
}

export interface AchievementBoardView {
  earnedCount: number;
  total: number;
  items: AchievementBoardItem[];
}
