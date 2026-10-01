import type { CSSProperties, ReactNode } from "react";
import clsx from "clsx";

interface PropProps {
  /** 가로 위치(장면 너비의 %, 스프라이트 가운데 기준) */
  x: number;
  /** 세로 위치(장면 높이의 %, 스프라이트 바닥 기준) */
  y: number;
  z?: number;
  anim?: "bob" | "breathe" | "drift" | "glow";
  flip?: boolean;
  shadow?: boolean;
  desktopOnly?: boolean;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

/**
 * Places one sprite inside a scene using percentage coordinates, with an optional idle animation.
 */
export function Prop({ x, y, z = 1, anim, flip, shadow, desktopOnly, className, style, children }: PropProps) {
  return (
    <div
      className={clsx("prop", flip && "prop--flip", shadow && "prop--shadow", desktopOnly && "prop--desktop", className)}
      style={{ left: `${x}%`, bottom: `${y}%`, zIndex: z, ...style }}
    >
      <div className={clsx("prop__inner", anim && `anim-${anim}`)}>{children}</div>
    </div>
  );
}

const PETAL_LEFTS = [6, 17, 29, 38, 52, 61, 73, 84, 92];

/**
 * Slowly falling blossom petals that add life to a scene.
 */
export function PetalField() {
  return (
    <div aria-hidden className="petals">
      {PETAL_LEFTS.map((left, index) => (
        <span
          className="petal"
          key={left}
          style={{ left: `${left}%`, animationDelay: `${-index * 1.7}s`, animationDuration: `${12 + (index % 4) * 3}s` }}
        />
      ))}
    </div>
  );
}

interface LanternGlowProps {
  x: number;
  y: number;
  size: number;
}

/**
 * Warm halo behind a street lamp (positioned like a Prop).
 */
export function LanternGlow({ x, y, size }: LanternGlowProps) {
  return (
    <div
      aria-hidden
      className="glow anim-glow"
      style={{ left: `${x}%`, bottom: `${y}%`, width: size, height: size, zIndex: 2, transform: "translate(-50%, 50%)" }}
    />
  );
}
