import { randomInt as secureRandomInt } from "node:crypto";

import {
  EXPIRE_DAYS,
  MAX_CHALLENGES_PER_DAY,
  QUESTION_COUNT,
  QUESTION_MS,
  applyElo,
  decideOutcome,
  explainChallengeBlock,
  flipOutcome,
  leagueFor,
  pointsToNextLeague,
  rewardFor,
  scoreAnswers,
  type AnswerInput,
  type Outcome,
} from "@/utils/arena-rules";
import type {
  ArenaOpponentView,
  ArenaOverview,
  ArenaRankRow,
  ArenaResultView,
  DuelResultView,
  DuelReviewItem,
  DuelStartView,
  LeagueView,
} from "@/utils/arena-types";
import { isEmoteName } from "@/utils/art/cc0";
import { formatKstMonthDay, getKstDateKey, getWeekStartKey } from "@/utils/kst";
import { prisma } from "@/utils/prisma";
import { QuestError, type DbClient } from "@/utils/quest-repository";
import {
  CHOICE_COUNT,
  QUIZ_CATEGORIES,
  generateQuestions,
  isQuizCategory,
  toPublicQuestions,
  type QuizCategory,
  type QuizQuestion,
} from "@/utils/quiz-bank";

const ARENA_SETTING_KEY = "arenaEnabled";
const DAY_MS = 24 * 60 * 60 * 1000;
const LEADERBOARD_SIZE = 8;
const RESULT_COUNT = 6;
const MIN_HUMAN_MS = 250;

/**
 * 대결장이 열려 있는지 읽는다. 설정이 없으면 열려 있다.
 */
export async function isArenaEnabled(client: DbClient = prisma): Promise<boolean> {
  const row = await client.classSetting.findUnique({ where: { key: ARENA_SETTING_KEY } });

  return row ? row.value !== "off" : true;
}

/**
 * 선생님이 대결장을 열거나 닫는다.
 */
export async function setArenaEnabled(enabled: boolean): Promise<void> {
  await prisma.classSetting.upsert({
    where: { key: ARENA_SETTING_KEY },
    create: { key: ARENA_SETTING_KEY, value: enabled ? "on" : "off" },
    update: { value: enabled ? "on" : "off" },
  });
}

/**
 * 오래 방치된 대결을 정리한다: 도전자가 하루 넘게 안 풀었거나, 상대가 며칠째 응하지 않은 대결.
 */
export async function expireStaleDuels(now: Date = new Date()): Promise<void> {
  await prisma.duel.updateMany({
    where: { status: "CHALLENGER_TURN", createdAt: { lt: new Date(now.getTime() - DAY_MS) } },
    data: { status: "EXPIRED" },
  });
  await prisma.duel.updateMany({
    where: { status: "PENDING", createdAt: { lt: new Date(now.getTime() - EXPIRE_DAYS * DAY_MS) } },
    data: { status: "EXPIRED" },
  });
}

/**
 * 저장된 문제 JSON을 되살린다.
 */
function parseQuestions(raw: string): QuizQuestion[] {
  return JSON.parse(raw) as QuizQuestion[];
}

/**
 * 분류 이름을 사람이 읽는 글자로 바꾼다.
 */
function categoryLabel(category: string): string {
  return QUIZ_CATEGORIES.find((item) => item.key === category)?.label ?? "퀴즈";
}

/**
 * 리그를 화면용 모양으로 바꾼다.
 */
function toLeagueView(rating: number): LeagueView {
  const league = leagueFor(rating);

  return { key: league.key, name: league.name, icon: league.icon };
}

/**
 * 며칠 전인지 짧게 적는다: "방금", "오늘", "어제", "3일 전".
 */
function describeAge(createdAt: Date, now: Date): string {
  const days = Math.floor((now.getTime() - createdAt.getTime()) / DAY_MS);
  if (days <= 0) {
    return getKstDateKey(createdAt) === getKstDateKey(now) ? "오늘" : "어제";
  }

  return days === 1 ? "어제" : `${days}일 전`;
}

