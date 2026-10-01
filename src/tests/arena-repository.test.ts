// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { MAX_CHALLENGES_PER_DAY, MAX_REWARDED_DUELS_PER_DAY, QUESTION_COUNT } from "@/utils/arena-rules";
import { createTempDatabase } from "./helpers/temp-db";

type Arena = typeof import("@/utils/arena-repository");
type Repo = typeof import("@/utils/quest-repository");
type PrismaModule = typeof import("@/utils/prisma");

let arena: Arena;
let repo: Repo;
let prisma: PrismaModule["prisma"];
let disposeDatabase: () => Promise<void>;
const ids: Record<string, string> = {};

const NOW = new Date("2026-09-30T03:00:00Z"); // 한국 시간 2026-09-30 12:00
const TODAY = "2026-09-30";

/**
 * 저장된 문제에서 정답 위치를 읽어, 모두 맞히거나 일부러 틀리는 답안을 만든다.
 */
async function answersFor(duelId: string, mode: "all" | "none" | "half"): Promise<{ choice: number | null; ms: number }[]> {
  const duel = await prisma.duel.findUniqueOrThrow({ where: { id: duelId } });
  const questions = JSON.parse(duel.questions) as { answerIndex: number }[];

  return questions.map((question, index) => {
    const right = mode === "all" || (mode === "half" && index % 2 === 0);

    return { choice: right ? question.answerIndex : (question.answerIndex + 1) % 4, ms: 4000 };
  });
}

/**
 * 다섯 문제의 답을 차례로 내고 마지막에 나온 결과를 돌려준다.
 */
async function submitAll(studentId: string, duelId: string, answers: { choice: number | null; ms: number }[], now: Date = NOW) {
  let last = null as Awaited<ReturnType<Arena["answerDuel"]>> | null;
  for (const [index, answer] of answers.entries()) {
    last = await arena.answerDuel({ studentId, duelId, index, choice: answer.choice, ms: answer.ms, now });
  }
  if (!last?.result) {
    throw new Error("마지막 문제에서 결과가 나와야 해요");
  }

  return last.result;
}

/**
 * 도전자가 문제를 풀어 제출까지 마친 뒤, 상대가 받아 제출해 승부를 낸다.
 */
async function playFullDuel(challenger: string, opponent: string, challengerMode: "all" | "none" | "half", opponentMode: "all" | "none" | "half") {
  const started = await arena.createDuel({ challengerId: ids[challenger], opponentId: ids[opponent], category: "MATH", now: NOW });
  await submitAll(ids[challenger], started.duelId, await answersFor(started.duelId, challengerMode));
  await arena.startDuel({ studentId: ids[opponent], duelId: started.duelId, now: NOW });
  const result = await submitAll(ids[opponent], started.duelId, await answersFor(started.duelId, opponentMode));

  return { duelId: started.duelId, result };
}

beforeAll(async () => {
  disposeDatabase = (await createTempDatabase()).dispose;
  arena = await import("@/utils/arena-repository");
  repo = await import("@/utils/quest-repository");
  ({ prisma } = await import("@/utils/prisma"));

  const red = await prisma.team.create({ data: { name: "빨강팀", emblem: "star" } });
  const blue = await prisma.team.create({ data: { name: "파랑팀", emblem: "wave" } });
  for (const [key, name, team] of [["a", "가온", red], ["b", "나래", red], ["c", "다솜", blue], ["d", "라온", blue], ["e", "마루", blue], ["f", "바다", red]] as const) {
    ids[key] = (await prisma.student.create({ data: { name, hairKey: "silver", teamId: team.id } })).id;
  }
});

afterAll(async () => {
  await disposeDatabase();
});

