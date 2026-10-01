import { HAT_KEYS, isHatKey, type HatKey } from "@/utils/art/hats";
import { CREATURE_NAMES, type CreatureName } from "@/utils/art/cc0";
import { ACHIEVEMENTS } from "@/utils/achievement-rules";
import { BOSSES, bossForWeek } from "@/utils/boss-rules";

export interface HatItem {
  key: HatKey;
  name: string;
  cost: number;
  description: string;
}

/** 코인으로 사는 모자. 점수나 능력치에는 영향이 없고 겉모습만 바뀐다. */
export const HAT_ITEMS: readonly HatItem[] = [
  { key: "sprout", name: "새싹 모자", cost: 10, description: "머리에서 새싹이 쑥쑥 자라요" },
  { key: "flower", name: "꽃핀", cost: 12, description: "작은 하얀 꽃 한 송이" },
  { key: "headband", name: "별 머리띠", cost: 18, description: "반짝이는 별이 달린 분홍 머리띠" },
  { key: "ears", name: "고양이 귀", cost: 25, description: "쫑긋 세운 고양이 귀" },
  { key: "cap", name: "빨간 모자", cost: 30, description: "씩씩해 보이는 빨간 모자" },
  { key: "beret", name: "남색 베레모", cost: 35, description: "멋쟁이 화가의 베레모" },
  { key: "crown", name: "반짝 왕관", cost: 60, description: "금빛으로 반짝이는 왕관" },
];

const PURCHASE_PREFIX = "hat:";

/**
 * 모자를 산 기록(Purchase.itemKey)에 쓰는 이름. 앞마당 꾸미기 아이템과 섞이지 않게 접두어를 붙인다.
 */
export function hatPurchaseKey(hatKey: HatKey): string {
  return `${PURCHASE_PREFIX}${hatKey}`;
}

/**
 * 구매 기록 이름에서 모자를 찾는다. 모자가 아니면 undefined.
 */
export function findHatByPurchaseKey(itemKey: string): HatItem | undefined {
  return itemKey.startsWith(PURCHASE_PREFIX) ? HAT_ITEMS.find((item) => item.key === itemKey.slice(PURCHASE_PREFIX.length)) : undefined;
}

export interface PetInfo {
  key: string;
  name: string;
  /** boss: 학급 보스를 쓰러뜨려 만남 / achievement: 업적을 이뤄 만남 */
  source: "boss" | "achievement";
  /** 그림 묶음: kenney(몬스터) 또는 creatures(동물) */
  art: "kenney" | "creatures";
  sprite: string;
}

/** 동물 펫의 한국어 이름 (그림 이름과 같은 키) */
export const CREATURE_PET_NAMES: Readonly<Record<CreatureName, string>> = {
  chicken: "꼬꼬닭",
  sheep: "구름양",
  rabbit: "깡총토끼",
  fox: "꼬마여우",
  squirrel: "도토리다람쥐",
  raccoon: "너구리",
  frog: "폴짝개구리",
  turtle: "느림보거북",
  owl: "올빼미 박사",
  polarbear: "하양곰",
  tiger: "아기호랑이",
  elephant: "코끼리",
  cow: "얼룩소",
  giraffe: "기린",
};

/** 보스를 쓰러뜨리고 보상을 받으면 그 보스가 친구(펫)가 되고, 업적을 이루면 동물 친구가 생긴다. */
export const PETS: readonly PetInfo[] = [
  ...BOSSES.map((boss): PetInfo => ({ key: boss.key, name: boss.name, source: "boss", art: "kenney", sprite: boss.sprite })),
  ...CREATURE_NAMES.map((name): PetInfo => ({ key: name, name: CREATURE_PET_NAMES[name], source: "achievement", art: "creatures", sprite: name })),
];

/**
 * 펫 이름인지 확인한다.
 */
export function isPetKey(value: unknown): value is string {
  return typeof value === "string" && PETS.some((pet) => pet.key === value);
}

/**
 * 펫 정보를 찾는다.
 */
export function petFor(key: string | null | undefined): PetInfo | undefined {
  return PETS.find((pet) => pet.key === key);
}

/**
 * 보스 보상을 받은 주 목록에서, 만난 펫 이름들을 뽑는다. (같은 보스가 다시 나와도 한 번만 센다)
 */
export function unlockedPetKeys(claimedWeekKeys: readonly string[]): string[] {
  return [...new Set(claimedWeekKeys.map((weekKey) => bossForWeek(weekKey).key))];
}

/**
 * 펫을 만나는 방법을 한 줄로 알려 준다. (아직 못 만난 펫의 안내문)
 * 보스 펫은 그 보스가 나오는 주에, 동물 펫은 짝이 되는 업적을 이룰 때 만난다.
 */
export function petHint(pet: PetInfo): string {
  if (pet.source === "boss") {
    const boss = BOSSES.find((item) => item.key === pet.key);

    return `학급 보스 ‘${boss?.name ?? pet.name}’가 나오는 주에 쓰러뜨리고 보상을 받으면 친구가 돼요.`;
  }
  const achievement = ACHIEVEMENTS.find((item) => item.pet === pet.key);

  return achievement ? `업적 ‘${achievement.title}’을(를) 이루면 친구가 돼요. (${achievement.hint})` : "업적을 이루면 친구가 돼요.";
}

export { HAT_KEYS, isHatKey };
export type { HatKey };
