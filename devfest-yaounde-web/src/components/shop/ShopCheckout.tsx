"use client";

import {
  ArrowLeft,
  ArrowRight,
  Package,
  ShoppingBag,
  Trash,
  Warning,
} from "@phosphor-icons/react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { CheckoutSteps } from "@/components/checkout/CheckoutSteps";
import {
  OrderSummary,
  type SummaryLine,
} from "@/components/checkout/OrderSummary";
import { PaymentStep } from "@/components/checkout/PaymentStep";
import { Button } from "@/components/ui/Button";
import { Link } from "@/i18n/navigation";
import {
  CheckoutError,
  checkoutShop,
  nextStepAfterCheckout,
} from "@/lib/checkout-client";
import { MAX_LINE_QTY, useCart } from "@/lib/use-cart";
import { useSession } from "@/lib/use-session";
import { ProductImage } from "./ProductImage";
import { BUYABLE } from "./StatusPill";
import type { Product, ProductStatus } from "@/data/types";

type Step = "bag" | "payment";
const STEPS = [
  { key: "bag", label: "bag" },
  { key: "payment", label: "payment" },
];

/**
 * `/shop/cart` — the bag and its checkout.
 *
 * THIS IS PART A'S CHECKOUT, not a second one. The step chrome, the sticky
 * order summary with the inline discount field, and the whole payment step —
 * Mobile Money only, the phone field, the refund acknowledgment that gates
 * the pay button — are the shared components under `components/checkout/`.
 * What differs is genuinely different: line items are products with variants
 * rather than attendees with names, so this file owns the bag editing and
 * nothing else.
 *
 * Fewer steps than tickets, deliberately: a bag needs no per-person details,
 * so inventing an equivalent middle step would be ceremony.
 */
