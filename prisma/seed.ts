import { PrismaClient, PhotoSlot } from "@prisma/client";

const prisma = new PrismaClient();

const SLOT_COLORS: Record<PhotoSlot, string> = {
  PREP: "#f97316",
  GOAL: "#fb7185",
  NOTES: "#0f766e",
  ASSIGNMENT: "#4f46e5",
};

const SLOT_LABELS: Record<PhotoSlot, string> = {
  PREP: "수업준비사진(자신이나오게)",
  GOAL: "수업목표사진",
  NOTES: "필기사진",
  ASSIGNMENT: "과제사진",
};

/**
 * Builds a lightweight SVG placeholder image as a data URI.
 */
function buildSeedImage(slot: PhotoSlot): string {
  const label = encodeURIComponent(SLOT_LABELS[slot]);
  const color = encodeURIComponent(SLOT_COLORS[slot]);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="900" viewBox="0 0 900 900"><defs><linearGradient id="g" x1="0%" x2="100%" y1="0%" y2="100%"><stop offset="0%" stop-color="${color}"/><stop offset="100%" stop-color="#111827"/></linearGradient></defs><rect width="900" height="900" fill="url(#g)"/><circle cx="720" cy="160" r="84" fill="rgba(255,255,255,0.18)"/><text x="80" y="190" fill="#ffffff" font-size="44" font-family="Arial, sans-serif" font-weight="700">${label}</text><text x="80" y="270" fill="rgba(255,255,255,0.78)" font-size="28" font-family="Arial, sans-serif">pen스타그램 시드 이미지</text></svg>`;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

/**
 * Resets demo data and inserts seed content for the local prototype.
 */
async function main(): Promise<void> {
  await prisma.comment.deleteMany();
  await prisma.postPhoto.deleteMany();
  await prisma.post.deleteMany();
  await prisma.scheduleItem.deleteMany();

  await prisma.post.create({
    data: {
      authorName: "펜 선생님",
      authorRole: "응용프로그래밍 수업 아카이브",
      avatarUrl:
        "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Crect width='160' height='160' rx='80' fill='%23ff7a59'/%3E%3Ctext x='80' y='96' text-anchor='middle' fill='white' font-size='54' font-family='Arial' font-weight='700'%3E펜%3C/text%3E%3C/svg%3E",
      lessonTitle: "응용프로그래밍 1차시 기록",
      caption:
        "반복문과 배열 순회 수업을 인스타그램 형식으로 정리했습니다. 준비-목표-필기-과제 흐름이 한 번에 보이도록 구성했습니다.",
      transcript:
        "오늘은 반복문과 배열 순회, 그리고 디버깅 순서를 한국어로 다시 정리했습니다. 학생들이 직접 코드 흐름을 설명해 보는 시간이 특히 좋았습니다.",
      photos: {
        create: [
          {
            slot: PhotoSlot.PREP,
            label: SLOT_LABELS.PREP,
            imageUrl: buildSeedImage(PhotoSlot.PREP),
          },
          {
            slot: PhotoSlot.GOAL,
            label: SLOT_LABELS.GOAL,
            imageUrl: buildSeedImage(PhotoSlot.GOAL),
          },
          {
            slot: PhotoSlot.NOTES,
            label: SLOT_LABELS.NOTES,
            imageUrl: buildSeedImage(PhotoSlot.NOTES),
          },
          {
            slot: PhotoSlot.ASSIGNMENT,
            label: SLOT_LABELS.ASSIGNMENT,
            imageUrl: buildSeedImage(PhotoSlot.ASSIGNMENT),
          },
        ],
      },
      comments: {
        create: [
          {
            authorName: "김도윤",
            body: "필기사진이랑 과제사진이 같이 보여서 복습하기 편해요.",
          },
          {
            authorName: "한서윤",
            body: "녹음 전사 내용도 같이 보니까 수업 내용이 더 잘 떠올라요.",
          },
        ],
      },
    },
  });

  await prisma.scheduleItem.createMany({
    data: [
      {
        title: "응용프로그래밍 실습 준비물 점검",
        notes: "USB, 예제 파일, 출석 확인",
        scheduledFor: new Date("2026-04-09T08:30:00+09:00"),
      },
      {
        title: "과제 제출 체크",
        notes: "미제출 학생 개별 확인",
        scheduledFor: new Date("2026-04-10T14:10:00+09:00"),
      },
      {
        title: "중간 피드백 기록 정리",
        notes: "캘린더에 간단 메모 추가",
        scheduledFor: new Date("2026-04-15T16:00:00+09:00"),
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