describe("도전장 만들기", () => {
  it("문제 5개를 만들어 정답 없이 돌려주고, 정답은 서버에만 저장한다", async () => {
    const started = await arena.createDuel({ challengerId: ids.a, opponentId: ids.b, category: "MIX", now: NOW });

    expect(started.questions).toHaveLength(QUESTION_COUNT);
    expect(JSON.stringify(started)).not.toContain("answerIndex");
    const stored = await prisma.duel.findUniqueOrThrow({ where: { id: started.duelId } });

    expect(stored.status).toBe("CHALLENGER_TURN");
    expect(JSON.parse(stored.questions)[0]).toHaveProperty("answerIndex");
    await prisma.duel.delete({ where: { id: started.duelId } });
  });

  it("나 자신, 없는 친구, 이상한 종류는 거절한다", async () => {
    await expect(arena.createDuel({ challengerId: ids.a, opponentId: ids.a, category: "MATH", now: NOW })).rejects.toMatchObject({ code: "LOCKED" });
    await expect(arena.createDuel({ challengerId: ids.a, opponentId: "없는아이디", category: "MATH", now: NOW })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(arena.createDuel({ challengerId: ids.a, opponentId: ids.b, category: "과학", now: NOW })).rejects.toMatchObject({ code: "INVALID" });
  });

  it("선생님이 대결장을 닫으면 도전할 수 없고, 다시 열면 된다", async () => {
    await arena.setArenaEnabled(false);
    await expect(arena.createDuel({ challengerId: ids.a, opponentId: ids.b, category: "MATH", now: NOW })).rejects.toMatchObject({ code: "LOCKED" });
    expect((await arena.getArenaOverview(ids.a, TODAY, NOW)).enabled).toBe(false);

    await arena.setArenaEnabled(true);
    const started = await arena.createDuel({ challengerId: ids.a, opponentId: ids.b, category: "MATH", now: NOW });
    await prisma.duel.delete({ where: { id: started.duelId } });

    expect((await arena.getArenaOverview(ids.a, TODAY, NOW)).enabled).toBe(true);
  });
});

describe("대결 한 판", () => {
  let duelId = "";

  it("도전자가 먼저 풀어 내면 상대를 기다리는 상태가 되고, 그동안 상대는 받은 도전장에서 볼 수 있다", async () => {
    const started = await arena.createDuel({ challengerId: ids.c, opponentId: ids.d, category: "MATH", now: NOW });
    duelId = started.duelId;

    await expect(arena.startDuel({ studentId: ids.d, duelId, now: NOW })).rejects.toMatchObject({ code: "LOCKED" });

    const waiting = await submitAll(ids.c, duelId, await answersFor(duelId, "all"));

    expect(waiting.state).toBe("WAITING");
    expect(waiting.rival).toBeNull();
    expect(waiting.review).toBeNull();
    expect((await arena.getArenaOverview(ids.d, TODAY, NOW)).incoming.map((item) => item.duelId)).toEqual([duelId]);
    expect((await arena.getArenaOverview(ids.c, TODAY, NOW)).waiting.map((item) => item.duelId)).toEqual([duelId]);
  });

  it("상대가 풀면 그 자리에서 승부·레이팅·보상이 정해지고 정답 풀이가 열린다", async () => {
    const started = await arena.startDuel({ studentId: ids.d, duelId, now: NOW });

    expect(started.rival.name).toBe("다솜");
    const result = await submitAll(ids.d, duelId, await answersFor(duelId, "half"));

    expect(result.state).toBe("DONE");
    expect(result.outcome).toBe("LOSE");
    expect(result.ratingDelta).toBe(-12);
    expect(result.ratingAfter).toBe(988);
    expect(result.rival?.correct).toBe(QUESTION_COUNT);
    expect(result.me.correct).toBe(3);
    expect(result.xp).toBe(3);
    expect(result.coins).toBe(1);
    expect(result.review).toHaveLength(QUESTION_COUNT);

    const winner = await prisma.student.findUniqueOrThrow({ where: { id: ids.c } });
    const loser = await prisma.student.findUniqueOrThrow({ where: { id: ids.d } });

    expect(winner.rating).toBe(1012);
    expect(loser.rating).toBe(988);
  });

  it("끝난 대결에는 다시 답을 낼 수 없고, 관계없는 학생은 볼 수 없다", async () => {
    await expect(arena.answerDuel({ studentId: ids.d, duelId, index: 0, choice: 0, ms: 1000, now: NOW })).rejects.toMatchObject({ code: "LOCKED" });
    await expect(arena.answerDuel({ studentId: ids.c, duelId, index: 0, choice: 0, ms: 1000, now: NOW })).rejects.toMatchObject({ code: "LOCKED" });
    await expect(arena.answerDuel({ studentId: ids.e, duelId, index: 0, choice: 0, ms: 1000, now: NOW })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(arena.getDuelResult({ studentId: ids.e, duelId })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect((await arena.getDuelResult({ studentId: ids.c, duelId })).outcome).toBe("WIN");
  });

  it("이긴 사람 XP·코인이 전체 XP·코인에 합쳐진다", async () => {
    const winnerTotals = await repo.getStudentTotals(ids.c);
    const loserTotals = await repo.getStudentTotals(ids.d);

    expect(winnerTotals).toEqual({ xp: 6, coins: 3 });
    expect(loserTotals).toEqual({ xp: 3, coins: 1 });
  });

  it("잘못된 답안은 거절한다", async () => {
    const started = await arena.createDuel({ challengerId: ids.e, opponentId: ids.f, category: "ENGLISH", now: NOW });
    const base = { studentId: ids.e, duelId: started.duelId, ms: 1000, now: NOW };

    await expect(arena.answerDuel({ ...base, index: 0, choice: 9 })).rejects.toMatchObject({ code: "INVALID" });
    await expect(arena.answerDuel({ ...base, index: 0, choice: 1.5 })).rejects.toMatchObject({ code: "INVALID" });
    await expect(arena.answerDuel({ ...base, index: 0, choice: 0, ms: Number.NaN })).rejects.toMatchObject({ code: "INVALID" });
    await expect(arena.answerDuel({ ...base, index: 2, choice: 0 })).rejects.toMatchObject({ code: "INVALID" });
    await prisma.duel.delete({ where: { id: started.duelId } });
  });
});

describe("문제마다 답을 잠그는 방식", () => {
  it("답을 내면 그 문제의 정답이 바로 나오고, 같은 문제에 다시 답할 수 없다", async () => {
    const started = await arena.createDuel({ challengerId: ids.e, opponentId: ids.f, category: "MATH", now: NOW });
    const stored = JSON.parse((await prisma.duel.findUniqueOrThrow({ where: { id: started.duelId } })).questions) as { answerIndex: number }[];
    const base = { studentId: ids.e, duelId: started.duelId, ms: 3000, now: NOW };

    const wrong = await arena.answerDuel({ ...base, index: 0, choice: (stored[0].answerIndex + 1) % 4 });

    expect(wrong.correct).toBe(false);
    expect(wrong.answerIndex).toBe(stored[0].answerIndex);
    expect(wrong.result).toBeNull();
    await expect(arena.answerDuel({ ...base, index: 0, choice: stored[0].answerIndex })).rejects.toMatchObject({ code: "INVALID" });

    const right = await arena.answerDuel({ ...base, index: 1, choice: stored[1].answerIndex });

    expect(right.correct).toBe(true);
    await prisma.duel.delete({ where: { id: started.duelId } });
  });

  it("중간에 나갔다 돌아오면 낸 답의 수와 맞힌 표시가 남아 있어 이어서 푼다", async () => {
    const started = await arena.createDuel({ challengerId: ids.e, opponentId: ids.f, category: "MATH", now: NOW });
    const stored = JSON.parse((await prisma.duel.findUniqueOrThrow({ where: { id: started.duelId } })).questions) as { answerIndex: number }[];
    await arena.answerDuel({ studentId: ids.e, duelId: started.duelId, index: 0, choice: stored[0].answerIndex, ms: 2000, now: NOW });
    await arena.answerDuel({ studentId: ids.e, duelId: started.duelId, index: 1, choice: (stored[1].answerIndex + 1) % 4, ms: 2000, now: NOW });
    const resumed = await arena.startDuel({ studentId: ids.e, duelId: started.duelId, now: NOW });

    expect(resumed.answered).toBe(2);
    expect(resumed.marks).toEqual([true, false]);
    await prisma.duel.delete({ where: { id: started.duelId } });
  });

  it("시간이 다 지난 답은 틀린 것으로 치고, 너무 빠른 시간은 사람이 낼 수 있는 값으로 올린다", async () => {
    const started = await arena.createDuel({ challengerId: ids.e, opponentId: ids.f, category: "MATH", now: NOW });
    const stored = JSON.parse((await prisma.duel.findUniqueOrThrow({ where: { id: started.duelId } })).questions) as { answerIndex: number }[];
    const base = { studentId: ids.e, duelId: started.duelId, now: NOW };
    const late = await arena.answerDuel({ ...base, index: 0, choice: stored[0].answerIndex, ms: 99999 });
    const fast = await arena.answerDuel({ ...base, index: 1, choice: stored[1].answerIndex, ms: 1 });

    expect(late.correct).toBe(false);
    expect(fast.correct).toBe(true);
    const row = await prisma.duel.findUniqueOrThrow({ where: { id: started.duelId } });
    const saved = JSON.parse(row.challengerAnswers ?? "[]") as { choice: number | null; ms: number }[];

    expect(saved[0]).toEqual({ choice: null, ms: 12000 });
    expect(saved[1].ms).toBe(250);
    await prisma.duel.delete({ where: { id: started.duelId } });
  });
});

describe("무승부·거절·기간 만료", () => {
  it("같은 점수면 무승부이고 레이팅은 그대로다", async () => {
    const { result } = await playFullDuel("e", "f", "all", "all");
    const scoreEqual = result.me.score === result.rival?.score;

    expect(scoreEqual).toBe(true);
    expect(result.outcome).toBe("DRAW");
    expect(result.ratingDelta).toBe(0);
  });

  it("받은 도전장을 거절하면 다시 도전할 수 있고, 남의 도전장은 거절할 수 없다", async () => {
    const started = await arena.createDuel({ challengerId: ids.a, opponentId: ids.c, category: "MATH", now: NOW });
    await submitAll(ids.a, started.duelId, await answersFor(started.duelId, "half"));

    await expect(arena.declineDuel({ studentId: ids.b, duelId: started.duelId })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await arena.declineDuel({ studentId: ids.c, duelId: started.duelId });
    await expect(arena.declineDuel({ studentId: ids.c, duelId: started.duelId })).rejects.toMatchObject({ code: "LOCKED" });

    const stored = await prisma.duel.findUniqueOrThrow({ where: { id: started.duelId } });

    expect(stored.status).toBe("DECLINED");
  });

  it("오래 답이 없는 도전장은 기간이 지나면 만료된다", async () => {
    const started = await arena.createDuel({ challengerId: ids.b, opponentId: ids.d, category: "MATH", now: NOW });
    await submitAll(ids.b, started.duelId, await answersFor(started.duelId, "all"));
    const later = new Date(NOW.getTime() + 4 * 24 * 60 * 60 * 1000);
    await arena.expireStaleDuels(later);
    const stored = await prisma.duel.findUniqueOrThrow({ where: { id: started.duelId } });

    expect(stored.status).toBe("EXPIRED");
    await expect(arena.startDuel({ studentId: ids.d, duelId: started.duelId, now: later })).rejects.toMatchObject({ code: "LOCKED" });
  });
});

describe("하루 제한과 보상 한도", () => {
  it("하루에 낼 수 있는 도전장 수를 넘기면 거절한다", async () => {
    await prisma.duel.deleteMany({});
    const others = ["b", "c", "d"] as const;
    const made: string[] = [];
    for (const key of others.slice(0, MAX_CHALLENGES_PER_DAY)) {
      made.push((await arena.createDuel({ challengerId: ids.a, opponentId: ids[key], category: "MATH", now: NOW })).duelId);
    }

    await expect(arena.createDuel({ challengerId: ids.a, opponentId: ids.e, category: "MATH", now: NOW })).rejects.toMatchObject({ code: "LOCKED" });
    expect((await arena.getArenaOverview(ids.a, TODAY, NOW)).challengesLeft).toBe(0);
    await prisma.duel.deleteMany({});
  });

  it("아직 끝나지 않은 대결이 있는 친구에게는 또 도전할 수 없다", async () => {
    await prisma.duel.deleteMany({});
    await arena.createDuel({ challengerId: ids.a, opponentId: ids.b, category: "MATH", now: NOW });

    await expect(arena.createDuel({ challengerId: ids.a, opponentId: ids.b, category: "ENGLISH", now: NOW })).rejects.toMatchObject({ code: "LOCKED" });
    await expect(arena.createDuel({ challengerId: ids.b, opponentId: ids.a, category: "ENGLISH", now: NOW })).rejects.toMatchObject({ code: "LOCKED" });
    const overview = await arena.getArenaOverview(ids.a, TODAY, NOW);

    expect(overview.opponents.find((item) => item.id === ids.b)?.blockedReason).toContain("끝나지 않은");
    expect(overview.waiting[0].resumable).toBe(true);
    await prisma.duel.deleteMany({});
  });

  it("보상은 하루 다섯 판까지만 받는다", async () => {
    await prisma.duel.deleteMany({});
    await prisma.student.updateMany({ data: { rating: 1000 } });
    const partners = ["b", "c", "d", "e", "f"] as const;
    for (const partner of partners.slice(0, MAX_REWARDED_DUELS_PER_DAY)) {
      await playFullDuel(partner, "a", "all", "none");
    }
    const before = await repo.getStudentTotals(ids.a);

    expect(before).toEqual({ xp: MAX_REWARDED_DUELS_PER_DAY * 3, coins: MAX_REWARDED_DUELS_PER_DAY });

    // a 는 이미 다섯 판을 끝냈으므로 여섯 번째 판의 보상은 0이다. (도전한 b 는 아직 보상을 받는다)
    const { duelId } = await playFullDuel("b", "a", "all", "none");
    const last = await prisma.duel.findUniqueOrThrow({ where: { id: duelId } });

    expect(last.opponentXp).toBe(0);
    expect(last.opponentCoins).toBe(0);
    expect(last.challengerXp).toBeGreaterThan(0);
    expect(await repo.getStudentTotals(ids.a)).toEqual(before);
  });
});

describe("순위와 팀 승수", () => {
  it("대결을 한 학생만 순위표에 오르고 이번 주 팀 승수가 센다", async () => {
    await prisma.duel.deleteMany({});
    await prisma.student.updateMany({ data: { rating: 1000 } });
    await playFullDuel("a", "c", "all", "none"); // 빨강팀 a 승
    await playFullDuel("b", "d", "all", "none"); // 빨강팀 b 승
    await playFullDuel("e", "f", "all", "none"); // 파랑팀 e 승
    const overview = await arena.getArenaOverview(ids.a, TODAY, NOW);

    expect(overview.leaderboard.map((row) => row.name)).not.toContain("없음");
    expect(overview.leaderboard[0].rating).toBeGreaterThanOrEqual(overview.leaderboard[1].rating);
    expect(overview.me.wins).toBe(1);
    expect(overview.me.rank).not.toBeNull();
    expect(overview.results).toHaveLength(1);
    expect(overview.results[0].outcome).toBe("WIN");
    expect(Object.fromEntries(overview.teamWins.map((row) => [row.teamName, row.wins]))).toEqual({ 빨강팀: 2, 파랑팀: 1 });
  });

  it("선생님 요약은 이번 주 대결 수와 참여 학생 수를 보여 준다", async () => {
    const summary = await arena.getArenaTeacherSummary(TODAY);

    expect(summary.enabled).toBe(true);
    expect(summary.duelsThisWeek).toBe(3);
    expect(summary.players).toBe(6);
    expect(summary.pending).toBe(0);
  });
});

describe("응원 이모트", () => {
  it("끝난 대결에서 서로 이모트를 보내면 상대 화면에 보이고, 다시 보내면 바뀐다", async () => {
    await prisma.duel.deleteMany({});
    await prisma.student.updateMany({ data: { rating: 1000 } });
    const { duelId } = await playFullDuel("a", "c", "all", "none");

    const first = await arena.reactToDuel({ studentId: ids.a, duelId, emote: "star" });
    expect(first.myEmote).toBe("star");
    expect(first.rivalEmote).toBeNull();

    const theirs = await arena.reactToDuel({ studentId: ids.c, duelId, emote: "hearts" });
    expect(theirs.myEmote).toBe("hearts");
    expect(theirs.rivalEmote).toBe("star");

    const changed = await arena.reactToDuel({ studentId: ids.a, duelId, emote: "music" });
    expect(changed.myEmote).toBe("music");
    expect(changed.rivalEmote).toBe("hearts");

    const overview = await arena.getArenaOverview(ids.c, TODAY, NOW);
    expect(overview.results[0].rivalEmote).toBe("music");
  });

  it("응원·칭찬이 되는 이모트만 보낼 수 있다", async () => {
    const duel = await prisma.duel.findFirstOrThrow({ where: { status: "DONE" } });

    for (const emote of ["laugh", "anger", "faceSad", "<script>", ""]) {
      await expect(arena.reactToDuel({ studentId: duel.challengerId, duelId: duel.id, emote })).rejects.toMatchObject({ code: "INVALID" });
    }
  });

  it("참여하지 않은 학생이나 아직 끝나지 않은 대결에는 보낼 수 없다", async () => {
    const done = await prisma.duel.findFirstOrThrow({ where: { status: "DONE" } });
    await expect(arena.reactToDuel({ studentId: ids.e, duelId: done.id, emote: "heart" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(arena.reactToDuel({ studentId: ids.a, duelId: "없는대결", emote: "heart" })).rejects.toMatchObject({ code: "NOT_FOUND" });

    const open = await arena.createDuel({ challengerId: ids.e, opponentId: ids.f, category: "MATH", now: NOW });
    await expect(arena.reactToDuel({ studentId: ids.e, duelId: open.duelId, emote: "heart" })).rejects.toMatchObject({ code: "LOCKED" });
    await prisma.duel.delete({ where: { id: open.duelId } });
  });

  it("상대가 보낸 이모트는 승부가 나기 전에는 결과에 보이지 않는다", async () => {
    const duel = await prisma.duel.findFirstOrThrow({ where: { status: "DONE" } });
    const view = await arena.getDuelResult({ studentId: duel.challengerId, duelId: duel.id });

    expect(view.state).toBe("DONE");
    expect(Object.keys(view)).toEqual(expect.arrayContaining(["myEmote", "rivalEmote"]));
  });
});
