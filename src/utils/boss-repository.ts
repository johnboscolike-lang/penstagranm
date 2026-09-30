import { Prisma } from "@prisma/client";

import {
  BOSS_REWARD,
  DEFAULT_RAID_LEVEL,
  buildRaid,
  damageNeededPerDay,
  explainRewardBlock,
  isRaidLevelKey,
  raidLevelFor,
  type RaidLevel,
  type RaidLevelKey,
  type RaidStatus,
} from "@/utils/boss-rules";
import type { RaidRewardView, RaidView } from "@/utils/boss-types";
import { addDaysToKey, getWeekStartKey, getWeekdayIndex } from "@/utils/kst";
import { prisma } from "@/utils/prisma";
import { QuestError, countConfirmed } from "@/utils/quest-repository";
import { countsTowardScore, toReviewStatus } from "@/utils/quest-review";

const TOP_COUNT = 5;
const RAID_LEVEL_KEY = "raidLevel";

interface WeekTally {
  raid: RaidStatus;
  playerCount: number;
}

/**
 * 선생님이 정한 보스 난이도. 정한 적이 없으면 기본 난이도다.
 */
export async function getRaidLevel(): Promise<RaidLevel> {
  const row = await prisma.classSetting.findUnique({ where: { key: RAID_LEVEL_KEY } });

  return raidLevelFor(row?.value ?? DEFAULT_RAID_LEVEL);
}

/**
 * 보스 난이도를 바꾼다. 이미 진행 중인 주에도 바로 적용된다.
 */
export async function setRaidLevel(key: RaidLevelKey): Promise<RaidLevel> {
  if (!isRaidLevelKey(key)) {
    throw new QuestError("INVALID", "알 수 없는 난이도예요.");
  }
  await prisma.classSetting.upsert({ where: { key: RAID_LEVEL_KEY }, create: { key: RAID_LEVEL_KEY, value: key }, update: { value: key } });

  return raidLevelFor(key);
}

/**
 * 선생님 화면용 보스 현황: 난이도, 이번 주 보스의 체력, 쓰러뜨렸는지, 보상을 받은 학생 수.
 */
export async function getRaidTeacherSummary(todayKey: string): Promise<{
  level: RaidLevelKey;
  bossName: string;
  hpLeft: number;
  maxHp: number;
  percentLeft: number;
  defeated: boolean;
  claimedCount: number;
  playerCount: number;
}> {
  const weekKey = getWeekStartKey(todayKey);
  const [{ raid, playerCount }, level, claimedCount] = await Promise.all([
    loadWeekRaid(weekKey),
    getRaidLevel(),
    prisma.bossReward.count({ where: { weekKey } }),
  ]);

  return {
    level: level.key,
    bossName: raid.boss.name,
    hpLeft: raid.hpLeft,
    maxHp: raid.maxHp,
    percentLeft: raid.percentLeft,
    defeated: raid.defeated,
    claimedCount,
    playerCount,
  };
}

/**
 * 그 주(월~일)에 학생마다 모은 칸 수와 끝낸 대결 수를 읽어 보스 상태를 만든다.
 * 선생님이 "다시 시도"로 돌려보낸 카드는 다시 제출하기 전까지 세지 않는다.
 */
async function loadWeekRaid(weekKey: string): Promise<WeekTally> {
  const weekEnd = addDaysToKey(weekKey, 6);
  const [level, students, cards, duels] = await Promise.all([
    getRaidLevel(),
    prisma.student.findMany({ select: { id: true } }),
    prisma.dailyPromise.findMany({
      where: { dateKey: { gte: weekKey, lte: weekEnd } },
      select: { studentId: true, unitStart: true, unitCount: true, reviewStatus: true, units: { select: { unitNo: true } } },
    }),
    prisma.duel.findMany({
      where: { status: "DONE", finishedKey: { gte: weekKey, lte: weekEnd } },
      select: { challengerId: true, opponentId: true },
    }),
  ]);

  const tally = new Map<string, { studentId: string; units: number; duels: number }>();
  students.forEach((student) => tally.set(student.id, { studentId: student.id, units: 0, duels: 0 }));
  cards.forEach((card) => {
    const entry = tally.get(card.studentId);
    if (entry && countsTowardScore(toReviewStatus(card.reviewStatus))) {
      entry.units += countConfirmed(card);
    }
  });
  duels.forEach((duel) => {
    [duel.challengerId, duel.opponentId].forEach((studentId) => {
      const entry = tally.get(studentId);
      if (entry) {
        entry.duels += 1;
      }
    });
  });

  return {
    raid: buildRaid({ weekKey, playerCount: students.length, hpPerStudent: level.hpPerStudent, contributions: [...tally.values()] }),
    playerCount: students.length,
  };
}

/**
 * 이번 주 남은 평일 수(오늘 포함, 주말이면 0).
 */
