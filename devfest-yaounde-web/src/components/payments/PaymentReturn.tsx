"use client";

import { CheckCircle, Clock, Warning, XCircle } from "@phosphor-icons/react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { ConfettiBurst } from "@/components/global/ConfettiBurst";
import { Button } from "@/components/ui/Button";
import { BadgeCode } from "@/components/tickets/BadgeCode";

/**
 * How long to keep asking, and how often.
 *
 * The old schedule was a flat 4s for two minutes. Two minutes is not long
 * enough: Mobile Money settlement in Cameroon routinely takes longer than
 * that — the buyer confirms on a USSD prompt, the operator reports back when
 * it reports back — and the reconcile sweep only runs every five minutes. So
 * a real payment regularly landed AFTER the page had stopped looking, and the
 * confirmation only appeared on a reload, ten minutes later.
 *
 * Now it watches for a quarter of an hour, backing off as hope fades: fast
 * while the answer is most likely imminent, slow enough afterwards that a
 * forgotten tab is not hammering PawaPay. Well inside the 120-per-5-minutes
 * budget of `RATE_LIMITS.paymentStatus` at every stage.
 */
const POLL_SCHEDULE = [
  { untilMs: 60_000, everyMs: 4_000 },
  { untilMs: 300_000, everyMs: 8_000 },
  { untilMs: 900_000, everyMs: 20_000 },
] as const;

const GIVE_UP_MS = POLL_SCHEDULE[POLL_SCHEDULE.length - 1].untilMs;

function nextDelay(elapsedMs: number): number {
  for (const step of POLL_SCHEDULE) {
    if (elapsedMs < step.untilMs) return step.everyMs;
  }
  return POLL_SCHEDULE[POLL_SCHEDULE.length - 1].everyMs;
}

type Status =
  | "pending"
  | "activated"
  | "failed"
  | "amount_mismatch"
  | "awaiting_payment"
  | "not_found";

interface StatusResponse {
  status?: Status;
  providerStatus?: string;
  charged?: number;
  currency?: string;
  kind?: "tickets" | "shop";
  error?: string;
}

/**
 * The shape `/api/account/tickets` returns. It changed to camelCase when the
 * endpoint started joining on the tier and the money (ADR 0036) and this
 * screen was not updated with it — so the badge code, the one thing that gets
 * somebody through the door, silently rendered blank on the confirmation.
 */
interface Ticket {
  id: string;
  attendeeName: string;
  badgeCode: string;
  tier: { name: string };
}

export interface PaymentReturnProps {
  depositId: string | null;
  /**
   * Whether the server can actually send email. Read from the environment by
   * the page, because the browser cannot know — and per the G3 decision the
   * UI must never promise a receipt that will not arrive.
   */
  emailConfigured: boolean;
}

/**
 * The waiting room people land in after paying — `/{locale}/payments/return`.
 *
 * THIS PAGE DOES REAL WORK. Settlement is by polling (ADR 0019): the status
 * endpoint re-asks PawaPay and issues the tickets itself, so this poll is what
 * turns a payment into a ticket, not merely a view of one. Closing the tab is
 * still safe — a sweep runs every five minutes — but keeping it open is what
 * makes confirmation feel instant.
 *
 * It also never trusts the redirect. Arriving here proves only that a browser
 * was sent here; the tab can be closed, or reopened by someone else entirely.
 * The status endpoint is the only source of truth, and it scopes every intent
 * to the signed-in person server-side.
 */