/**
 * 부호를 뒤집되 0이 -0으로 나오지 않게 한다.
 */
function negate(value: number): number {
  return value === 0 ? 0 : -value;
}

interface DuelRow {
  id: string;
  challengerId: string;
  opponentId: string;
  category: string;
  questions: string;
  status: string;
  challengerAnswers: string | null;
  challengerCorrect: number | null;
  challengerScore: number | null;
  challengerMs: number | null;
  opponentAnswers: string | null;
  opponentCorrect: number | null;
  opponentScore: number | null;
  opponentMs: number | null;
  outcome: string | null;
  ratingDelta: number;
  challengerRatingAfter: number | null;
  opponentRatingAfter: number | null;
  challengerXp: number;
  challengerCoins: number;
  opponentXp: number;
  opponentCoins: number;
  finishedKey: string | null;
  challengerEmote: string | null;
  opponentEmote: string | null;
  createdAt: Date;
  finishedAt: Date | null;
}

interface PlayerRow {
  id: string;
  name: string;
  hairKey: string;
  rating: number;
}

/**
 * 끝난 대결을 "내 입장"에서 본 결과로 바꾼다.
 */
function buildResultView(duel: DuelRow, meId: string, me: PlayerRow, rival: PlayerRow, includeReview: boolean): DuelResultView {
  const isChallenger = duel.challengerId === meId;
  const done = duel.status === "DONE";
  const outcomeForChallenger = (duel.outcome as Outcome | null) ?? null;
  const outcome = outcomeForChallenger ? (isChallenger ? outcomeForChallenger : flipOutcome(outcomeForChallenger)) : null;
  const myAnswers = JSON.parse((isChallenger ? duel.challengerAnswers : duel.opponentAnswers) ?? "[]") as AnswerInput[];
  const questions = parseQuestions(duel.questions);

  const review: DuelReviewItem[] | null = includeReview
    ? questions.map((question, index) => ({
        prompt: question.prompt,
        choices: question.choices,
        myChoice: myAnswers[index]?.choice ?? null,
        answerIndex: question.answerIndex,
        correct: myAnswers[index]?.choice === question.answerIndex,
      }))
    : null;

  const mineCorrect = (isChallenger ? duel.challengerCorrect : duel.opponentCorrect) ?? 0;
  const mineScore = (isChallenger ? duel.challengerScore : duel.opponentScore) ?? 0;
  const mineMs = (isChallenger ? duel.challengerMs : duel.opponentMs) ?? 0;
  const theirCorrect = (isChallenger ? duel.opponentCorrect : duel.challengerCorrect) ?? 0;
  const theirScore = (isChallenger ? duel.opponentScore : duel.challengerScore) ?? 0;
  const theirMs = (isChallenger ? duel.opponentMs : duel.challengerMs) ?? 0;
  const ratingAfter = isChallenger ? duel.challengerRatingAfter : duel.opponentRatingAfter;

  return {
    duelId: duel.id,
    state: done ? "DONE" : "WAITING",
    me: { name: me.name, hairKey: me.hairKey, correct: mineCorrect, score: mineScore, totalMs: mineMs },
    rival: done ? { name: rival.name, hairKey: rival.hairKey, correct: theirCorrect, score: theirScore, totalMs: theirMs } : null,
    outcome: done ? outcome : null,
    ratingDelta: done ? (isChallenger ? duel.ratingDelta : negate(duel.ratingDelta)) : 0,
    ratingAfter: done ? ratingAfter : null,
    leagueName: leagueFor(ratingAfter ?? me.rating).name,
    xp: done ? (isChallenger ? duel.challengerXp : duel.opponentXp) : 0,
    coins: done ? (isChallenger ? duel.challengerCoins : duel.opponentCoins) : 0,
    review: done ? review : null,
    myEmote: (isChallenger ? duel.challengerEmote : duel.opponentEmote) ?? null,
    rivalEmote: done ? ((isChallenger ? duel.opponentEmote : duel.challengerEmote) ?? null) : null,
  };
}

/**
 * 대결 상대를 고를 때 필요한 학생 정보를 읽는다.
 */
