import type { CreatureName, ItemName } from "@/utils/art/cc0";

/** 업적 조건을 따질 때 쓰는 학생의 기록 모음 */
export interface AchievementMetrics {
  /** 약속 칸을 채운 연속 등교일 수 (지금 이어지고 있는 것) */
  streak: number;
  /** 지금까지 채운 약속 칸 수 (다시 시도로 돌려보낸 카드는 제외) */
  confirmedUnits: number;
  /** 끝난 대결 수 */
  duelsPlayed: number;
  /** 이긴 대결 수 */
  duelWins: number;
  /** 문제를 모두 맞힌 대결 수 */
  perfectDuels: number;
  /** 지금 대결 점수 */
  rating: number;
  /** 학급 보스를 쓰러뜨리고 받은 보상 수 */
  bossClaims: number;
  /** 가지고 있는 모자 수 */
  hatsOwned: number;
  /** 올린 성장 기록(네 컷) 수 */
  posts: number;
  /** 대결 뒤 친구에게 보낸 응원 이모트 수 */
  emotesSent: number;
}

export type MetricKey = keyof AchievementMetrics;

export interface AchievementDef {
  key: string;
  title: string;
  /** 어떻게 얻는지 한 줄 */
  hint: string;
  metric: MetricKey;
  target: number;
  icon: ItemName;
  /** 이 업적을 이루면 만나는 동물 펫 */
  pet: CreatureName;
}

/** 업적 목록. 하나를 이룰 때마다 동물 친구가 한 마리씩 생긴다. 모두 기록으로만 판단하고 남과 비교하지 않는다. */
export const ACHIEVEMENTS: readonly AchievementDef[] = [
  { key: "first-step", title: "첫걸음", hint: "약속 칸을 처음 채워요", metric: "confirmedUnits", target: 1, icon: "feather", pet: "chicken" },
  { key: "acorn-collector", title: "도토리 모으기", hint: "약속 칸 50개를 채워요", metric: "confirmedUnits", target: 50, icon: "honey", pet: "squirrel" },
  { key: "elephant-memory", title: "코끼리 기억력", hint: "약속 칸 200개를 채워요", metric: "confirmedUnits", target: 200, icon: "gemPurple", pet: "elephant" },
  { key: "counting-sheep", title: "양 세기", hint: "3일 연속 약속을 실천해요", metric: "streak", target: 3, icon: "onigiri", pet: "sheep" },
  { key: "slow-and-steady", title: "느려도 꾸준히", hint: "10일 연속 약속을 실천해요", metric: "streak", target: 10, icon: "fish", pet: "turtle" },
  { key: "first-duel", title: "첫 대결", hint: "퀴즈 대결을 한 판 끝내요", metric: "duelsPlayed", target: 1, icon: "goldKey", pet: "frog" },
  { key: "clever-fox", title: "영리한 여우", hint: "퀴즈 대결에서 5번 이겨요", metric: "duelWins", target: 5, icon: "goldCup", pet: "fox" },
  { key: "tiger-warrior", title: "호랑이 용사", hint: "퀴즈 대결에서 문제를 모두 맞혀요", metric: "perfectDuels", target: 1, icon: "gemRed", pet: "tiger" },
  { key: "flower-league", title: "꽃 리그 입성", hint: "대결 점수 1080점에 닿아요", metric: "rating", target: 1080, icon: "silverCup", pet: "polarbear" },
  { key: "boss-hunter", title: "보스 사냥꾼", hint: "학급 보스를 함께 쓰러뜨려요", metric: "bossClaims", target: 1, icon: "goldCoin", pet: "rabbit" },
  { key: "fashionista", title: "멋쟁이", hint: "모자를 3개 모아요", metric: "hatsOwned", target: 3, icon: "heart", pet: "raccoon" },
  { key: "record-keeper", title: "기록 장인", hint: "네 컷 성장 기록을 3개 올려요", metric: "posts", target: 3, icon: "lifePot", pet: "owl" },
];

/**
 * 기록이 업적 목표에 닿았는지 확인한다.
 */
export function isAchieved(def: AchievementDef, metrics: AchievementMetrics): boolean {
  return metrics[def.metric] >= def.target;
}

/**
 * 지금 기록으로 이룬 업적 이름들.
 */
export function earnedKeys(metrics: AchievementMetrics): string[] {
  return ACHIEVEMENTS.filter((def) => isAchieved(def, metrics)).map((def) => def.key);
}

/**
 * 진행 상황. 목표를 넘겨도 목표 값까지만 보여 준다.
 */
export function progressOf(def: AchievementDef, metrics: AchievementMetrics): { value: number; target: number; percent: number } {
  const value = Math.min(Math.max(0, metrics[def.metric]), def.target);

  return { value, target: def.target, percent: Math.round((value / def.target) * 100) };
}

/**
 * 업적 정보를 찾는다.
 */
export function findAchievement(key: string): AchievementDef | undefined {
  return ACHIEVEMENTS.find((def) => def.key === key);
}

/**
 * 업적을 이루면 만나는 펫(동물) 이름을 이룬 업적들에서 모은다. 모르는 업적 이름은 무시한다.
 */
export function petsFromAchievements(keys: readonly string[]): CreatureName[] {
  const owned = new Set(keys);

  return ACHIEVEMENTS.filter((def) => owned.has(def.key)).map((def) => def.pet);
}

/** 기록이 하나도 없을 때의 값 */
export const EMPTY_METRICS: AchievementMetrics = {
  streak: 0,
  confirmedUnits: 0,
  duelsPlayed: 0,
  duelWins: 0,
  perfectDuels: 0,
  rating: 1000,
  bossClaims: 0,
  hatsOwned: 0,
  posts: 0,
  emotesSent: 0,
};
