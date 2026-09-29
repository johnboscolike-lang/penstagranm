import { PrismaClient, PhotoSlot } from "@prisma/client";

import { addDaysToKey, getKstDateKey, getSchoolDayKeys, getWeekStartKey, isSchoolDay } from "../src/utils/kst";
import { rowsToSvgMarkup, svgToDataUri } from "../src/utils/pixel";
import { DEFAULT_PROMISE_PLAN, FIRST_PAGE_STARTS, listUnitNumbers } from "../src/utils/quest-plan";

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
 * Resets demo data and inserts seed content for the local prototype.
 */
async function main(): Promise<void> {
  await prisma.purchase.deleteMany();
  await prisma.promiseUnit.deleteMany();
  await prisma.dailyPromise.deleteMany();
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
