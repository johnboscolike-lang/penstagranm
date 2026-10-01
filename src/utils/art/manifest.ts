/**
 * 서버가 내려주는 스프라이트의 격자 크기 [너비, 높이]. 클라이언트가 생성 코드를 가져오지 않고도 화면 크기를 계산하도록 분리했다.
 * 스프라이트를 고치면 src/tests/sprites.test.ts 가 이 표와의 차이를 알려 준다.
 */
export const SPRITE_VERSION = "1";

export const SPRITE_SIZES: Readonly<Record<string, readonly [number, number]>> = {
  "tree-green": [56, 64],
  "tree-green-b": [56, 64],
  "tree-blossom": [56, 64],
  "bush-a": [44, 22],
  "bush-b": [44, 22],
  "bush-c": [44, 22],
  "flowers-a": [48, 10],
  "flowers-b": [48, 10],
  "ivy-a": [10, 30],
  "ivy-b": [10, 46],
  "ivy-c": [10, 22],
  "cloud-a": [40, 14],
  "cloud-b": [40, 14],
  "castle": [150, 62],
  "hills": [320, 36],
  "floor-stone": [32, 32],
  "water-tile": [32, 16],
  "waterfall-tile": [16, 40],
  "school": [110, 75],
  "library": [112, 85],
  "cafeteria": [86, 49],
  "cottage": [90, 63],
  "stairs": [96, 28],
  "lantern": [14, 33],
  "banner": [14, 38],
  "bench": [30, 18],
  "fence": [16, 18],
  "mailbox": [16, 28],
  "bookshelf": [32, 42],
  "chalkboard": [36, 26],
  "desk": [44, 30],
  "bridge-tile": [22, 14],
  "flowerbed": [32, 20],
  "treebed": [36, 40],
  "frame-parchment": [12, 12],
  "frame-hud": [12, 12],
  "frame-card": [12, 12],
  "frame-cardMint": [12, 12],
  "frame-tile": [12, 12],
  "frame-tileDone": [12, 12],
  "frame-btnTeal": [12, 12],
  "frame-btnCream": [12, 12],
  "frame-btnGold": [12, 12],
  "frame-btnPink": [12, 12],
  "frame-input": [12, 12],
  "frame-chipDark": [12, 12],
  "frame-bubble": [12, 12],
  "frame-bar": [12, 12],
  "frame-seg": [12, 12],
};

export type SpriteName = keyof typeof SPRITE_SIZES;

/**
 * Builds the URL of a server-rendered sprite.
 */
export function getSpriteUrl(name: string): string {
  return `/api/sprites/${name}.svg?v=${SPRITE_VERSION}`;
}
