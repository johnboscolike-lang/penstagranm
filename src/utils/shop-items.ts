export const SHOP_ITEM_KEYS = ["lamp", "banner", "flowerbed", "bench", "bookshelf", "treebed"] as const;

export type ShopItemKey = (typeof SHOP_ITEM_KEYS)[number];

export interface ShopItem {
  key: ShopItemKey;
  name: string;
  cost: number;
  description: string;
}

/**
 * 코인으로 살 수 있는 앞마당 꾸미기 아이템. 경쟁 점수·능력치에는 영향을 주지 않는다.
 */
export const SHOP_ITEMS: readonly ShopItem[] = [
  { key: "lamp", name: "가로등", cost: 20, description: "저녁 앞마당을 밝혀 줘요" },
  { key: "banner", name: "깃발", cost: 15, description: "새싹 문양이 새겨진 깃발" },
  { key: "flowerbed", name: "화단", cost: 25, description: "알록달록 꽃이 피는 화단" },
  { key: "bench", name: "벤치", cost: 30, description: "쉬어 가는 나무 벤치" },
  { key: "bookshelf", name: "책장", cost: 40, description: "읽은 책을 꽂아 두는 책장" },
  { key: "treebed", name: "나무 화단", cost: 50, description: "작은 나무가 자라는 돌 화단" },
] as const;

/**
 * Finds a shop item definition by key, or undefined for unknown keys.
 */
export function findShopItem(key: string): ShopItem | undefined {
  return SHOP_ITEMS.find((item) => item.key === key);
}

/**
 * Computes the spendable coin balance: coins earned minus coins already spent.
 */
export function calcCoinBalance(earnedCoins: number, spentCoins: number): number {
  return Math.max(0, earnedCoins - spentCoins);
}
