"use client";

import { Link as LinkIcon } from "@phosphor-icons/react";
import type { Product, TicketTier, TierSwagItem } from "@/data/types";
import type { AdminData, AdminSettings } from "@/lib/admin/shape";
import { slugify } from "@/lib/admin/form-helpers";
import { EntityCrud } from "../forms/EntityCrud";
import {
  EntitlementListField,
  Field,
  LocalizedInput,
  TextInput,
  Toggle,
} from "../forms/fields";
import { MultiImageUpload } from "../forms/MultiImageUpload";
import { useToast } from "../forms/Toast";
import { InfoBanner } from "./shared";

export function AdminTicketTiers({
  rows,
  data,
  settings,
  products,
}: {
  rows: TicketTier[];
  data: AdminData;
  settings: AdminSettings;
  products: Product[];
}) {
  const toast = useToast();
  const capacityTotal = settings.capacity.total;
  const capSum = rows.reduce(
    (sum, tier) => sum + (tier.quantityAvailable ?? 0),
    0,
  );
  const overCapacity =
    capacityTotal != null && capacityTotal > 0 && capSum > capacityTotal;

  function soldCount(tierId: string): number {
    return data.tickets.rows.filter((t) => t.tierId === tierId).length;
  }

  return (
    <div className="flex flex-col gap-5">
      {overCapacity && (
        <InfoBanner tone="warn">
          Tier caps add up to {capSum} tickets, above the overall capacity of{" "}
          {capacityTotal} set in Info bar &amp; policies. This does not block
          sales — checkout still gates on each tier&rsquo;s own cap — but the public
          counter can undercount how many of these tiers could actually sell
          out. Raise the overall capacity or lower a tier cap.
        </InfoBanner>
      )}

      <EntityCrud<TicketTier>
        collection="ticket-tiers"
        rows={rows}
        addLabel="Add a tier"
        emptyLabel="No tiers yet."
        onSaveResponse={(body) => {
          const drafts =
            (body as { createdDrafts?: { productId: string }[] } | null)
              ?.createdDrafts ?? [];
          if (drafts.length === 0) return;
          toast.push(
            "ok",
            drafts.length === 1
              ? "New swag item needs a shop listing — price, stock and status. Finish it in Shop."
              : `${drafts.length} new swag items need shop listings — finish them in Shop.`,
          );
        }}
        describeImpact={(tier) => {
          const sold = soldCount(tier.id);
          if (sold === 0) return null;
          return {
            blocked: true,
            message: `${sold} ticket${sold === 1 ? "" : "s"} already sold on this tier. Turn off "On sale" or mark it sold out instead of deleting — deleting would orphan those tickets' tier reference.`,
          };
        }}
        blank={() => ({
          id: "",
          name: "",
          priceXAF: 0,
          description: { fr: "", en: "" },
          perks: [],
          includesApparel: false,
          onSale: true,
        })}
        renderRow={(row) => (
          <div className="flex items-center gap-3">
            <span className="rounded-pill border-2 border-black02 px-2.5 py-0.5 font-mono text-mono-tag font-bold text-black02">
              {row.name}
            </span>
            <div className="min-w-0">
              <p className="truncate font-sans text-body-m font-bold text-black02">
                {row.priceXAF === 0
                  ? "Free"
                  : `${row.priceXAF.toLocaleString("en-CM")} XAF`}
                {row.quantityAvailable != null && ` · ${row.quantityAvailable} cap`}
              </p>
              <p className="truncate text-caption text-black02/60">
                {row.onSale ? "On sale" : "Off sale"}
                {row.soldOut && " · Sold out"}
              </p>
            </div>
          </div>
        )}
        renderForm={(draft, patch) => (
          <>
            <Field label="Name" hint="Proper-noun tier name, e.g. SONNET.">
              <TextInput
                value={draft.name}
                onChange={(name) =>
                  patch(draft.id ? { name } : { name, id: slugify(name) })
                }
              />
            </Field>

            <Field label="Id">
              <TextInput value={draft.id} onChange={(id) => patch({ id })} />
            </Field>

            <Field
              label="Sub-label"
              hint='Optional, beside the name (e.g. "Free pass"). Leave blank when the name says enough.'
            >
              <LocalizedInput
                value={draft.label ?? { fr: "", en: "" }}
                onChange={(label) => patch({ label })}
              />
            </Field>

            <Field label="Price (XAF)">
              <TextInput
                type="number"
                value={String(draft.priceXAF)}
                onChange={(v) => patch({ priceXAF: Math.max(0, Number(v) || 0) })}
              />
            </Field>

            <Field
              label="Quantity available"
              hint="Blank = unlimited. Enforced server-side at checkout regardless of what this admin shows."
            >
              <TextInput
                type="number"
                value={draft.quantityAvailable?.toString() ?? ""}
                onChange={(v) =>
                  patch({
                    quantityAvailable: v.trim() === "" ? undefined : Math.max(0, Number(v) || 0),
                  })
                }
              />
            </Field>

            <div className="flex flex-wrap gap-6">
              <Toggle
                checked={draft.onSale}
                onChange={(onSale) => patch({ onSale })}
                label="On sale"
                hint="Off hides it from the tier list."
              />
              <Toggle
                checked={Boolean(draft.soldOut)}
                onChange={(soldOut) => patch({ soldOut })}
                label="Sold out"
                hint="Independent of quantity — pulls the tier off sale regardless of remaining cap."
              />
              <Toggle
                checked={draft.includesApparel}
                onChange={(includesApparel) => patch({ includesApparel })}
                label="Includes apparel"
                hint="Collects an attendee size at checkout."
              />
              <Toggle
                checked={Boolean(draft.rsvpExternal)}
                onChange={(rsvpExternal) => patch({ rsvpExternal })}
                label="RSVP off-site"
                hint="Delegates to Bevy instead of selling here — the free tier."
              />
            </div>

            <Field label="Description">
              <LocalizedInput
                value={draft.description}
                onChange={(description) => patch({ description })}
                multiline
              />
            </Field>

            <Field
              label="What this ticket grants"
              hint="Rendered as a checklist on the public tier card, in this order."
            >
              <EntitlementListField
                values={draft.perks}
                onChange={(perks) => patch({ perks })}
              />
            </Field>

            <Field
              label="Swag included"
              hint="Each item also becomes a shop product — new ones save as a hidden draft until you finish the shop listing (price, stock, status)."
            >
              <SwagItemsField
                tierId={draft.id || "tier"}
                items={draft.swag ?? []}
                products={products}
                onChange={(swag) => patch({ swag })}
              />
            </Field>
          </>
        )}
      />
    </div>
  );
}

