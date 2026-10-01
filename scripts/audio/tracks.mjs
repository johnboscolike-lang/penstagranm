/**
 * 공간별 배경 음악 악보. make-bgm.mjs가 이 악보를 읽어 mp3로 합성하고, 테스트가 같은 악보를 검사한다.
 *
 * 표기:
 *  - melody: 마디마다 "음:길이" 목록. 길이는 8분음표 수, "R"은 쉼표. (한 마디 = 8칸)
 *  - chords: 마디마다 화음 이름. 아래 CHORD_TABLE에서 음을 찾는다.
 *  - drums: 16분음표 16칸 문자열. x=킥, s=스네어, h=닫힌 하이햇, o=열린 하이햇
 *  - bassPattern: 8분음표 8칸. r=근음, 5=5도, 8=옥타브, .=쉼
 *  - compPattern: 16칸. 0~3은 화음의 몇 번째 음을 칠지, .=쉼
 */

export const CHORD_TABLE = {
  C: ["C4", "E4", "G4", "C5"],
  Dm: ["D4", "F4", "A4", "D5"],
  Em: ["E4", "G4", "B4", "E5"],
  F: ["F4", "A4", "C5", "F5"],
  G: ["G3", "B3", "D4", "G4"],
  Am: ["A3", "C4", "E4", "A4"],
  Bb: ["A#3", "D4", "F4", "A#4"],
  D: ["D4", "F#4", "A4", "D5"],
  A: ["A3", "C#4", "E4", "A4"],
  E: ["E4", "G#4", "B4", "E5"],
  Bm: ["B3", "D4", "F#4", "B4"],
  Gm: ["G3", "A#3", "D4", "G4"],
};

/** 화음 이름 → 베이스 근음 */
export const BASS_ROOT = { C: "C2", Dm: "D2", Em: "E2", F: "F2", G: "G1", Am: "A1", Bb: "A#1", D: "D2", A: "A1", E: "E2", Bm: "B1", Gm: "G1" };