export function ShopCheckout({ products }: { products: Product[] }) {
  const t = useTranslations("pages.shop");
  const tt = useTranslations("pages.tickets");
  const te = useTranslations("errors.checkout");
  const locale = useLocale();
  const { profile, loading: sessionLoading } = useSession();
  const { lines, setQuantity, remove, count } = useCart();

  const [step, setStep] = useState<Step>("bag");
  const [discountCode, setDiscountCode] = useState("");
  const [discountOpen, setDiscountOpen] = useState(false);
  const [discountApplied, setDiscountApplied] = useState(false);
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<CheckoutError | null>(null);

  const productOf = (id: string) => products.find((p) => p.id === id);
  const money = (v: number) =>
    new Intl.NumberFormat(locale === "fr" ? "fr-CM" : "en-CM").format(v);

  const subtotal = lines.reduce((sum, line) => {
    const p = productOf(line.productId);
    return sum + (p ? p.priceXAF * line.quantity : 0);
  }, 0);

  /* A stale tab can hold something that has since sold out. The server
     refuses it either way; catching it here explains it before they pay. */
  const unbuyable = lines.filter((line) => {
    const p = productOf(line.productId);
    return !p || !BUYABLE.includes(p.status as ProductStatus);
  });

  const summaryLines: SummaryLine[] = lines.map((line, i) => {
    const p = productOf(line.productId);
    const variant = [line.variant?.size, line.variant?.color]
      .filter(Boolean)
      .join(" · ");
    return {
      id: `${line.productId}-${i}`,
      label: p?.name[locale as "fr" | "en"] ?? line.productId,
      sublabel: variant || undefined,
      quantity: line.quantity,
      amount: (p?.priceXAF ?? 0) * line.quantity,
    };
  });

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const result = await checkoutShop({
        cart: lines.map((line) => ({
          productId: line.productId,
          quantity: line.quantity,
          ...(line.variant ? { variant: line.variant } : {}),
        })),
        ...(discountCode.trim() ? { discountCode: discountCode.trim() } : {}),
        contact: {
          email: profile?.email ?? "",
          ...(phone.trim() ? { phone: phone.trim() } : {}),
        },
        locale,
      });
      // Full navigation: the paid branch leaves the app for PawaPay.
      window.location.assign(nextStepAfterCheckout(result, locale));
    } catch (err) {
      const e =
        err instanceof CheckoutError
          ? err
          : new CheckoutError("server_error", 500);
      setError(e);
      if (
        e.code === "discount_invalid" ||
        e.code === "discount_expired" ||
        e.code === "discount_exhausted"
      ) {
        setDiscountApplied(false);
        setDiscountError(e.code);
        setDiscountCode("");
        setDiscountOpen(true);
      }
      if (e.code === "product_unavailable" || e.code === "unknown_product") {
        setStep("bag");
      }
      setSubmitting(false);
    }
  }

  if (count === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed border-black02/30 px-7 py-16 text-center">
        <ShoppingBag
          size={36}
          weight="bold"
          aria-hidden
          className="mx-auto text-black02/40"
        />
        <p className="mt-5 font-sans text-heading-m font-bold text-black02">
          {t("emptyBagTitle")}
        </p>
        <p className="mx-auto mt-3 max-w-sm text-body-m text-black02/70">
          {t("emptyBagBody")}
        </p>
        <div className="mt-7 flex justify-center">
          <Button href="/shop" size="md">
            {t("browseShop")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-14">
      <div>
        <CheckoutSteps
          steps={STEPS}
          current={STEPS.findIndex((s) => s.key === step)}
          label={(key) => t(`steps.${key}`)}
        />

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
                  {tt("retryIn", { seconds: error.retryAfter })}
                </p>
              )}
            </div>
          </div>
        )}

        {step === "bag" && (
          <ul className="flex flex-col gap-5">
            {lines.map((line, i) => {
              const p = productOf(line.productId);
              const variant = [line.variant?.size, line.variant?.color]
                .filter(Boolean)
                .join(" · ");
              const gone = !p || !BUYABLE.includes(p.status as ProductStatus);
              return (
                <li
                  key={`${line.productId}-${i}`}
                  className={`flex flex-wrap items-center gap-5 rounded-lg border-2 bg-offwhite p-5 ${
                    gone ? "border-danger" : "border-black02"
                  }`}
                >
                  {p && (
                    <div className="h-24 w-24 shrink-0 overflow-hidden rounded-md border-2 border-black02 bg-pastel">
                      <ProductImage
                        src={p.images[0]}
                        alt={p.name[locale as "fr" | "en"]}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-sans text-heading-m font-bold text-black02">
                      {p?.name[locale as "fr" | "en"] ?? line.productId}
                    </p>
                    {variant && (
                      <p className="mt-1 font-mono text-mono-tag uppercase tracking-wide text-black02/60">
                        {variant}
                      </p>
                    )}
                    <p className="mt-2 font-mono text-body-m font-bold text-black02">
                      {money((p?.priceXAF ?? 0) * line.quantity)} XAF
                    </p>
                    {gone && (
                      <p className="mt-2 text-body-m font-bold text-danger">
                        {t("lineUnavailable")}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setQuantity(i, line.quantity - 1)}
                      aria-label={t("decrease")}
                      className="flex h-10 w-10 items-center justify-center rounded-pill border-2 border-black02 text-black02 hover:bg-pastel"
                    >
                      −
                    </button>
                    <span className="w-7 text-center font-mono text-body-l font-bold text-black02">
                      {line.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuantity(i, line.quantity + 1)}
                      disabled={line.quantity >= MAX_LINE_QTY}
                      aria-label={t("increase")}
                      className="flex h-10 w-10 items-center justify-center rounded-pill border-2 border-black02 text-black02 hover:bg-pastel disabled:opacity-30"
                    >
                      +
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(i)}
                      aria-label={t("removeLine")}
                      className="flex h-10 w-10 items-center justify-center rounded-pill border-2 border-black02 text-black02 transition-colors hover:bg-danger-pastel hover:text-danger"
                    >
                      <Trash size={16} weight="bold" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {step === "payment" && (
          <PaymentStep
            phone={phone}
            setPhone={setPhone}
            acceptedTerms={acceptedTerms}
            setAcceptedTerms={setAcceptedTerms}
            profile={profile}
            sessionLoading={sessionLoading}
            signInNext={`/${locale}/shop/cart`}
            terms={{
              title: t("returnsTitle"),
              body: t("returnsBody"),
              ack: t("returnsAck"),
            }}
            extra={
              /*
               * An INFORMATIONAL LINE, not a control.
               *
               * This was a pickup-vs-delivery radio group, and it was a fake
               * control: the shop checkout schema has no fulfilment field
               * (the order's column is organiser-set through PATCH), so the
               * choice was collected and discarded. A control that changes
               * nothing is worse than no control — it invites a decision and
               * then ignores it. Buyer-settable fulfilment is a backend item
               * (GAPS.md G13); until it exists, this says what will actually
               * happen.
               */
              <div className="flex items-start gap-3 rounded-lg border-2 border-black02 bg-offwhite p-5">
                <Package
                  size={22}
                  weight="bold"
                  className="mt-0.5 shrink-0 text-black02"
                />
                <div>
                  <p className="text-body-m font-bold text-black02">
                    {t("fulfilmentTitle")}
                  </p>
                  <p className="mt-1 text-body-m text-black02/75">
                    {t("fulfilmentBody")}
                  </p>
                </div>
              </div>
            }
          />
        )}

        <div className="mt-10 flex flex-wrap items-center gap-3">
          {step === "payment" && (
            <button
              type="button"
              onClick={() => setStep("bag")}
              className="inline-flex items-center gap-2 rounded-pill border-2 border-black02 px-5 py-2.5 font-sans text-body-m font-bold text-black02 transition-colors hover:bg-pastel"
            >
              <ArrowLeft size={16} weight="bold" />
              {tt("back")}
            </button>
          )}
          {step === "bag" ? (
            <Button
              size="md"
              onClick={() => setStep("payment")}
              disabled={unbuyable.length > 0}
            >
              {tt("next")}
              <ArrowRight size={16} weight="bold" />
            </Button>
          ) : (
            <Button
              size="md"
              onClick={submit}
              /* Same gate as tickets: the refund acknowledgment blocks the
                 pay button, and the shared component is why it cannot drift. */
              disabled={submitting || !profile || !acceptedTerms}
            >
              {submitting ? tt("working") : tt("payNow")}
              <ArrowRight size={16} weight="bold" />
            </Button>
          )}
        </div>
      </div>

      <aside className="lg:sticky lg:top-40 lg:self-start">
        <OrderSummary
          title={tt("summary")}
          lines={summaryLines}
          total={subtotal}
          emptyLabel={tt("summaryEmpty")}
          note={tt("totalNote")}
          discount={{
            open: discountOpen,
            setOpen: setDiscountOpen,
            code: discountCode,
            setCode: (v) => {
              setDiscountCode(v);
              setDiscountApplied(false);
              setDiscountError(null);
            },
            applied: discountApplied,
            apply: () => {
              setDiscountApplied(discountCode.trim().length >= 3);
              setDiscountError(null);
            },
            error: discountError,
            errorText: (code) => te(code as never),
          }}
        >
          <p className="mt-5 text-caption text-black02/60">
            <Link
              href="/shop"
              className="underline decoration-2 underline-offset-4"
            >
              {t("keepShopping")}
            </Link>
          </p>
        </OrderSummary>
      </aside>
    </div>
  );
}
