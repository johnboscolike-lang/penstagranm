import { Prisma } from "@prisma/client";

import { ACHIEVEMENTS, earnedKeys, findAchievement, progressOf, type AchievementMetrics } from "@/utils/achievement-rules";
import type { AchievementBoardView, AchievementToastView } from "@/utils/achievement-types";
import { QUESTION_COUNT } from "@/utils/arena-rules";
import { CREATURE_PET_NAMES } from "@/utils/cosmetics";
import { prisma } from "@/utils/prisma";
import { MASTERED_DAYS } from "@/utils/word-review";
import type { DbClient } from "@/utils/quest-repository";

/**
 * 학생의 기록을 모아 업적 조건에 쓸 값으로 만든다. (연속 실천 일수는 이미 계산해 둔 값을 받는다)
 */
export async function collectMetrics(client: DbClient, studentId: string, streak: number): Promise<AchievementMetrics> {
  const mine = { OR: [{ challengerId: studentId }, { opponentId: studentId }] };
  const [student, confirmedUnits, duelsPlayed, duelWins, perfectDuels, bossClaims, hatsOwned, posts, emotesSent, wordsLearned, wordsMastered] = await Promise.all([
    client.student.findUnique({ where: { id: studentId }, select: { rating: true } }),
    client.promiseUnit.count({ where: { promise: { studentId, NOT: { reviewStatus: "RETRY" } } } }),
    client.duel.count({ where: { status: "DONE", ...mine } }),
    client.duel.count({ where: { status: "DONE", OR: [{ challengerId: studentId, outcome: "WIN" }, { opponentId: studentId, outcome: "LOSE" }] } }),
    client.duel.count({
      where: { status: "DONE", OR: [{ challengerId: studentId, challengerCorrect: QUESTION_COUNT }, { opponentId: studentId, opponentCorrect: QUESTION_COUNT }] },
    }),
    client.bossReward.count({ where: { studentId } }),
    client.purchase.count({ where: { studentId, itemKey: { startsWith: "hat:" } } }),
    client.post.count({ where: { studentId } }),
    client.duel.count({
      where: { status: "DONE", OR: [{ challengerId: studentId, challengerEmote: { not: null } }, { opponentId: studentId, opponentEmote: { not: null } }] },
    }),
    client.wordCard.count({ where: { studentId } }),
    client.wordCard.count({ where: { studentId, state: 2, scheduledDays: { gte: MASTERED_DAYS } } }),
  ]);

  return {
    streak,
    confirmedUnits,
    duelsPlayed,
    duelWins,
    perfectDuels,
    rating: student?.rating ?? 1000,
    bossClaims,
    hatsOwned,
    posts,
    emotesSent,
    wordsLearned,
    wordsMastered,
  };
}

/**
 * 업적을 알림용 모양으로 바꾼다.
 */
function toToast(key: string): AchievementToastView | null {
  const def = findAchievement(key);

  return def ? { key: def.key, title: def.title, icon: def.icon, petName: CREATURE_PET_NAMES[def.pet] } : null;
}

/**
 * 지금 기록으로 이룬 업적을 저장하고(이미 있는 것은 그대로), 이룬 업적 전체와 아직 알리지 않은 것을 돌려준다.
 * 같은 요청이 겹쳐도 (학생, 업적) 유일 키 덕분에 한 번만 남는다.
 */
export async function syncAchievements(client: DbClient, studentId: string, streak: number): Promise<{ earned: string[]; fresh: AchievementToastView[] }> {
  const [metrics, stored] = await Promise.all([collectMetrics(client, studentId, streak), client.achievement.findMany({ where: { studentId }, select: { key: true, seen: true } })]);
  const have = new Set(stored.map((row) => row.key));
  const missing = earnedKeys(metrics).filter((key) => !have.has(key));

  for (const key of missing) {
    try {
      await client.achievement.create({ data: { studentId, key } });
    } catch (error: unknown) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) {
        throw error;
      }
    }
  }
  const freshKeys = [...stored.filter((row) => !row.seen).map((row) => row.key), ...missing];
  const earned = [...have, ...missing].filter((key) => findAchievement(key));

  return { earned, fresh: freshKeys.flatMap((key) => toToast(key) ?? []) };
}

/**
 * 알림으로 알려 준 업적을 "봤음"으로 바꾼다. 내 업적만 바꾸고, 모르는 이름은 무시한다.
 */
export async function markAchievementsSeen(studentId: string, keys: readonly string[]): Promise<number> {
  const known = keys.filter((key) => findAchievement(key));
  if (known.length === 0) {
    return 0;
  }
  const result = await prisma.achievement.updateMany({ where: { studentId, key: { in: known }, seen: false }, data: { seen: true } });

  return result.count;
}

/**
 * 내공간의 업적판: 모든 업적과 이뤘는지, 얼마나 왔는지.
 */
export async function getAchievementBoard(studentId: string, streak: number): Promise<AchievementBoardView> {
  const [metrics, stored] = await Promise.all([collectMetrics(prisma, studentId, streak), prisma.achievement.findMany({ where: { studentId }, select: { key: true } })]);
  const have = new Set(stored.map((row) => row.key));

  const items = ACHIEVEMENTS.map((def) => {
    const progress = progressOf(def, metrics);

    return {
      key: def.key,
      title: def.title,
      hint: def.hint,
      icon: def.icon,
      pet: def.pet,
      petName: CREATURE_PET_NAMES[def.pet],
      earned: have.has(def.key),
      value: progress.value,
      target: progress.target,
      percent: progress.percent,
    };
  });

  return { earnedCount: items.filter((item) => item.earned).length, total: items.length, items };
}
