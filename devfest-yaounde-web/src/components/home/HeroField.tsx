"use client";

import type { ReactNode } from "react";
import { useHeroField } from "@/lib/use-hero-field";

/**
 * The hero's stage: everything inside it leans toward the pointer while it
 * is here, and recedes as you scroll past it.
 *
 * A client boundary drawn as tightly as it can be. This component owns one
 * ref and `useHeroField`'s two effects; the wordmark, the facts and the
 * shapes are passed in as `children` and stay server-rendered, so making the
 * hero interactive costs the bundle a hook and not the whole composition.
 */
export function HeroField({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useHeroField<HTMLDivElement>();
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
