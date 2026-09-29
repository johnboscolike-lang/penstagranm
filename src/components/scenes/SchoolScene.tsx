import { Character, SceneSprite, StudentSprite } from "@/components/pixel/PixelSprite";
import { LanternGlow, PetalField, Prop } from "@/components/scenes/Prop";

interface SchoolSceneProps {
  hairKey: string;
  bubble?: string;
}

/**
 * 학교 장면: 담쟁이 덮인 교실 건물, 도서관 계단, 급식실, 등교하는 친구들.
 */
export function SchoolScene({ hairKey, bubble }: SchoolSceneProps) {
  return (
    <div aria-hidden className="scene scene--school">
      <div className="scene__sky" />
      <Prop anim="drift" x={24} y={80} z={1}>
        <SceneSprite name="cloud-a" scale={1.6} />
      </Prop>
      <Prop anim="drift" x={56} y={88} z={1}>
        <SceneSprite name="cloud-b" scale={1.2} />
      </Prop>
      <Prop x={62} y={50} z={1}>
        <SceneSprite name="castle" scale={1.5} />
      </Prop>
      <div className="scene__hills" />

      <Prop x={2} y={36} z={2}>
        <SceneSprite name="tree-green" scale={1.5} />
      </Prop>
      <Prop x={95} y={36} z={2}>
        <SceneSprite name="tree-blossom" scale={1.7} />
      </Prop>

      <Prop x={85} y={30} z={3}>
        <SceneSprite name="cafeteria" scale={1.1} />
      </Prop>
      <Prop x={51} y={28} z={3}>
        <SceneSprite name="library" />
      </Prop>
      <Prop x={16} y={24} z={4}>
        <SceneSprite name="school" />
      </Prop>

      <Prop x={33} y={30} z={3}>
        <SceneSprite name="tree-green-b" scale={1.2} />
      </Prop>
      <Prop x={70} y={30} z={3}>
        <SceneSprite name="tree-blossom" scale={1.3} />
      </Prop>

      <div className="scene__ground" />

      <Prop x={51} y={19} z={5}>
        <SceneSprite name="stairs" scale={1.1} />
      </Prop>
      <Prop x={40} y={22} z={6}>
        <SceneSprite name="banner" scale={1.1} />
      </Prop>
      <Prop x={62} y={22} z={6}>
        <SceneSprite name="banner" scale={1.1} />
      </Prop>
      <Prop x={27} y={21} z={6}>
        <SceneSprite name="bush-c" scale={1.1} />
      </Prop>
      <Prop x={76} y={24} z={6}>
        <SceneSprite name="bush-a" scale={1.1} />
      </Prop>

      <LanternGlow size={210} x={31} y={21} />
      <LanternGlow size={210} x={71} y={21} />
      <Prop x={31} y={5} z={8}>
        <SceneSprite name="lantern" scale={1.5} />
      </Prop>
      <Prop x={71} y={5} z={8}>
        <SceneSprite name="lantern" scale={1.5} />
      </Prop>
      <Prop anim="bob" desktopOnly x={31} y={24} z={9}>
        <Character name="bird" scale={1.2} />
      </Prop>
      <Prop anim="bob" desktopOnly x={71.6} y={24} z={9}>
        <Character name="bird" scale={1.2} />
      </Prop>

      <Prop shadow x={21} y={10} z={7}>
        <StudentSprite bag={0} hairKey="black" scale={1.4} />
      </Prop>
      <Prop shadow x={25} y={7} z={7}>
        <StudentSprite bag={1} hairKey="brown" scale={1.4} />
      </Prop>
      <Prop desktopOnly shadow x={58} y={14} z={7}>
        <StudentSprite bag={2} hairKey="rose" scale={1.4} />
      </Prop>
      <Prop desktopOnly shadow x={63} y={10} z={7}>
        <StudentSprite bag={3} hairKey="blue" scale={1.4} />
      </Prop>

      <Prop x={9} y={0} z={9}>
        <SceneSprite name="bush-b" scale={1.5} />
      </Prop>
      <Prop x={14} y={1} z={10}>
        <SceneSprite name="flowers-a" scale={1.4} />
      </Prop>

      <Prop shadow x={44} y={12} z={10}>
        <Character hairKey={hairKey} name="hero" scale={1.6} />
      </Prop>
      <Prop anim="breathe" flip shadow x={37.5} y={11} z={10}>
        <Character name="cat" scale={1.6} />
      </Prop>
      {bubble ? (
        <div className="bubble pf" style={{ left: "38.5%", bottom: "36%" }}>
          {bubble}
        </div>
      ) : null}

      <div className="scene__caption">
        우리의 오늘이
        <br />더 멋진 내일이 되는 곳
      </div>
      <PetalField />
    </div>
  );
}
