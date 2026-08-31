/**
 * DP generator — sharing.
 *
 * Web Share API with a file when the browser supports it (that is the one-tap
 * share sheet on mobile), and a copy-to-clipboard fallback on desktop, per
 * PAGES.md §9.
 *
 * Captions are bilingual because they are user-facing copy — the i18n rule
 * covers share text explicitly.
 */

export const SHARE_HASHTAGS = ["#DevFestYaounde", "#GDGYaounde", "#DevFest"];

export const SHARE_CAPTIONS = {
  fr: "Je serai au DevFest Yaoundé. On s'y retrouve ?",
  en: "I'll be at DevFest Yaoundé. See you there?",
} as const;

export type ShareOutcome = "shared" | "copied" | "unavailable";

export function shareCaption(locale: "fr" | "en", eventUrl: string): string {
  return `${SHARE_CAPTIONS[locale]}\n\n${SHARE_HASHTAGS.join(" ")}\n${eventUrl}`;
}

/**
 * Tries the share sheet, falls back to the clipboard.
 *
 * Returns what actually happened so the screen can say the right thing —
 * "shared" and "link copied" are different confirmations.
 */
export async function shareDp(options: {
  blob: Blob;
  fileName: string;
  locale: "fr" | "en";
  eventUrl: string;
}): Promise<ShareOutcome> {
  const text = shareCaption(options.locale, options.eventUrl);
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

  try {
    await navigator.clipboard.writeText(text);
    return "copied";
  } catch {
    return "unavailable";
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