async function loadPlayer(client: DbClient, id: string): Promise<PlayerRow | null> {
  return client.student.findUnique({ where: { id }, select: { id: true, name: true, hairKey: true, rating: true } });
}

/**
 * 두 학생 사이의 대결을 찾는 조건 (누가 먼저 걸었든 상관없다).
 */
function pairWhere(a: string, b: string) {
  return {
    OR: [
      { challengerId: a, opponentId: b },
      { challengerId: b, opponentId: a },
    ],
  };
}

/**
 * 도전장을 만든다: 문제를 뽑아 저장하고, 도전자가 바로 풀 수 있게 정답 없는 문제를 돌려준다.
 */
export async function createDuel(input: { challengerId: string; opponentId: string; category: string; now?: Date }): Promise<DuelStartView> {
  const now = input.now ?? new Date();
  const todayKey = getKstDateKey(now);
  if (!isQuizCategory(input.category)) {
    throw new QuestError("INVALID", "알 수 없는 퀴즈 종류예요.");
  }
  await expireStaleDuels(now);

  const [enabled, challenger, opponent] = await Promise.all([isArenaEnabled(), loadPlayer(prisma, input.challengerId), loadPlayer(prisma, input.opponentId)]);
  if (!challenger || !opponent) {
    throw new QuestError("NOT_FOUND", "친구를 찾을 수 없어요.");
  }

  const [challengesToday, pairDuelsToday, openBetweenPair] = await Promise.all([
    prisma.duel.count({ where: { challengerId: input.challengerId, dateKey: todayKey } }),
    prisma.duel.count({ where: { AND: [pairWhere(input.challengerId, input.opponentId), { dateKey: todayKey, status: { not: "DECLINED" } }] } }),
    prisma.duel.count({ where: { AND: [pairWhere(input.challengerId, input.opponentId), { status: { in: ["CHALLENGER_TURN", "PENDING"] } }] } }),
  ]);
  const reason = explainChallengeBlock({
    enabled,
    isSelf: input.challengerId === input.opponentId,
    challengesToday,
    pairDuelsToday,
    openBetweenPair: openBetweenPair > 0,
  });
  if (reason) {
    throw new QuestError("LOCKED", reason);
  }

  const questions = generateQuestions(input.category, secureRandomInt(1, 2 ** 31 - 1), QUESTION_COUNT);
  const duel = await prisma.duel.create({
    data: {
      challengerId: input.challengerId,
      opponentId: input.opponentId,
      category: input.category,
      questions: JSON.stringify(questions),
      dateKey: todayKey,
      createdAt: now,
    },
  });

  return {
    duelId: duel.id,
    category: input.category,
    questions: toPublicQuestions(questions),
    me: { name: challenger.name, hairKey: challenger.hairKey },
    rival: { name: opponent.name, hairKey: opponent.hairKey },
    questionMs: QUESTION_MS,
    answered: 0,
    marks: [],
  };
}

/**
 * 풀 차례가 된 사람이 문제를 받는다: 도전자는 이어서 풀기, 상대는 도전장을 받아 풀기.
 */
