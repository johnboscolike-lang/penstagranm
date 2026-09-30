import { BOSSES } from "@/utils/boss-rules";
import type { ClosetView } from "@/utils/closet-types";
import { HAT_ITEMS, hatPurchaseKey, petHint, PETS } from "@/utils/cosmetics";
import { prisma } from "@/utils/prisma";
import { QuestError, loadWardrobe } from "@/utils/quest-repository";

export type ClosetSlot = "hat" | "pet";

/**
 * 옷장 화면 데이터: 모자와 펫 목록, 가지고 있는지, 지금 쓰고 있는지.
 */
export async function getCloset(studentId: string): Promise<ClosetView> {
  const wardrobe = await loadWardrobe(prisma, studentId);
  if (!wardrobe.found) {
    throw new QuestError("NOT_FOUND", "학생 정보를 찾을 수 없어요. 다시 입장해 주세요.");
  }
  const { hatKey, petKey } = wardrobe;

  return {
    hatKey,
    petKey,
    hats: HAT_ITEMS.map((item) => ({
      key: item.key,
      name: item.name,
      cost: item.cost,
      description: item.description,
      owned: wardrobe.ownedHatKeys.has(item.key),
      equipped: hatKey === item.key,
      purchaseKey: hatPurchaseKey(item.key),
    })),
    pets: PETS.map((pet) => ({
      key: pet.key,
      name: pet.name,
      sprite: pet.sprite,
      owned: wardrobe.ownedPetKeys.has(pet.key),
      equipped: petKey === pet.key,
      hint: petHint(BOSSES.find((boss) => boss.key === pet.key) ?? BOSSES[0]),
    })),
  };
}

/**
 * 모자나 펫을 쓰거나(key) 벗는다(null). 가지고 있는 것만 쓸 수 있다.
 */
export async function equipCosmetic(input: { studentId: string; slot: ClosetSlot; key: string | null }): Promise<ClosetView> {
  if (input.key !== null) {
    const closet = await getCloset(input.studentId);
    const found = input.slot === "hat" ? closet.hats.find((hat) => hat.key === input.key) : closet.pets.find((pet) => pet.key === input.key);
    if (!found) {
      throw new QuestError("UNKNOWN_ITEM", input.slot === "hat" ? "없는 모자예요." : "없는 펫이에요.");
    }
    if (!found.owned) {
      throw new QuestError("LOCKED", input.slot === "hat" ? "아직 가지고 있지 않은 모자예요." : "아직 만나지 못한 펫이에요.");
    }
  }
  await prisma.student.update({ where: { id: input.studentId }, data: input.slot === "hat" ? { hatKey: input.key } : { petKey: input.key } });

  return getCloset(input.studentId);
}
