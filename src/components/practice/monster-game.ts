import kaplay from "kaplay";
import type { GameObj, KAPLAYCtx } from "kaplay";

import { GAME_SECONDS, hitPoints, type RoundSetup, type RunResult } from "@/utils/minigame-rules";

const WIDTH = 360;
const HEIGHT = 480;
const FONT = "galmuri";
const MONSTERS = ["slime", "bat", "ghost", "spider", "wolf", "imp", "rat", "cyclops"] as const;
/** 몬스터 네 마리가 서는 자리 (2×2) */
const SLOTS = [
  { x: 96, y: 210 },
  { x: 264, y: 210 },
  { x: 96, y: 350 },
  { x: 264, y: 350 },
] as const;
/** 몬스터 한 마리를 누를 수 있는 영역(몸 + 단어 상자) */
const HIT_W = 84;
const HIT_H = 118;
const ROUND_SECONDS = 4.5;
const ROUND_SECONDS_CALM = 7;
const PAUSE_SECONDS = 0.45;

export type GameSound = "correct" | "wrong" | "tick" | "pop";

export interface MonsterGameOptions {
  canvas: HTMLCanvasElement;
  rounds: RoundSetup[];
  /** 움직임을 줄이고 싶은 사용자를 위해 몬스터가 가만히 있고 시간이 넉넉하다. */
  calm: boolean;
  onSound: (name: GameSound) => void;
  onFinish: (result: RunResult) => void;
}

/**
 * 한 칸의 위치를 무작위로 섞는다. 시드를 쓰지 않아도 되는 화면 효과라서 Math.random을 쓴다.
 */
function shuffledSlots(): (typeof SLOTS)[number][] {
  const copy = [...SLOTS];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const other = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[other]] = [copy[other], copy[index]];
  }

  return copy;
}

/**
 * 몬스터 사냥을 캔버스 위에서 시작한다. 위에 나온 뜻에 맞는 영어 단어를 든 몬스터를 눌러서 잡는다.
 * 30초 동안 계속되고, 끝나면 onFinish로 점수·맞힌 수·놓친 수를 알려 준다. 돌려받은 함수를 부르면 게임을 정리한다.
 */
