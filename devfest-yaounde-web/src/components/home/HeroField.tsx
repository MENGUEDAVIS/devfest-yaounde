"use client";

import type { ReactNode } from "react";
import { useCursorField } from "@/lib/use-cursor-field";

/**
 * The hero's stage: everything inside it leans toward the pointer.
 *
 * A client boundary drawn as tightly as it can be. This component owns one
 * ref and one effect; the wordmark, the facts and the shapes are passed in as
 * `children` and stay server-rendered, so making the hero interactive costs
 * the bundle a hook and not the whole composition.
 */
export function HeroField({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useCursorField<HTMLDivElement>();
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

/**
 * One floating fact.
 *
 * `depth` is how far it travels at the edge of the hero, in pixels — bigger
 * reads as nearer. `tilt` and `float` drive the idle breathing so no two
 * satellites are ever quite in phase, which is the difference between "alive"
 * and "a row of things bobbing together".
 */
export function Satellite({
  children,
  className = "",
  depth = 16,
  tilt = 0,
  float = -10,
  drift = 9,
  delay = 0,
  settle = 0,
  skittish = false,
}: {
  children: ReactNode;
  className?: string;
  depth?: number;
  tilt?: number;
  float?: number;
  drift?: number;
  delay?: number;
  settle?: number;
  /**
   * Chase it and it ducks. See EASTER-EGGS.md — a fact that dodges once and
   * comes back is a joke; one that dodges forever is a broken control, so it
   * only ever gives ground, never the information.
   */
  skittish?: boolean;
}) {
  return (
    <div
      className={`hero-satellite absolute ${skittish ? "hero-skittish" : ""} ${className}`}
      style={
        {
          "--depth": `${depth}px`,
        } as React.CSSProperties
      }
    >
      <span
        className="hero-satellite-inner"
        style={
          {
            "--tilt": `${tilt}deg`,
            "--float": `${float}px`,
            "--drift": `${drift}s`,
            "--drift-delay": `${delay}ms`,
          } as React.CSSProperties
        }
      >
        <span
          className="hero-settle block"
          style={{ ["--settle-delay" as string]: `${settle}ms` }}
        >
          {children}
        </span>
      </span>
    </div>
  );
}
