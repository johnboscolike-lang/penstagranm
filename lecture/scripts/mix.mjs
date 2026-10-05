/**
 * 최종 오디오 트랙을 만든다: 내레이션 + 효과음(피크를 이벤트에 맞춤) + 음악(내레이션 아래로 덕킹),
 * 그리고 loudnorm 으로 -14 LUFS 정규화.
 *
 * 사용: node --experimental-strip-types scripts/mix.mjs
 * 결과: out/t01/master.m4a, out/t01/sfx-events.json
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { pickLesson, ROOT, log, writeFile } from "./lib.mjs";

const l01 = await pickLesson();
const { planLesson } = await import("../src/timeline.ts");

const voice = JSON.parse(readFileSync(resolve(ROOT, "public/voice", l01.id, "timeline.json"), "utf8"));
const plan = planLesson(l01, voice);
const peaks = JSON.parse(readFileSync(resolve(ROOT, "public/sfx/peaks.json"), "utf8"));
const OUT = resolve(ROOT, "out", l01.id);
const TOTAL = plan.total;

/** 효과음 이벤트: { name, at(피크가 와야 할 시각), gain(dB) } */
const events = [];
const add = (name, at, gain) => events.push({ name, at, gain });

const first = plan.scenes[0];
const last = plan.scenes[plan.scenes.length - 1];
if (first.scene.v.kind === "opening") {
  add("slide", first.start + 0.75, -16);
  add("irisOpen", first.start + 2.55, -12);
}
if (last.scene.v.kind === "closing") {
  add("irisClose", last.start + 3.1, -12);
  add("slide", last.start + 4.9, -18);
}
for (let k = 1; k < plan.scenes.length; k++) {
  const s = plan.scenes[k];
  const prev = plan.scenes[k - 1];
  const kind = s.scene.v.kind;
  if (kind === "closing") continue;
  const continuous = kind === prev.scene.v.kind && (kind === "timeline" || kind === "map");
  if (!continuous && prev.scene.v.kind !== "opening") add("whoosh", s.start + 0.28, -26);
  const v = s.scene.v;
  const cue = (c) => s.cues[c];
  if (v.kind === "exam") {
    v.marks.forEach((m) => cue(m.at) !== undefined && add("marker", cue(m.at) + 0.12, -20));
    (v.blanks ?? []).forEach((b) => cue(b.at) !== undefined && add("pop", cue(b.at), -17));
    if (v.verdict && cue(v.verdict.at) !== undefined) add("chime", cue(v.verdict.at), -21);
  }
  if (v.kind === "map" && v.stage === "epitome" && v.at) Object.values(v.at).forEach((c) => cue(c) !== undefined && add("tick", cue(c), -22));
  if (v.kind === "map" && v.stage === "done" && v.at?.lit && cue(v.at.lit) !== undefined) add("chime", cue(v.at.lit), -22);
}
writeFile(resolve(OUT, "sfx-events.json"), JSON.stringify(events, null, 1));
log(`효과음 이벤트 ${events.length}개`);

/**
 * 여러 소리를 지정한 시각에 놓아 하나의 wav로 합친다.
 * @param {{ file: string, at: number, gain: number }[]} items 배치할 소리
 * @param {string} out 결과 wav
 * @returns {void}
 */
function place(items, out) {
  const CHUNK = 40;
  const parts = [];
  for (let c = 0; c < items.length; c += CHUNK) {
    const group = items.slice(c, c + CHUNK);
    const args = ["-v", "error", "-y"];
    group.forEach((it) => args.push("-i", it.file));
    const chains = group.map((it, i) => {
      const ms = Math.max(0, Math.round(it.at * 1000));
      return `[${i}:a]aresample=48000,aformat=channel_layouts=stereo,volume=${it.gain}dB,adelay=${ms}|${ms}[a${i}]`;
    });
    const refs = group.map((_, i) => `[a${i}]`).join("");
    const part = `${out}.part${parts.length}.wav`;
    args.push(
      "-filter_complex",
      `${chains.join(";")};${refs}amix=inputs=${group.length}:normalize=0:dropout_transition=0,apad=whole_dur=${TOTAL.toFixed(3)}[m]`,
      "-map", "[m]", "-t", TOTAL.toFixed(3), "-c:a", "pcm_s16le", part,
    );
    execFileSync("ffmpeg", args);
    parts.push(part);
  }
  if (parts.length === 1) {
    execFileSync("mv", [parts[0], out]);
    return;
  }
  const args = ["-v", "error", "-y"];
  parts.forEach((p) => args.push("-i", p));
  args.push("-filter_complex", `${parts.map((_, i) => `[${i}:a]`).join("")}amix=inputs=${parts.length}:normalize=0[m]`, "-map", "[m]", "-c:a", "pcm_s16le", out);
  execFileSync("ffmpeg", args);
  execFileSync("rm", parts);
}