function schoolDaysLeftFrom(todayKey: string): number {
  return Math.max(0, 5 - getWeekdayIndex(todayKey));
}

/**
 * 학생 한 명의 보스 화면: 체력, 기여도, 받을 수 있는 보상.
 */
export async function getRaidView(studentId: string, todayKey: string): Promise<RaidView> {
  const thisWeek = getWeekStartKey(todayKey);
  const lastWeek = addDaysToKey(thisWeek, -7);
  const [current, previous, claims, roster] = await Promise.all([
    loadWeekRaid(thisWeek),
    loadWeekRaid(lastWeek),
    prisma.bossReward.findMany({ where: { studentId, weekKey: { in: [thisWeek, lastWeek] } }, select: { weekKey: true } }),
    prisma.student.findMany({ select: { id: true, name: true, hairKey: true } }),
  ]);
  const claimed = new Set(claims.map((claim) => claim.weekKey));
  const byId = new Map(roster.map((student) => [student.id, student]));
  const { raid } = current;
  const myEntry = raid.ranking.find((entry) => entry.studentId === studentId);
  const myIndex = raid.ranking.findIndex((entry) => entry.studentId === studentId);
  const daysLeft = schoolDaysLeftFrom(todayKey);

  const rewardFor = (status: RaidStatus, isCurrentWeek: boolean): RaidRewardView => {
    const mine = status.ranking.find((entry) => entry.studentId === studentId);
    const blockedReason = explainRewardBlock({ defeated: status.defeated, myDamage: mine?.damage ?? 0, claimed: claimed.has(status.weekKey) });

    return {
      weekKey: status.weekKey,
      bossName: status.boss.name,
      bossSprite: status.boss.sprite,
      xp: BOSS_REWARD.xp,
      coins: BOSS_REWARD.coins,
      claimed: claimed.has(status.weekKey),
      blockedReason,
      isCurrentWeek,
    };
  };
  // 지난주 보스는 받을 게 남았을 때만 알려 주고, 이번 주 보스는 항상 보여 준다.
  const lastWeekReward = rewardFor(previous.raid, false);
  const rewards = [rewardFor(raid, true), ...(previous.raid.defeated && !lastWeekReward.claimed && lastWeekReward.blockedReason === null ? [lastWeekReward] : [])];

  return {
    weekKey: raid.weekKey,
    bossName: raid.boss.name,
    bossSprite: raid.boss.sprite,
    bossIntro: raid.boss.intro,
    maxHp: raid.maxHp,
    damage: raid.damage,
    hpLeft: raid.hpLeft,
    percentLeft: raid.percentLeft,
    defeated: raid.defeated,
    mood: raid.mood,
    schoolDaysLeft: daysLeft,
    neededPerDay: raid.defeated ? 0 : damageNeededPerDay(raid.hpLeft, daysLeft),
    top: raid.ranking
      .filter((entry) => entry.damage > 0)
      .slice(0, TOP_COUNT)
      .flatMap((entry) => {
        const student = byId.get(entry.studentId);

        return student ? [{ ...entry, name: student.name, hairKey: student.hairKey, isMe: entry.studentId === studentId }] : [];
      }),
    me: { units: myEntry?.units ?? 0, duels: myEntry?.duels ?? 0, damage: myEntry?.damage ?? 0, rank: myEntry && myEntry.damage > 0 ? myIndex + 1 : null },
    rewards,
  };
}

/**
 * 쓰러뜨린 보스의 보상을 한 번 받는다. 이번 주와 지난주 보스만 받을 수 있고, 한 번 받으면 다시 받을 수 없다.
 */
export async function claimRaidReward(input: { studentId: string; weekKey: string; todayKey: string }): Promise<{ xp: number; coins: number }> {
  const thisWeek = getWeekStartKey(input.todayKey);
  const allowed = [thisWeek, addDaysToKey(thisWeek, -7)];
  if (!allowed.includes(input.weekKey)) {
    throw new QuestError("INVALID", "지금은 받을 수 없는 보스 보상이에요.");
  }

  const [{ raid }, existing] = await Promise.all([
    loadWeekRaid(input.weekKey),
    prisma.bossReward.findUnique({ where: { studentId_weekKey: { studentId: input.studentId, weekKey: input.weekKey } } }),
  ]);
  const mine = raid.ranking.find((entry) => entry.studentId === input.studentId);
  const reason = explainRewardBlock({ defeated: raid.defeated, myDamage: mine?.damage ?? 0, claimed: existing !== null });
  if (reason) {
    throw new QuestError("LOCKED", reason);
  }

  try {
    await prisma.bossReward.create({ data: { studentId: input.studentId, weekKey: input.weekKey, xp: BOSS_REWARD.xp, coins: BOSS_REWARD.coins } });
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new QuestError("LOCKED", "이미 보상을 받았어요.");
    }
    throw error;
  }

  return { xp: BOSS_REWARD.xp, coins: BOSS_REWARD.coins };
}