export async function startDuel(input: { studentId: string; duelId: string; now?: Date }): Promise<DuelStartView> {
  await expireStaleDuels(input.now ?? new Date());
  const duel = await prisma.duel.findUnique({ where: { id: input.duelId } });
  if (!duel) {
    throw new QuestError("NOT_FOUND", "대결을 찾을 수 없어요.");
  }
  const isChallenger = duel.challengerId === input.studentId;
  const isOpponent = duel.opponentId === input.studentId;
  const myTurn = (isChallenger && duel.status === "CHALLENGER_TURN") || (isOpponent && duel.status === "PENDING" && duel.opponentScore === null);
  if (!isChallenger && !isOpponent) {
    throw new QuestError("FORBIDDEN", "내가 참여한 대결이 아니에요.");
  }
  if (!myTurn) {
    throw new QuestError("LOCKED", "지금은 이 대결을 풀 수 없어요.");
  }
  if (!(await isArenaEnabled())) {
    throw new QuestError("LOCKED", "지금은 선생님이 대결을 잠시 닫아 두었어요.");
  }

  if (isOpponent && !duel.opponentStartedAt) {
    await prisma.duel.update({ where: { id: duel.id }, data: { opponentStartedAt: input.now ?? new Date() } });
  }
  const [me, rival] = await Promise.all([loadPlayer(prisma, input.studentId), loadPlayer(prisma, isChallenger ? duel.opponentId : duel.challengerId)]);
  if (!me || !rival) {
    throw new QuestError("NOT_FOUND", "친구를 찾을 수 없어요.");
  }

  const questions = parseQuestions(duel.questions);
  const answered = JSON.parse((isChallenger ? duel.challengerAnswers : duel.opponentAnswers) ?? "[]") as AnswerInput[];

  return {
    duelId: duel.id,
    category: duel.category as QuizCategory,
    questions: toPublicQuestions(questions),
    me: { name: me.name, hairKey: me.hairKey },
    rival: { name: rival.name, hairKey: rival.hairKey },
    questionMs: QUESTION_MS,
    answered: answered.length,
    marks: answered.map((answer, index) => answer.choice === questions[index]?.answerIndex),
  };
}

/**
 * 하루에 이미 끝난 대결 수. 보상은 하루 정해진 횟수까지만 준다.
 */
async function countFinishedToday(client: DbClient, studentId: string, todayKey: string): Promise<number> {
  return client.duel.count({
    where: { status: "DONE", finishedKey: todayKey, OR: [{ challengerId: studentId }, { opponentId: studentId }] },
  });
}

/**
 * 한 사람의 답안이 다 모였을 때 마무리한다. 도전자면 상대를 기다리는 상태가 되고, 상대면 그 자리에서 승부·레이팅·보상이 정해진다.
 */
async function finishDuelSide(duel: DuelRow, studentId: string, answers: AnswerInput[], now: Date): Promise<DuelResultView> {
  const todayKey = getKstDateKey(now);
  const isChallenger = duel.challengerId === studentId;
  const questions = parseQuestions(duel.questions);
  const scored = scoreAnswers(
    questions.map((question) => question.answerIndex),
    answers,
  );
  const answersJson = JSON.stringify(answers);

  if (isChallenger) {
    const updated = await prisma.duel.updateMany({
      where: { id: duel.id, status: "CHALLENGER_TURN" },
      data: { status: "PENDING", challengerAnswers: answersJson, challengerCorrect: scored.correct, challengerScore: scored.score, challengerMs: scored.totalMs },
    });
    if (updated.count !== 1) {
      throw new QuestError("LOCKED", "이미 제출한 대결이에요.");
    }
    const [me, rival, fresh] = await Promise.all([loadPlayer(prisma, duel.challengerId), loadPlayer(prisma, duel.opponentId), prisma.duel.findUnique({ where: { id: duel.id } })]);
    if (!me || !rival || !fresh) {
      throw new QuestError("NOT_FOUND", "대결을 찾을 수 없어요.");
    }

    return buildResultView(fresh, studentId, me, rival, false);
  }

  return prisma.$transaction(async (tx) => {
    const fresh = await tx.duel.findUnique({ where: { id: duel.id } });
    if (!fresh || fresh.status !== "PENDING" || fresh.opponentScore !== null) {
      throw new QuestError("LOCKED", "이미 끝난 대결이에요.");
    }
    const [challenger, opponent] = await Promise.all([loadPlayer(tx, fresh.challengerId), loadPlayer(tx, fresh.opponentId)]);
    if (!challenger || !opponent) {
      throw new QuestError("NOT_FOUND", "친구를 찾을 수 없어요.");
    }

    const outcome = decideOutcome(fresh.challengerScore ?? 0, scored.score);
    const elo = applyElo(challenger.rating, opponent.rating, outcome);
    const [challengerDone, opponentDone] = await Promise.all([countFinishedToday(tx, challenger.id, todayKey), countFinishedToday(tx, opponent.id, todayKey)]);
    const challengerReward = rewardFor(outcome, challengerDone);
    const opponentReward = rewardFor(flipOutcome(outcome), opponentDone);

    await tx.student.update({ where: { id: challenger.id }, data: { rating: elo.challenger } });
    await tx.student.update({ where: { id: opponent.id }, data: { rating: elo.opponent } });
    const finished = await tx.duel.update({
      where: { id: fresh.id },
      data: {
        status: "DONE",
        opponentAnswers: answersJson,
        opponentCorrect: scored.correct,
        opponentScore: scored.score,
        opponentMs: scored.totalMs,
        outcome,
        ratingDelta: elo.delta,
        challengerRatingAfter: elo.challenger,
        opponentRatingAfter: elo.opponent,
        challengerXp: challengerReward.xp,
        challengerCoins: challengerReward.coins,
        opponentXp: opponentReward.xp,
        opponentCoins: opponentReward.coins,
        finishedKey: todayKey,
        finishedAt: now,
      },
    });

    return buildResultView(finished, studentId, { ...opponent, rating: elo.opponent }, { ...challenger, rating: elo.challenger }, true);
  });
}

