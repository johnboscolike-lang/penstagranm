import { describe, expect, it } from "vitest";

import { renderTrack } from "../../scripts/audio/make-bgm.mjs";
import { SAMPLE_RATE, midiToFreq, noteToMidi } from "../../scripts/audio/synth.mjs";
import { BASS_ROOT, CHORD_TABLE, TRACKS, parseMelodyBar } from "../../scripts/audio/tracks.mjs";
import { BGM_TRACKS } from "@/utils/audio/sound-catalog";

describe("배경 음악 악보", () => {
  it("음 이름을 MIDI 번호와 주파수로 바꾼다", () => {
    expect(noteToMidi("C4")).toBe(60);
    expect(noteToMidi("A4")).toBe(69);
    expect(noteToMidi("A#3")).toBe(58);
    expect(midiToFreq(69)).toBeCloseTo(440, 5);
    expect(() => noteToMidi("H9")).toThrow();
  });

  it("악보의 곡 이름이 앱이 쓰는 곡 목록과 같다", () => {
    expect(TRACKS.map((track) => track.name).sort()).toEqual([...BGM_TRACKS].sort());
  });

  it.each(TRACKS)("$name: 마디마다 멜로디가 8칸을 채우고 화음이 모두 정의돼 있다", (track) => {
    expect(track.melody).toHaveLength(track.chords.length);
    track.melody.forEach((bar) => {
      const units = parseMelodyBar(bar).reduce((sum, item) => sum + item.units, 0);

      expect(units, bar).toBe(8);
      parseMelodyBar(bar).forEach((item) => {
        if (item.note) {
          expect(() => noteToMidi(item.note as string)).not.toThrow();
        }
      });
    });
    track.chords.forEach((chord) => {
      expect(CHORD_TABLE[chord as keyof typeof CHORD_TABLE], chord).toBeDefined();
      expect(BASS_ROOT[chord as keyof typeof BASS_ROOT], chord).toBeDefined();
    });
    track.drums.forEach((pattern) => expect(pattern).toHaveLength(16));
    expect(track.bassPattern).toHaveLength(8);
  });

  it("곡을 합성하면 반복 한 바퀴 길이가 악보의 마디 수와 템포에 맞고 소리가 있다", () => {
    const track = TRACKS.find((item) => item.name === "school");
    if (!track) {
      throw new Error("school 곡이 없어요");
    }
    const { pcm, seconds } = renderTrack(track);
    const expected = (track.chords.length * 4 * 60) / track.bpm;
    let peak = 0;
    for (let i = 0; i < pcm.length; i += 97) {
      peak = Math.max(peak, Math.abs(pcm[i]));
    }

    expect(seconds).toBeCloseTo(expected, 3);
    expect(pcm.length).toBe(Math.round(expected * SAMPLE_RATE) * 2);
    expect(peak).toBeGreaterThan(3000);
  });
});
