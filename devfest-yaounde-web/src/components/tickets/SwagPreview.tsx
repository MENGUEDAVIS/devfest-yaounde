"use client";

import { useLocale, useTranslations } from "next-intl";
import type { TierSwagItem } from "@/data/types";

/**
 * The swag that comes with a paid tier — PHASE14 edit, images added PHASE20.
 *
 * A horizontal row of small cutout-style prints rather than product shots:
 * white border, soft corners, alternating tilt, hover lifts one forward and
 * names it. It is a teaser for what is in the box, so it is deliberately
 * small — big imagery here would compete with the price and the perks, which
 * are what someone is actually deciding on.
 *
 * The tilt alternates by index and is set inline, so it follows the ITEM
 * rather than its position in the DOM.
 *
 * An item with no image yet (freshly added in admin, upload pending) falls
 * back to the plain placeholder thumb — the name is still the real
 * information, which is why it is in the popover and in the accessible name
 * rather than only in a file.
 */
export function SwagPreview({ items }: { items: TierSwagItem[] }) {
  const t = useTranslations("pages.tickets");
  const locale = useLocale() as "fr" | "en";
  if (items.length === 0) return null;

  return (
    <div className="mt-6">
      <p className="font-mono text-mono-tag font-bold uppercase tracking-wide text-black02/55">
        {t("swagLabel", { count: items.length })}
      </p>
      <ul className="swag-row mt-3 flex flex-wrap items-end gap-3">
        {items.map((item, i) => {
          const image = item.images?.[0];
          return (
            <li
              key={item.id}
              className="swag-cutout"
              style={{
                ["--swag-tilt" as string]: `${i % 2 === 0 ? -3 : 3}deg`,
              }}
            >
              {/* The tooltip is decorative duplication of the label below it,
                  so it is aria-hidden — a screen reader gets the name once. */}
              <span aria-hidden className="swag-pop">
                {item.name[locale]}
              </span>
              {image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={image}
                  alt=""
                  aria-hidden
                  className="swag-thumb w-full object-cover"
                />
              ) : (
                <span className="swag-thumb" aria-hidden />
              )}
              <span className="sr-only">{item.name[locale]}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
