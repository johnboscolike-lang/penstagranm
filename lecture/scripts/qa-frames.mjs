/**
 * 렌더된 영상에서 한 프레임만 튀는 곳(앞뒤 프레임과 둘 다 크게 다른 프레임)을 찾는다.
 *
 * 사용: node scripts/qa-frames.mjs out/t01/video.mp4
 * 결과: 표준 출력에 의심 프레임 목록, out/<lesson>/qa-frames.json
 */
import { spawnSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { log, writeFile } from "./lib.mjs";

const file = process.argv[2];
if (!file) throw new Error("영상 경로를 주세요");

const r = spawnSync(
  "ffmpeg",
  ["-v", "info", "-i", file, "-vf", "scale=192:108,format=gray,tblend=all_mode=difference,signalstats,metadata=print:key=lavfi.signalstats.YAVG", "-f", "null", "-"],
  { encoding: "utf8", maxBuffer: 1 << 30 },
);
const diffs = [...r.stderr.matchAll(/lavfi\.signalstats\.YAVG=([0-9.]+)/g)].map((m) => Number(m[1]));
log(`프레임 차이 ${diffs.length}개 측정`);

/** diffs[i] = 프레임 i 와 i+1 의 평균 밝기 차 */
const suspects = [];
for (let i = 1; i < diffs.length - 1; i++) {
  const a = diffs[i - 1];
  const b = diffs[i];
  const before = diffs[i - 2] ?? 0;
  const after = diffs[i + 1] ?? 0;
  // 프레임 i 가 앞뒤 모두와 크게 다르고, 그 주변은 조용하면 '한 프레임 튐'
  if (a > 6 && b > 6 && before < a / 3 && after < b / 3) suspects.push({ frame: i, t: +(i / 30).toFixed(2), a, b });
}
writeFile(resolve(dirname(file), "qa-frames.json"), JSON.stringify({ count: diffs.length, suspects }, null, 1));
log(suspects.length ? `의심 프레임 ${suspects.length}개: ${suspects.slice(0, 20).map((s) => s.t + "s").join(", ")}` : "튀는 프레임 없음");