function SwagItemsField({
  tierId,
  items,
  products,
  onChange,
}: {
  tierId: string;
  items: TierSwagItem[];
  products: Product[];
  onChange: (v: TierSwagItem[]) => void;
}) {
  function update(i: number, changes: Partial<TierSwagItem>) {
    onChange(items.map((it, idx) => (idx === i ? { ...it, ...changes } : it)));
  }
  function remove(i: number) {
    // Unlink, never delete the shop product silently — the linkage ADR's
    // policy. The product (if any) stays; only the tier's reference to it
    // goes away, which the swag-sync route reads as "this swag item is gone"
    // and clears `sourceSwag` on save.
    onChange(items.filter((_, idx) => idx !== i));
  }
  function add() {
    onChange([
      ...items,
      { id: crypto.randomUUID(), name: { fr: "", en: "" }, images: [] },
    ]);
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((item, i) => {
        const linked = item.shopProductId
          ? products.find((p) => p.id === item.shopProductId)
          : undefined;
        return (
          <div
            key={item.id}
            className="flex flex-col gap-2 rounded-lg border border-black02/15 bg-pastel/40 p-3"
          >
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <LocalizedInput
                  value={item.name}
                  onChange={(name) => update(i, { name })}
                />
              </div>
              <button
                type="button"
                onClick={() => remove(i)}
                className="mt-1 shrink-0 rounded-pill border border-black02/20 px-2.5 py-1 text-caption font-bold text-black02 hover:bg-danger-pastel hover:text-danger"
              >
                Remove
              </button>
            </div>
            <MultiImageUpload
              images={item.images ?? []}
              onChange={(images) => update(i, { images })}
              uploadPath={`tickets/${slugify(tierId)}/swag/${item.id}`}
              max={6}
            />
            {item.shopProductId && (
              <a
                href={`/admin?view=shop&edit=${item.shopProductId}`}
                className="inline-flex w-fit items-center gap-1.5 rounded-pill border border-black02/25 bg-offwhite px-2.5 py-1 font-mono text-caption font-bold text-black02 hover:bg-pastel"
              >
                <LinkIcon size={12} weight="bold" aria-hidden />
                {linked ? `Shop: ${linked.name.en}` : "Shop listing"}
                {linked?.published === false && " (draft)"}
              </a>
            )}
          </div>
        );
      })}
      <button
        type="button"
        onClick={add}
        className="inline-flex w-fit items-center gap-2 rounded-pill border border-black02/25 px-3.5 py-1.5 font-sans text-caption font-bold text-black02 hover:bg-pastel"
      >
        Add swag item
      </button>
    </div>
  );
}
