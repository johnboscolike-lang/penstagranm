export interface TimetablePeriod {
  period: number;
  subject: string;
  room: string;
  startMinutes: number;
}

export interface SchoolNotice {
  id: string;
  title: string;
  source: string;
  target: string;
  importance: "중요" | "일반";
  postedOn: string;
  body: string;
}

export interface MealInfo {
  label: string;
  menu: string[];
  allergyNumbers: number[];
}

export const SCHOOL_INFO_SOURCE = "학교 정보 예시(데모 데이터)";

const PERIOD_START_MINUTES = [9 * 60, 10 * 60, 11 * 60, 12 * 60, 14 * 60, 15 * 60, 16 * 60] as const;
const PERIOD_LENGTH_MINUTES = 50;

const WEEKLY_SUBJECTS: readonly (readonly string[])[] = [
  ["국어", "수학", "영어", "과학", "체육", "사회", "창의적 체험"],
  ["수학", "국어", "사회", "영어", "음악", "과학", "동아리"],
  ["영어", "과학", "국어", "수학", "미술", "기술·가정", "자율"],
  ["과학", "사회", "수학", "국어", "영어", "체육", "도서관"],
  ["국어", "영어", "체육", "수학", "사회", "창의적 체험", "학급 회의"],
];

const WEEKLY_MEALS: readonly MealInfo[] = [
  { label: "점심", menu: ["비빔밥", "미역국", "배추김치", "요구르트"], allergyNumbers: [1, 5, 6, 13] },
  { label: "점심", menu: ["카레라이스", "콩나물국", "단무지", "과일"], allergyNumbers: [1, 2, 5, 6] },
  { label: "점심", menu: ["제육볶음", "잡곡밥", "된장국", "상추쌈"], allergyNumbers: [5, 6, 10] },
  { label: "점심", menu: ["닭갈비", "쌀밥", "어묵국", "깍두기"], allergyNumbers: [5, 6, 13, 15] },
  { label: "점심", menu: ["돈가스", "볶음밥", "우동국물", "샐러드"], allergyNumbers: [1, 2, 5, 6, 10] },
];

export const SCHOOL_NOTICES: readonly SchoolNotice[] = [
  {
    id: "library",
    title: "도서관 운영 안내",
    source: "도서관",
    target: "전교생",
    importance: "일반",
    postedOn: "이번 주 월요일",
    body: "점심시간(12:50~13:40)과 방과후 16:30까지 열려요. 대출은 1인 3권까지 가능해요.",
  },
  {
    id: "sports-day",
    title: "체육대회 준비물 안내",
    source: "체육부",
    target: "전 학년",
    importance: "중요",
    postedOn: "지난주 금요일",
    body: "체육복과 물병을 챙겨 오세요. 우천 시 강당에서 진행해요.",
  },
  {
    id: "safety",
    title: "등하굣길 안전 안내",
    source: "학생부",
    target: "전교생",
    importance: "일반",
    postedOn: "지난주 수요일",
    body: "교문 앞 횡단보도 공사로 우회로를 이용해 주세요.",
  },
];

/**
 * Formats minutes from midnight as HH:mm.
 */
export function formatMinutes(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/**
 * Lists the timetable of a school weekday (Monday is 0). Weekends fall back to Monday.
 */
export function getTimetable(weekdayIndex: number): TimetablePeriod[] {
  const subjects = WEEKLY_SUBJECTS[weekdayIndex] ?? WEEKLY_SUBJECTS[0];

  return subjects.map((subject, index) => ({
    period: index + 1,
    subject,
    room: subject === "체육" ? "체육관" : subject === "과학" ? "과학실" : "우리 교실",
    startMinutes: PERIOD_START_MINUTES[index],
  }));
}

/**
 * Finds the next class that has not started yet, or the first class of the next school day.
 */
export function getNextClass(
  weekdayIndex: number,
  minutesNow: number,
): { period: TimetablePeriod; isTomorrow: boolean } {
  const today = weekdayIndex < 5 ? getTimetable(weekdayIndex) : [];
  const upcoming = today.find((period) => period.startMinutes + PERIOD_LENGTH_MINUTES > minutesNow);
  if (upcoming) {
    return { period: upcoming, isTomorrow: false };
  }

  const nextWeekday = weekdayIndex >= 4 ? 0 : weekdayIndex + 1;

  return { period: getTimetable(nextWeekday)[0], isTomorrow: true };
}

/**
 * Returns the lunch menu for a school weekday (Monday is 0). Weekends fall back to Monday.
 */
export function getMeal(weekdayIndex: number): MealInfo {
  return WEEKLY_MEALS[weekdayIndex] ?? WEEKLY_MEALS[0];
}

/**
 * Builds the one-line meal summary shown in the collapsed school panel.
 */
export function summarizeMeal(meal: MealInfo): string {
  return meal.menu.slice(0, 2).join(" · ");
}