export interface AnswerFeedback {
  correct: boolean;
  answerIndex: number;
  /** 마지막 문제였다면 승부 결과(또는 상대를 기다리는 상태) */
  result: DuelResultView | null;
}

/**
 * 문제 하나의 답을 서버에 잠근다. 답은 한 번 내면 바꿀 수 없고 정답은 그 직후에야 알려 준다.
 * 그래서 정답을 미리 알아내 고쳐 낼 수 없다. 마지막 문제를 내면 그 자리에서 마무리된다.
 */
export async function answerDuel(input: { studentId: string; duelId: string; index: number; choice: number | null; ms: number; now?: Date }): Promise<AnswerFeedback> {
  const now = input.now ?? new Date();
  const duel = await prisma.duel.findUnique({ where: { id: input.duelId } });
  if (!duel) {
    throw new QuestError("NOT_FOUND", "대결을 찾을 수 없어요.");
  }
  const isChallenger = duel.challengerId === input.studentId;
  const isOpponent = duel.opponentId === input.studentId;
  if (!isChallenger && !isOpponent) {
    throw new QuestError("FORBIDDEN", "내가 참여한 대결이 아니에요.");
  }
  const myTurn = (isChallenger && duel.status === "CHALLENGER_TURN") || (isOpponent && duel.status === "PENDING" && duel.opponentScore === null);
  if (!myTurn) {
    throw new QuestError("LOCKED", "지금은 이 대결에 답을 낼 수 없어요.");
  }
  const questions = parseQuestions(duel.questions);
  const stored = isChallenger ? duel.challengerAnswers : duel.opponentAnswers;
  const current = JSON.parse(stored ?? "[]") as AnswerInput[];
  const validChoice = input.choice === null || (Number.isInteger(input.choice) && input.choice >= 0 && input.choice < CHOICE_COUNT);
  if (!validChoice || !Number.isFinite(input.ms)) {
    throw new QuestError("INVALID", "답안 모양이 올바르지 않아요.");
  }
  if (input.index !== current.length || input.index >= QUESTION_COUNT) {
    throw new QuestError("INVALID", "문제 차례가 맞지 않아요.");
  }

  const question = questions[input.index];
  const ms = Math.min(QUESTION_MS, Math.max(MIN_HUMAN_MS, Math.round(input.ms)));
  const timedOut = ms >= QUESTION_MS;
  const entry: AnswerInput = { choice: timedOut ? null : input.choice, ms };
  const correct = entry.choice === question.answerIndex;
  const next = [...current, entry];

  if (next.length < QUESTION_COUNT) {
    const field = isChallenger ? "challengerAnswers" : "opponentAnswers";
    const updated = await prisma.duel.updateMany({ where: { id: duel.id, [field]: stored }, data: { [field]: JSON.stringify(next) } });
    if (updated.count !== 1) {
      throw new QuestError("LOCKED", "이미 낸 답이에요.");
    }

    return { correct, answerIndex: question.answerIndex, result: null };
  }

  return { correct, answerIndex: question.answerIndex, result: await finishDuelSide(duel, input.studentId, next, now) };
}

