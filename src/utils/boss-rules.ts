import type { KenneyName } from "@/utils/art/kenney";

export const MIN_BOSS_HP = 60;
/** 끝난 대결 한 판이 참가자 한 명마다 보스에게 주는 피해 */
export const DUEL_DAMAGE = 4;
/** 보상을 받으려면 이번 주에 최소한 이만큼은 보스에게 피해를 줘야 한다. */
export const MIN_CONTRIBUTION = 1;
export const BOSS_REWARD = { xp: 30, coins: 8 } as const;

export type RaidLevelKey = "easy" | "normal" | "hard";

export interface RaidLevel {
  key: RaidLevelKey;
  label: string;
  hpPerStudent: number;
  hint: string;
}

/** 선생님이 고르는 보스 난이도. 학생 한 명당 체력이라 반 크기가 달라도 비슷한 속도로 싸운다. */
export const RAID_LEVELS: readonly RaidLevel[] = [
  { key: "easy", label: "쉬움", hpPerStudent: 40, hint: "약속 분량이 적거나 처음 시작할 때" },
  { key: "normal", label: "보통", hpPerStudent: 60, hint: "성실하게 하면 금요일쯤 쓰러져요" },
  { key: "hard", label: "어려움", hpPerStudent: 90, hint: "분량이 많거나 대결도 자주 하는 반" },
];

export const DEFAULT_RAID_LEVEL: RaidLevelKey = "normal";

/**
 * 문자열이 보스 난이도 이름인지 확인한다.
 */
export function isRaidLevelKey(value: unknown): value is RaidLevelKey {
  return RAID_LEVELS.some((level) => level.key === value);
}

/**
 * 난이도 이름에 맞는 정보를 찾는다. 모르는 값이면 기본 난이도를 준다.
 */
export function raidLevelFor(key: unknown): RaidLevel {
  return RAID_LEVELS.find((level) => level.key === key) ?? RAID_LEVELS.find((level) => level.key === DEFAULT_RAID_LEVEL) ?? RAID_LEVELS[0];
}

export interface BossInfo {
  key: string;
  name: string;
  sprite: KenneyName;
  /** 화면에 한 줄로 보여 줄 소개 */
  intro: string;
}

/** 주마다 돌아가며 나오는 보스. 순서는 주 시작 날짜로 정해져서 모든 학생에게 같다. */
export const BOSSES: readonly BossInfo[] = [
  { key: "slime", name: "말랑 슬라임", sprite: "slime", intro: "말랑말랑해 보여도 끈질겨요. 칸을 모아 톡톡 눌러 줘요!" },
  { key: "bat", name: "깜깜 박쥐", sprite: "bat", intro: "밤새 날아다니다 교실에 들어왔어요. 아침 약속으로 쫓아내요!" },
  { key: "ghost", name: "두근 유령", sprite: "ghost", intro: "숙제를 미루면 더 커져요. 오늘 칸을 채워서 사라지게 해요!" },
  { key: "spider", name: "거미줄 대장", sprite: "spider", intro: "칸 사이사이에 거미줄을 쳤어요. 함께 걷어 내요!" },
  { key: "wolf", name: "달빛 늑대", sprite: "wolf", intro: "달빛을 받으면 강해져요. 해가 있을 때 힘을 모아요!" },
  { key: "imp", name: "장난꾸러기 임프", sprite: "imp", intro: "장난을 좋아하지만 팀워크에는 약해요!" },
  { key: "rat", name: "치즈 도둑 쥐", sprite: "rat", intro: "우리 반 간식을 노려요. 다 같이 지켜요!" },
  { key: "cyclops", name: "외눈 대왕", sprite: "cyclops", intro: "이번 주의 대장이에요. 온 교실이 힘을 합쳐야 해요!" },
];

export type BossMood = "fresh" | "hurt" | "weak" | "down";

export interface RaidContribution {
  studentId: string;
  units: number;
  duels: number;
  damage: number;
}

