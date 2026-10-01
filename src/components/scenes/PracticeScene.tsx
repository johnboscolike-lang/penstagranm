import { Character, SceneSprite } from "@/components/pixel/PixelSprite";
import { LanternGlow, PetalField, Prop } from "@/components/scenes/Prop";
import { PetProp } from "@/components/scenes/PetProp";

interface PracticeSceneProps {
  hairKey: string;
  /** 쓰고 있는 모자 */
  hatKey?: string | null;
  /** 함께 다니는 펫 */
  petKey?: string | null;
  bubble?: string;
}

/**
 * 연습장 장면: 책장과 책상이 놓인 햇살 좋은 도서관 마당에서 부엉이 선생님과 함께 단어를 익히는 곳.
 */
export function PracticeScene({ hairKey, hatKey, petKey, bubble }: PracticeSceneProps) {
  return (
    <div aria-hidden className="scene scene--practice">
      <div className="scene__sky" />
      <Prop anim="drift" x={20} y={84} z={1}>
        <SceneSprite name="cloud-a" scale={1.3} />
      </Prop>
      <Prop anim="drift" x={74} y={90} z={1}>
        <SceneSprite name="cloud-b" scale={1.1} />
      </Prop>
      <div className="scene__hills" />
      <Prop x={30} y={36} z={2}>
        <SceneSprite name="library" scale={1.5} />
      </Prop>
      <div className="scene__ground" />

      <Prop x={6} y={20} z={4}>
        <SceneSprite name="bookshelf" scale={1.8} />
      </Prop>
      <Prop desktopOnly x={14} y={17} z={4}>
        <SceneSprite name="bookshelf" scale={1.6} />
      </Prop>
      <LanternGlow size={150} x={86} y={34} />
      <Prop x={86} y={30} z={4}>
        <SceneSprite name="lantern" scale={1.6} />
      </Prop>
      <Prop desktopOnly x={72} y={16} z={5}>
        <SceneSprite name="desk" scale={1.5} />
      </Prop>
      <Prop x={10} y={1} z={9}>
        <SceneSprite name="bush-b" scale={1.5} />
      </Prop>
      <Prop x={18} y={1} z={10}>
        <SceneSprite name="flowers-a" scale={1.4} />
      </Prop>

      <Prop anim="breathe" shadow x={40} y={14} z={8}>
        <Character hairKey={hairKey} hatKey={hatKey} name="hero" scale={1.7} />
      </Prop>
      <PetProp petKey={petKey} scale={1.5} x={46} y={13} z={8} />
      <Prop anim="breathe" flip shadow x={33} y={13} z={8}>
        <Character name="owl" scale={1.6} />
      </Prop>
      {bubble ? (
        <div className="bubble pf" style={{ left: "26%", bottom: "38%" }}>
          {bubble}
        </div>
      ) : null}
      <PetalField />
    </div>
  );
}
