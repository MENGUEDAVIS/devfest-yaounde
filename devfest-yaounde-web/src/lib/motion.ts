import type { CSSProperties } from "react";

/**
 * Named motion presets backed by src/app/motion.css. Import these instead of
 * hardcoding animation class names, so every component pulls from the same
 * set — see .claude/skills/devfest-animation/SKILL.md.
 *
 * All of these already no-op under prefers-reduced-motion; no extra
 * wrapper/hook is required to make a component reduced-motion safe.
 */
export const bouncyPop = "anim-bouncy-pop";
export const fadeInUp = "anim-fade-in-up";
export const staggerReveal = "anim-stagger-reveal";
export const marqueeLoop = "anim-marquee";
export const confettiPiece = "anim-confetti-piece";

/**
 * Apply to the Nth child of a `staggerReveal` container to offset its
 * entrance by `index * 80ms`.
 */
export function staggerStyle(index: number): CSSProperties {
  return { "--stagger-index": index } as CSSProperties;
}

/**
 * Apply to a `confettiPiece` element to fly out toward (x, y) px while
 * rotating by r degrees.
 */
export function confettiPieceStyle(
  x: number,
  y: number,
  r: number,
): CSSProperties {
  return {
    "--confetti-x": `${x}px`,
    "--confetti-y": `${y}px`,
    "--confetti-r": `${r}deg`,
  } as CSSProperties;
}