export interface RaidStatus {
  weekKey: string;
  boss: BossInfo;
  maxHp: number;
  damage: number;
  hpLeft: number;
  /** 남은 체력 비율 (0~100) */
  percentLeft: number;
  defeated: boolean;
  mood: BossMood;
  /** 피해가 큰 순서 */
  ranking: RaidContribution[];
}

const DAY_MS = 86_400_000;

/**
 * 그 주(월요일 날짜)에 나오는 보스. 날짜가 같으면 항상 같은 보스다.
 */
export function bossForWeek(weekKey: string): BossInfo {
  const weeks = Math.floor(new Date(`${weekKey}T00:00:00Z`).getTime() / (7 * DAY_MS));
  const index = ((weeks % BOSSES.length) + BOSSES.length) % BOSSES.length;

  return BOSSES[index];
}

/**
 * 보스의 최대 체력. 학생이 많으면 더 튼튼하지만 너무 작은 반도 놀이가 되도록 바닥을 둔다.
 */
export function raidMaxHp(playerCount: number, hpPerStudent: number = raidLevelFor(DEFAULT_RAID_LEVEL).hpPerStudent): number {
  return Math.max(MIN_BOSS_HP, Math.max(0, Math.floor(playerCount)) * hpPerStudent);
}

/**
 * 한 학생이 보스에게 준 피해: 선생님이 확인 중이거나 확인한 칸 하나가 1, 끝난 대결 한 판이 DUEL_DAMAGE.
 */
export function damageOf(units: number, duels: number): number {
  return Math.max(0, Math.floor(units)) + Math.max(0, Math.floor(duels)) * DUEL_DAMAGE;
}

/**
 * 남은 체력 비율에 따른 보스 표정. 처치되면 down.
 */
export function bossMood(percentLeft: number, defeated: boolean): BossMood {
  if (defeated) {
    return "down";
  }
  if (percentLeft <= 25) {
    return "weak";
  }

  return percentLeft <= 70 ? "hurt" : "fresh";
}

/**
 * 학생별 기록을 모아 이번 주 보스의 상태를 계산한다.
 */
export function buildRaid(input: {
  weekKey: string;
  playerCount: number;
  hpPerStudent?: number;
  contributions: { studentId: string; units: number; duels: number }[];
}): RaidStatus {
  const ranking = input.contributions
    .map((entry) => ({ ...entry, damage: damageOf(entry.units, entry.duels) }))
    .sort((left, right) => right.damage - left.damage || left.studentId.localeCompare(right.studentId));
  const maxHp = raidMaxHp(input.playerCount, input.hpPerStudent);
  const damage = ranking.reduce((sum, entry) => sum + entry.damage, 0);
  const hpLeft = Math.max(0, maxHp - damage);
  const percentLeft = Math.round((hpLeft / maxHp) * 100);
  const defeated = hpLeft === 0;

  return {
    weekKey: input.weekKey,
    boss: bossForWeek(input.weekKey),
    maxHp,
    damage: Math.min(damage, maxHp),
    hpLeft,
    percentLeft,
    defeated,
    mood: bossMood(percentLeft, defeated),
    ranking,
  };
}

/**
 * 보상을 받을 수 있는지와, 못 받는다면 이유를 알려 준다.
 */
export function explainRewardBlock(input: { defeated: boolean; myDamage: number; claimed: boolean }): string | null {
  if (input.claimed) {
    return "이미 보상을 받았어요.";
  }
  if (!input.defeated) {
    return "아직 보스가 쓰러지지 않았어요. 조금만 더 힘을 모아요!";
  }
  if (input.myDamage < MIN_CONTRIBUTION) {
    return "그 주에 한 번도 참여하지 못해서 보상은 받을 수 없어요.";
  }

  return null;
}

/**
 * 보스를 쓰러뜨리기까지 하루 평균 몇 점의 피해가 더 필요한지 (남은 평일 수 기준, 최소 1일).
 */
export function damageNeededPerDay(hpLeft: number, schoolDaysLeft: number): number {
  return Math.ceil(hpLeft / Math.max(1, schoolDaysLeft));
}
