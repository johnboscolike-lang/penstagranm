import clsx from "clsx";

import { Character, SceneSprite, StudentSprite } from "@/components/pixel/PixelSprite";
import { PetalField, Prop } from "@/components/scenes/Prop";

interface ChallengeSceneProps {
  hairKey: string;
  litTiles: number;
  totalTiles: number;
  teamName: string;
  bubble: { who: string; text: string };
}

/**
 * 주간도전 장면: 도서관 테라스, 폭포, 그리고 팀 점수만큼 빛나는 다리.
 */
export function ChallengeScene({ hairKey, litTiles, totalTiles, teamName, bubble }: ChallengeSceneProps) {
  return (
    <div aria-hidden className="scene scene--challenge">
      <div className="scene__sky" />
      <Prop anim="drift" x={44} y={84} z={1}>
        <SceneSprite name="cloud-a" scale={1.4} />
      </Prop>
      <Prop anim="drift" x={14} y={88} z={1}>
        <SceneSprite name="cloud-b" scale={1.2} />
      </Prop>
      <Prop x={66} y={52} z={1}>
        <SceneSprite name="castle" scale={1.3} />
      </Prop>
      <div className="scene__hills" />

      <div className="scene__cliff" />
      <div className="scene__fall scene__fall--a" />
      <div className="scene__fall scene__fall--b" />
      <Prop x={57} y={58} z={2}>
        <SceneSprite name="bush-c" scale={1.3} />
      </Prop>
      <Prop x={91} y={56} z={2}>
        <SceneSprite name="tree-green" scale={1.5} />
      </Prop>

      <div className="scene__wall" />
      <Prop x={9} y={34} z={2}>
        <SceneSprite name="ivy-b" scale={1.6} />
      </Prop>
      <Prop x={27} y={43} z={2}>
        <SceneSprite name="ivy-a" scale={1.6} />
      </Prop>
      <Prop x={41} y={48} z={2}>
        <SceneSprite name="ivy-c" scale={1.6} />
      </Prop>

      <div className="scene__water" />
      <div className="scene__ledge" />

      <Prop x={9} y={26} z={4}>
        <SceneSprite name="bookshelf" scale={1.35} />
      </Prop>
      <Prop x={21} y={26} z={4}>
        <SceneSprite name="bookshelf" scale={1.35} />
      </Prop>
      <Prop x={34} y={38} z={4}>
        <SceneSprite name="chalkboard" scale={1.4} />
      </Prop>
      <Prop x={30} y={14} z={5}>
        <SceneSprite name="desk" scale={1.15} />
      </Prop>

      <div className="scene__bridge">
        {Array.from({ length: totalTiles }, (_, index) => {
          const t = index / Math.max(1, totalTiles - 1);
          const lit = index < litTiles;

          return (
            <div
              className={clsx("bridge-tile", lit && "bridge-tile--lit")}
              key={index}
              style={{ left: `${46 + t * 21}%`, bottom: `${27 + Math.sin(t * Math.PI) * 3}%`, zIndex: 6 }}
            >
              <SceneSprite name="bridge-tile" scale={1.35} />
            </div>
          );
        })}
      </div>

      <Prop shadow x={13} y={9} z={8}>
        <Character name="owl" scale={1.6} />
      </Prop>
      <div className="bubble pf" style={{ left: "3%", bottom: "29%" }}>
        <span className="bubble__who">{bubble.who}</span>
        {bubble.text}
      </div>

      <Prop anim="breathe" shadow x={39} y={17} z={8}>
        <Character hairKey={hairKey} name="hero" scale={1.6} />
      </Prop>
      <Prop flip shadow x={34.5} y={14} z={8}>
        <Character name="cat" scale={1.5} />
      </Prop>
      <Prop desktopOnly shadow x={52} y={28} z={8}>
        <StudentSprite bag={1} hairKey="brown" scale={1.3} />
      </Prop>
      <Prop desktopOnly shadow x={60} y={30} z={8}>
        <StudentSprite bag={3} hairKey="green" scale={1.3} />
      </Prop>
      <div className="scene__tag">
        <span>
          {teamName} 다리 <b>{litTiles} / {totalTiles}</b>칸 복구
        </span>
      </div>
      <PetalField />
    </div>
  );
}
