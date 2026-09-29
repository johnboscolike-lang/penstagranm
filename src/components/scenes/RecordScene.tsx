import { Character, SceneSprite } from "@/components/pixel/PixelSprite";
import { LanternGlow, PetalField, Prop } from "@/components/scenes/Prop";

interface RecordSceneProps {
  hairKey: string;
}

/**
 * 기록실 장면: 따뜻한 조명 아래 책장과 책상이 있는 공부방.
 */
export function RecordScene({ hairKey }: RecordSceneProps) {
  return (
    <div aria-hidden className="scene scene--record">
      <div className="scene__sky" />
      <div className="scene__wall scene__wall--room" />
      <div className="scene__window" />
      <Prop x={6} y={30} z={3}>
        <SceneSprite name="bookshelf" scale={1.5} />
      </Prop>
      <Prop x={17} y={30} z={3}>
        <SceneSprite name="bookshelf" scale={1.5} />
      </Prop>
      <Prop x={40} y={44} z={3}>
        <SceneSprite name="chalkboard" scale={1.3} />
      </Prop>
      <Prop x={10} y={54} z={2}>
        <SceneSprite name="ivy-c" scale={1.4} />
      </Prop>
      <div className="scene__ground scene__ground--wood" />
      <LanternGlow size={260} x={24} y={20} />
      <Prop x={28} y={16} z={6}>
        <SceneSprite name="desk" scale={1.5} />
      </Prop>
      <Prop anim="breathe" flip shadow x={22} y={9} z={8}>
        <Character name="cat" scale={1.6} />
      </Prop>
      <Prop anim="breathe" shadow x={37} y={12} z={8}>
        <Character hairKey={hairKey} name="hero" scale={1.7} />
      </Prop>
      <div className="bubble pf" style={{ left: "29%", bottom: "38%" }}>
        오늘 한 일을 네 컷으로 남겨 볼까?
      </div>
      <PetalField />
    </div>
  );
}
