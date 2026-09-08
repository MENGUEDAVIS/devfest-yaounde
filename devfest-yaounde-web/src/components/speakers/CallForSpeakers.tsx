import { ArrowUpRight, Microphone } from "@phosphor-icons/react/dist/ssr";
import { getTranslations } from "next-intl/server";
import { Reveal } from "@/components/ui/Reveal";
import { cfsAcceptsSubmissions, type CfsView } from "@/lib/content/cfs";
import { CfsCountdown } from "./CfsCountdown";

/**
 * What stands where the speaker lineup will be.
 *
 * One component for both surfaces — the home section and `/speakers` — with a
 * `compact` flag for the home one. The alternative was two invitations that
 * would drift, and the copy here is the ask that fills the lineup, so it
 * should read the same wherever somebody meets it.
 *
 * It is a server component: the state is decided on the server from the
 * store, so the right thing is in the HTML rather than appearing after
 * hydration. Only the countdown is a client island, because only the
 * countdown depends on what time it is.
 */
export async function CallForSpeakers({
  view,
  compact = false,
}: {
  view: CfsView;
  compact?: boolean;
}) {
  const t = await getTranslations("cfs");
  const open = cfsAcceptsSubmissions(view);

  const heading =
    view.state === "closed"
      ? t("closedTitle")
      : view.state === "waiting"
        ? t("waitingTitle")
        : t("openTitle");

  const body =
    view.state === "closed"
      ? t("closedBody")
      : view.state === "waiting"
        ? t("waitingBody")
        : t("openBody");

  return (
    <Reveal>
      <div
        className={`rounded-lg border-2 border-black02 bg-offwhite shadow-[0_6px_0_0_var(--color-black02)] ${
          compact ? "p-6 sm:p-8" : "p-7 sm:p-10"
        }`}
      >
        <span className="inline-flex items-center gap-2 rounded-pill border-2 border-black02 bg-primary px-3 py-1 font-mono text-mono-tag font-bold uppercase tracking-wide text-black02">
          <Microphone size={14} weight="bold" aria-hidden />
          {t("eyebrow")}
        </span>

        <h3
          className={`mt-5 font-sans font-bold leading-[0.95] text-black02 ${
            compact ? "text-display-l" : "text-display-xl"
          }`}
        >
          {heading}
        </h3>

        <p className="mt-4 max-w-2xl text-body-l text-black02/80">{body}</p>

        <div className="mt-7 flex flex-wrap items-end gap-x-8 gap-y-5">
          {open && (
            <a
              href={view.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-pill border-2 border-black02 bg-primary px-7 py-3.5 font-sans text-body-l font-bold text-black02 shadow-[0_4px_0_0_var(--color-black02)] transition-transform duration-200 ease-bouncy hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none motion-reduce:transform-none"
            >
              {t("cta")}
              <ArrowUpRight size={18} weight="bold" aria-hidden />
            </a>
          )}

          {/*
            The countdown only appears while there is something to count down
            TO. Past the deadline it would be counting up, and before the call
            opens it would be counting to the wrong instant.
          */}
          {view.state === "open" && view.closesAt && (
            <CfsCountdown closesAt={view.closesAt} />
          )}
        </div>

        {view.state === "open" && view.closesAt && (
          <p className="mt-5 text-caption text-black02/60">
            {t("deadline", { date: formatDeadline(view.closesAt) })}
          </p>
        )}
      </div>
    </Reveal>
  );
}

/**
 * The deadline in words, rendered on the SERVER.
 *
 * This is what a crawler, a reader with JavaScript off and the first paint
 * all see — the countdown beside it cannot be any of those things honestly,
 * so the real information lives here and the ticking version is decoration.
 *
 * Fixed to Africa/Douala rather than the reader's zone: the deadline is a
 * moment in the organisers' day, and someone reading in another country
 * needs to know when it shuts there, not when that happens to be locally.
 */
function formatDeadline(iso: string): string {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return "";
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Africa/Douala",
  }).format(new Date(ms));
}
