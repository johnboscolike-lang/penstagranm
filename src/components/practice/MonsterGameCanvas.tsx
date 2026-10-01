import { useEffect, useRef } from "react";

import { startMonsterGame, type GameSound } from "@/components/practice/monster-game";
import { playSfx } from "@/utils/audio/audio-engine";
import type { RoundSetup, RunResult } from "@/utils/minigame-rules";

interface MonsterGameCanvasProps {
  rounds: RoundSetup[];
  calm: boolean;
  onFinish: (result: RunResult) => void;
}

/**
 * 몬스터 사냥 캔버스. Kaplay 엔진은 브라우저에서만 돌아서 이 파일은 dynamic import(ssr: false)로만 불러온다.
 * 개발 모드에서 효과가 두 번 실행돼도 먼저 만든 게임을 정리하도록 취소 표시를 둔다.
 */
export default function MonsterGameCanvas({ rounds, calm, onFinish }: MonsterGameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const finishRef = useRef(onFinish);

  useEffect(() => {
    finishRef.current = onFinish;
  }, [onFinish]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return undefined;
    }
    let cancelled = false;
    let stop: (() => void) | null = null;

    void startMonsterGame({
      canvas,
      rounds,
      calm,
      onSound: (name: GameSound) => playSfx(name),
      onFinish: (result) => finishRef.current(result),
    }).then((cleanup) => {
      if (cancelled) {
        cleanup();
      } else {
        stop = cleanup;
      }
    });

    return () => {
      cancelled = true;
      stop?.();
    };
  }, [rounds, calm]);

  return <canvas aria-label="몬스터 사냥 게임 화면. 위에 나온 뜻과 같은 영어 단어를 가진 몬스터를 눌러요." className="hunt__canvas" ref={canvasRef} role="img" />;
}
