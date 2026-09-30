// @vitest-environment node
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { bossForWeek } from "@/utils/boss-rules";
import { createTempDatabase } from "./helpers/temp-db";

type Closet = typeof import("@/utils/closet-repository");
type Repo = typeof import("@/utils/quest-repository");
type PrismaModule = typeof import("@/utils/prisma");

let closet: Closet;
let repo: Repo;
let prisma: PrismaModule["prisma"];
let disposeDatabase: () => Promise<void>;
const ids: Record<string, string> = {};

const WEEK = "2026-09-28";

/**
 * 코인을 벌어 둔 것처럼 끝난 대결 기록을 만든다.
 */
async function giveCoins(student: string, coins: number): Promise<void> {
  await prisma.duel.create({
    data: {
      challengerId: ids[student],
      opponentId: ids.b,
      category: "MATH",
      questions: "[]",
      status: "DONE",
      dateKey: WEEK,
      finishedKey: WEEK,
      challengerCoins: coins,
    },
  });
}

beforeAll(async () => {
  disposeDatabase = (await createTempDatabase()).dispose;
  closet = await import("@/utils/closet-repository");
  repo = await import("@/utils/quest-repository");
  ({ prisma } = await import("@/utils/prisma"));

  const team = await prisma.team.create({ data: { name: "빨강팀", emblem: "star" } });
  for (const [key, name] of [["a", "가온"], ["b", "나래"]] as const) {
    ids[key] = (await prisma.student.create({ data: { name, hairKey: "silver", teamId: team.id } })).id;
  }
});

afterEach(async () => {
  await prisma.student.updateMany({ data: { hatKey: null, petKey: null } });
  await prisma.purchase.deleteMany();
  await prisma.bossReward.deleteMany();
  await prisma.duel.deleteMany();
});

afterAll(async () => {
  await disposeDatabase();
});

describe("모자 사기", () => {
  it("코인이 있으면 모자를 사고, 앞마당 아이템과 따로 가지고 있는다", async () => {
    await giveCoins("a", 100);

    await expect(repo.purchaseItem(ids.a, "hat:crown")).resolves.toEqual({ coins: 40 });
    const view = await closet.getCloset(ids.a);

    expect(view.hats.find((hat) => hat.key === "crown")).toMatchObject({ owned: true, equipped: false });
    expect(view.hats.filter((hat) => hat.owned)).toHaveLength(1);
    expect(await repo.getOwnedItemKeys(ids.a)).toEqual(["hat:crown"]);
  });

  it("코인이 모자라거나 이미 있거나 없는 모자면 살 수 없다", async () => {
    await expect(repo.purchaseItem(ids.a, "hat:crown")).rejects.toMatchObject({ code: "INSUFFICIENT_COINS" });
    await expect(repo.purchaseItem(ids.a, "hat:없음")).rejects.toMatchObject({ code: "UNKNOWN_ITEM" });

    await giveCoins("a", 100);
    await repo.purchaseItem(ids.a, "hat:cap");
    await expect(repo.purchaseItem(ids.a, "hat:cap")).rejects.toMatchObject({ code: "ALREADY_OWNED" });
  });
});

describe("모자 쓰기", () => {
  it("가진 모자만 쓰고, 다른 모자로 바꾸거나 벗을 수 있다", async () => {
    await giveCoins("a", 100);
    await repo.purchaseItem(ids.a, "hat:cap");
    await repo.purchaseItem(ids.a, "hat:ears");

    expect((await closet.equipCosmetic({ studentId: ids.a, slot: "hat", key: "cap" })).hatKey).toBe("cap");
    expect((await closet.equipCosmetic({ studentId: ids.a, slot: "hat", key: "ears" })).hats.find((hat) => hat.equipped)?.key).toBe("ears");
    expect((await closet.equipCosmetic({ studentId: ids.a, slot: "hat", key: null })).hatKey).toBeNull();
  });

  it("없는 모자·갖지 않은 모자는 쓸 수 없다", async () => {
    await expect(closet.equipCosmetic({ studentId: ids.a, slot: "hat", key: "없음" })).rejects.toMatchObject({ code: "UNKNOWN_ITEM" });
    await expect(closet.equipCosmetic({ studentId: ids.a, slot: "hat", key: "crown" })).rejects.toMatchObject({ code: "LOCKED" });
  });

  it("다른 학생이 산 모자를 쓸 수 없고, 쓴 모자는 내 화면에만 반영된다", async () => {
    await giveCoins("a", 100);
    await repo.purchaseItem(ids.a, "hat:cap");
    await closet.equipCosmetic({ studentId: ids.a, slot: "hat", key: "cap" });

    await expect(closet.equipCosmetic({ studentId: ids.b, slot: "hat", key: "cap" })).rejects.toMatchObject({ code: "LOCKED" });
    expect((await closet.getCloset(ids.b)).hatKey).toBeNull();
  });

  it("DB에 남은 값이 가지고 있지 않은 모자여도 쓴 것으로 보여 주지 않는다", async () => {
    await prisma.student.update({ where: { id: ids.a }, data: { hatKey: "crown" } });

    expect((await closet.getCloset(ids.a)).hatKey).toBeNull();
    expect((await repo.getPageBase(ids.a)).hud.hatKey).toBeNull();
  });
});

describe("펫 만나기", () => {
  it("보스 보상을 받아야 그 보스가 펫이 되고, 그 전에는 쓸 수 없다", async () => {
    const boss = bossForWeek(WEEK);
    await expect(closet.equipCosmetic({ studentId: ids.a, slot: "pet", key: boss.key })).rejects.toMatchObject({ code: "LOCKED" });

    await prisma.bossReward.create({ data: { studentId: ids.a, weekKey: WEEK, xp: 30, coins: 8 } });
    const view = await closet.equipCosmetic({ studentId: ids.a, slot: "pet", key: boss.key });

    expect(view.petKey).toBe(boss.key);
    expect(view.pets.find((pet) => pet.key === boss.key)).toMatchObject({ owned: true, equipped: true });
    expect(view.pets.filter((pet) => pet.owned)).toHaveLength(1);
    expect((await closet.equipCosmetic({ studentId: ids.a, slot: "pet", key: null })).petKey).toBeNull();
  });

  it("없는 펫 이름은 거절한다", async () => {
    await expect(closet.equipCosmetic({ studentId: ids.a, slot: "pet", key: "dragon" })).rejects.toMatchObject({ code: "UNKNOWN_ITEM" });
  });
});

describe("화면 위쪽 정보", () => {
  it("쓰고 있는 모자와 펫이 어디서나 보이는 상단 정보에 들어간다", async () => {
    await giveCoins("a", 100);
    await repo.purchaseItem(ids.a, "hat:sprout");
    await prisma.bossReward.create({ data: { studentId: ids.a, weekKey: WEEK, xp: 30, coins: 8 } });
    await closet.equipCosmetic({ studentId: ids.a, slot: "hat", key: "sprout" });
    await closet.equipCosmetic({ studentId: ids.a, slot: "pet", key: bossForWeek(WEEK).key });

    const { hud } = await repo.getPageBase(ids.a);

    expect(hud.hatKey).toBe("sprout");
    expect(hud.petKey).toBe(bossForWeek(WEEK).key);
  });
});
