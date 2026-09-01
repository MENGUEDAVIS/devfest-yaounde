"use client";

import {
  ArrowLeft,
  ArrowRight,
  Check,
  DeviceMobile,
  Minus,
  Plus,
  Warning,
} from "@phosphor-icons/react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  CheckoutError,
  checkoutTickets,
  nextStepAfterCheckout,
  type AttendeeInput,
} from "@/lib/checkout-client";
import { signInWithGoogle, useSession } from "@/lib/use-session";
import type { TicketTier } from "@/data/types";

const APPAREL_SIZES = ["XS", "S", "M", "L", "XL", "XXL"] as const;
/** The server caps an order at 10 attendees; stop them at the same number. */
const MAX_TICKETS = 10;

type Step = "select" | "details" | "discount" | "payment";
const STEPS: Step[] = ["select", "details", "discount", "payment"];

interface AttendeeDraft {
  tierId: string;
  name: string;
  email: string;
  apparelSize: string;
}

export function TicketCheckout({ tiers }: { tiers: TicketTier[] }) {
  const t = useTranslations("pages.tickets");
  const te = useTranslations("errors.checkout");
  const locale = useLocale();
  const { profile, loading: sessionLoading } = useSession();

  const onSale = useMemo(() => tiers.filter((tier) => tier.onSale), [tiers]);

  const [step, setStep] = useState<Step>("select");
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [attendees, setAttendees] = useState<AttendeeDraft[]>([]);
  const [discountCode, setDiscountCode] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<CheckoutError | null>(null);
  const [invalidIndex, setInvalidIndex] = useState<number | null>(null);

  const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
  const subtotal = onSale.reduce(
    (sum, tier) => sum + tier.priceXAF * (counts[tier.id] ?? 0),
    0,
  );
  const isFree = subtotal === 0;

  const money = (value: number) =>
    new Intl.NumberFormat(locale === "fr" ? "fr-CM" : "en-CM").format(value);

  function setCount(tierId: string, next: number) {
    const clamped = Math.max(0, Math.min(next, MAX_TICKETS));
    setCounts((prev) => {
      const updated = { ...prev, [tierId]: clamped };
      if (clamped === 0) delete updated[tierId];
      return updated;
    });
  }

  /**
   * The attendee LIST is the quantity — three Sonnet entries means three
   * Sonnet tickets. Building it from the counts here keeps that invariant in
   * one place instead of asking every later step to remember it.
   */
  function buildAttendees(): AttendeeDraft[] {
    const built: AttendeeDraft[] = [];
    for (const tier of onSale) {
      for (let i = 0; i < (counts[tier.id] ?? 0); i++) {
        // Carry over anything already typed for this slot.
        const existing = attendees.filter((a) => a.tierId === tier.id)[i];
        built.push(
          existing ?? { tierId: tier.id, name: "", email: "", apparelSize: "" },
        );
      }
    }
    return built;
  }

  function tierOf(id: string) {
    return onSale.find((tier) => tier.id === id);
  }

  const detailsComplete = attendees.every((a) => {
    if (a.name.trim().length < 2 || !a.email.includes("@")) return false;
    if (tierOf(a.tierId)?.includesApparel && !a.apparelSize) return false;
    return true;
  });

  function goNext() {
    setError(null);
    if (step === "select") {
      setAttendees(buildAttendees());
      setStep("details");
      return;
    }
    const i = STEPS.indexOf(step);
    setStep(STEPS[Math.min(i + 1, STEPS.length - 1)]);
  }

  function goBack() {
    setError(null);
    const i = STEPS.indexOf(step);
    setStep(STEPS[Math.max(i - 1, 0)]);
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    setInvalidIndex(null);
    try {
      const payload: AttendeeInput[] = attendees.map((a) => ({
        tierId: a.tierId,
        name: a.name.trim(),
        email: a.email.trim(),
        ...(a.apparelSize ? { apparelSize: a.apparelSize } : {}),
      }));
      const result = await checkoutTickets({
        attendees: payload,
        ...(discountCode.trim() ? { discountCode: discountCode.trim() } : {}),
        contact: {
          email: profile?.email ?? attendees[0]?.email ?? "",
          ...(phone.trim() ? { phone: phone.trim() } : {}),
        },
        locale,
      });
      // A full navigation, not a router push: the paid branch leaves the app
      // entirely for PawaPay's hosted page.
      window.location.assign(nextStepAfterCheckout(result, locale));
    } catch (err) {
      const e =
        err instanceof CheckoutError
          ? err
          : new CheckoutError("server_error", 500);
      setError(e);
      // Point at the attendee that needs fixing rather than making them hunt.
      if (e.code === "apparel_size_required") {
        setInvalidIndex(
          attendees.findIndex(
            (a) => tierOf(a.tierId)?.includesApparel && !a.apparelSize,
          ),
        );
        setStep("details");
      }
      if (
        e.code === "discount_invalid" ||
        e.code === "discount_expired" ||
        e.code === "discount_exhausted"
      ) {
        // Keep the basket, clear only the code — the guide is explicit.
        setDiscountCode("");
        setStep("discount");
      }
      if (e.code === "tier_sold_out" || e.code === "tier_not_on_sale")
        setStep("select");
      setSubmitting(false);
    }
  }

  const stepIndex = STEPS.indexOf(step);

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-14">
      <div>
        {/* Progress. Text, not colour alone. */}
        <ol className="mb-10 flex flex-wrap items-center gap-x-3 gap-y-2">
          {STEPS.map((s, i) => (
            <li key={s} className="flex items-center gap-3">
              <span
                aria-current={s === step ? "step" : undefined}
                className={`flex items-center gap-2 font-mono text-mono-tag font-bold uppercase tracking-wide ${
                  i <= stepIndex ? "text-black02" : "text-black02/40"
                }`}
              >
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-pill border-2 border-black02 text-caption ${
                    i < stepIndex
                      ? "bg-black02 text-offwhite"
                      : i === stepIndex
                        ? "bg-primary text-black02"
                        : "bg-transparent text-black02/40"
                  }`}
                >
                  {i < stepIndex ? <Check size={12} weight="bold" /> : i + 1}
                </span>
                {t(`steps.${s}`)}
              </span>
              {i < STEPS.length - 1 && (
                <span aria-hidden className="text-black02/25">
                  /
                </span>
              )}
            </li>
          ))}
        </ol>

        {error && (
          <div
            role="alert"
            className="mb-8 flex items-start gap-3 rounded-lg border-2 border-danger bg-danger-pastel px-5 py-4"
          >
            <Warning
              size={20}
              weight="fill"
              className="mt-0.5 shrink-0 text-danger"
            />
            <div>
              <p className="text-body-m font-bold text-black02">
                {te(error.code as never)}
              </p>
              {error.retryAfter != null && (
                <p className="mt-1 text-body-m text-black02/75">
                  {t("retryIn", { seconds: error.retryAfter })}
                </p>
              )}
            </div>
          </div>
        )}

        {step === "select" && (
          <div className="flex flex-col gap-6">
            {onSale.map((tier) => {
              const count = counts[tier.id] ?? 0;
              return (
                <article
                  key={tier.id}
                  className={`rounded-lg border-2 border-black02 bg-offwhite p-6 transition-shadow sm:p-7 ${
                    count > 0 ? "shadow-[0_6px_0_0_var(--color-black02)]" : ""
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <Badge tone="primary" variant="outline">
                          {tier.name}
                        </Badge>
                        {tier.includesApparel && (
                          <Badge tone="blue">{t("includesApparel")}</Badge>
                        )}
                      </div>
                      <p className="mt-4 font-sans text-display-l font-bold leading-none text-black02">
                        {tier.priceXAF === 0
                          ? t("free")
                          : `${money(tier.priceXAF)} XAF`}
                      </p>
                      <p className="mt-3 max-w-prose text-body-m text-black02/75">
                        {tier.description[locale as "fr" | "en"]}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setCount(tier.id, count - 1)}
                        disabled={count === 0}
                        aria-label={t("removeOne", { tier: tier.name })}
                        className="flex h-11 w-11 items-center justify-center rounded-pill border-2 border-black02 text-black02 transition-colors hover:bg-pastel disabled:opacity-30"
                      >
                        <Minus size={16} weight="bold" />
                      </button>
                      <span
                        aria-live="polite"
                        className="w-8 text-center font-mono text-heading-m font-bold text-black02"
                      >
                        {count}
                      </span>
                      <button
                        type="button"
                        onClick={() => setCount(tier.id, count + 1)}
                        disabled={total >= MAX_TICKETS}
                        aria-label={t("addOne", { tier: tier.name })}
                        className="flex h-11 w-11 items-center justify-center rounded-pill border-2 border-black02 text-black02 transition-colors hover:bg-pastel disabled:opacity-30"
                      >
                        <Plus size={16} weight="bold" />
                      </button>
                    </div>
                  </div>

                  <ul className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {tier.perks.map((perk, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <Check
                          size={16}
                          weight="bold"
                          className="mt-1 shrink-0 text-black02"
                        />
                        <span className="text-body-m text-black02/80">
                          {perk[locale as "fr" | "en"]}
                        </span>
                      </li>
                    ))}
                  </ul>
                </article>
              );
            })}
            {total >= MAX_TICKETS && (
              <p className="text-body-m text-black02/70">
                {t("maxReached", { max: MAX_TICKETS })}
              </p>
            )}
          </div>
        )}

        {step === "details" && (
          <div className="flex flex-col gap-6">
            <p className="text-body-l text-black02/80">{t("detailsIntro")}</p>
            {attendees.map((a, i) => {
              const tier = tierOf(a.tierId);
              return (
                <fieldset
                  key={i}
                  className={`rounded-lg border-2 bg-offwhite p-6 ${
                    invalidIndex === i ? "border-danger" : "border-black02"
                  }`}
                >
                  <legend className="flex items-center gap-3 px-2">
                    <span className="font-mono text-mono-tag font-bold uppercase tracking-wide text-black02">
                      {t("ticketOfN", {
                        current: i + 1,
                        total: attendees.length,
                      })}
                    </span>
                    <Badge tone="primary" variant="outline">
                      {tier?.name}
                    </Badge>
                  </legend>

                  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <label className="flex flex-col gap-1.5">
                      <span className="text-body-m font-bold text-black02">
                        {t("attendeeName")}
                      </span>
                      <input
                        value={a.name}
                        onChange={(e) =>
                          setAttendees((prev) =>
                            prev.map((x, j) =>
                              j === i ? { ...x, name: e.target.value } : x,
                            ),
                          )
                        }
                        maxLength={80}
                        required
                        className="rounded-lg border-2 border-black02 bg-offwhite px-4 py-2.5 text-body-m text-black02"
                      />
                    </label>
                    <label className="flex flex-col gap-1.5">
                      <span className="text-body-m font-bold text-black02">
                        {t("attendeeEmail")}
                      </span>
                      <input
                        type="email"
                        value={a.email}
                        onChange={(e) =>
                          setAttendees((prev) =>
                            prev.map((x, j) =>
                              j === i ? { ...x, email: e.target.value } : x,
                            ),
                          )
                        }
                        required
                        className="rounded-lg border-2 border-black02 bg-offwhite px-4 py-2.5 text-body-m text-black02"
                      />
                    </label>
                  </div>

                  {/* Only tiers that actually include apparel ask for a size —
                      the server rejects the order without one. */}
                  {tier?.includesApparel && (
                    <div className="mt-4">
                      <p className="text-body-m font-bold text-black02">
                        {t("apparelSize")}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {APPAREL_SIZES.map((size) => (
                          <button
                            key={size}
                            type="button"
                            onClick={() =>
                              setAttendees((prev) =>
                                prev.map((x, j) =>
                                  j === i ? { ...x, apparelSize: size } : x,
                                ),
                              )
                            }
                            aria-pressed={a.apparelSize === size}
                            className={`rounded-pill border-2 border-black02 px-4 py-2 font-mono text-mono-tag font-bold transition-colors ${
                              a.apparelSize === size
                                ? "bg-primary text-black02"
                                : "bg-transparent text-black02/70 hover:bg-pastel"
                            }`}
                          >
                            {size}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {i === 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        setAttendees((prev) =>
                          prev.map((x, j) =>
                            j === 0
                              ? {
                                  ...x,
                                  name: profile?.displayName ?? x.name,
                                  email: profile?.email ?? x.email,
                                }
                              : x,
                          ),
                        )
                      }
                      disabled={!profile}
                      className="mt-4 font-mono text-mono-tag font-bold uppercase tracking-wide text-black02 underline decoration-2 underline-offset-4 disabled:opacity-40"
                    >
                      {t("thisIsMe")}
                    </button>
                  )}
                </fieldset>
              );
            })}
          </div>
        )}

        {step === "discount" && (
          <div className="flex max-w-md flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-body-m font-bold text-black02">
                {t("discountLabel")}
              </span>
              <input
                value={discountCode}
                onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                placeholder="GDG-2026"
                maxLength={32}
                className="rounded-lg border-2 border-black02 bg-offwhite px-4 py-2.5 font-mono text-body-m uppercase tracking-wide text-black02"
              />
            </label>
            {/* No "check code" button on purpose: a validation endpoint would
                be a free oracle for guessing codes. It is applied when the
                order is placed, and the server's verdict is what shows. */}
            <p className="text-body-m text-black02/70">{t("discountHint")}</p>
          </div>
        )}

        {step === "payment" && (
          <div className="flex max-w-md flex-col gap-6">
            {isFree ? (
              <div className="rounded-lg border-2 border-black02 bg-pastel p-6">
                <p className="text-body-l font-bold text-black02">
                  {t("freeTitle")}
                </p>
                <p className="mt-2 text-body-m text-black02/80">
                  {t("freeBody")}
                </p>
              </div>
            ) : (
              <>
                {/* Mobile Money only. Card is NOT offered — the integration
                    does not support it, and a disabled button would read as a
                    bug on someone's phone rather than a decision. See
                    docs/backend/GAPS.md G1. */}
                <div className="flex items-start gap-3 rounded-lg border-2 border-black02 bg-offwhite p-5">
                  <DeviceMobile
                    size={22}
                    weight="bold"
                    className="mt-0.5 shrink-0 text-black02"
                  />
                  <div>
                    <p className="text-body-m font-bold text-black02">
                      {t("momoTitle")}
                    </p>
                    <p className="mt-1 text-body-m text-black02/75">
                      {t("momoBody")}
                    </p>
                  </div>
                </div>
                <label className="flex flex-col gap-1.5">
                  <span className="text-body-m font-bold text-black02">
                    {t("phoneLabel")}
                  </span>
                  <input
                    value={phone}
                    onChange={(e) =>
                      setPhone(e.target.value.replace(/[^0-9]/g, ""))
                    }
                    placeholder="237690000000"
                    inputMode="numeric"
                    className="rounded-lg border-2 border-black02 bg-offwhite px-4 py-2.5 font-mono text-body-m text-black02"
                  />
                  <span className="text-caption text-black02/60">
                    {t("phoneHint")}
                  </span>
                </label>
              </>
            )}

            {!sessionLoading && !profile && (
              <div className="rounded-lg border-2 border-black02 bg-pastel p-5">
                <p className="text-body-m font-bold text-black02">
                  {t("signInRequired")}
                </p>
                <button
                  type="button"
                  onClick={() => signInWithGoogle(locale, `/${locale}/tickets`)}
                  className="mt-4 inline-flex items-center gap-2 rounded-pill border-2 border-black02 bg-offwhite px-5 py-2.5 font-sans text-body-m font-bold text-black02 shadow-[0_4px_0_0_var(--color-black02)]"
                >
                  {t("continueWithGoogle")}
                </button>
              </div>
            )}
          </div>
        )}

        <div className="mt-10 flex flex-wrap items-center gap-3">
          {step !== "select" && (
            <button
              type="button"
              onClick={goBack}
              className="inline-flex items-center gap-2 rounded-pill border-2 border-black02 px-5 py-2.5 font-sans text-body-m font-bold text-black02 transition-colors hover:bg-pastel"
            >
              <ArrowLeft size={16} weight="bold" />
              {t("back")}
            </button>
          )}
          {step !== "payment" ? (
            <Button
              size="md"
              onClick={goNext}
              disabled={
                (step === "select" && total === 0) ||
                (step === "details" && !detailsComplete)
              }
            >
              {t("next")}
              <ArrowRight size={16} weight="bold" />
            </Button>
          ) : (
            <Button
              size="md"
              onClick={submit}
              disabled={submitting || !profile}
            >
              {submitting ? t("working") : isFree ? t("claim") : t("payNow")}
              <ArrowRight size={16} weight="bold" />
            </Button>
          )}
        </div>
      </div>

      {/* ---- Order summary, sticky through every step ---- */}
      <aside className="lg:sticky lg:top-40 lg:self-start">
        <div className="rounded-lg border-2 border-black02 bg-offwhite p-6">
          <h2 className="font-sans text-heading-m font-bold text-black02">
            {t("summary")}
          </h2>
          {total === 0 ? (
            <p className="mt-4 text-body-m text-black02/70">
              {t("summaryEmpty")}
            </p>
          ) : (
            <>
              <ul className="mt-4 flex flex-col gap-3">
                {onSale
                  .filter((tier) => (counts[tier.id] ?? 0) > 0)
                  .map((tier) => (
                    <li
                      key={tier.id}
                      className="flex items-baseline justify-between gap-4"
                    >
                      <span className="text-body-m text-black02">
                        {tier.name} × {counts[tier.id]}
                      </span>
                      <span className="font-mono text-body-m font-bold text-black02">
                        {tier.priceXAF === 0
                          ? t("free")
                          : `${money(tier.priceXAF * (counts[tier.id] ?? 0))}`}
                      </span>
                    </li>
                  ))}
              </ul>
              <div className="mt-5 flex items-baseline justify-between gap-4 border-t-2 border-black02/15 pt-4">
                <span className="font-sans text-body-l font-bold text-black02">
                  {t("total")}
                </span>
                <span className="font-mono text-heading-m font-bold text-black02">
                  {isFree ? t("free") : `${money(subtotal)} XAF`}
                </span>
              </div>
              {/* The server recomputes every total from the catalog, so this
                  is an estimate until the order comes back with its quote. */}
              <p className="mt-3 text-caption text-black02/60">
                {t("totalNote")}
              </p>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
