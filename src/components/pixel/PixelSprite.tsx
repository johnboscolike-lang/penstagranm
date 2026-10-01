import { useMemo, type CSSProperties } from "react";
import clsx from "clsx";

import type { ArtSpec } from "@/utils/art/canvas";
import { getCharacterArt, getHeadArt, getStudentArt, type CharacterName } from "@/utils/art/characters";
import { getIconSpec, MEDAL_PALETTES } from "@/utils/art/icons";
import { CC0_TILE, cc0Url, type Cc0Kind } from "@/utils/art/cc0";
import { KENNEY_TILE, kenneyUrl, type KenneyName } from "@/utils/art/kenney";
import { getSpriteUrl, SPRITE_SIZES } from "@/utils/art/manifest";
import { measurePixelRows, rowsToRects } from "@/utils/pixel";

interface PixelSpriteProps {
  art: ArtSpec;
  scale?: number;
  label?: string;
  className?: string;
  style?: CSSProperties;
}

type SpriteVars = CSSProperties & Record<`--${string}`, string | number>;

/**
 * Draws a small pixel-art sprite as inline SVG. One art pixel is `--u` CSS pixels times `scale`.
 */
export function PixelSprite({ art, scale = 1, label, className, style }: PixelSpriteProps) {
  const { width, height } = measurePixelRows(art.rows);
  const rects = useMemo(() => rowsToRects(art.rows, art.palette), [art]);
  const vars: SpriteVars = { "--w": width, "--h": height, "--m": scale, ...style };

  return (
    <svg
      aria-hidden={label ? undefined : true}
      aria-label={label}
      className={clsx("px", className)}
      role={label ? "img" : undefined}
      shapeRendering="crispEdges"
      style={vars}
      viewBox={`0 0 ${width} ${height}`}
    >
      {rects.map((rect, index) => (
        <rect fill={rect.fill} height={rect.h} key={index} width={rect.w} x={rect.x} y={rect.y} />
      ))}
    </svg>
  );
}

interface SceneSpriteProps {
  name: string;
  scale?: number;
  className?: string;
  style?: CSSProperties;
}

/**
 * Shows a server-rendered sprite (buildings, trees, props) as a cached SVG image.
 */
export function SceneSprite({ name, scale = 1, className, style }: SceneSpriteProps) {
  const size = SPRITE_SIZES[name];
  if (!size) {
    return null;
  }
  const vars: SpriteVars = { "--w": size[0], "--h": size[1], "--m": scale, ...style };

  return (
    // eslint-disable-next-line @next/next/no-img-element -- 도트 스프라이트는 최적화 대신 원본 픽셀을 그대로 보여 준다.
    <img alt="" aria-hidden className={clsx("px", "px--img", className)} draggable={false} height={size[1]} src={getSpriteUrl(name)} style={vars} width={size[0]} />
  );
}

interface PixelIconProps {
  name: string;
  scale?: number;
  label?: string;
  className?: string;
  medalRank?: 1 | 2 | 3;
}

/**
 * Draws a named UI icon (coin, check, school, ...).
 */
export function PixelIcon({ name, scale = 1, label, className, medalRank }: PixelIconProps) {
  const base = getIconSpec(name);
  const art = name === "medal" && medalRank ? { rows: base.rows, palette: MEDAL_PALETTES[medalRank] } : base;

  return <PixelSprite art={art} className={clsx("px--icon", className)} label={label} scale={scale} />;
}

interface PixelAvatarProps {
  hairKey: string | null | undefined;
  /** 쓰고 있는 모자 (없으면 생략) */
  hatKey?: string | null;
  scale?: number;
  label?: string;
  className?: string;
}

/**
 * Head-only avatar recolored by hair key.
 */
export function PixelAvatar({ hairKey, hatKey, scale = 1, label, className }: PixelAvatarProps) {
  return <PixelSprite art={getHeadArt(hairKey, hatKey)} className={className} label={label} scale={scale} />;
}

interface CharacterProps {
  name: CharacterName;
  hairKey?: string;
  /** 영웅이 쓰고 있는 모자 */
  hatKey?: string | null;
  scale?: number;
  className?: string;
}

/**
 * Full-body character used in scenes (hero, cat, owl, bird).
 */
export function Character({ name, hairKey, hatKey, scale = 1, className }: CharacterProps) {
  return <PixelSprite art={getCharacterArt(name, hairKey, hatKey)} className={className} scale={scale} />;
}

interface StudentProps {
  hairKey: string;
  bag?: number;
  scale?: number;
  className?: string;
}

/**
 * Small uniformed student walking around the school scenes.
 */
export function StudentSprite({ hairKey, bag = 0, scale = 1, className }: StudentProps) {
  return <PixelSprite art={getStudentArt(hairKey, bag)} className={className} scale={scale} />;
}

interface KenneySpriteProps {
  name: KenneyName;
  scale?: number;
  flip?: boolean;
  label?: string;
  className?: string;
}

/**
 * 공개(CC0) 도트 캐릭터를 게임 도트 크기에 맞춰 보여 준다. (16×16 원본)
 */
export function KenneySprite({ name, scale = 1, flip, label, className }: KenneySpriteProps) {
  const vars: SpriteVars = { "--w": KENNEY_TILE, "--h": KENNEY_TILE, "--m": scale };

  return (
    // eslint-disable-next-line @next/next/no-img-element -- 도트는 최적화 대신 원본 픽셀을 그대로 보여 준다.
    <img
      alt={label ?? ""}
      aria-hidden={label ? undefined : true}
      className={clsx("px", "px--img", flip && "px--flip", className)}
      draggable={false}
      height={KENNEY_TILE}
      src={kenneyUrl(name)}
      style={vars}
      width={KENNEY_TILE}
    />
  );
}

interface Cc0SpriteProps {
  kind: Cc0Kind;
  name: string;
  scale?: number;
  flip?: boolean;
  label?: string;
  className?: string;
}

/**
 * 공개(CC0) 동물·이모트·아이템 도트를 게임 도트 크기에 맞춰 보여 준다. (16×16 원본)
 */
export function Cc0Sprite({ kind, name, scale = 1, flip, label, className }: Cc0SpriteProps) {
  const vars: SpriteVars = { "--w": CC0_TILE, "--h": CC0_TILE, "--m": scale };

  return (
    // eslint-disable-next-line @next/next/no-img-element -- 도트는 최적화 대신 원본 픽셀을 그대로 보여 준다.
    <img
      alt={label ?? ""}
      aria-hidden={label ? undefined : true}
      className={clsx("px", "px--img", flip && "px--flip", className)}
      draggable={false}
      height={CC0_TILE}
      src={cc0Url(kind, name)}
      style={vars}
      width={CC0_TILE}
    />
  );
}
