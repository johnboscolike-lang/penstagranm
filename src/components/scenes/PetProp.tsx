import { PetSprite } from "@/components/pixel/PixelSprite";
import { Prop } from "@/components/scenes/Prop";
import { petFor } from "@/utils/cosmetics";

interface PetPropProps {
  petKey?: string | null;
  x: number;
  y: number;
  z?: number;
  scale?: number;
}

/**
 * 영웅 옆을 따라다니는 펫. 펫을 데리고 있지 않으면 아무것도 그리지 않는다.
 */
export function PetProp({ petKey, x, y, z = 9, scale = 1.5 }: PetPropProps) {
  const pet = petFor(petKey);
  if (!pet) {
    return null;
  }

  return (
    <Prop anim="bob" shadow x={x} y={y} z={z}>
      <PetSprite art={pet.art} label={`펫 ${pet.name}`} scale={scale} sprite={pet.sprite} />
    </Prop>
  );
}
