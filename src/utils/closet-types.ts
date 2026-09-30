import type { KenneyName } from "@/utils/art/kenney";

export interface ClosetHatView {
  key: string;
  name: string;
  cost: number;
  description: string;
  owned: boolean;
  equipped: boolean;
  /** 사는 데 쓰는 구매 이름 */
  purchaseKey: string;
}

export interface ClosetPetView {
  key: string;
  name: string;
  sprite: KenneyName;
  owned: boolean;
  equipped: boolean;
  /** 아직 못 만난 펫을 만나는 방법 */
  hint: string;
}

export interface ClosetView {
  hatKey: string | null;
  petKey: string | null;
  hats: ClosetHatView[];
  pets: ClosetPetView[];
}
