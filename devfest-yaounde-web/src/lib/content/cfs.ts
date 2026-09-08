import type { CfsSettings } from "@/lib/admin/shape";

/**
 * What the speaker surfaces should show right now.
 *
 * - `lineup`   — there are speakers; show the grid.
 * - `open`     — no speakers yet and the call is running; invite submissions.
 * - `waiting`  — the call has not opened yet.
 * - `closed`   — the call has run and shut; submissions are done, no lineup.
 *
 * A pure function of three inputs, so every surface that has to make this
 * decision — the page, the home section, the banner, the admin — makes the
 * same one. It is also the only part of this feature worth testing, and it is
 * fully testable because `now` is an argument.
 */
export type CfsState = "lineup" | "open" | "waiting" | "closed";

export interface CfsView {
  state: CfsState;
  /** Where the submit button goes. Empty means there is nowhere to send them. */
  url: string;
  /** The instant the call shuts, for the countdown. Null = no deadline. */
  closesAt: string | null;
  opensAt: string | null;
}

function instant(value: string | null | undefined): number | null {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? null : ms;
}

export function cfsView(
  cfs: CfsSettings,
  speakerCount: number,
  now: Date = new Date(),
): CfsView {
  const url = cfs.url ?? "";
  const opensAt = cfs.opensAt ?? null;
  const closesAt = cfs.closesAt ?? null;
  const base = { url, opensAt, closesAt };

  /*
   * The override is checked FIRST and wins outright.
   *
   * It exists for the two cases the automatic rule cannot read: a lineup
   * announced before anyone has entered it, and a call reopened after the
   * first speaker was added. Both are real and both are brief, which is why
   * this is a manual switch rather than more inference.
   */
  if (cfs.override === "force-off") return { ...base, state: "lineup" };
  if (cfs.override === "force-on") {
    return { ...base, state: windowState(opensAt, closesAt, now) };
  }

  // Automatic: one published speaker is the announcement.
  if (speakerCount > 0) return { ...base, state: "lineup" };
  return { ...base, state: windowState(opensAt, closesAt, now) };
}

/**
 * Where `now` sits relative to the submission window.
 *
 * A missing bound means "no bound", not "closed" — a call with no end date is
 * simply open, and treating an unset field as a shut door would silently hide
 * the invitation the moment somebody cleared it in the dashboard.
 */
function windowState(
  opensAt: string | null,
  closesAt: string | null,
  now: Date,
): CfsState {
  const start = instant(opensAt);
  const end = instant(closesAt);
  const t = now.getTime();

  if (start !== null && t < start) return "waiting";
  if (end !== null && t >= end) return "closed";
  return "open";
}

/** Whether a submit button should be shown and pointed somewhere. */
export function cfsAcceptsSubmissions(view: CfsView): boolean {
  return view.state === "open" && view.url.trim().length > 0;
}
