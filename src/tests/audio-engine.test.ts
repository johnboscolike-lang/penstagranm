import { describe, expect, it, vi } from "vitest";

import { AudioEngine, type AudioContextLike, type AudioEngineDeps } from "@/utils/audio/audio-engine";
import { DEFAULT_AUDIO_SETTINGS } from "@/utils/audio/audio-settings";

interface FakeSource {
  buffer: unknown;
  loop: boolean;
  playbackRate: { value: number };
  onended: (() => void) | null;
  started: boolean;
  stopped: boolean;
  connect: () => void;
  start: () => void;
  stop: () => void;
  disconnect: () => void;
}

/**
 * 진짜 소리 없이 호출만 기록하는 가짜 오디오 컨텍스트를 만든다.
 */
function createFakeContext() {
  const sources: FakeSource[] = [];
  const context: AudioContextLike & { resumed: number } = {
    currentTime: 0,
    state: "suspended",
    destination: {},
    resumed: 0,
    async resume() {
      this.resumed += 1;
    },
    createGain() {
      return {
        gain: { value: 1, cancelScheduledValues: () => undefined, setValueAtTime: () => undefined, linearRampToValueAtTime() { return undefined; } },
        connect: () => undefined,
        disconnect: () => undefined,
      };
    },
    createBufferSource() {
      const source: FakeSource = {
        buffer: null,
        loop: false,
        playbackRate: { value: 1 },
        onended: null,
        started: false,
        stopped: false,
        connect: () => undefined,
        start() { source.started = true; },
        stop() { source.stopped = true; },
        disconnect: () => undefined,
      };
      sources.push(source);

      return source;
    },
    async decodeAudioData(data: ArrayBuffer) {
      return { duration: 1.5, byteLength: data.byteLength };
    },
  };

  return { context, sources };
}

/**
 * 테스트용 엔진과 기록 도구를 만든다.
 */
function setup(stored: string | null = null) {
  const { context, sources } = createFakeContext();
  const written: string[] = [];
  const fetched: string[] = [];
  let clock = 1000;
  const deps: AudioEngineDeps = {
    createContext: () => context,
    fetchData: async (url) => {
      fetched.push(url);

      return new ArrayBuffer(8);
    },
    readStored: () => stored,
    writeStored: (value) => {
      written.push(value);
    },
    now: () => clock,
  };
  const engine = new AudioEngine(deps);

  return { engine, context, sources, written, fetched, advance: (ms: number) => { clock += ms; } };
}

/**
 * 아직 끝나지 않은 비동기 작업이 모두 지나가게 기다린다.
 */
async function flush(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe("소리 엔진", () => {
  it("저장된 설정을 읽고, 바꾸면 저장하고 구독자에게 알린다", () => {
    const { engine, written } = setup(JSON.stringify({ musicOn: false }));
    const listener = vi.fn();
    engine.subscribe(listener);

    expect(engine.getSettings().musicOn).toBe(false);
    engine.setSettings({ sfxVolume: 0.3 });

    expect(engine.getSettings().sfxVolume).toBe(0.3);
    expect(written).toHaveLength(1);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("첫 터치(unlock) 전에는 효과음도 음악도 나지 않는다", async () => {
    const { engine, sources, fetched } = setup();
    engine.setTrack("school");
    engine.playSfx("click");
    await flush();

    expect(sources).toHaveLength(0);
    expect(fetched).toHaveLength(0);
  });

  it("unlock 뒤에 기다리던 배경 음악이 반복 재생으로 시작된다", async () => {
    const { engine, sources, fetched } = setup();
    engine.setTrack("arena");
    await engine.unlock();
    await flush();

    expect(fetched).toEqual(["/game/bgm/arena.mp3"]);
    expect(sources).toHaveLength(1);
    expect(sources[0].loop).toBe(true);
    expect(sources[0].started).toBe(true);
  });

  it("같은 곡이면 이어서 재생하고, 다른 곡이면 앞 곡을 멈추고 새 곡을 튼다", async () => {
    const { engine, sources } = setup();
    await engine.unlock();
    engine.setTrack("school");
    await flush();
    engine.setTrack("school");
    await flush();

    expect(sources).toHaveLength(1);

    engine.setTrack("room");
    await flush();

    expect(sources).toHaveLength(2);
    expect(sources[0].stopped).toBe(true);
    expect(sources[1].started).toBe(true);
  });

  it("배경 음악을 끄면 멈추고, 다시 켜면 다시 튼다", async () => {
    const { engine, sources } = setup();
    await engine.unlock();
    engine.setTrack("school");
    await flush();
    engine.setSettings({ musicOn: false });

    expect(sources[0].stopped).toBe(true);

    engine.setSettings({ musicOn: true });
    await flush();

    expect(sources).toHaveLength(2);
  });

  it("효과음은 설정이 꺼져 있으면 나지 않고, 켜져 있으면 한 번 난다", async () => {
    const { engine, sources } = setup(JSON.stringify({ sfxOn: false }));
    await engine.unlock();
    engine.playSfx("coin");
    await flush();

    expect(sources).toHaveLength(0);

    engine.setSettings({ sfxOn: true });
    engine.playSfx("coin");
    await flush();

    expect(sources).toHaveLength(1);
    expect(sources[0].started).toBe(true);
  });

  it("같은 효과음이 아주 짧은 간격으로 겹쳐 울리는 것을 막는다", async () => {
    const { engine, sources, advance } = setup();
    await engine.unlock();
    engine.playSfx("tile");
    engine.playSfx("tile");
    await flush();

    expect(sources).toHaveLength(1);

    advance(200);
    engine.playSfx("tile");
    await flush();

    expect(sources).toHaveLength(2);
  });

  it("받아 온 소리 파일은 다시 받지 않는다", async () => {
    const { engine, fetched, advance } = setup();
    await engine.unlock();
    engine.playSfx("pop");
    await flush();
    advance(200);
    engine.playSfx("pop");
    await flush();

    expect(fetched.filter((url) => url.endsWith("pop.mp3"))).toHaveLength(1);
  });

  it("기본 설정이 켜짐 상태다", () => {
    expect(DEFAULT_AUDIO_SETTINGS.musicOn && DEFAULT_AUDIO_SETTINGS.sfxOn).toBe(true);
  });
});
