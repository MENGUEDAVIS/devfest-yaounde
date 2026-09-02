/**
 * DP generator — sharing.
 *
 * TWO PATHS, and the difference between them is a platform limit, not a
 * preference:
 *
 *  - Where the browser can share FILES (`navigator.canShare({files})` — the
 *    share sheet on Android and iOS, and some desktop browsers), one tap
 *    hands the image and the caption to whatever app the person picks. That
 *    is a real image post to Instagram, WhatsApp, X or LinkedIn.
 *
 *  - Everywhere else, no web API can attach an image to a post on the
 *    person's behalf. X, LinkedIn and WhatsApp accept a prefilled composer by
 *    URL but no attachment; Instagram has no web composer at all. So the
 *    fallback downloads the image, opens the composer with the caption
 *    already in it, and SAYS that the image has to be attached. What it does
 *    not do is pretend.
 *
 * Captions are bilingual because they are user-facing copy — the i18n rule
 * covers share text explicitly.
 */
import { SITE_HOST, SITE_URL } from "@/lib/site-config";

export const SHARE_HASHTAGS = ["#DevFestYaounde", "#GDGYaounde", "#DevFest"];

export const SHARE_CAPTIONS = {
  fr: "Je serai au DevFest Yaoundé. On s'y retrouve ?",
  en: "I'll be at DevFest Yaoundé. See you there?",
} as const;

/**
 * The call to action. It names the page rather than an account, which is why
 * the caption carries no handles: a URL is verifiable and cannot tag the
 * wrong person, and none of the chapter's social profiles are confirmed
 * (GAPS.md G16).
 */
const SHARE_CTA = {
  fr: "Fais la tienne sur",
  en: "Get yours at",
} as const;

/** Where the CTA points. No locale segment — the site redirects to theirs. */
export const DP_SHARE_URL = `${SITE_URL}/dp-generator`;
export const DP_SHARE_LABEL = `${SITE_HOST}/dp-generator`;

export type ShareOutcome =
  "shared" | "copied" | "unavailable" | "imageCopied" | "copyUnsupported";

export function shareCaption(locale: "fr" | "en"): string {
  return [
    SHARE_CAPTIONS[locale],
    "",
    `${SHARE_CTA[locale]} ${DP_SHARE_LABEL}`,
    "",
    SHARE_HASHTAGS.join(" "),
  ].join("\n");
}

/** Can this browser put the actual image into a share sheet? */
export function canShareImage(blob?: Blob): boolean {
  if (typeof navigator === "undefined" || !navigator.share) return false;
  const probe = blob ?? new Blob([new Uint8Array([0])], { type: "image/png" });
  const file = new File([probe], "devfest.png", { type: "image/png" });
  try {
    return navigator.canShare?.({ files: [file] }) === true;
  } catch {
    return false;
  }
}

/**
 * The one-tap path. Returns what actually happened so the screen can say the
 * right thing — "shared" and "caption copied" are different confirmations.
 */
export async function shareDp(options: {
  blob: Blob;
  fileName: string;
  locale: "fr" | "en";
}): Promise<ShareOutcome> {
  const text = shareCaption(options.locale);
  const file = new File([options.blob], options.fileName, {
    type: "image/png",
  });

  // canShare must be asked about the actual file: some browsers expose
  // navigator.share but refuse file payloads.
  if (
    typeof navigator !== "undefined" &&
    navigator.canShare?.({ files: [file] }) &&
    navigator.share
  ) {
    try {
      await navigator.share({ files: [file], text });
      return "shared";
    } catch (err) {
      // The user dismissing the sheet is not a failure worth reporting.
      if ((err as Error)?.name === "AbortError") return "shared";
      // Anything else: fall through to the clipboard.
    }
  }

  return copyCaption(options.locale);
}

export async function copyCaption(locale: "fr" | "en"): Promise<ShareOutcome> {
  try {
    await navigator.clipboard.writeText(shareCaption(locale));
    return "copied";
  } catch {
    return "unavailable";
  }
}

/**
 * Put the card itself on the clipboard.
 *
 * `ClipboardItem` with `image/png` is what lets someone paste a picture
 * straight into a post, a chat or a document — no file to find afterwards.
 * Support is real but not universal (Firefox has historically refused image
 * writes), and it needs a secure context, so a refusal is reported rather
 * than swallowed: the download is right there and still works.
 *
 * The Blob is passed rather than a Promise of one. Some browsers want the
 * write to happen inside the user gesture, and awaiting the render first is
 * what would break that — the caller renders, then calls this.
 */
export async function copyImage(blob: Blob): Promise<ShareOutcome> {
  try {
    if (typeof ClipboardItem === "undefined" || !navigator.clipboard?.write) {
      return "copyUnsupported";
    }
    await navigator.clipboard.write([
      new ClipboardItem({ [blob.type || "image/png"]: blob }),
    ]);
    return "imageCopied";
  } catch {
    return "copyUnsupported";
  }
}

export const SHARE_NETWORKS = [
  "whatsapp",
  "x",
  "linkedin",
  "instagram",
] as const;
export type ShareNetwork = (typeof SHARE_NETWORKS)[number];

/**
 * The composer URL for a network, or `null` where the platform has none.
 *
 * Instagram is the `null`: it has no web post composer, so there is nothing
 * honest to open beyond the app itself. The UI treats that case differently
 * rather than opening a link that goes nowhere useful.
 *
 * LinkedIn takes a URL and ignores prefilled text — its `shareArticle` text
 * parameter was removed. That is why every fallback ALSO copies the caption:
 * on LinkedIn, pasting is the only way the words arrive.
 */
export function composerUrl(
  network: ShareNetwork,
  locale: "fr" | "en",
): string | null {
  const caption = shareCaption(locale);
  switch (network) {
    case "x":
      return `https://x.com/intent/post?text=${encodeURIComponent(caption)}`;
    case "whatsapp":
      return `https://wa.me/?text=${encodeURIComponent(caption)}`;
    case "linkedin":
      return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
        DP_SHARE_URL,
      )}`;
    case "instagram":
      return null;
  }
}

/** Saves the composed image locally. */
export function downloadDp(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Give the browser a tick to start the download before revoking.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