export async function startMonsterGame(options: MonsterGameOptions): Promise<() => void> {
  const k: KAPLAYCtx = kaplay({
    canvas: options.canvas,
    width: WIDTH,
    height: HEIGHT,
    global: false,
    background: [152, 212, 240],
    crisp: true,
    touchToMouse: true,
    pixelDensity: Math.min(window.devicePixelRatio || 1, 2),
    debug: false,
    loadingScreen: false,
    font: FONT,
  });

  k.loadFont(FONT, "/fonts/Galmuri11.woff2");
  MONSTERS.forEach((name) => k.loadSprite(name, `/game/kenney/${name}.png`));
  await new Promise<void>((resolve) => k.onLoad(resolve));

  let disposed = false;

  k.scene("play", () => {
    let score = 0;
    let hits = 0;
    let misses = 0;
    let combo = 0;
    let timeLeft = GAME_SECONDS;
    let roundIndex = 0;
    let roundLeft = 0;
    let locked = true;
    let finished = false;
    let current: RoundSetup | null = null;
    let lastTickSecond = GAME_SECONDS + 1;

    // 하늘과 땅
    k.add([k.rect(WIDTH, 120), k.pos(0, HEIGHT - 120), k.color(122, 196, 104), k.z(0)]);
    k.add([k.rect(WIDTH, 6), k.pos(0, HEIGHT - 120), k.color(88, 150, 80), k.z(1)]);

    // 위쪽 표시줄: 점수, 남은 시간, 연속
    k.add([k.rect(WIDTH, 44), k.pos(0, 0), k.color(20, 70, 66), k.z(20)]);
    const scoreText = k.add([k.text("점수 0", { size: 16 }), k.pos(10, 12), k.color(255, 244, 214), k.z(21)]);
    const comboText = k.add([k.text("", { size: 14 }), k.pos(WIDTH - 10, 13), k.anchor("topright"), k.color(255, 200, 90), k.z(21)]);
    const timeBack = k.add([k.rect(WIDTH - 20, 6), k.pos(10, 36), k.color(10, 40, 40), k.z(21)]);
    const timeBar = k.add([k.rect(WIDTH - 20, 6), k.pos(10, 36), k.color(102, 220, 196), k.z(22)]);
    void timeBack;

    // 문제: 뜻을 보고 영어 단어를 든 몬스터를 찾는다
    k.add([k.rect(WIDTH - 40, 64, { radius: 6 }), k.pos(20, 58), k.color(255, 248, 224), k.outline(3, k.rgb(58, 42, 36)), k.z(10)]);
    k.add([k.text("이 뜻의 단어를 가진 몬스터를 잡아요", { size: 12, width: WIDTH - 60, align: "center" }), k.pos(WIDTH / 2, 66), k.anchor("top"), k.color(110, 90, 80), k.z(11)]);
    const promptText = k.add([k.text("", { size: 26, width: WIDTH - 60, align: "center" }), k.pos(WIDTH / 2, 86), k.anchor("top"), k.color(58, 42, 36), k.z(11)]);
    const roundBack = k.add([k.rect(WIDTH - 40, 4), k.pos(20, 126), k.color(58, 42, 36), k.z(10)]);
    const roundBar = k.add([k.rect(WIDTH - 40, 4), k.pos(20, 126), k.color(242, 193, 78), k.z(11)]);
    void roundBack;

    /**
     * 화면에 떠오르는 점수·안내 글자.
     */
    const popup = (text: string, x: number, y: number, color: [number, number, number]) => {
      const label = k.add([k.text(text, { size: 22 }), k.pos(x, y), k.anchor("center"), k.color(...color), k.outline(3, k.rgb(58, 42, 36)), k.z(40), k.opacity(1)]);
      let age = 0;
      label.onUpdate(() => {
        age += k.dt();
        label.pos.y -= 40 * k.dt();
        label.opacity = Math.max(0, 1 - age / 0.7);
        if (age > 0.7) {
          label.destroy();
        }
      });
    };

    /**
     * 한 라운드의 몬스터를 모두 치운다.
     */
    const clearMonsters = () => {
      k.get("monster").forEach((monster) => monster.destroy());
    };

    /**
     * 점수 표시를 새로 쓴다.
     */
    const refreshHud = () => {
      scoreText.text = `점수 ${score}`;
      comboText.text = combo >= 2 ? `${combo}연속!` : "";
    };

    /**
     * 게임을 끝내고 결과를 알린다.
     */
    const finish = () => {
      if (finished) {
        return;
      }
      finished = true;
      locked = true;
      clearMonsters();
      k.add([k.rect(WIDTH, HEIGHT), k.pos(0, 0), k.color(20, 70, 66), k.opacity(0.78), k.z(50)]);
      k.add([k.text("끝!", { size: 44 }), k.pos(WIDTH / 2, HEIGHT / 2 - 20), k.anchor("center"), k.color(255, 244, 214), k.z(51)]);
      k.add([k.text(`${score}점`, { size: 28 }), k.pos(WIDTH / 2, HEIGHT / 2 + 30), k.anchor("center"), k.color(242, 193, 78), k.z(51)]);
      options.onFinish({ score, hits, misses });
    };

    /**
     * 한 라운드가 끝났을 때(맞힘·틀림·시간 초과) 결과를 반영하고 잠깐 쉰 뒤 다음 라운드로 넘어간다.
     */
    const resolve = (hit: boolean, monster: GameObj | null) => {
      if (locked || finished) {
        return;
      }
      locked = true;
      const x = monster?.pos.x ?? WIDTH / 2;
      const y = monster?.pos.y ?? 250;
      if (hit) {
        const gained = hitPoints(combo);
        score += gained;
        hits += 1;
        combo += 1;
        options.onSound("correct");
        popup(`+${gained}`, x, y - 40, [255, 236, 130]);
      } else {
        misses += 1;
        combo = 0;
        options.onSound("wrong");
        popup(monster ? "아쉬워요" : "놓쳤어요", x, y - 40, [255, 160, 160]);
      }
      refreshHud();
      k.get("monster").forEach((item) => {
        const isAnswer = item.word === current?.answer;
        const [body, label, text] = item.parts as GameObj[];
        [body, label, text].forEach((part) => {
          part.opacity = isAnswer || item === monster ? 1 : 0.35;
        });
        if (isAnswer) {
          body.color = k.rgb(190, 255, 190);
        } else if (item === monster) {
          body.color = k.rgb(255, 170, 170);
        }
      });
      k.wait(PAUSE_SECONDS, () => {
        if (!finished) {
          nextRound();
        }
      });
    };

    /**
     * 다음 라운드를 보여 준다: 뜻을 올리고 몬스터 네 마리를 자리에 세운다.
     */
    const nextRound = () => {
      clearMonsters();
      if (timeLeft <= 0) {
        finish();

        return;
      }
      const round = options.rounds[roundIndex % options.rounds.length];
      roundIndex += 1;
      current = round;
      promptText.text = round.prompt;
      roundLeft = options.calm ? ROUND_SECONDS_CALM : ROUND_SECONDS;
      options.onSound("pop");

      const slots = shuffledSlots();
      round.options.forEach((word, index) => {
        const slot = slots[index];
        const sprite = MONSTERS[(roundIndex * 3 + index * 5) % MONSTERS.length];
        // 루트는 누를 영역만 맡는다(확대하지 않는다). 몸과 단어 상자는 자식이라 크기가 서로 영향을 주지 않는다.
        const monster = k.add([
          k.pos(slot.x - HIT_W / 2, slot.y - 36),
          k.area({ shape: new k.Rect(k.vec2(0, 0), HIT_W, HIT_H) }),
          k.z(5),
          "monster",
          { word, baseY: slot.y - 36, phase: Math.random() * 6, parts: [] as GameObj[] },
        ]);
        const body = monster.add([k.sprite(sprite), k.pos(HIT_W / 2, 36), k.anchor("center"), k.scale(3.4), k.color(255, 255, 255), k.opacity(1)]);
        const label = monster.add([k.rect(84, 24, { radius: 4 }), k.pos(HIT_W / 2, 92), k.anchor("center"), k.color(255, 248, 224), k.outline(2, k.rgb(58, 42, 36)), k.opacity(1)]);
        const text = label.add([k.text(word, { size: 14 }), k.anchor("center"), k.color(58, 42, 36), k.opacity(1)]);
        monster.parts = [body, label, text];
        monster.onUpdate(() => {
          if (!options.calm) {
            monster.pos.y = monster.baseY + Math.sin(k.time() * 3 + monster.phase) * 6;
          }
        });
      });
      locked = false;
    };

    k.onClick("monster", (monster) => {
      if (locked || finished || !current) {
        return;
      }
      resolve(monster.word === current.answer, monster);
    });

    k.onUpdate(() => {
      if (finished) {
        return;
      }
      timeLeft = Math.max(0, timeLeft - k.dt());
      timeBar.width = (WIDTH - 20) * (timeLeft / GAME_SECONDS);
      timeBar.color = timeLeft <= 8 ? k.rgb(255, 120, 110) : k.rgb(102, 220, 196);
      const second = Math.ceil(timeLeft);
      if (second <= 5 && second > 0 && second < lastTickSecond) {
        lastTickSecond = second;
        options.onSound("tick");
      }
      if (!locked && current) {
        roundLeft -= k.dt();
        roundBar.width = (WIDTH - 40) * Math.max(0, roundLeft / (options.calm ? ROUND_SECONDS_CALM : ROUND_SECONDS));
        if (roundLeft <= 0) {
          resolve(false, null);
        }
      }
      if (timeLeft <= 0 && !locked) {
        // 마지막 라운드는 시간이 다 되면 놓친 것으로 치고 끝낸다.
        resolve(false, null);
        k.wait(PAUSE_SECONDS + 0.05, finish);
      } else if (timeLeft <= 0 && locked && !finished) {
        k.wait(PAUSE_SECONDS + 0.05, finish);
      }
    });

    refreshHud();
    nextRound();
  });

  k.go("play");

  return () => {
    if (disposed) {
      return;
    }
    disposed = true;
    k.quit();
  };
}
