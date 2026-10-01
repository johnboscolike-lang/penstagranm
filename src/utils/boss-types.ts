import type { BossMood } from "@/utils/boss-rules";
import type { KenneyName } from "@/utils/art/kenney";

export interface RaidMemberView {
  studentId: string;
  name: string;
  hairKey: string;
  units: number;
  duels: number;
  damage: number;
  isMe: boolean;
}

export interface RaidView {
  weekKey: string;
  bossName: string;
  bossSprite: KenneyName;
  bossIntro: string;
  maxHp: number;
  damage: number;
  hpLeft: number;
  percentLeft: number;
  defeated: boolean;
  mood: BossMood;
  /** 이번 주 남은 평일 수(오늘 포함) */
  schoolDaysLeft: number;
  /** 하루에 이만큼씩 모으면 이번 주 안에 쓰러뜨릴 수 있다. */
  neededPerDay: number;
  /** 피해가 큰 순서 위쪽 몇 명 */
  top: RaidMemberView[];
  me: { units: number; duels: number; damage: number; rank: number | null };
  /** 받을 수 있는 보상이 있으면 알려 준다. 이번 주와 지난주 두 곳까지. */
  rewards: RaidRewardView[];
}

export interface RaidRewardView {
  weekKey: string;
  bossName: string;
  bossSprite: KenneyName;
  xp: number;
  coins: number;
  claimed: boolean;
  /** 받을 수 없을 때 이유. 받을 수 있으면 null */
  blockedReason: string | null;
  isCurrentWeek: boolean;
}
