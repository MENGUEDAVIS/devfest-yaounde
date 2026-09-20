"use client";

import { useState } from "react";

/**
 * The signed-in organiser's Google profile picture, or their initial.
 *
 * `url` has already been vetted server-side (`googleAvatarUrl`: https, on
 * Google's image host), so this only decides between the picture and the
 * fallback. The fallback also covers a picture that fails to LOAD — an
 * account whose photo was later removed, a blocked host, being offline — so
 * the badge is never a broken-image icon.
 *
 * `referrerPolicy="no-referrer"`: Google's image host is known to refuse or
 * throttle hotlinked profile pictures that arrive with a Referer, and there
 * is no reason to tell it which admin page somebody is on.
 *
 * Decorative (`alt=""`): the email and "Signed in" label beside it already
 * say who this is, and repeating it would have a screen reader read it twice.
 */
export function OrganiserAvatar({
  url,
  fallbackSource,
}: {
  url: string | null;
  /** Name or email — whichever is available — for the initial. */
  fallbackSource: string | null;
}) {
  // Keyed to the URL it failed for, so a different picture gets a fresh try.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showPicture = url !== null && failedUrl !== url;
  const initial = (fallbackSource?.trim()[0] ?? "?").toUpperCase();

  return (
    <span
      aria-hidden
      className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-pill border border-black02/20 bg-pastel font-sans text-body-m font-bold text-black02"
    >
      {showPicture ? (
        // Plain <img>: the host is external and not in `remotePatterns`, and
        // next/image THROWS on such a host — an unoptimised 32px avatar is a
        // far better failure than an admin shell that will not render.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt=""
          width={32}
          height={32}
          referrerPolicy="no-referrer"
          onError={() => setFailedUrl(url)}
          className="h-full w-full object-cover"
        />
      ) : (
        initial
      )}
    </span>
  );
}
