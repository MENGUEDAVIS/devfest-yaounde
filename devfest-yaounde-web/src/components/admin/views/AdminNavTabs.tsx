"use client";

import { useState } from "react";
import { NAV_TAB_KEYS, type NavSettings, type NavTabKey } from "@/lib/nav-tabs";
import { Toggle } from "../forms/fields";
import { InfoBanner, Panel } from "./shared";

const LABELS: Record<NavTabKey, { name: string; where: string }> = {
  schedule: { name: "Schedule", where: "Text link in the bar" },
  speakers: { name: "Speakers", where: "Text link in the bar" },
  faqs: { name: "FAQs", where: "Text link in the bar" },
  team: { name: "Team", where: "Text link in the bar" },
  shop: { name: "Shop", where: "Outlined button on the right" },
  tickets: { name: "Tickets", where: "Yellow button on the right" },
};

/**
 * Show or hide the navbar's tabs (PHASE24).
 *
 * Its OWN panel with its OWN save, not part of the big "Links and
 * configuration" form: `nav` lives in a newer column (migration 0027), and
 * sending it along with every other setting would make the whole config save
 * fail on a database that has not had that migration yet, over a field
 * nobody touched — the same reason Memory Lane's links are sent only when
 * they change. Kept apart, a failure here says exactly what failed.
 *
 * The language switch is not listed as a toggle because it cannot be turned
 * off: it stays in the bar whatever is set here.
 */
export function AdminNavTabs({ nav }: { nav: NavSettings }) {
  const [saved, setSaved] = useState(nav);
  const [draft, setDraft] = useState(nav);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);

  const dirty = NAV_TAB_KEYS.some((key) => draft[key] !== saved[key]);
  const shown = NAV_TAB_KEYS.filter((key) => draft[key]);

  async function save() {
    setStatus("saving");
    setError(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        // The WHOLE group, always — `saveSettings` replaces the column, so a
        // partial object would put back to "shown" whatever was left out.
        body: JSON.stringify({ nav: draft }),
      });
      if (!res.ok) {
        setStatus("error");
        setError(
          "Could not save. If this keeps failing, the navigation migration (0027) may not be applied to the database yet.",
        );
        return;
      }
      setSaved(draft);
      setStatus("saved");
    } catch {
      setStatus("error");
      setError("Network error — nothing was changed. Try again.");
    }
  }

  return (
    <Panel
      title="Navigation"
      subtitle="Choose which tabs the navbar shows. The language switch always stays."
    >
      <InfoBanner>
        Hiding a tab hides the <strong>link</strong> only. The page still exists
        at its address, and buttons elsewhere on the site that point to it (the
        home page, the footer) keep working.
      </InfoBanner>

      <div className="flex max-w-2xl flex-col gap-3">
        {NAV_TAB_KEYS.map((key) => (
          <div
            key={key}
            className="rounded-lg border border-black02/20 bg-offwhite px-4 py-3"
          >
            <Toggle
              checked={draft[key]}
              onChange={(on) => {
                setStatus("idle");
                setDraft((current) => ({ ...current, [key]: on }));
              }}
              label={LABELS[key].name}
              hint={LABELS[key].where}
            />
          </div>
        ))}
        <p className="rounded-lg border border-dashed border-black02/25 px-4 py-3 text-body-m text-black02/70">
          <strong className="text-black02">Language switch (FR / EN)</strong> —
          always shown.
        </p>

        <p className="text-caption text-black02/70" aria-live="polite">
          {shown.length === 0
            ? "The navbar will show only the logo and the language switch."
            : `The navbar will show: ${shown.map((k) => LABELS[k].name).join(" · ")}.`}
        </p>

        <button
          type="button"
          onClick={() => void save()}
          disabled={!dirty || status === "saving"}
          className="self-start rounded-pill border-2 border-black02 bg-primary px-5 py-2.5 font-sans text-body-m font-bold text-black02 disabled:opacity-50"
        >
          {status === "saving" ? "Saving…" : "Save navigation"}
        </button>
        {status === "saved" && !dirty && (
          <p className="text-body-m font-bold text-black02">
            Saved — it is live on the site now.
          </p>
        )}
        {error && (
          <p className="rounded-lg border-2 border-danger bg-danger-pastel px-4 py-3 text-body-m font-bold text-black02">
            {error}
          </p>
        )}
      </div>
    </Panel>
  );
}
