/**
 * 대본 해석기와 시간표 계산 검사.
 * 실행: node --experimental-strip-types --test tests/
 */
import { test } from "node:test";
import assert from "node:assert/strict";

const { parseSay } = await import("../src/content/parse.ts");
const { planLesson } = await import("../src/timeline.ts");
const { l01 } = await import("../src/content/l01/index.ts");

test("큐는 바로 뒤 글자의 위치를 가리킨다", () => {
  const p = parseSay("가나{a}다라");
  assert.equal(p.spoken, "가나다라");
  assert.equal(p.cues.a, 2);
});

test("[화면|소리] 표기는 자막과 음성을 나눈다", () => {
  const p = parseSay("[1823|천팔백이십삼] 년 {x}런던");
  assert.equal(p.display, "1823 년 런던");
  assert.equal(p.spoken, "천팔백이십삼 년 런던");
  assert.equal(p.spoken.slice(p.cues.x), "런던");
  assert.equal(p.displayToSpoken.length, p.display.length);
  assert.equal(p.displayToSpoken[0], 0);
});

test("중복 큐와 닫히지 않은 큐는 오류", () => {
  assert.throws(() => parseSay("{a}가{a}나"));
  assert.throws(() => parseSay("{a가나"));
});

test("음성이 없으면 글자 수로 길이와 큐를 어림한다", () => {
  const plan = planLesson(l01, null);
  assert.ok(plan.total > 60);
  for (let i = 1; i < plan.scenes.length; i++) {
    assert.equal(plan.scenes[i].start, plan.scenes[i - 1].end, "장면은 빈틈없이 이어진다");
  }
  const s = plan.scenes.find((x) => x.scene.id === "c2s1");
  for (const at of Object.values(s.cues)) {
    assert.ok(at >= s.audioStart && at <= s.audioStart + s.dur, "큐는 음성 구간 안에 있다");
  }
});

test("음성 타임라인이 있으면 실제 길이와 큐 시각을 쓴다", () => {
  const voice = {
    lesson: "t01",
    voice: "x",
    model: "x",
    scenes: [{ id: "c1s1", chapter: "c1", audio: "voice/t01/c1s1.mp3", dur: 10, cues: { a: 2, b: 5 }, words: [{ w: "시험이", s: 0, e: 0.4 }], text: "" }],
  };
  const plan = planLesson(l01, voice);
  const s = plan.scenes.find((x) => x.scene.id === "c1s1");
  assert.equal(s.dur, 10);
  assert.equal(s.cues.a, s.audioStart + 2);
  assert.equal(s.words[0].s, s.audioStart);
});

test("대본의 모든 장면 id는 겹치지 않는다", () => {
  const ids = l01.chapters.flatMap((c) => c.scenes.map((s) => s.id));
  assert.equal(new Set(ids).size, ids.length);
});
