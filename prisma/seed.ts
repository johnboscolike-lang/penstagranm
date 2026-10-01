import { deflateSync } from "node:zlib";

import { PrismaClient, PhotoSlot } from "@prisma/client";

import { syncAchievements } from "../src/utils/achievement-repository";
import { reviewWord } from "../src/utils/word-review";
import { BOSS_REWARD, bossForWeek } from "../src/utils/boss-rules";
import { hatPurchaseKey } from "../src/utils/cosmetics";
import { applyElo, decideOutcome, flipOutcome, rewardFor, scoreAnswers, START_RATING } from "../src/utils/arena-rules";
import { addDaysToKey, getKstDateKey, getSchoolDayKeys, getWeekStartKey, isSchoolDay } from "../src/utils/kst";
import { rowsToSvgMarkup, svgToDataUri } from "../src/utils/pixel";
import { DEFAULT_PROMISE_PLAN, FIRST_PAGE_STARTS, listUnitNumbers } from "../src/utils/quest-plan";
import { generateQuestions, type QuizCategory } from "../src/utils/quiz-bank";

// 로컬 SQLite 데모는 별도 설정 없이도 실행되도록 기본 경로를 채운다.
process.env.DATABASE_URL ??= "file:./dev.db";

const prisma = new PrismaClient();

const SLOT_LABELS: Record<PhotoSlot, string> = {
  PREP: "수업준비사진(자신이나오게)",
  GOAL: "수업목표사진",
  NOTES: "필기사진",
  ASSIGNMENT: "과제사진",
};

const SLOT_BACKGROUNDS: Record<PhotoSlot, string> = {
  PREP: "#ffe3c2",
  GOAL: "#ffd3dc",
  NOTES: "#cfeee6",
  ASSIGNMENT: "#d8dcff",
};

const ICON_PALETTE = { d: "#3a2a2a", w: "#fffaf0", y: "#ffd66b", r: "#f0627a", b: "#7bb6d9", g: "#3fae7a", e: "#3a2a2a", m: "#c94a5c" };

const SLOT_ICONS: Record<PhotoSlot, string[]> = {
  PREP: [
    "....dddd....",
    "..ddyyyydd..",
    ".dyyyyyyyyd.",
    ".dyyeyyeyyd.",
    "dyyyyyyyyyyd",
    "dyyryyyyryyd",
    "dyyyymmyyyyd",
    "dyyyyyyyyyyd",
    ".dyyyyyyyyd.",
    ".dyyyyyyyyd.",
    "..ddyyyydd..",
    "....dddd....",
  ],
  GOAL: [
    "............",
    ".dd.........",
    ".drrrrr.....",
    ".drrrrrrr...",
    ".drrrrr.....",
    ".dd.........",
    ".dd.........",
    ".dd.........",
    ".dd.........",
    ".dd.........",
    ".dd.........",
    "dddddd......",
  ],
  NOTES: [
    ".dddddddddd.",
    ".dwwwwwwwwd.",
    ".dwbbbbbbwd.",
    ".dwwwwwwwwd.",
    ".dwbbbbbwwd.",
    ".dwwwwwwwwd.",
    ".dwbbbbbbwd.",
    ".dwwwwwwwwd.",
    ".dwbbbwwwwd.",
    ".dwwwwwwwwd.",
    ".dddddddddd.",
    "............",
  ],
  ASSIGNMENT: [
    ".dddddddddd.",
    ".dwwwwwwwwd.",
    ".dwwwwwwgwd.",
    ".dwwwwwggwd.",
    ".dwgwwggwwd.",
    ".dwggggwwwd.",
    ".dwwgggwwwd.",
    ".dwwwgwwwwd.",
    ".dwwwwwwwwd.",
    ".dwbbbbbbwd.",
    ".dddddddddd.",
    "............",
  ],
};

interface TeamSeed {
  name: string;
  emblem: string;
  skill: number;
  members: { name: string; hairKey: string; isMe?: boolean }[];
}