/**
 * 받은 도전장을 정중히 거절한다. (감점 없음)
 */
export async function declineDuel(input: { studentId: string; duelId: string }): Promise<void> {
  const duel = await prisma.duel.findUnique({ where: { id: input.duelId } });
  if (!duel) {
    throw new QuestError("NOT_FOUND", "대결을 찾을 수 없어요.");
  }
  if (duel.opponentId !== input.studentId) {
    throw new QuestError("FORBIDDEN", "내가 받은 도전장이 아니에요.");
  }
  const updated = await prisma.duel.updateMany({ where: { id: duel.id, status: "PENDING", opponentScore: null }, data: { status: "DECLINED" } });
  if (updated.count !== 1) {
    throw new QuestError("LOCKED", "이미 정리된 도전장이에요.");
  }
}

/**
 * 이미 끝난 대결의 결과와 정답 풀이를 다시 본다.
 */
export async function getDuelResult(input: { studentId: string; duelId: string }): Promise<DuelResultView> {
  const duel = await prisma.duel.findUnique({ where: { id: input.duelId } });
  if (!duel) {
    throw new QuestError("NOT_FOUND", "대결을 찾을 수 없어요.");
  }
  if (duel.challengerId !== input.studentId && duel.opponentId !== input.studentId) {
    throw new QuestError("FORBIDDEN", "내가 참여한 대결이 아니에요.");
  }
  const rivalId = duel.challengerId === input.studentId ? duel.opponentId : duel.challengerId;
  const [me, rival] = await Promise.all([loadPlayer(prisma, input.studentId), loadPlayer(prisma, rivalId)]);
  if (!me || !rival) {
    throw new QuestError("NOT_FOUND", "친구를 찾을 수 없어요.");
  }

  return buildResultView(duel, input.studentId, me, rival, duel.status === "DONE");
}

/**
 * 끝난 대결에서 친구에게 응원 이모트를 하나 보낸다. 다시 보내면 바뀐다.
 * 놀림이 되지 않도록 응원·칭찬 이모트만 받는다.
 */
export async function reactToDuel(input: { studentId: string; duelId: string; emote: string }): Promise<DuelResultView> {
  if (!isEmoteName(input.emote)) {
    throw new QuestError("INVALID", "보낼 수 없는 이모트예요.");
  }
  const duel = await prisma.duel.findUnique({ where: { id: input.duelId } });
  if (!duel) {
    throw new QuestError("NOT_FOUND", "대결을 찾을 수 없어요.");
  }
  if (duel.challengerId !== input.studentId && duel.opponentId !== input.studentId) {
    throw new QuestError("FORBIDDEN", "내가 참여한 대결이 아니에요.");
  }
  if (duel.status !== "DONE") {
    throw new QuestError("LOCKED", "승부가 난 뒤에 응원을 보낼 수 있어요.");
  }
  await prisma.duel.update({
    where: { id: duel.id },
    data: duel.challengerId === input.studentId ? { challengerEmote: input.emote } : { opponentEmote: input.emote },
  });

  return getDuelResult({ studentId: input.studentId, duelId: input.duelId });
}

/**
 * 대결장 화면에 필요한 모든 것을 모은다: 내 리그, 도전장, 결과, 상대 목록, 순위, 이번 주 팀 승수.
 */
