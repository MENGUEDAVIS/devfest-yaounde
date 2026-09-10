"use client";

import { PreloaderDots } from "@/components/global/PreloaderDots";
import { ContentImage } from "@/components/ui/ContentImage";
import { useMediaQuery } from "@/lib/use-media-query";

/**
 * What the hero sits on: one photograph, a flat scrim, and the dot field.
 *
 * ## Four layers, in this order, and the order is the point
 *
 * 0. **The themed ground** — a solid fill in the theme's pastel, painted
 *    whether or not there is a photograph. Not a fallback: it is what shows
 *    through a photograph with transparency in it, which is why it stays even
 *    when an image is present. The backdrop is stored as WebP precisely so
 *    that alpha survives to reach it (ADR 0047).
 * 1. **The photograph**, full-bleed, and only if one has been uploaded. ONE
 *    image — the hero this replaced used eighteen, and the lesson from
 *    removing them was about the pile, not about photography. `ContentImage`
 *    means `next/image`, a real `sizes`, AVIF/WebP, and the host guard
 *    everything else uses.
 *
 *    ONE UPLOAD, NOT TWO. `next/image` generates a responsive `srcset` from
 *    it, so a phone downloads a phone-sized file — the "optimised for mobile
 *    and desktop" part is handled without a second asset to keep in sync. A
 *    separate mobile crop would only be worth its upkeep for ART DIRECTION —
 *    a different composition, not a different size — and this image sits
 *    under a heavy tint and a dot field, where it reads as texture rather
 *    than as a subject somebody needs to see framed.
 * 2. **A flat scrim** in the theme's pastel. Flat, not a gradient (DESIGN.md
 *    §2.6) — an opacity on a solid fill, which is a different thing from a
 *    ramp between two colours. It is what keeps ink text legible over a
 *    photograph whose brightness nobody controls, and it is theme-coloured so
 *    a theme switch repaints it with everything else.
 * 3. **The dot field**, over the photograph rather than under it, so it reads
 *    as a texture pass ON the image — the same relationship the DP generator
 *    gives its texture effects. Its highlight follows the pointer here
 *    instead of drifting on a timer.
 *
 * ## Why the scrim is heavy
 *
 * Heavier than it looks like it needs to be. The photograph is content an
 * organiser uploads, so its brightness is unknown and could be anything from
 * a dark room to a white wall — and the text over it is a fixed ink colour
 * that cannot adapt. A scrim tuned to the placeholder would be a scrim tuned
 * to one image. This one keeps ink at a comfortable contrast over a fully
 * white photograph, which is the worst case.
 */
export function HeroBackdrop({
  src,
  alt,
}: {
  src: string | null | undefined;
  alt: string;
}) {
  const calm = useMediaQuery("(prefers-reduced-motion: reduce)");

  return (
    <div aria-hidden className="absolute inset-0 -z-10 overflow-hidden">
      {/*
        The themed ground, always. It is the hero's colour when there is no
        photograph, AND the colour behind one that has transparency in it — a
        cut-out subject lands on the theme rather than on black.
      */}
      <div className="absolute inset-0 bg-pastel" />

      {/* `scale(1.06)` on the wrapper gives the recede somewhere to move to
          without ever showing an edge of the photograph. */}
      {src?.trim() ? (
        <div className="hero-backdrop absolute inset-0">
          <ContentImage
            src={src}
            alt={alt}
            sizes="100vw"
            priority
            className="object-cover"
          />
        </div>
      ) : null}

      {/*
        The scrim, and only over a photograph. With no image there is nothing
        to hold back, and a tint over the bare theme colour would just make
        the whole hero a slightly different, muddier yellow.
      */}
      {src?.trim() ? (
        <div className="absolute inset-0 bg-pastel/[0.88]" />
      ) : null}

      {/*
        The texture pass, over the photograph — and held well back.

        At the preloader's own strength this is a field on an otherwise blank
        screen and reads as texture. Behind a headline, two buttons and a
        sticker cluster it reads as noise competing with all of them, so it
        runs at half. It is the layer nobody should notice they are looking
        at.
      */}
      <div className="absolute inset-0 opacity-45">
        <PreloaderDots calm={calm} follow ink="#1E1E1E" />
      </div>
    </div>
  );
}