const TEAM_SEEDS: TeamSeed[] = [
  {
    name: "별빛팀",
    emblem: "star",
    skill: 0.88,
    members: [
      { name: "한서윤", hairKey: "rose" },
      { name: "김도윤", hairKey: "black" },
      { name: "이준서", hairKey: "brown" },
      { name: "박하은", hairKey: "blonde" },
    ],
  },
  {
    name: "새싹팀",
    emblem: "sprout",
    skill: 0.78,
    members: [
      { name: "도토리", hairKey: "silver", isMe: true },
      { name: "최민재", hairKey: "green" },
      { name: "정유나", hairKey: "black" },
      { name: "강시우", hairKey: "brown" },
    ],
  },
  {
    name: "물결팀",
    emblem: "wave",
    skill: 0.66,
    members: [
      { name: "윤서아", hairKey: "blue" },
      { name: "임재현", hairKey: "orange" },
      { name: "오지안", hairKey: "black" },
      { name: "신도현", hairKey: "purple" },
    ],
  },
];

const NOT_STARTED_TODAY = new Set(["박하은", "이준서", "정유나", "윤서아", "임재현"]);

const PLANNED_UNITS = DEFAULT_PROMISE_PLAN.map((template) => template.unitCount);

// 도토리(나)의 지난 4주 기록. 각 날짜는 [국어 6쪽, 수학 4쪽, 영단어 15개] 중 확인한 단위 수.
const MY_HISTORY: number[][][] = [
  [[3, 1, 0], [6, 0, 0], [0, 0, 0], [3, 2, 3], [6, 2, 0]],
  [[6, 2, 5], [0, 0, 0], [3, 2, 0], [6, 0, 0], [0, 0, 0]],
  [[6, 3, 5], [3, 2, 3], [0, 0, 0], [6, 4, 0], [3, 0, 6]],
  [[6, 4, 10], [6, 2, 5], [3, 4, 3], [6, 3, 0], [6, 4, 15]],
];
const MY_FULL_DAY = [6, 4, 5];
const MY_TODAY = [3, 2, 5];

/**
 * Creates a small deterministic random generator so the seed data is repeatable.
 */
function createRandom(seedText: string): () => number {
  let state = 0;
  for (const char of seedText) {
    state = (state * 31 + char.charCodeAt(0)) >>> 0;
  }

  return function next(): number {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);

    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Computes the CRC-32 checksum PNG chunks need.
 */
function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }

  return (crc ^ 0xffffffff) >>> 0;
}

/**
 * Wraps data into one PNG chunk.
 */
function pngChunk(type: string, data: Buffer): Buffer {
  const body = Buffer.concat([Buffer.from(type), data]);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(body));

  return Buffer.concat([length, body, checksum]);
}

/**
 * Draws a tiny "notebook photo" PNG (lined paper with a colored margin) so demo proofs show a real image.
 */