export async function getArenaOverview(meId: string, todayKey: string, now: Date = new Date()): Promise<ArenaOverview> {
  await expireStaleDuels(now);
  const [enabled, students, teams, doneAll, mine] = await Promise.all([
    isArenaEnabled(),
    prisma.student.findMany({ select: { id: true, name: true, hairKey: true, rating: true, teamId: true } }),
    prisma.team.findMany({ select: { id: true, name: true } }),
    prisma.duel.findMany({ where: { status: "DONE" }, select: { challengerId: true, opponentId: true, outcome: true, finishedKey: true } }),
    prisma.duel.findMany({
      where: { OR: [{ challengerId: meId }, { opponentId: meId }] },
      orderBy: { createdAt: "desc" },
      take: 60,
    }),
  ]);

  const teamName = new Map(teams.map((team) => [team.id, team.name]));
  const byId = new Map(students.map((student) => [student.id, student]));
  const me = byId.get(meId);
  if (!me) {
    throw new QuestError("NOT_FOUND", "학생을 찾을 수 없어요.");
  }

  const played = new Set<string>();
  const record = new Map<string, { wins: number; losses: number; draws: number }>();
  const bump = (id: string, kind: "wins" | "losses" | "draws") => {
    const row = record.get(id) ?? { wins: 0, losses: 0, draws: 0 };
    row[kind] += 1;
    record.set(id, row);
  };
  const weekStart = getWeekStartKey(todayKey);
  const winsByTeam = new Map<string, number>(teams.map((team) => [team.name, 0]));
  doneAll.forEach((duel) => {
    played.add(duel.challengerId);
    played.add(duel.opponentId);
    if (duel.outcome === "WIN") {
      bump(duel.challengerId, "wins");
      bump(duel.opponentId, "losses");
    } else if (duel.outcome === "LOSE") {
      bump(duel.challengerId, "losses");
      bump(duel.opponentId, "wins");
    } else {
      bump(duel.challengerId, "draws");
      bump(duel.opponentId, "draws");
    }
    if (duel.finishedKey && duel.finishedKey >= weekStart && duel.outcome !== "DRAW") {
      const winner = byId.get(duel.outcome === "WIN" ? duel.challengerId : duel.opponentId);
      const name = winner ? teamName.get(winner.teamId) : undefined;
      if (name) {
        winsByTeam.set(name, (winsByTeam.get(name) ?? 0) + 1);
      }
    }
  });

  const ranked = students
    .filter((student) => played.has(student.id))
    .sort((left, right) => right.rating - left.rating || left.name.localeCompare(right.name, "ko"));
  const rankOf = (id: string) => {
    const index = ranked.findIndex((student) => student.id === id);

    return index >= 0 ? index + 1 : null;
  };
  const toRankRow = (student: (typeof students)[number], rank: number): ArenaRankRow => ({
    rank,
    studentId: student.id,
    name: student.name,
    hairKey: student.hairKey,
    teamName: teamName.get(student.teamId) ?? "",
    rating: student.rating,
    league: toLeagueView(student.rating),
    isMe: student.id === meId,
  });
  const leaderboard = ranked.slice(0, LEADERBOARD_SIZE).map((student, index) => toRankRow(student, index + 1));
  const myRank = rankOf(meId);
  if (myRank && myRank > LEADERBOARD_SIZE) {
    leaderboard.push(toRankRow(me, myRank));
  }

  const challengesToday = mine.filter((duel) => duel.challengerId === meId && duel.dateKey === todayKey).length;
  const opponents: ArenaOpponentView[] = students
    .filter((student) => student.id !== meId)
    .map((student) => {
      const between = mine.filter((duel) => duel.challengerId === student.id || duel.opponentId === student.id);

      return {
        id: student.id,
        name: student.name,
        hairKey: student.hairKey,
        teamName: teamName.get(student.teamId) ?? "",
        rating: student.rating,
        league: toLeagueView(student.rating),
        blockedReason: explainChallengeBlock({
          enabled,
          isSelf: false,
          challengesToday,
          pairDuelsToday: between.filter((duel) => duel.dateKey === todayKey && duel.status !== "DECLINED").length,
          openBetweenPair: between.some((duel) => duel.status === "CHALLENGER_TURN" || duel.status === "PENDING"),
        }),
      };
    })
    .sort((left, right) => right.rating - left.rating || left.name.localeCompare(right.name, "ko"));

  const nameOf = (id: string) => byId.get(id)?.name ?? "친구";
  const hairOf = (id: string) => byId.get(id)?.hairKey ?? "silver";
  const results: ArenaResultView[] = mine
    .filter((duel) => duel.status === "DONE")
    .slice(0, RESULT_COUNT)
    .map((duel) => {
      const isChallenger = duel.challengerId === meId;
      const outcome = (isChallenger ? duel.outcome : flipOutcome(duel.outcome as Outcome)) as Outcome;
      const otherId = isChallenger ? duel.opponentId : duel.challengerId;

      return {
        duelId: duel.id,
        opponentName: nameOf(otherId),
        hairKey: hairOf(otherId),
        categoryLabel: categoryLabel(duel.category),
        outcome,
        myScore: (isChallenger ? duel.challengerScore : duel.opponentScore) ?? 0,
        theirScore: (isChallenger ? duel.opponentScore : duel.challengerScore) ?? 0,
        myCorrect: (isChallenger ? duel.challengerCorrect : duel.opponentCorrect) ?? 0,
        theirCorrect: (isChallenger ? duel.opponentCorrect : duel.challengerCorrect) ?? 0,
        ratingDelta: isChallenger ? duel.ratingDelta : negate(duel.ratingDelta),
        xp: isChallenger ? duel.challengerXp : duel.opponentXp,
        coins: isChallenger ? duel.challengerCoins : duel.opponentCoins,
        finishedLabel: duel.finishedAt ? formatKstMonthDay(duel.finishedAt) : "",
        rivalEmote: (isChallenger ? duel.opponentEmote : duel.challengerEmote) ?? null,
      };
    });

  const myRecord = record.get(meId) ?? { wins: 0, losses: 0, draws: 0 };
  const nextPoints = pointsToNextLeague(me.rating);

  return {
    enabled,
    me: {
      rating: me.rating,
      league: toLeagueView(me.rating),
      pointsToNext: nextPoints,
      nextLeagueName: nextPoints === null ? null : leagueFor(me.rating + nextPoints).name,
      wins: myRecord.wins,
      losses: myRecord.losses,
      draws: myRecord.draws,
      rank: myRank,
    },
    challengesLeft: Math.max(0, MAX_CHALLENGES_PER_DAY - challengesToday),
    incoming: mine
      .filter((duel) => duel.opponentId === meId && duel.status === "PENDING")
      .map((duel) => ({
        duelId: duel.id,
        challengerName: nameOf(duel.challengerId),
        hairKey: hairOf(duel.challengerId),
        category: duel.category as QuizCategory,
        categoryLabel: categoryLabel(duel.category),
        createdLabel: describeAge(duel.createdAt, now),
      })),
    waiting: mine
      .filter((duel) => duel.challengerId === meId && (duel.status === "PENDING" || duel.status === "CHALLENGER_TURN"))
      .map((duel) => ({
        duelId: duel.id,
        opponentName: nameOf(duel.opponentId),
        hairKey: hairOf(duel.opponentId),
        categoryLabel: categoryLabel(duel.category),
        resumable: duel.status === "CHALLENGER_TURN",
      })),
    results,
    opponents,
    leaderboard,
    teamWins: [...winsByTeam.entries()].map(([name, wins]) => ({ teamName: name, wins })).sort((left, right) => right.wins - left.wins),
  };
}

/**
 * 선생님 화면용 대결 현황: 열림 여부, 이번 주 대결 수, 참여한 학생 수, 답을 기다리는 도전장 수.
 */
export async function getArenaTeacherSummary(todayKey: string): Promise<{ enabled: boolean; duelsThisWeek: number; players: number; pending: number }> {
  const weekStart = getWeekStartKey(todayKey);
  const [enabled, done, pending] = await Promise.all([
    isArenaEnabled(),
    prisma.duel.findMany({ where: { status: "DONE", finishedKey: { gte: weekStart } }, select: { challengerId: true, opponentId: true } }),
    prisma.duel.count({ where: { status: "PENDING" } }),
  ]);
  const players = new Set<string>();
  done.forEach((duel) => {
    players.add(duel.challengerId);
    players.add(duel.opponentId);
  });

  return { enabled, duelsThisWeek: done.length, players: players.size, pending };
}
