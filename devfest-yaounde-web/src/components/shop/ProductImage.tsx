/* eslint-disable @next/next/no-img-element -- catalog images are arbitrary
   local/remote URLs from content JSON; next/image optimisation isn't wired for
   these yet. Same call, and same reason, as MorphedImageFrame. */
"use client";

/**
 * A product image with the "soft deterrent" protections PAGES.md §8 asks for:
 * no context menu, no dragging, no selection.
 *
 * THIS IS NOT SECURITY, and it is worth being blunt about that in the code so
 * nobody later mistakes it for a barrier: the file is still in the network
 * tab, still in the cache, and a screenshot takes one keystroke. What it
 * actually buys is friction against the casual right-click-and-save — which
 * is the realistic threat for merch mockups, and all §8 claims for it. The
 * documented stronger option is a watermark.
 *
 * It is deliberately confined to product imagery. Blanket-disabling the
 * context menu across a site is hostile to people using it for ordinary
 * things — open in new tab, translate, inspect.
 */
export function ProductImage({
  src,
  alt,
  className = "",
  priority = false,
}: {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
}) {
  return (
    <img
      src={src}
      alt={alt}
      draggable={false}
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
      loading={priority ? "eager" : "lazy"}
      className={`select-none ${className}`}
    />
  );
}