function buildDemoPhoto(accent: [number, number, number]): Buffer {
  const size = 96;
  const rows: Buffer[] = [];
  for (let y = 0; y < size; y += 1) {
    const row = Buffer.alloc(1 + size * 3);
    for (let x = 0; x < size; x += 1) {
      const onLine = y % 12 === 10;
      const inMargin = x > 10 && x < 14;
      const color = inMargin ? accent : onLine ? [150, 190, 230] : [255, 250, 235];
      row[1 + x * 3] = color[0];
      row[2 + x * 3] = color[1];
      row[3 + x * 3] = color[2];
    }
    rows.push(row);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header.set([8, 2, 0, 0, 0], 8);

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", header),
    pngChunk("IDAT", deflateSync(Buffer.concat(rows))),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

/**
 * Builds a pixel-art placeholder image for one of the four fixed photo slots.
 */
function buildSeedImage(slot: PhotoSlot): string {
  return svgToDataUri(
    rowsToSvgMarkup(SLOT_ICONS[slot], ICON_PALETTE, { background: SLOT_BACKGROUNDS[slot], padding: 2 }),
  );
}

/**
 * Converts a date key and Korean wall-clock time into a Date.
 */
function atKst(dateKey: string, time: string): Date {
  return new Date(`${dateKey}T${time}:00+09:00`);
}

/**
 * Decides how many units a classmate confirmed for one promise on one day.
 */
function pickClassmateUnits(random: () => number, skill: number, planned: number): number {
  if (random() < 0.07) {
    return 0;
  }

  const ratio = Math.min(1, Math.max(0, skill + (random() - 0.5) * 0.5));
  const fullChance = ratio > 0.85 ? 0.45 : 0.12;

  return random() < fullChance ? planned : Math.round(ratio * planned);
}

/**
 * Calculates the range start for a past day so page numbers wrap inside a 60-page workbook.
 */
function pastPageStart(slotIndex: number, daysBack: number, pagesPerDay: number): number {
  const first = FIRST_PAGE_STARTS[slotIndex] ?? 1;

  return 1 + ((((first - 1 - pagesPerDay * daysBack) % 60) + 60) % 60);
}

/**
 * Stores a demo proof photo and returns the relative URL that /api/uploads serves.
 */
async function createDemoProof(promiseId: string, accent: [number, number, number]): Promise<void> {
  const data = buildDemoPhoto(accent);
  const file = await prisma.uploadedFile.create({ data: { mime: "image/png", size: data.length, data: new Uint8Array(data) } });
  await prisma.questProof.create({ data: { promiseId, imageUrl: `/api/uploads/${file.id}` } });
}

/**
 * Adds teacher quests in every review state so the teacher screens are alive on the first visit:
 * one waiting for review, one confirmed with feedback, one sent back for a retry, plus a weekly quest.
 */
async function seedQuestDemo(
  studentsByName: Map<string, string>,
  myId: string,
  todayKey: string,
  thisMonday: string,
): Promise<void> {
  const base = { advance: false, weekdays: "12345", startDate: thisMonday, requireProof: true, createdBy: "국어 선생님" };
  const idOf = (name: string): string => studentsByName.get(name) ?? myId;

  const questFor = (studentName: string, subject: string, title: string, unitKind: string, unitStart: number, unitCount: number) =>
    prisma.quest.create({ data: { ...base, studentId: idOf(studentName), kind: "DAILY", subject, title, unitKind, unitStart, unitCount } });

  const linkTodayCard = async (studentName: string, slotIndex: number, quest: { id: string; subject: string; title: string }, extra: Record<string, unknown>) => {
    const card = await prisma.dailyPromise.findFirst({ where: { studentId: idOf(studentName), dateKey: todayKey, slotIndex, scope: "DAY" } });
    if (!card) {
      return null;
    }

    return prisma.dailyPromise.update({
      where: { id: card.id },
      data: { questId: quest.id, subject: quest.subject, title: quest.title, requireProof: true, reviewStatus: "OPEN", ...extra },
    });
  };

  const mine = await questFor("도토리", "수학", "올림포스 풀이", "PAGE", 24, 4);
  await linkTodayCard("도토리", 1, mine, {});

  const submitted = await questFor("한서윤", "국어", "예비 매3문 근거 표시", "PAGE", 12, 6);
  const submittedCard = await linkTodayCard("한서윤", 0, submitted, { reviewStatus: "SUBMITTED", submittedAt: new Date() });
  if (submittedCard) {
    await createDemoProof(submittedCard.id, [230, 90, 100]);
  }

  const confirmed = await questFor("김도윤", "수학", "올림포스 풀이", "PAGE", 24, 4);
  const confirmedCard = await linkTodayCard("김도윤", 1, confirmed, {
    reviewStatus: "CONFIRMED",
    feedback: "풀이 과정이 잘 보여요! 막힌 문제를 표시한 점이 좋아요.",
    reviewedAt: new Date(),
    reviewedBy: "수학 선생님",
  });
  if (confirmedCard) {
    await createDemoProof(confirmedCard.id, [70, 140, 210]);
  }

  const retry = await questFor("최민재", "영단어", "내가 고른 단어 15개", "WORD", 1, 15);
  const retryCard = await linkTodayCard("최민재", 2, retry, {
    reviewStatus: "RETRY",
    feedback: "사진이 흐려서 단어가 안 보여요. 밝은 곳에서 다시 찍어 줄래요?",
    reviewedAt: new Date(),
    reviewedBy: "영어 선생님",
  });
  if (retryCard) {
    await createDemoProof(retryCard.id, [90, 180, 110]);
  }

  const weekly = await prisma.quest.create({
    data: { ...base, studentId: myId, kind: "WEEKLY", subject: "영어", title: "독해 지문 읽기", unitKind: "PAGE", unitStart: 1, unitCount: 20, requireProof: false },
  });
  const weeklyCard = await prisma.dailyPromise.create({
    data: {
      studentId: myId,
      dateKey: thisMonday,
      slotIndex: 100,
      scope: "WEEK",
      questId: weekly.id,
      subject: weekly.subject,
      title: weekly.title,
      unitKind: "PAGE",
      unitStart: 1,
      unitCount: 20,
      reviewStatus: "OPEN",
    },
  });
  await prisma.promiseUnit.createMany({
    data: Array.from({ length: 8 }, (_, index) => ({ promiseId: weeklyCard.id, unitNo: index + 1 })),
  });
}

/**
 * 대결장이 첫날부터 살아 있도록 끝난 대결 몇 판과 도토리에게 온 도전장 한 장을 넣는다.
 */
async function seedArenaDemo(studentsByName: Map<string, string>, myId: string, todayKey: string): Promise<void> {
  const idOf = (name: string): string => studentsByName.get(name) ?? myId;
  const ratings = new Map<string, number>();
  const ratingOf = (id: string): number => ratings.get(id) ?? START_RATING;

  const makeAnswers = (correctCount: number, answerIndexes: number[], baseMs: number) =>
    answerIndexes.map((answerIndex, index) => ({ choice: index < correctCount ? answerIndex : (answerIndex + 1) % 4, ms: baseMs + index * 350 }));

  const playDone = async (
    challengerName: string,
    opponentName: string,
    category: QuizCategory,
    seed: number,
    challengerCorrect: number,
    opponentCorrect: number,
    finishedKey: string,
  ) => {
    const questions = generateQuestions(category, seed);
    const indexes = questions.map((question) => question.answerIndex);
    const challengerAnswers = makeAnswers(challengerCorrect, indexes, 3200);
    const opponentAnswers = makeAnswers(opponentCorrect, indexes, 3800);
    const challengerScore = scoreAnswers(indexes, challengerAnswers);
    const opponentScore = scoreAnswers(indexes, opponentAnswers);
    const challengerId = idOf(challengerName);
    const opponentId = idOf(opponentName);
    const outcome = decideOutcome(challengerScore.score, opponentScore.score);
    const elo = applyElo(ratingOf(challengerId), ratingOf(opponentId), outcome);
    ratings.set(challengerId, elo.challenger);
    ratings.set(opponentId, elo.opponent);
    const challengerReward = rewardFor(outcome, 0);
    const opponentReward = rewardFor(flipOutcome(outcome), 0);

    await prisma.duel.create({
      data: {
        challengerId,
        opponentId,
        category,
        questions: JSON.stringify(questions),
        status: "DONE",
        dateKey: finishedKey,
        challengerAnswers: JSON.stringify(challengerAnswers),
        challengerCorrect: challengerScore.correct,
        challengerScore: challengerScore.score,
        challengerMs: challengerScore.totalMs,
        opponentAnswers: JSON.stringify(opponentAnswers),
        opponentCorrect: opponentScore.correct,
        opponentScore: opponentScore.score,
        opponentMs: opponentScore.totalMs,
        outcome,
        ratingDelta: elo.delta,
        challengerRatingAfter: elo.challenger,
        opponentRatingAfter: elo.opponent,
        challengerXp: challengerReward.xp,
        challengerCoins: challengerReward.coins,
        opponentXp: opponentReward.xp,
        opponentCoins: opponentReward.coins,
        finishedKey,
        finishedAt: new Date(`${finishedKey}T03:00:00Z`),
      },
    });
  };

  const yesterday = addDaysToKey(todayKey, -1);
  await playDone("김도윤", "한서윤", "MATH", 101, 5, 4, yesterday);
  await playDone("최민재", "정유나", "ENGLISH", 202, 4, 4, yesterday);
  await playDone("박하은", "이준서", "MIX", 303, 3, 5, yesterday);
  await playDone("도토리", "김도윤", "MIX", 404, 4, 5, todayKey);
  await playDone("정유나", "도토리", "ENGLISH", 505, 3, 4, todayKey);
  await playDone("강시우", "임재현", "MATH", 606, 5, 2, todayKey);

  // 도토리에게 온 도전장: 한서윤이 먼저 풀어 놓고 답을 기다린다.
  const pendingQuestions = generateQuestions("MATH", 707);
  const pendingIndexes = pendingQuestions.map((question) => question.answerIndex);
  const pendingAnswers = makeAnswers(4, pendingIndexes, 3000);
  const pendingScore = scoreAnswers(pendingIndexes, pendingAnswers);
  await prisma.duel.create({
    data: {
      challengerId: idOf("한서윤"),
      opponentId: myId,
      category: "MATH",
      questions: JSON.stringify(pendingQuestions),
      status: "PENDING",
      dateKey: todayKey,
      challengerAnswers: JSON.stringify(pendingAnswers),
      challengerCorrect: pendingScore.correct,
      challengerScore: pendingScore.score,
      challengerMs: pendingScore.totalMs,
    },
  });

  for (const [studentId, rating] of ratings) {
    await prisma.student.update({ where: { id: studentId }, data: { rating } });
  }
}

/**
 * Resets demo data and inserts seed content for the local prototype.
 */
async function main(): Promise<void> {
  // 배포 빌드에서는 `--if-empty`로 부르므로, 이미 학생이 있으면 기존 데이터를 지우지 않고 건너뛴다.
  if (process.argv.includes("--if-empty") && (await prisma.student.count()) > 0) {
    process.stdout.write("이미 데이터가 있어 시드를 건너뜁니다.\n");
    return;
  }

  await prisma.wordCard.deleteMany();
  await prisma.achievement.deleteMany();
  await prisma.bossReward.deleteMany();
  await prisma.duel.deleteMany();
  await prisma.classSetting.deleteMany();
  await prisma.uploadedFile.deleteMany();
  await prisma.questProof.deleteMany();
  await prisma.purchase.deleteMany();
  await prisma.promiseUnit.deleteMany();
  await prisma.dailyPromise.deleteMany();
  await prisma.quest.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.postPhoto.deleteMany();
  await prisma.post.deleteMany();
  await prisma.student.deleteMany();
  await prisma.team.deleteMany();
  await prisma.scheduleItem.deleteMany();

  const todayKey = getKstDateKey();
  const thisMonday = getWeekStartKey(todayKey);

  const dayKeys: string[] = [];
  for (let weeksBack = 4; weeksBack >= 0; weeksBack -= 1) {
    const monday = addDaysToKey(thisMonday, -7 * weeksBack);
    getSchoolDayKeys(monday).forEach((dayKey) => {
      if (dayKey <= todayKey) {
        dayKeys.push(dayKey);
      }
    });
  }

  const studentsByName = new Map<string, string>();
  let myId = "";

  for (const teamSeed of TEAM_SEEDS) {
    const team = await prisma.team.create({ data: { name: teamSeed.name, emblem: teamSeed.emblem } });

    for (const member of teamSeed.members) {
      const student = await prisma.student.create({
        data: { name: member.name, hairKey: member.hairKey, isMe: Boolean(member.isMe), teamId: team.id },
      });
      studentsByName.set(member.name, student.id);
      if (member.isMe) {
        myId = student.id;
      }
    }
  }

  const promiseRows: { id: string; studentId: string; dateKey: string; slotIndex: number; subject: string; title: string; unitKind: string; unitStart: number; unitCount: number }[] = [];
  const unitRows: { promiseId: string; unitNo: number; confirmedAt: Date }[] = [];

  for (const teamSeed of TEAM_SEEDS) {
    for (const member of teamSeed.members) {
      const studentId = studentsByName.get(member.name) ?? "";
      const random = createRandom(member.name);

      dayKeys.forEach((dayKey, dayIndex) => {
        const daysBack = dayKeys.length - 1 - dayIndex;
        const mondayOfDay = getWeekStartKey(dayKey);
        const weeksBack = Math.round(
          (new Date(`${thisMonday}T00:00:00Z`).getTime() - new Date(`${mondayOfDay}T00:00:00Z`).getTime()) /
            (7 * 24 * 60 * 60 * 1000),
        );
        const weekdayIndex = getSchoolDayKeys(dayKey).indexOf(dayKey);

        DEFAULT_PROMISE_PLAN.forEach((template, slotIndex) => {
          const isPage = template.unitKind === "PAGE";
          const unitStart = isPage
            ? daysBack === 0
              ? (FIRST_PAGE_STARTS[slotIndex] ?? 1)
              : pastPageStart(slotIndex, daysBack, template.unitCount)
            : 1;

          let confirmed: number;
          if (member.isMe) {
            if (weeksBack === 0) {
              confirmed = (dayKey === todayKey ? MY_TODAY : MY_FULL_DAY)[slotIndex];
            } else {
              confirmed = MY_HISTORY[4 - weeksBack][weekdayIndex][slotIndex];
            }
          } else {
            confirmed = pickClassmateUnits(random, teamSeed.skill, PLANNED_UNITS[slotIndex]);
            // 오늘 아직 시작하지 않은 친구들이 있어야 선생님이 낸 퀘스트가 바로 나타난다.
            if (dayKey === todayKey && NOT_STARTED_TODAY.has(member.name) && slotIndex > 0) {
              confirmed = 0;
            }
          }

          const promiseId = `seed-${studentId}-${dayKey}-${slotIndex}`;
          promiseRows.push({
            id: promiseId,
            studentId,
            dateKey: dayKey,
            slotIndex,
            subject: template.subject,
            title: template.title,
            unitKind: template.unitKind,
            unitStart,
            unitCount: template.unitCount,
          });

          listUnitNumbers({ unitStart, unitCount: template.unitCount })
            .slice(0, confirmed)
            .forEach((unitNo) => {
              unitRows.push({ promiseId, unitNo, confirmedAt: atKst(dayKey, "16:00") });
            });
        });
      });
    }
  }

  await prisma.dailyPromise.createMany({ data: promiseRows });
  await prisma.promiseUnit.createMany({ data: unitRows });

  await prisma.purchase.createMany({
    data: [
      { studentId: myId, itemKey: "lamp", cost: 20 },
      { studentId: myId, itemKey: "flowerbed", cost: 25 },
    ],
  });

  await seedQuestDemo(studentsByName, myId, todayKey, thisMonday);
  await seedArenaDemo(studentsByName, myId, todayKey);
  // 도토리는 지난 보스 두 마리를 이겨 펫을 만났고, 고양이 귀 모자를 쓰고 첫 펫과 함께 다닌다.
  const oldWeeks = [addDaysToKey(thisMonday, -14), addDaysToKey(thisMonday, -21)];
  await prisma.bossReward.createMany({ data: oldWeeks.map((weekKey) => ({ studentId: myId, weekKey, xp: BOSS_REWARD.xp, coins: BOSS_REWARD.coins })) });
  await prisma.purchase.create({ data: { studentId: myId, itemKey: hatPurchaseKey("ears"), cost: 25 } });
  await prisma.student.update({ where: { id: myId }, data: { hatKey: "ears", petKey: bossForWeek(oldWeeks[0]).key } });
  // 도토리가 지난 며칠 동안 복습한 단어: 단어마다 간격 반복이 쌓인 모습을 보여 준다.
  const dayMs = 86_400_000;
  const demoWords: { word: string; answers: boolean[] }[] = [
    { word: "apple", answers: [true, true, true] },
    { word: "cat", answers: [true, true] },
    { word: "dog", answers: [true, false, true] },
    { word: "book", answers: [false, true] },
    { word: "school", answers: [true] },
    { word: "water", answers: [true, true, true, true] },
  ];
  for (const [offset, demo] of demoWords.entries()) {
    let card = null as ReturnType<typeof reviewWord>["card"] | null;
    let when = Date.now() - (14 - offset) * dayMs;
    for (const correct of demo.answers) {
      card = reviewWord(demo.word, card, correct, new Date(when)).card;
      when = Math.min(Date.now() - dayMs, Math.max(when + dayMs, card.due.getTime()));
    }
    if (card) {
      await prisma.wordCard.create({ data: { studentId: myId, createdAt: new Date(Date.now() - (14 - offset) * dayMs), ...card } });
    }
  }
  // 이미 기록으로 이룬 업적은 "봤음"으로 두어, 첫 화면에서 알림이 한꺼번에 쏟아지지 않게 한다.
  // (연속 실천은 화면을 열 때의 날짜로 계산하니, 지금 이어지는 연속 업적만 새 알림으로 뜬다.)
  for (const studentId of studentsByName.values()) {
    await syncAchievements(prisma, studentId, 0);
    await prisma.achievement.updateMany({ where: { studentId }, data: { seen: true } });
  }
  // 데모 데이터는 칸이 넉넉히 채워져 있어서, 보스가 한창 싸우는 모습이 보이도록 어려움으로 둔다.
  await prisma.classSetting.create({ data: { key: "raidLevel", value: "hard" } });

  const previousSchoolDays = dayKeys.filter((dayKey) => dayKey < todayKey && isSchoolDay(dayKey));
  const postDays = [
    previousSchoolDays[previousSchoolDays.length - 1],
    previousSchoolDays[previousSchoolDays.length - 3],
    previousSchoolDays[previousSchoolDays.length - 6],
    previousSchoolDays[previousSchoolDays.length - 9],
  ].filter((dayKey): dayKey is string => Boolean(dayKey));

  const postSeeds: {
    author: string;
    role: string;
    day: string;
    time: string;
    title: string;
    caption: string;
    transcript: string;
    comments: { name: string; body: string; time: string }[];
  }[] = [
    {
      author: "도토리",
      role: "새싹팀 · 모험가",
      day: postDays[0] ?? todayKey,
      time: "16:20",
      title: "국어 예비 매3문 · 근거 표시하기",
      caption: "막힌 곳을 먼저 표시하고 풀었더니 어디서 헷갈리는지 보였어요. 내일은 표시한 문장만 다시 읽어 볼래요.",
      transcript: "오늘은 지문에서 근거 문장에 밑줄을 긋고, 선택지와 하나씩 비교하는 순서로 풀었습니다.",
      comments: [
        { name: "국어 선생님", body: "막힌 곳을 잘 표시했구나! 다음엔 표시한 이유를 한 줄로 적어 보자.", time: "17:05" },
        { name: "한서윤", body: "나도 밑줄 긋기 따라 해 볼래!", time: "17:40" },
      ],
    },
    {
      author: "한서윤",
      role: "별빛팀 · 모험가",
      day: postDays[1] ?? todayKey,
      time: "15:40",
      title: "수학 올림포스 · 오답 재도전",
      caption: "틀린 문제를 표시해 두고 두 번째 풀이까지 마쳤어요. 별빛팀 다리도 한 칸 복구!",
      transcript: "",
      comments: [{ name: "김도윤", body: "재도전한 게 대단해요. 나도 오늘 해 봐야지.", time: "16:10" }],
    },
    {
      author: "도토리",
      role: "새싹팀 · 모험가",
      day: postDays[2] ?? todayKey,
      time: "16:50",
      title: "영단어 15개 · 뜻 떠올리기",
      caption: "내가 고른 단어 15개 중 10개를 떠올렸어요. 다시 볼 단어 5개는 포스트잇에 붙였어요.",
      transcript: "단어를 보기 전에 뜻을 먼저 말해 보고, 헷갈린 단어만 따로 모았습니다.",
      comments: [{ name: "영어 선생님", body: "먼저 떠올려 본 방법이 아주 좋아요. 다시 볼 단어도 잘 골랐네요!", time: "17:20" }],
    },
    {
      author: "윤서아",
      role: "물결팀 · 모험가",
      day: postDays[3] ?? todayKey,
      time: "16:05",
      title: "인강 1개 · 핵심 한 문장",
      caption: "강의를 보고 핵심을 한 문장으로 정리했어요. 짧게 써도 기억에 남아요.",
      transcript: "",
      comments: [],
    },
  ];

  for (const postSeed of postSeeds) {
    const authorId = studentsByName.get(postSeed.author);
    await prisma.post.create({
      data: {
        studentId: authorId,
        authorName: postSeed.author,
        authorRole: postSeed.role,
        lessonTitle: postSeed.title,
        caption: postSeed.caption,
        transcript: postSeed.transcript,
        createdAt: atKst(postSeed.day, postSeed.time),
        photos: {
          create: (Object.keys(SLOT_LABELS) as PhotoSlot[]).map((slot) => ({
            slot,
            label: SLOT_LABELS[slot],
            imageUrl: buildSeedImage(slot),
          })),
        },
        comments: {
          create: postSeed.comments.map((comment) => ({
            authorName: comment.name,
            body: comment.body,
            createdAt: atKst(postSeed.day, comment.time),
          })),
        },
      },
    });
  }

  const nextFriday = (() => {
    let key = todayKey;
    while (new Date(`${key}T00:00:00Z`).getUTCDay() !== 5) {
      key = addDaysToKey(key, 1);
    }

    return key;
  })();

  await prisma.scheduleItem.createMany({
    data: [
      {
        title: "체육대회",
        notes: "체육복과 물병을 챙겨 오세요. 우천 시 강당에서 진행해요.",
        scheduledFor: atKst(nextFriday, "09:00"),
      },
      {
        title: "수학 수행평가 안내",
        notes: "올림포스 p.24~27 범위를 복습해 두면 좋아요.",
        scheduledFor: atKst(addDaysToKey(todayKey, 1), "14:10"),
      },
      {
        title: "도서관 반납일",
        notes: "대출한 책은 3권까지 반납해요.",
        scheduledFor: atKst(addDaysToKey(todayKey, 3), "12:50"),
      },
      {
        title: "학급 회의: 우리 반 이번 달 목표",
        notes: "모둠별로 한 가지씩 의견을 준비해 주세요.",
        scheduledFor: atKst(addDaysToKey(todayKey, 8), "15:00"),
      },
      {
        title: "과제 제출 체크",
        notes: "미제출 학생 개별 확인",
        scheduledFor: atKst(addDaysToKey(todayKey, -2), "14:10"),
      },
    ],
  });
}

main()
  .catch(async (error: unknown) => {
    process.stderr.write(`${String(error)}\n`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
