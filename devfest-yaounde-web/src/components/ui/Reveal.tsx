"use client";

import { useEffect, useRef } from "react";
import type { ElementType, ReactNode } from "react";
import { revealOnScroll, staggerStyle } from "@/lib/motion";

export interface RevealProps {
  children: ReactNode;
  /** Stagger position within a group — each step adds 110ms. */
  index?: number;
  /** Render as something other than a div (e.g. "li", "section"). */
  as?: ElementType;
  className?: string;
}

/**
 * Scroll-triggered entrance (DESIGN.md §6.2 macro tier, §7c perceptibility).
 * Adds `is-visible` when the element enters the viewport, which drives the
 * `.anim-reveal` transition in motion.css.
 *
 * The class is toggled directly on the node rather than through React state
 * on purpose: it keeps this out of the render path entirely (no
 * set-state-in-effect churn, no re-render per element on scroll), which
 * matters when dozens of these are on one page.
 *
 * Reduced-motion users never see the hidden state — motion.css forces
 * `.anim-reveal` visible under that media query, so content is readable
 * regardless of whether the observer ever fires.
 */
export function Reveal({
  children,
  index = 0,
  as: Tag = "div",
  className = "",
}: RevealProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    // Safety net: if IntersectionObserver is unavailable, show immediately
    // rather than leaving content stuck at opacity 0.
    if (typeof IntersectionObserver === "undefined") {
      node.classList.add("is-visible");
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -80px 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      style={staggerStyle(index)}
      className={`${revealOnScroll} ${className}`}
    >
      {children}
    </Tag>
  );
}
