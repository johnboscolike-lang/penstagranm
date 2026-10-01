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
  /** 그림 묶음(kenney 몬스터 또는 creatures 동물)과 그림 이름 */
  art: "kenney" | "creatures";
  sprite: string;
  /** 어떻게 만나는지: 학급 보스를 쓰러뜨려서 또는 업적을 이루어서 */
  source: "boss" | "achievement";
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
