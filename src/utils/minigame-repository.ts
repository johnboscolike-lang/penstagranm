import type { MiniGameFinish, MiniGameStart, MiniGameSummary } from "@/utils/minigame-types";
import { getKstDateKey } from "@/utils/kst";
import { buildRounds, explainResultProblem, GAME_SECONDS, rewardForScore, runsLeft } from "@/utils/minigame-rules";
import { prisma } from "@/utils/prisma";
import { QuestError, type DbClient } from "@/utils/quest-repository";
import { hashSeed } from "@/utils/rng";

/** 한 판에 미리 보내 주는 라운드 수. 30초 동안 충분히 쓰고도 남는다. */
const ROUNDS_PER_RUN = 40;

/**
 * 오늘 상황: 시작한 판, 보상 받은 판, 남은 횟수, 최고 점수.
 */
export async function getMiniGameSummary(client: DbClient, studentId: string, todayKey: string): Promise<MiniGameSummary> {
  const [startedToday, rewardedToday, best, totalPlays] = await Promise.all([
    client.miniGameRun.count({ where: { studentId, dateKey: todayKey } }),
    client.miniGameRun.count({ where: { studentId, dateKey: todayKey, status: "DONE", OR: [{ xp: { gt: 0 } }, { coins: { gt: 0 } }] } }),
    client.miniGameRun.aggregate({ where: { studentId, status: "DONE" }, _max: { score: true } }),
    client.miniGameRun.count({ where: { studentId, status: "DONE" } }),
  ]);
  const left = runsLeft(startedToday, rewardedToday);

  return { startedToday, runsLeft: left.runs, rewardsLeft: left.rewards, bestScore: best._max.score ?? 0, totalPlays };
}

/**
 * 한 판을 시작한다. 하루 판 수를 넘으면 거절하고, 아니면 이번 판의 라운드(영어 단어 문제)를 만들어 돌려준다.
 * 시작 시각은 서버가 기록해서, 결과를 받을 때 정말 한 판이 지났는지 확인한다.
 */
export async function startMiniGame(input: { studentId: string; now?: Date }): Promise<MiniGameStart> {
  const now = input.now ?? new Date();
  const todayKey = getKstDateKey(now);
  const before = await getMiniGameSummary(prisma, input.studentId, todayKey);
  if (before.runsLeft <= 0) {
    throw new QuestError("LOCKED", "오늘은 충분히 놀았어요. 내일 또 만나요!");
  }

  const run = await prisma.miniGameRun.create({ data: { studentId: input.studentId, dateKey: todayKey, startedAt: now } });
  const summary = await getMiniGameSummary(prisma, input.studentId, todayKey);

  return { runId: run.id, rounds: buildRounds(hashSeed(run.id), ROUNDS_PER_RUN), summary };
}

/**
 * 게임이 끝났을 때 결과를 받는다. 내 판이고 아직 끝나지 않은 판일 때만, 앞뒤가 맞는 결과만 받는다.
 * 게임은 브라우저에서 돌아가서 서버가 플레이를 볼 수는 없다. 그래서 (1) 한 판 길이가 지났는지, (2) 점수가 사람이 낼 수 있는 범위인지
 * 확인하고, (3) 보상은 아주 작게 두며 (4) 하루 보상 횟수를 제한한다.
 */
export async function finishMiniGame(input: { studentId: string; runId: string; score: number; hits: number; misses: number; now?: Date }): Promise<MiniGameFinish> {
  const now = input.now ?? new Date();
  const run = await prisma.miniGameRun.findUnique({ where: { id: input.runId } });
  if (!run || run.studentId !== input.studentId) {
    throw new QuestError("NOT_FOUND", "게임 기록을 찾을 수 없어요.");
  }
  if (run.status !== "STARTED") {
    throw new QuestError("LOCKED", "이 판의 결과는 이미 받았어요.");
  }

  const elapsedSeconds = (now.getTime() - run.startedAt.getTime()) / 1000;
  const problem = explainResultProblem({ score: input.score, hits: input.hits, misses: input.misses }, elapsedSeconds);
  if (problem) {
    throw new QuestError("INVALID", problem);
  }

  const todayKey = getKstDateKey(now);
  const before = await getMiniGameSummary(prisma, input.studentId, run.dateKey);
  const reward = before.rewardsLeft > 0 ? rewardForScore(input.score) : { xp: 0, coins: 0 };
  // 같은 판의 결과가 동시에 두 번 오면 먼저 온 것만 반영된다.
  const updated = await prisma.miniGameRun.updateMany({
    where: { id: run.id, studentId: input.studentId, status: "STARTED" },
    data: { status: "DONE", finishedAt: now, score: input.score, hits: input.hits, misses: input.misses, xp: reward.xp, coins: reward.coins },
  });
  if (updated.count === 0) {
    throw new QuestError("LOCKED", "이 판의 결과는 이미 받았어요.");
  }

  const summary = await getMiniGameSummary(prisma, input.studentId, todayKey);

  return {
    score: input.score,
    hits: input.hits,
    misses: input.misses,
    xp: reward.xp,
    coins: reward.coins,
    newBest: input.score > before.bestScore,
    summary,
  };
}

export { GAME_SECONDS };
