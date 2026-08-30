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
 * Sets `data-visible="true"` when the element enters the viewport, which
 * drives the `.anim-reveal` transition in motion.css.
 *
 * The flag is written directly to the node rather than held in React state on
 * purpose: it keeps this out of the render path entirely (no
 * set-state-in-effect churn, no re-render per element on scroll), which
 * matters when dozens of these are on one page.
 *
 * WHY A DATA ATTRIBUTE AND NOT A CLASS (this was a real bug, PHASE11 §8):
 * it used to add an `is-visible` CLASS. But React owns the `className`
 * attribute of this node, and it rewrites that attribute whenever the
 * `className` PROP changes — wiping any class added imperatively. So the
 * moment a caller passed a conditional class (`focusedId === id ? "..." : ""`,
 * which /speakers and /team both do), expanding a card rewrote className,
 * destroyed `is-visible`, and the element snapped back to `.anim-reveal`'s
 * hidden state: opacity 0 and translateY(40px). The box kept its space and
 * the content vanished — and because the observer had already unobserved the
 * node, it never came back.
 *
 * `data-visible` is not a prop, so React never touches it, and imperative
 * and declarative ownership no longer collide.
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
      node.dataset.visible = "true";
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).dataset.visible = "true";
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
