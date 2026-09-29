import type { UnitKind } from "@/utils/quest-plan";
import type { WeekNews } from "@/utils/quest-board";

export interface HudView {
  name: string;
  hairKey: string;
  teamName: string;
  level: number;
  xpInLevel: number;
  xpForNext: number;
  totalXp: number;
  coins: number;
}

export interface PromiseView {
  id: string;
  slotIndex: number;
  subject: string;
  title: string;
  unitKind: UnitKind;
  unitStart: number;
  unitCount: number;
  rangeLabel: string;
  confirmedUnitNos: number[];
}

export interface TodayView {
  dateKey: string;
  label: string;
  isSchoolDay: boolean;
  reflected: boolean;
  promises: PromiseView[];
}

export interface OwnedItemView {
  itemKey: string;
}

export interface MyRoomExtras {
  ownedItemKeys: string[];
  lastWeek: WeekNews;
}

export interface UpcomingScheduleView {
  id: string;
  title: string;
  notes: string | null;
  scheduledFor: string;
}
