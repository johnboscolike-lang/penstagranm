import { describe, expect, it } from "vitest";

import { getCharacterArt, getHeadArt } from "@/utils/art/characters";
import { HAT_ART, HAT_KEYS, HAT_WIDTH, isHatKey, overlayHat } from "@/utils/art/hats";
import { BOSSES } from "@/utils/boss-rules";
import { HAT_ITEMS, PETS, findHatByPurchaseKey, hatPurchaseKey, isPetKey, petFor, unlockedPetKeys } from "@/utils/cosmetics";

describe("모자 도트", () => {
  it("모든 모자 줄이 얼굴 너비(14칸) 안에 들어온다", () => {
    HAT_KEYS.forEach((key) => {
      HAT_ART[key].rows.forEach((row) => expect(row.length, `${key}: ${row}`).toBeLessThanOrEqual(HAT_WIDTH));
    });
  });

  it("모자에 쓰인 모든 색 기호가 팔레트에 있다", () => {
    HAT_KEYS.forEach((key) => {
      const palette = HAT_ART[key].palette as Record<string, string>;
      const symbols = new Set(HAT_ART[key].rows.join("").replace(/\./g, ""));
      symbols.forEach((symbol) => expect(palette[symbol], `${key}의 ${symbol}`).toBeDefined());
    });
  });

  it("모자를 씌워도 도트 크기는 그대로고, 모자 색은 얼굴 색을 덮어쓰지 않는다", () => {
    const bare = getHeadArt("silver");
    HAT_KEYS.forEach((key) => {
      const worn = getHeadArt("silver", key);

      expect(worn.rows).toHaveLength(bare.rows.length);
      expect(worn.rows[0]).toHaveLength(bare.rows[0].length);
      Object.entries(bare.palette).forEach(([symbol, color]) => expect(worn.palette[symbol]).toBe(color));
    });
  });

  it("모자마다 겉모습이 달라진다", () => {
    const seen = new Set([getHeadArt("silver").rows.join("|")]);
    HAT_KEYS.forEach((key) => seen.add(getHeadArt("silver", key).rows.join("|")));

    expect(seen.size).toBe(HAT_KEYS.length + 1);
  });

  it("영웅에게 씌우면 머리 자리(왼쪽 위에서 2칸 안쪽)에 얹힌다", () => {
    const bare = getCharacterArt("hero", "silver");
    const worn = getCharacterArt("hero", "silver", "crown");

    expect(worn.rows).toHaveLength(bare.rows.length);
    expect(worn.rows[3]).not.toBe(bare.rows[3]);
    expect(worn.rows.slice(14)).toEqual(bare.rows.slice(14));
  });

  it("모르는 모자나 빈 값은 원래 도트를 그대로 돌려준다", () => {
    const bare = getHeadArt("rose");

    expect(overlayHat(bare, "없는모자")).toBe(bare);
    expect(overlayHat(bare, null)).toBe(bare);
    expect(overlayHat(bare, undefined)).toBe(bare);
    expect(isHatKey("crown")).toBe(true);
    expect(isHatKey("없는모자")).toBe(false);
  });
});

describe("모자 상점", () => {
  it("모든 모자에 이름·값이 있고 이름이 겹치지 않으며 도트가 있다", () => {
    expect(HAT_ITEMS).toHaveLength(HAT_KEYS.length);
    expect(new Set(HAT_ITEMS.map((item) => item.key)).size).toBe(HAT_KEYS.length);
    HAT_ITEMS.forEach((item) => {
      expect(isHatKey(item.key)).toBe(true);
      expect(item.cost).toBeGreaterThan(0);
      expect(item.name.length).toBeGreaterThan(0);
    });
  });

  it("구매 이름에 접두어를 붙여 앞마당 아이템과 섞이지 않게 한다", () => {
    expect(hatPurchaseKey("crown")).toBe("hat:crown");
    expect(findHatByPurchaseKey("hat:crown")?.name).toBe("반짝 왕관");
    expect(findHatByPurchaseKey("crown")).toBeUndefined();
    expect(findHatByPurchaseKey("hat:없음")).toBeUndefined();
    expect(findHatByPurchaseKey("lamp")).toBeUndefined();
  });
});

describe("펫", () => {
  it("보스마다 펫이 하나씩 있다", () => {
    expect(PETS).toHaveLength(BOSSES.length);
    PETS.forEach((pet) => expect(isPetKey(pet.key)).toBe(true));
    expect(isPetKey("dragon")).toBe(false);
    expect(petFor("slime")?.name).toBe("말랑 슬라임");
    expect(petFor("dragon")).toBeUndefined();
    expect(petFor(null)).toBeUndefined();
  });

  it("보상을 받은 주에 나온 보스가 펫으로 풀리고 같은 보스는 한 번만 센다", () => {
    const first = unlockedPetKeys(["2026-09-28"]);
    const cycle = new Date(Date.UTC(2026, 8, 28 + 7 * BOSSES.length)).toISOString().slice(0, 10);

    expect(first).toHaveLength(1);
    expect(unlockedPetKeys(["2026-09-28", cycle])).toEqual(first);
    expect(unlockedPetKeys(["2026-09-28", "2026-10-05"])).toHaveLength(2);
    expect(unlockedPetKeys([])).toEqual([]);
  });
});
