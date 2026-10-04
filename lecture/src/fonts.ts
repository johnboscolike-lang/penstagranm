import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

const FACES: [string, string, string][] = [
  ["Pretendard", "Pretendard-Regular.woff2", "400"],
  ["Pretendard", "Pretendard-Medium.woff2", "500"],
  ["Pretendard", "Pretendard-SemiBold.woff2", "600"],
  ["Pretendard", "Pretendard-Bold.woff2", "700"],
  ["Pretendard", "Pretendard-ExtraBold.woff2", "800"],
  ["Geist", "Geist-Regular.woff2", "400"],
  ["Geist", "Geist-Medium.woff2", "500"],
  ["Geist", "Geist-SemiBold.woff2", "600"],
  ["Geist", "Geist-Bold.woff2", "700"],
  ["Geist Mono", "GeistMono-Regular.woff2", "400"],
  ["Geist Mono", "GeistMono-Medium.woff2", "500"],
];

/**
 * 영상에 쓰는 모든 로컬 폰트를 불러온다. 렌더는 폰트가 준비될 때까지 기다린다.
 * @returns 완료 프로미스
 */
export const fontsReady: Promise<unknown> = Promise.all(
  FACES.map(([family, file, weight]) => loadFont({ family, url: staticFile(`fonts/${file}`), weight, display: "block" })),
);