// 1) 내레이션 버스
const voiceItems = plan.scenes.filter((s) => s.audio).map((s) => ({ file: resolve(ROOT, "public", s.audio), at: s.audioStart, gain: 0 }));
place(voiceItems, resolve(OUT, "voice.wav"));
log("내레이션 버스 완료");

// 2) 효과음 버스: 파일의 피크가 이벤트 시각에 오도록 앞당겨 놓는다.
const sfxItems = events.map((e) => ({ file: resolve(ROOT, "public/sfx", `${e.name}.mp3`), at: e.at - (peaks[e.name] ?? 0), gain: e.gain }));
place(sfxItems, resolve(OUT, "sfx.wav"));
log("효과음 버스 완료");

// 3) 음악: 오프닝 징글(피크를 제목 등장에), 반복 배경음(덕킹), 클로징 징글
const musicItems = [];
if (first.scene.v.kind === "opening") musicItems.push({ file: resolve(ROOT, "public/music/opening.mp3"), at: Math.max(0, first.start + 3.7 - peaks["music:opening"]), gain: -10 });
if (last.scene.v.kind === "closing") musicItems.push({ file: resolve(ROOT, "public/music/closing.mp3"), at: last.start + 0.4, gain: -12 });
place(musicItems, resolve(OUT, "stings.wav"));
const bedStart = first.end - 0.8;
const bedEnd = last.start + 0.6;
execFileSync("ffmpeg", [
  "-v", "error", "-y",
  "-stream_loop", "-1", "-i", resolve(ROOT, "public/music/bed.mp3"),
  "-i", resolve(OUT, "voice.wav"),
  "-filter_complex",
  [
    `[0:a]aresample=48000,aformat=channel_layouts=stereo,atrim=0:${(bedEnd - bedStart).toFixed(3)},afade=t=in:d=2,afade=t=out:st=${(bedEnd - bedStart - 2.5).toFixed(3)}:d=2.5,volume=-27dB,adelay=${Math.round(bedStart * 1000)}|${Math.round(bedStart * 1000)},apad=whole_dur=${TOTAL.toFixed(3)}[bed]`,
    `[1:a]aresample=48000,aformat=channel_layouts=stereo[sc]`,
    `[bed][sc]sidechaincompress=threshold=0.02:ratio=6:attack=40:release=600:makeup=1[duck]`,
  ].join(";"),
  "-map", "[duck]", "-t", TOTAL.toFixed(3), "-c:a", "pcm_s16le", resolve(OUT, "bed.wav"),
]);
log("배경음 덕킹 완료");

// 4) 합치고 -14 LUFS 로 정규화
const master = resolve(OUT, "master.m4a");
execFileSync("ffmpeg", [
  "-v", "error", "-y",
  "-i", resolve(OUT, "voice.wav"), "-i", resolve(OUT, "sfx.wav"), "-i", resolve(OUT, "stings.wav"), "-i", resolve(OUT, "bed.wav"),
  "-filter_complex", "[0:a][1:a][2:a][3:a]amix=inputs=4:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11[m]",
  "-map", "[m]", "-ar", "48000", "-c:a", "aac", "-b:a", "192k", master,
]);
const meter = spawnSync("ffmpeg", ["-hide_banner", "-i", master, "-af", "ebur128", "-f", "null", "-"], { encoding: "utf8" }).stderr;
const integrated = meter.match(/I:\s+(-?[0-9.]+) LUFS/g)?.pop();
log(`마스터 저장: ${master} · ${integrated ?? "LUFS 측정 실패"}`);
if (!existsSync(master)) process.exit(1);
