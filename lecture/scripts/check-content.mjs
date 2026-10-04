/**
 * 대본 데이터 검사: 큐 참조 누락, 시험지 표시 문구 누락, 금지 표현, 분량 추정.
 * 사용: node --experimental-strip-types scripts/check-content.mjs
 */
import { pickLesson } from "./lib.mjs";
const l01 = await pickLesson();
const { parseSay } = await import("../src/content/parse.ts");

const CHARS_PER_MIN = 432;
let total = 0;
let errors = 0;
for (const c of l01.chapters) {
  let cc = 0;
  for (const s of c.scenes) {
    const p = parseSay(s.say);
    cc += p.spoken.length;
    const json = JSON.stringify(s.v);
    for (const m of json.matchAll(/"(at|nextAt|rootAt|xAt|yAt)":"([^"]+)"/g)) {
      const name = m[2];
      if (!(name in p.cues) && !name.startsWith("zz")) {
        console.error(`큐 없음 ${s.id}: ${name}`);
        errors++;
      }
    }
    if (s.v.kind === "map" && s.v.at) {
      for (const v of Object.values(s.v.at)) if (!(v in p.cues)) { console.error(`지도 큐 없음 ${s.id}: ${v}`); errors++; }
    }
    if (s.v.kind === "exam") {
      const body = s.v.body.join("\n");
      for (const mk of s.v.marks) if (!body.includes(mk.q)) { console.error(`지문에 없는 표시 ${s.id}: ${mk.q}`); errors++; }
      for (const b of s.v.blanks ?? []) if (!body.includes(`( ${b.mark} )`)) { console.error(`빈칸 없음 ${s.id}: ${b.mark}`); errors++; }
    }
    for (const bad of ["멈추", "써 보세요", "외워 보세요", "원문", "쪽수", "검증된", "검증 완료", "검증했", "창작", "확증"]) {
      if (s.say.includes(bad)) { console.error(`금지 표현 '${bad}' ${s.id}`); errors++; }
    }
  }
  console.log(`${c.id} ${c.title}: ${cc}자 ≈ ${(cc / CHARS_PER_MIN).toFixed(1)}분`);
  total += cc;
}
console.log(`합계 ${total}자 ≈ ${(total / CHARS_PER_MIN).toFixed(1)}분`);
if (errors) process.exit(1);
