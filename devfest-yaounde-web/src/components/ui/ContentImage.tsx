/* eslint-disable @next/next/no-img-element -- the fallback branch is the point: see `canOptimise` */
import Image from "next/image";
import { canOptimise, OPTIMISABLE_HOST } from "@/lib/images";

/**
 * A photo whose URL comes from the content store.
 *
 * WHY A WRAPPER. Every image on this site is one of three things and they
 * cannot be treated the same:
 *
 *   - an uploaded photograph, on the Supabase bucket — worth optimising, and
 *     the whole reason `next/image` is configured at all;
 *   - a placeholder SVG in `public/placeholders` — 500 bytes, already the
 *     smallest it will ever be, and an optimiser round-trip would make it
 *     slower rather than faster;
 *   - nothing at all, because the record has no photo yet, which is the
 *     normal state today.
 *
 * The third case is the one that has bitten this codebase before: `<img
 * src="">` makes a browser re-request the current HTML document and draw a
 * broken-image icon. Here an empty src renders the brand's pastel and stops.
 *
 * WHY NO BLUR PLACEHOLDER. `placeholder="blur"` needs a `blurDataURL` per
 * image, and a remote photo has none unless something computes it. A single
 * shared blur would be a fabricated preview of content it has never seen —
 * every photo unblurring into something that looked nothing like its own
 * preview. A flat brand-coloured ground is honest and costs nothing. Storing
 * a real per-photo blur is possible (sharp already re-encodes on upload) and
 * is written up in ADR 0041 as the follow-up it is.
 */
export function ContentImage({
  src,
  alt,
  sizes,
  className = "",
  priority = false,
}: {
  src: string | null | undefined;
  alt: string;
  /** Required by `fill` — how wide this renders, so the srcset is right. */
  sizes: string;
  className?: string;
  priority?: boolean;
}) {
  const url = src?.trim();
  if (!url) {
    // `absolute inset-0`, not `block`: every call site positions this to be
    // filled, so a flow-level box would collapse to nothing.
    return (
      <span
        aria-hidden
        className={`absolute inset-0 block bg-pastel ${className}`}
      />
    );
  }

  // A host the optimiser is not configured for: render it plainly rather
  // than throwing. Unoptimised is a worse picture; a throw is no page.
  if (!canOptimise(url, OPTIMISABLE_HOST)) {
    return (
      <img
        src={url}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        className={`absolute inset-0 h-full w-full object-cover ${className}`}
      />
    );
  }

  return (
    <Image
      src={url}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      // Placeholder art is already minimal; sending it through the optimiser
      // costs a round-trip and saves nothing. It also keeps `next/image` off
      // the SVG path entirely, so `dangerouslyAllowSVG` stays off.
      unoptimized={url.endsWith(".svg")}
      className={`object-cover ${className}`}
    />
  );
}
