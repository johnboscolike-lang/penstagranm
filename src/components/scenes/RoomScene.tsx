import { Character, PixelIcon, SceneSprite } from "@/components/pixel/PixelSprite";
import { PetalField, Prop } from "@/components/scenes/Prop";
import type { ShopItemKey } from "@/utils/shop-items";

interface YardSlot {
  sprite: string;
  x: number;
  y: number;
  scale: number;
  z: number;
}

/**
 * 앞마당에서 아이템이 놓이는 자리. 산 아이템만 장면에 나타난다.
 */
export const YARD_SLOTS: Readonly<Record<ShopItemKey, YardSlot>> = {
  lamp: { sprite: "lantern", x: 22, y: 12, scale: 1.5, z: 8 },
  banner: { sprite: "banner", x: 47, y: 17, scale: 1.3, z: 7 },
  flowerbed: { sprite: "flowerbed", x: 12, y: 6, scale: 1.4, z: 9 },
  bench: { sprite: "bench", x: 57, y: 8, scale: 1.5, z: 9 },
  bookshelf: { sprite: "bookshelf", x: 62, y: 20, scale: 1.2, z: 6 },
  treebed: { sprite: "treebed", x: 6, y: 20, scale: 1.4, z: 6 },
};

interface RoomSceneProps {
  hairKey: string;
  ownedItemKeys: string[];
  hasMail: boolean;
}

/**
 * 내공간 장면: 아늑한 집과 앞마당. 코인으로 산 꾸미기 아이템이 자리에 나타난다.
 */
export function RoomScene({ hairKey, ownedItemKeys, hasMail }: RoomSceneProps) {
  const owned = new Set(ownedItemKeys);

  return (
    <div aria-hidden className="scene scene--room">
      <div className="scene__sky" />
      <Prop anim="drift" x={16} y={84} z={1}>
        <SceneSprite name="cloud-a" scale={1.6} />
      </Prop>
      <Prop anim="drift" x={52} y={90} z={1}>
        <SceneSprite name="cloud-b" scale={1.3} />
      </Prop>
      <Prop x={70} y={52} z={1}>
        <SceneSprite name="castle" scale={1.2} />
      </Prop>
      <div className="scene__hills" />

      <Prop x={4} y={36} z={2}>
        <SceneSprite name="tree-green" scale={1.6} />
      </Prop>
      <Prop x={62} y={34} z={2}>
        <SceneSprite name="tree-blossom" scale={1.5} />
      </Prop>

      <div className="scene__ground scene__ground--grass" />
      <div className="scene__path" />

      <Prop x={35} y={30} z={3}>
        <SceneSprite name="cottage" scale={1.35} />
      </Prop>
      <div className="scene__sign">쌓이는 성장</div>

      <div className="scene__fence scene__fence--left" />
      <div className="scene__fence scene__fence--right" />
      <Prop x={4} y={16} z={5}>
        <SceneSprite name="bush-a" scale={1.3} />
      </Prop>
      <Prop x={60} y={24} z={5}>
        <SceneSprite name="bush-c" scale={1.2} />
      </Prop>

      {Object.entries(YARD_SLOTS).map(([key, slot]) =>
        owned.has(key) ? (
          <Prop key={key} x={slot.x} y={slot.y} z={slot.z}>
            <SceneSprite name={slot.sprite} scale={slot.scale} />
          </Prop>
        ) : null,
      )}

      <Prop x={54} y={17} z={9}>
        <SceneSprite name="mailbox" scale={1.4} />
      </Prop>
      {hasMail ? (
        <Prop anim="bob" x={54} y={31} z={12}>
          <PixelIcon name="mail" scale={1.4} />
        </Prop>
      ) : null}

      <Prop anim="breathe" shadow x={39} y={13} z={10}>
        <Character hairKey={hairKey} name="hero" scale={1.6} />
      </Prop>
      <Prop anim="breathe" shadow x={33} y={10} z={10}>
        <Character name="cat" scale={1.5} />
      </Prop>
      <Prop anim="bob" desktopOnly x={57} y={30} z={9}>
        <Character name="bird" scale={1.3} />
      </Prop>

      <div className="bubble pf" style={{ left: "9%", bottom: "38%" }}>
        {hasMail ? "우편함에 지난주 성장 소식이 왔어!" : "오늘도 내 공간이 조금씩 자라고 있어."}
      </div>
      <PetalField />
    </div>
  );
}
