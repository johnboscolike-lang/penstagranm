import type { UnitKind } from "@/utils/quest-plan";
import type { WeekNews } from "@/utils/quest-board";
import type { ReviewStatus } from "@/utils/quest-review";

export interface HudView {
  name: string;
  hairKey: string;
  teamName: string;
  level: number;
  xpInLevel: number;
  xpForNext: number;
  totalXp: number;
  coins: number;
  /** 받은 도전장(대결) 수 */
  arenaInbox: number;
  /** 쓰고 있는 모자(없으면 null) */
  hatKey: string | null;
  /** 함께 다니는 펫(없으면 null) */
  petKey: string | null;
  /** 연속으로 약속 칸을 채운 등교일 수 */
  streak: number;
  /** 오늘도 이미 채웠는지 */
  streakToday: boolean;
}

export interface ProofView {
  id: string;
  imageUrl: string;
}

export interface PromiseView {
  id: string;
  slotIndex: number;
  scope: "DAY" | "WEEK";
  subject: string;
  title: string;
  unitKind: UnitKind;
  unitStart: number;
  unitCount: number;
  rangeLabel: string;
  confirmedUnitNos: number[];
  questId: string | null;
  questNote: string;
  requireProof: boolean;
  reviewStatus: ReviewStatus;
  feedback: string;
  reviewedBy: string;
  proofs: ProofView[];
}

export interface TodayView {
  dateKey: string;
  label: string;
  isSchoolDay: boolean;
  reflected: boolean;
  promises: PromiseView[];
  weekly: PromiseView[];
}

export interface CardState {
  confirmedUnitNos: number[];
  reviewStatus: ReviewStatus;
  feedback: string;
  proofs: ProofView[];
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

export interface QuestView {
  id: string;
  studentId: string;
  studentName: string;
  teamName: string;
  kind: "DAILY" | "WEEKLY";
  subject: string;
  title: string;
  note: string;
  unitKind: UnitKind;
  unitStart: number;
  unitCount: number;
  rangeLabel: string;
  scheduleLabel: string;
  requireProof: boolean;
  active: boolean;
  createdBy: string;
}

export interface ReviewItemView {
  promiseId: string;
  studentId: string;
  studentName: string;
  hairKey: string;
  teamName: string;
  scope: "DAY" | "WEEK";
  dateLabel: string;
  subject: string;
  title: string;
  questNote: string;
  rangeLabel: string;
  unitKind: UnitKind;
  unitStart: number;
  unitCount: number;
  confirmedUnitNos: number[];
  requireProof: boolean;
  proofs: ProofView[];
  submittedAt: string | null;
  reviewStatus: ReviewStatus;
  feedback: string;
}

export interface StudentOverviewView {
  studentId: string;
  name: string;
  hairKey: string;
  teamName: string;
  todayScore: number;
  cards: { id: string; subject: string; title: string; scope: "DAY" | "WEEK"; reviewStatus: ReviewStatus; confirmed: number; planned: number }[];
}