export const TRACKS = [
  {
    name: "school",
    title: "학교 — 아침 등굣길",
    bpm: 96,
    swing: 0.08,
    chords: ["C", "G", "Am", "F", "C", "G", "F", "G"],
    melody: [
      "E5:2 G5:2 E5:1 D5:1 C5:2",
      "D5:2 G5:2 B4:2 D5:2",
      "C5:2 E5:2 A5:2 G5:2",
      "A5:2 G5:1 F5:1 E5:2 C5:2",
      "E5:2 G5:2 C6:2 B5:2",
      "A5:2 G5:2 D5:2 B4:2",
      "C5:1 F5:1 A5:2 G5:2 F5:2",
      "D5:2 E5:1 D5:1 B4:2 G4:2",
    ],
    lead: { duty: 0.25, decay: 3.2, level: 0.9, vibrato: 0.003 },
    drums: ["x.......x.......", "....s.......s...", "h.h.h.h.h.h.h.h."],
    drumLevels: { kick: 0.55, snare: 0.35, hat: 0.5 },
    bassPattern: "r.5.r.5.",
    compPattern: ".1..2..1.1..2...",
    comp: { kind: "pulse", duty: 0.125, decay: 9, level: 0.5 },
    pad: 0.5,
  },
  {
    name: "challenge",
    title: "주간도전 — 집중 타임",
    bpm: 112,
    swing: 0,
    chords: ["G", "D", "Em", "C", "G", "D", "C", "D", "Em", "C", "G", "D", "Em", "C", "D", "D"],
    melody: [
      "B4:2 D5:2 G5:2 D5:2",
      "A4:2 D5:2 F#5:2 D5:2",
      "G4:2 B4:2 E5:2 B4:2",
      "E5:2 G5:2 C6:2 G5:2",
      "B4:1 D5:1 G5:2 F#5:2 D5:2",
      "A4:2 F#5:2 A5:2 F#5:2",
      "E5:2 G5:2 E5:1 D5:1 C5:2",
      "D5:2 F#5:2 A5:4",
      "G5:2 E5:2 B4:2 E5:2",
      "E5:2 G5:2 C6:2 E6:2",
      "D5:2 G5:2 B5:2 G5:2",
      "F#5:2 A5:2 D6:2 A5:2",
      "G5:1 B5:1 E6:2 D6:2 B5:2",
      "C6:2 G5:2 E5:2 G5:2",
      "A5:2 F#5:2 D5:2 F#5:2",
      "D5:2 F#5:2 A5:2 R:2",
    ],
    lead: { duty: 0.5, decay: 3.5, level: 0.85, vibrato: 0.002 },
    drums: ["x...x...x...x...", "....s.......s...", "h.hhh.hhh.hhh.hh"],
    drumLevels: { kick: 0.6, snare: 0.4, hat: 0.45 },
    bassPattern: "r.r8r.r8",
    compPattern: "0.1.2.1.0.1.2.1.",
    comp: { kind: "pulse", duty: 0.25, decay: 12, level: 0.45 },
    pad: 0.35,
  },
  {
    name: "room",
    title: "내공간 — 포근한 오후",
    bpm: 80,
    swing: 0.12,
    chords: ["F", "C", "Dm", "Bb", "F", "C", "Bb", "C"],
    melody: [
      "A5:2 C6:2 A5:2 G5:2",
      "G5:2 E5:2 G5:4",
      "F5:2 A5:2 D6:2 A5:2",
      "D6:2 C6:2 A5:4",
      "A5:2 C6:2 F6:2 C6:2",
      "E6:2 C6:2 G5:4",
      "D6:2 C6:2 A#5:2 A5:2",
      "G5:2 A5:2 G5:4",
    ],
    lead: { kind: "bell", decay: 2.2, level: 0.9 },
    drums: [],
    drumLevels: { kick: 0, snare: 0, hat: 0 },
    bassPattern: "r.....5.",
    compPattern: "0.1.2.3.2.1.0.1.",
    comp: { kind: "bell", decay: 3.2, level: 0.35 },
    pad: 0.75,
  },
  {
    name: "arena",
    title: "대결장 — 승부의 시간",
    bpm: 140,
    swing: 0,
    chords: ["Am", "F", "G", "Em", "Am", "F", "C", "E", "Am", "F", "G", "Em", "F", "G", "Am", "E"],
    melody: [
      "A4:1 C5:1 E5:2 A5:2 E5:2",
      "F5:2 A5:2 C6:2 A5:2",
      "G5:2 B5:2 D6:2 B5:2",
      "E5:2 G5:2 B5:4",
      "A5:1 A5:1 C6:2 E6:2 C6:2",
      "C6:2 A5:2 F5:4",
      "E5:2 G5:2 C6:2 G5:2",
      "B5:2 G#5:2 E5:2 R:2",
      "E6:2 C6:2 A5:2 C6:2",
      "F6:2 C6:2 A5:2 C6:2",
      "D6:2 B5:2 G5:2 B5:2",
      "G5:2 B5:2 E6:4",
      "C6:2 F6:2 A5:2 F6:2",
      "D6:2 G5:2 B5:2 D6:2",
      "C6:1 E6:1 A5:2 E6:2 C6:2",
      "B5:2 G#5:2 B5:1 G#5:1 E5:2",
    ],
    lead: { duty: 0.5, decay: 3, level: 0.9, vibrato: 0.004 },
    drums: ["x...x...x..xx...", "....s.......s..s", "h.h.h.h.h.h.h.hh", "x..xx...x...x.x."],
    drumLevels: { kick: 0.8, snare: 0.55, hat: 0.5 },
    bassPattern: "rr8rrr8r",
    compPattern: "0123012301230123",
    comp: { kind: "pulse", duty: 0.25, decay: 14, level: 0.4 },
    pad: 0.25,
    sawBass: true,
  },
  {
    name: "teacher",
    title: "교무실 — 차분한 확인 시간",
    bpm: 88,
    swing: 0.06,
    chords: ["D", "A", "Bm", "G", "D", "A", "G", "A"],
    melody: [
      "F#5:2 A5:2 F#5:2 E5:2",
      "E5:2 C#5:2 E5:4",
      "D5:2 F#5:2 B5:2 F#5:2",
      "B5:2 A5:2 F#5:4",
      "F#5:2 A5:2 D6:2 A5:2",
      "C#6:2 A5:2 E5:4",
      "B5:2 A5:2 G5:2 F#5:2",
      "E5:2 F#5:2 E5:4",
    ],
    lead: { duty: 0.25, decay: 3, level: 0.75, vibrato: 0.003 },
    drums: ["x.......x.......", "........s.......", "..h...h...h...h."],
    drumLevels: { kick: 0.3, snare: 0.22, hat: 0.3 },
    bassPattern: "r.....5.",
    compPattern: "0.1.2.1.",
    comp: { kind: "pulse", duty: 0.125, decay: 10, level: 0.4 },
    pad: 0.7,
  },
];

/**
 * 악보 한 줄("E5:2 G5:2")을 [음 이름 또는 null, 길이(8분음표 수)] 목록으로 푼다.
 * @param {string} line 한 마디 악보
 * @returns {Array<{note: string | null, units: number}>} 음 목록
 */
export function parseMelodyBar(line) {
  return line
    .trim()
    .split(/\s+/)
    .map((token) => {
      const [name, length] = token.split(":");

      return { note: name === "R" ? null : name, units: Number(length) };
    });
}
