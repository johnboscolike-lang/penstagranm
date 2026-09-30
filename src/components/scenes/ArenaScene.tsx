import { Character, KenneySprite, SceneSprite, StudentSprite } from "@/components/pixel/PixelSprite";
import { LanternGlow, PetalField, Prop } from "@/components/scenes/Prop";

interface ArenaSceneProps {
  hairKey: string;
}

/**
 * 대결장 장면: 노을빛 하늘 아래 모래 링, 깃발과 등불, 그리고 마주 선 두 캐릭터.
 * 관중과 박쥐는 넓은 화면에서만 보여 준다.
 */
export function ArenaScene({ hairKey }: ArenaSceneProps) {
  return (
    <div aria-hidden className="scene scene--arena">
      <div className="scene__sky" />
      <Prop anim="drift" x={18} y={84} z={1}>
        <SceneSprite name="cloud-a" scale={1.3} />
      </Prop>
      <Prop anim="drift" x={76} y={88} z={1}>
        <SceneSprite name="cloud-b" scale={1.1} />
      </Prop>
      <Prop x={72} y={50} z={1}>
        <SceneSprite name="castle" scale={1.4} />
      </Prop>
      <Prop anim="drift" desktopOnly x={40} y={70} z={2}>
        <KenneySprite name="bat" scale={1.5} />
      </Prop>
      <Prop anim="drift" desktopOnly x={12} y={62} z={2}>
        <KenneySprite flip name="bat" scale={1.2} />
      </Prop>
      <div className="scene__hills" />
      <div className="scene__ground" />

      <div className="arena-ring">
        <div className="arena-ring__inner" />
      </div>
      <Prop x={4} y={34} z={3}>
        <SceneSprite name="banner" scale={1.8} />
      </Prop>
      <Prop x={96} y={34} z={3}>
        <SceneSprite name="banner" scale={1.8} />
      </Prop>
      <LanternGlow size={150} x={13} y={34} />
      <Prop x={13} y={30} z={4}>
        <SceneSprite name="lantern" scale={1.6} />
      </Prop>
      <LanternGlow size={150} x={87} y={34} />
      <Prop x={87} y={30} z={4}>
        <SceneSprite name="lantern" scale={1.6} />
      </Prop>

      <Prop desktopOnly shadow x={4} y={20} z={5}>
        <StudentSprite bag={2} hairKey="rose" scale={1.3} />
      </Prop>
      <Prop desktopOnly shadow x={10} y={17} z={5}>
        <StudentSprite bag={4} hairKey="green" scale={1.3} />
      </Prop>

      <Prop anim="breathe" shadow x={30} y={16} z={8}>
        <Character hairKey={hairKey} name="hero" scale={1.9} />
      </Prop>
      <div className="arena-vs pf">VS</div>
      <Prop anim="bob" flip shadow x={58} y={16} z={8}>
        <KenneySprite name="slime" scale={3.4} />
      </Prop>
      <Prop flip shadow x={64} y={12} z={8}>
        <Character name="cat" scale={1.4} />
      </Prop>
      <PetalField />
    </div>
  );
}