export function PaymentReturn({
  depositId,
  emailConfigured,
}: PaymentReturnProps) {
  const t = useTranslations("pages.paymentReturn");
  const tp = useTranslations("errors.payment");
  const locale = useLocale();

  const [status, setStatus] = useState<Status>("pending");
  const [detail, setDetail] = useState<StatusResponse | null>(null);
  const [gaveUp, setGaveUp] = useState(false);
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!depositId) return;

    let cancelled = false;
    const startedAt = Date.now();

    async function poll() {
      if (cancelled) return;
      try {
        const res = await fetch(
          `/api/payments/status?depositId=${encodeURIComponent(depositId!)}`,
          { cache: "no-store" },
        );
        const body: StatusResponse = await res.json();
        if (cancelled) return;

        if (res.status === 404) {
          setStatus("not_found");
          return;
        }
        // 401/429 are transient from the page's point of view: keep waiting
        // rather than declaring a failure that did not happen.
        if (res.ok && body.status) {
          setDetail(body);
          if (body.status !== "pending") {
            setStatus(body.status);
            return;
          }
        }
      } catch {
        // Network blip. The next tick retries; a dropped request is not a
        // failed payment and must never be shown as one.
      }

      const elapsed = Date.now() - startedAt;
      if (elapsed > GIVE_UP_MS) {
        setGaveUp(true);
        return;
      }
      timerRef.current = window.setTimeout(poll, nextDelay(elapsed));
    }

    poll();
    return () => {
      cancelled = true;
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, [depositId]);

  // Once activated, fetch the ticket so the badge code is on screen. It is the
  // source of truth for getting in — email may not be configured at all.
  useEffect(() => {
    if (status !== "activated" || detail?.kind === "shop") return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/account/tickets", { cache: "no-store" });
        if (!res.ok) return;
        const body = await res.json();
        if (!cancelled) setTickets(body.tickets ?? []);
      } catch {
        // Non-fatal: /account shows the same list.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [status, detail?.kind]);

  if (!depositId) {
    return (
      <Shell
        tone="error"
        icon={<XCircle size={40} weight="fill" />}
        title={t("missingTitle")}
      >
        <p className="text-body-l text-black02/80">{t("missingBody")}</p>
        <Button href="/tickets" size="md">
          {t("backToTickets")}
        </Button>
      </Shell>
    );
  }

  if (status === "activated") {
    const amount =
      detail?.charged != null
        ? new Intl.NumberFormat(locale === "fr" ? "fr-CM" : "en-CM").format(
            detail.charged,
          )
        : null;
    return (
      <Shell
        tone="success"
        icon={<CheckCircle size={40} weight="fill" />}
        title={t("successTitle")}
        confetti
      >
        <p className="text-body-l text-black02/80">{tp("activated")}</p>
        {amount && (
          <p className="font-mono text-mono-tag font-bold uppercase tracking-wide text-black02/60">
            {t("charged", { amount, currency: detail?.currency ?? "XAF" })}
          </p>
        )}

        {tickets && tickets.length > 0 && (
          <div className="w-full rounded-lg border-2 border-black02 bg-offwhite p-6">
            <p className="font-mono text-mono-tag font-bold uppercase tracking-wide text-black02/55">
              {t("badgeLabel")}
            </p>
            <ul className="mt-4 flex flex-col gap-6">
              {tickets.slice(0, 5).map((ticket) => (
                <li key={ticket.id} className="flex flex-col gap-2">
                  <span className="text-body-m text-black02/70">
                    {ticket.attendeeName}
                    <span className="ml-2 font-mono text-caption uppercase tracking-wide text-black02/55">
                      {ticket.tier?.name}
                    </span>
                  </span>
                  <BadgeCode code={ticket.badgeCode} label={t("scanAtDoor")} />
                </li>
              ))}
            </ul>
            <p className="mt-4 text-caption text-black02/60">
              {t("badgeHint")}
            </p>
          </div>
        )}

        <p className="text-body-m text-black02/70">
          {emailConfigured ? t("emailSent") : t("noEmail")}
        </p>
        <div className="flex flex-wrap gap-3">
          <Button href="/account" size="md">
            {t("viewAccount")}
          </Button>
        </div>
      </Shell>
    );
  }

  // Distinct from `failed` on purpose. PawaPay has no record of a deposit,
  // which means nothing was charged — but the intent is still claimable, so
  // this must not be dressed up as a failure. Someone slow at typing a PIN
  // reloads and lands on the confirmation.
  if (status === "awaiting_payment") {
    return (
      <Shell
        tone="waiting"
        icon={<Warning size={40} weight="fill" />}
        title={t("awaitingTitle")}
      >
        <p className="text-body-l text-black02/80">{t("awaitingBody")}</p>
        <div className="flex flex-wrap gap-3">
          <Button href="/tickets" size="md">
            {t("tryAgain")}
          </Button>
          <Button
            href={`/payments/return?depositId=${encodeURIComponent(depositId ?? "")}`}
            size="md"
            variant="secondary"
          >
            {t("refresh")}
          </Button>
        </div>
      </Shell>
    );
  }

  if (status === "failed") {
    return (
      <Shell
        tone="error"
        icon={<XCircle size={40} weight="fill" />}
        title={t("failedTitle")}
      >
        <p className="text-body-l text-black02/80">{tp("failed")}</p>
        <Button href="/tickets" size="md">
          {t("tryAgain")}
        </Button>
      </Shell>
    );
  }

  if (status === "amount_mismatch") {
    return (
      <Shell
        tone="warning"
        icon={<Warning size={40} weight="fill" />}
        title={t("mismatchTitle")}
      >
        {/* No retry offered on purpose: money moved, and a second attempt
            would charge again. This needs a human, per the guide. */}
        <p className="text-body-l text-black02/80">{tp("amount_mismatch")}</p>
        <Button href="/account" size="md">
          {t("viewAccount")}
        </Button>
      </Shell>
    );
  }

  if (status === "not_found") {
    return (
      <Shell
        tone="error"
        icon={<XCircle size={40} weight="fill" />}
        title={t("notFoundTitle")}
      >
        <p className="text-body-l text-black02/80">{tp("not_found")}</p>
        <Button href="/account" size="md">
          {t("viewAccount")}
        </Button>
      </Shell>
    );
  }

  // Still pending.
  //
  // The icon has to change once we stop looking. It used to keep spinning
  // after the page had given up, so "still checking" and "no longer checking"
  // were visually identical — a spinner that turns forever, which is exactly
  // what it looked like: a payment taking ten minutes to verify when in fact
  // nothing had been watching it for eight of them.
  return (
    <Shell
      tone={gaveUp ? "warning" : "waiting"}
      icon={
        gaveUp ? (
          <Clock size={40} weight="fill" />
        ) : (
          <span className="payment-spinner" aria-hidden />
        )
      }
      title={gaveUp ? t("slowTitle") : t("waitingTitle")}
    >
      <p className="text-body-l text-black02/80">
        {gaveUp
          ? emailConfigured
            ? t("slowEmail")
            : t("slowNoEmail")
          : tp("pending")}
      </p>
      {!gaveUp && (
        <p className="text-body-m text-black02/70">{t("waitingHint")}</p>
      )}
      {/* Announced once, not on every poll — an aria-live region that updated
          every four seconds would talk over everything else. */}
      <p className="sr-only" role="status">
        {tp("pending")}
      </p>
      {gaveUp && (
        <div className="flex flex-wrap gap-3">
          <Button
            href={`/payments/return?depositId=${encodeURIComponent(depositId)}`}
            size="md"
          >
            {t("refresh")}
          </Button>
          <Button href="/account" size="md" variant="secondary">
            {t("viewAccount")}
          </Button>
        </div>
      )}
    </Shell>
  );
}

function Shell({
  tone,
  icon,
  title,
  confetti = false,
  children,
}: {
  tone: "success" | "error" | "warning" | "waiting";
  icon: React.ReactNode;
  title: string;
  confetti?: boolean;
  children: React.ReactNode;
}) {
  const toneClass =
    tone === "success"
      ? "bg-success text-offwhite"
      : tone === "error"
        ? "bg-danger text-offwhite"
        : tone === "warning"
          ? "bg-primary text-black02"
          : "bg-offwhite text-black02";

  return (
    <div className="mx-auto flex max-w-xl flex-col items-start gap-5">
      <div
        className={`relative flex h-20 w-20 items-center justify-center rounded-pill border-2 border-black02 ${toneClass}`}
      >
        {icon}
        {confetti && <ConfettiBurst />}
      </div>
      <h1 className="font-sans text-display-l font-bold leading-tight text-black02">
        {title}
      </h1>
      {children}
    </div>
  );
}
