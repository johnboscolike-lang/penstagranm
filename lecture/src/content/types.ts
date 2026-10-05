/**
 * 강의 대본 데이터 형식.
 *
 * 발화(say) 안의 `{큐이름}`은 바로 뒤 글자가 들리는 순간을 가리킨다.
 * `[화면표기|읽는소리]`는 자막·화면에는 앞쪽을, 음성에는 뒤쪽을 쓴다(예: `[1823|천팔백이십삼]`).
 * 장면의 시각 요소는 큐 이름으로 등장 시점을 지정한다.
 */

export type Tone = "ice" | "blue" | "yellow" | "green" | "red" | "dim";

/** 발화 안의 큐 이름. */
export type Cue = string;

export type TextAt = { t: string; at: Cue; tone?: Tone };

export type IconName =
  | "recipe"
  | "fridge"
  | "chef"
  | "pot"
  | "bolt"
  | "meter"
  | "gear"
  | "school"
  | "factory"
  | "person"
  | "book"
  | "shield"
  | "eye"
  | "coin"
  | "flag"
  | "spark";

export type StatementProps = {
  kind: "statement";
  kicker?: string;
  lines: { t: string; at?: Cue; tone?: Tone; size?: "xl" | "l" | "m" }[];
  notes?: TextAt[];
};

export type MapProps = {
  kind: "map";
  /** epitome: 다섯 질문, areas: 7영역 부착, roadmap: 6강 배지, focus: 한 질문으로 들어감, done: 강 완료 표시 */
  stage: "epitome" | "areas" | "roadmap" | "focus" | "done";
  /** 노드·영역·강 배지 등장 큐. 키: q0..q4, a0..a6, l1..l6 */
  at?: Record<string, Cue>;
  focus?: number;
  /** 이미 끝난 질문 */
  lit?: number[];
};

export type Side = {
  title: string;
  icon: IconName;
  at?: Cue;
  tone?: Tone;
  items: TextAt[];
};

export type MetaphorProps = {
  kind: "metaphor";
  left: Side;
  right: Side;
  bridge?: TextAt;
};

export type ChunksProps = {
  kind: "chunks";
  /** 정의 문장 조각. k가 있으면 해당 덩어리로 밑줄이 그어진다. */
  parts: { t: string; k?: string }[];
  chunks: { k: string; label: string; sub?: string; at: Cue; tone: Tone }[];
  traps?: TextAt[];
};

export type TableProps = {
  kind: "table";
  title?: string;
  /** 첫 열을 축 이름 열로 쓸지 */
  axis?: string;
  cols: { t: string; sub?: string; tone?: Tone; at?: Cue }[];
  rows: { axis?: string; cells: string[]; at: Cue; group?: number; tone?: Tone }[];
  groups?: { t: string; at: Cue; tone: Tone }[];
  foot?: TextAt;
};

export type GridProps = {
  kind: "grid";
  xTitle: string;
  yTitle: string;
  xs: string[];
  ys: string[];
  xAt: Cue;
  yAt: Cue;
  cells: { x: number; y: number; t: string; at: Cue; tone?: Tone }[];
  foot?: TextAt;
};

export type ListProps = {
  kind: "list";
  title?: string;
  layout: "steps" | "cards" | "stack";
  items: { t: string; sub?: string; tag?: string; at: Cue; tone?: Tone; icon?: IconName }[];
  foot?: TextAt;
};

export type TimelineProps = {
  kind: "timeline";
  events: { year: string; t: string; sub?: string; at: Cue; tone?: Tone }[];
  notes?: TextAt[];
};

export type ExamProps = {
  kind: "exam";
  meta: string;
  points?: string;
  body: string[];
  /** 지문 안의 문구 q에 표시를 남긴다. 강사 시선 커서가 그 위치로 이동한다. */
  marks: { q: string; at: Cue; kind: "hl" | "ul" | "box" | "strike" }[];
  blanks?: { mark: string; answer: string; at: Cue }[];
  verdict?: TextAt;
};

export type RecapProps = {
  kind: "recap";
  root: string;
  rootAt?: Cue;
  branches: { t: string; leaves: string[]; at: Cue }[];
  foot?: TextAt;
};

export type OpeningProps = {
  kind: "opening";
  word: string;
  title: string;
  sub: string;
};

export type ClosingProps = {
  kind: "closing";
  word: string;
  next: string;
  nextAt?: Cue;
};

export type Visual =
  | StatementProps
  | MapProps
  | MetaphorProps
  | ChunksProps
  | TableProps
  | GridProps
  | ListProps
  | TimelineProps
  | ExamProps
  | RecapProps
  | OpeningProps
  | ClosingProps;

export type Scene = {
  id: string;
  say: string;
  v: Visual;
};

export type Chapter = {
  id: string;
  no: number;
  title: string;
  scenes: Scene[];
};

export type Lesson = {
  id: string;
  no: number;
  title: string;
  chapters: Chapter[];
};
