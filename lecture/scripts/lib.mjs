/**
 * 스크립트 공용 도구: 환경 변수, 로그, 해시, 파일, 외부 명령.
 */
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * lecture/.env 를 읽어 process.env 에 채운다(이미 있는 값은 유지).
 * @returns {void}
 */
export function loadEnv() {
  const p = resolve(ROOT, ".env");
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

/**
 * 진행 상황을 표준 오류로 남긴다.
 * @param {...unknown} args 출력할 값
 * @returns {void}
 */
export function log(...args) {
  process.stderr.write(args.map(String).join(" ") + "\n");
}

/**
 * 값의 SHA-1 해시(앞 16자).
 * @param {unknown} v 해시할 값
 * @returns {string} 16자리 해시
 */
export function hash(v) {
  return createHash("sha1").update(typeof v === "string" ? v : JSON.stringify(v)).digest("hex").slice(0, 16);
}

/**
 * 부모 폴더를 만들고 파일을 쓴다.
 * @param {string} p 경로
 * @param {string | Buffer} data 내용
 * @returns {void}
 */
export function writeFile(p, data) {
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, data);
}

/**
 * ffprobe 로 미디어 길이(초)를 잰다.
 * @param {string} p 파일 경로
 * @returns {number} 초
 */
export function mediaDuration(p) {
  const out = execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", p]).toString();
  return Number(out.trim());
}

/**
 * 동시 실행 개수를 제한해 비동기 작업을 돌린다.
 * @template T, R
 * @param {T[]} items 작업 대상
 * @param {number} limit 동시 개수
 * @param {(item: T, i: number) => Promise<R>} fn 작업
 * @returns {Promise<R[]>} 결과
 */
export async function pool(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return out;
}

/**
 * 대상 강의를 고른다: `--lesson t02` 또는 환경 변수 LESSON, 기본 t01.
 * @returns {Promise<import("../src/content/types.ts").Lesson>} 강의 대본
 */
export async function pickLesson() {
  const i = process.argv.indexOf("--lesson");
  const id = i >= 0 ? process.argv[i + 1] : process.env.LESSON || "t01";
  const { getLesson } = await import("../src/content/lessons.ts");
  return getLesson(id);
}
