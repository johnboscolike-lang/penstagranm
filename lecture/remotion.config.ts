import { Config } from "@remotion/cli/config";

/**
 * Remotion 설정. 렌더링은 scripts/render.mjs(렌더러 API)에서 하고,
 * 여기서는 Studio·CLI 기본값만 맞춘다.
 */
Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(92);
Config.setConcurrency(4);
Config.setOverwriteOutput(true);
Config.setEntryPoint("src/index.ts");
