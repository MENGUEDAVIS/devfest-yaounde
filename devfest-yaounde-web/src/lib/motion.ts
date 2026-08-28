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
export const heroRise = "anim-hero-rise";
export const shapeDrift = "anim-shape-drift";
export const marqueeLoop = "anim-marquee";
export const marqueeTrack = "anim-marquee-track";
export const confettiPiece = "anim-confetti-piece";
export const modalBackdropIn = "anim-modal-backdrop";
export const modalPopIn = "anim-modal-pop";
export const navSettle = "anim-nav-settle";
/** Applied by <Reveal>; pairs with `is-visible` toggled on scroll-into-view. */
export const revealOnScroll = "anim-reveal";
/** Kinetic per-word headline pop — set wordStyle(i) on each word. */
export const wordPop = "anim-word-pop";
/** Spotlight hover group (container + items) — see docs/components/. */
export const spotlightGroup = "spotlight-group";
export const spotlightItem = "spotlight-item";
/** Memory-lane scroll choreography — driven by <ScrollStage>. */
export const stagePhoto = "stage-photo";
export const stageParallax = "stage-parallax";

/**
 * Offset a staggered child. Used by both `revealOnScroll` (110ms steps) and
 * any container that stages its children.
 */
export function staggerStyle(index: number): CSSProperties {
  return { "--stagger-index": index } as CSSProperties;
}

/** Delay an element within the hero load sequence (`heroRise`). */
export function heroDelayStyle(ms: number): CSSProperties {
  return { "--hero-delay": `${ms}ms` } as CSSProperties;
}

/** Stagger the Nth word of a `wordPop` headline; `baseMs` offsets the line. */
export function wordStyle(index: number, baseMs = 0): CSSProperties {
  return {
    "--word-index": index,
    "--word-base": `${baseMs}ms`,
  } as CSSProperties;
}

/** Per-photo resting rotation for the memory-lane stage choreography. */
export function stagePhotoStyle(
  index: number,
  rotateDeg: number,
): CSSProperties {
  return {
    "--stagger-index": index,
    "--stage-rot": `${rotateDeg}deg`,
  } as CSSProperties;
}

/** Parallax travel distance for an element inside a <ScrollStage>. */
export function parallaxStyle(depthPx: number): CSSProperties {
  return { "--parallax-depth": `${depthPx}px` } as CSSProperties;
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
