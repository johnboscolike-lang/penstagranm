import { HAT_KEYS, isHatKey, type HatKey } from "@/utils/art/hats";
import type { KenneyName } from "@/utils/art/kenney";
import { BOSSES, bossForWeek, type BossInfo } from "@/utils/boss-rules";

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
  sprite: KenneyName;
}

/** 보스를 쓰러뜨리고 보상을 받으면 그 보스가 친구(펫)가 된다. 펫 이름은 보스 이름을 따른다. */
export const PETS: readonly PetInfo[] = BOSSES.map((boss) => ({ key: boss.key, name: boss.name, sprite: boss.sprite }));

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
 */
export function petHint(boss: BossInfo): string {
  return `학급 보스 ‘${boss.name}’가 나오는 주에 쓰러뜨리고 보상을 받으면 친구가 돼요.`;
}

export { HAT_KEYS, isHatKey };
export type { HatKey };
