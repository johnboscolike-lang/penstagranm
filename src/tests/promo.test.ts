import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  BAR_SECONDS,
  BEAT_SECONDS,
  BPM,
  CHORD_BY_BAR,
  DURATION_SECONDS,
  SECTIONS,
  TOTAL_BARS,
  beatTime,
} from "../../scripts/promo/beat-grid.mjs";

const PROMO_DIR = path.join(process.cwd(), "public", "promo");

const COMPOSITIONS = [
  { file: "index.html", label: "가로 16:9", width: 1920, height: 1080 },
  { file: "shorts.html", label: "세로 9:16", width: 1080, height: 1920 },
] as const;

/**
 * Reads a numeric data-* attribute from the first element that carries the given id.
 */
function readNumberAttribute(html: string, id: string, attribute: string): number {
  const tag = html.match(new RegExp(`<[^>]*\\bid="${id}"[^>]*>`));
  const value = tag?.[0].match(new RegExp(`${attribute}="([\\d.]+)"`))?.[1];

  return Number(value);
}

describe("홍보 영상 박자표", () => {
  it("120 BPM이면 한 박 0.5초, 한 마디 2초, 20마디 40초다", () => {
    expect(BPM).toBe(120);
    expect(BEAT_SECONDS).toBe(0.5);
    expect(BAR_SECONDS).toBe(2);
    expect(DURATION_SECONDS).toBe(40);
    expect(beatTime(13)).toBe(26);
    expect(beatTime(19, 2)).toBe(39);
  });

  it("마디마다 코드가 있고 장면 구간이 빈틈없이 이어진다", () => {
    expect(CHORD_BY_BAR).toHaveLength(TOTAL_BARS);

    let cursor = 0;
    SECTIONS.forEach((section) => {
      expect(section.startBar).toBe(cursor);
      cursor += section.bars;
    });
    expect(cursor).toBe(TOTAL_BARS);
  });
});

describe.each(COMPOSITIONS)("홍보 영상 컴포지션 ($label)", ({ file, width, height }) => {
  const html = readFileSync(path.join(PROMO_DIR, file), "utf8");

  it("화면 크기와 전체 길이, 소리 길이가 맞다", () => {
    expect(readNumberAttribute(html, "root", "data-width")).toBe(width);
    expect(readNumberAttribute(html, "root", "data-height")).toBe(height);
    expect(readNumberAttribute(html, "root", "data-duration")).toBe(DURATION_SECONDS);
    expect(readNumberAttribute(html, "bgm", "data-duration")).toBe(DURATION_SECONDS);
    expect(html).toContain(`var BPM = ${BPM};`);
  });

  it("장면 일곱 개가 박자표의 마디 경계에서 시작하고 끝난다", () => {
    SECTIONS.forEach((section) => {
      const id = `s-${section.name}`;

      expect(readNumberAttribute(html, id, "data-start")).toBe(beatTime(section.startBar));
      expect(readNumberAttribute(html, id, "data-duration")).toBe(section.bars * BAR_SECONDS);
    });
  });

  it("쓰는 이미지·글꼴·소리 파일이 모두 실제로 있다", () => {
    const references = [...html.matchAll(/(?:src|href)="(assets\/[^"]+|beat\.mp3)"/g)].map((match) => match[1]);
    const cssReferences = [...html.matchAll(/url\("(assets\/[^"]+)"\)/g)].map((match) => match[1]);

    expect(references.length).toBeGreaterThan(20);
    [...references, ...cssReferences].forEach((asset) => {
      expect(existsSync(path.join(PROMO_DIR, asset)), asset).toBe(true);
    });
    expect(statSync(path.join(PROMO_DIR, "beat.mp3")).size).toBeGreaterThan(100_000);
  });

  it("바깥 서버에 기대지 않고 결정적으로 그려진다", () => {
    expect(html).not.toMatch(/(?:src|href)="https?:/);
    expect(html).not.toMatch(/Math\.random|Date\.now|performance\.now|repeat:\s*-1/);
  });
});
