"use client";

import { useState } from "react";
import { Link as LinkIcon, Minus, Plus } from "@phosphor-icons/react";
import type {
  ApparelSize,
  Product,
  ProductStatus,
  TicketTier,
} from "@/data/types";
import { slugify } from "@/lib/admin/form-helpers";
import type { AdminData } from "@/lib/admin/shape";
import { EntityCrud } from "../forms/EntityCrud";
import {
  ChipInput,
  Field,
  FilterBar,
  LocalizedInput,
  Segmented,
  TextInput,
  Toggle,
} from "../forms/fields";
import { MultiImageUpload } from "../forms/MultiImageUpload";
import { InfoBanner } from "./shared";

const EMPTY = { fr: "", en: "" };
const SIZES: ApparelSize[] = ["XS", "S", "M", "L", "XL", "XXL"];

const STATUSES: { value: ProductStatus; label: string }[] = [
  { value: "in-stock", label: "In stock" },
  { value: "pre-order", label: "Pre-order" },
  { value: "venue-only", label: "Venue only" },
  { value: "sold-out", label: "Sold out" },
];

export function AdminShop({
  rows,
  data,
  tiers,
  initialEditId,
}: {
  rows: Product[];
  data: AdminData;
  /** For the linkage chip: which tier a swag-created product belongs to. */
  tiers: TicketTier[];
  initialEditId?: string;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [completion, setCompletion] = useState("all");

  const needle = query.trim().toLowerCase();
  function matches(row: Product): boolean {
    if (status !== "all" && row.status !== status) return false;
    if (completion === "draft" && row.published !== false) return false;
    if (!needle) return true;
    return (
      row.id.toLowerCase().includes(needle) ||
      row.name.fr.toLowerCase().includes(needle) ||
      row.name.en.toLowerCase().includes(needle) ||
      row.description.fr.toLowerCase().includes(needle) ||
      row.description.en.toLowerCase().includes(needle)
    );
  }

  const draftCount = rows.filter((r) => r.published === false).length;

  function tierNameFor(tierId: string): string {
    return tiers.find((t) => t.id === tierId)?.name ?? tierId;
  }

  function ordersFor(productId: string): number {
    return data.orders.rows.filter((o) =>
      o.items.some((i) => i.productId === productId),
    ).length;
  }

  return (
    <div className="flex flex-col gap-5">
      <InfoBanner>
        No category field — filtering is by status and search instead (see
        `docs/backend/GAPS.md` G11). Categories were deferred again as
        packages whose shape isn&rsquo;t settled yet; adding a real one is a
        separate decision, not a quiet filter-bar addition.
      </InfoBanner>

      <EntityCrud<Product>
        collection="products"
        rows={rows}
        addLabel="Add a product"
        emptyLabel="No products yet."
        initialEditId={initialEditId}
        toolbar={
          <FilterBar
            query={query}
            onQuery={setQuery}
            placeholder="Search name, description or id"
            chips={[
              {
                label: "Status",
                value: status,
                onChange: setStatus,
                options: [
                  { value: "all", label: "All" },
                  ...STATUSES.map((s) => ({ value: s.value, label: s.label })),
                ],
              },
              {
                label: "Completion",
                value: completion,
                onChange: setCompletion,
                options: [
                  { value: "all", label: "All" },
                  {
                    value: "draft",
                    label: `Needs completion${draftCount ? ` (${draftCount})` : ""}`,
                  },
                ],
              },
            ]}
          />
        }
        filter={matches}
        describeImpact={(product) => {
          const orderCount = ordersFor(product.id);
          if (orderCount > 0) {
            return {
              blocked: true,
              message: `Linked to ${orderCount} existing order${orderCount === 1 ? "" : "s"}. Mark it sold-out or unpublish it instead of deleting — deleting would orphan those orders' line items.`,
            };
          }
          if (product.sourceSwag) {
            return {
              blocked: false,
              message: `Still linked to the ${tierNameFor(product.sourceSwag.tierId)} tier's swag. Deleting this only removes the shop listing — the tier will show a swag item with no linked product until you edit it there.`,
            };
          }
          return null;
        }}
        blank={() => ({
          id: "",
          name: { ...EMPTY },
          description: { ...EMPTY },
          priceXAF: 0,
          images: [],
          status: "pre-order" as ProductStatus,
          published: true,
        })}
        renderRow={(row) => (
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-md border border-black02/15 bg-pastel">
              {row.images[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={row.images[0]}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="font-mono text-caption text-black02/40">
                  —
                </span>
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate font-sans text-body-m font-bold text-black02">
                {row.name.en || row.name.fr || row.id}
              </p>
              <p className="truncate text-caption text-black02/60">
                {row.priceXAF.toLocaleString("en-CM")} XAF ·{" "}
                {STATUSES.find((s) => s.value === row.status)?.label}
                {row.published === false && " · Draft"}
                {row.sourceSwag &&
                  ` · From ${tierNameFor(row.sourceSwag.tierId)}`}
              </p>
            </div>
          </div>
        )}
        renderForm={(draft, patch) => {
          const canPublish = draft.priceXAF > 0 && draft.images.length > 0;
          return (
            <>
              <Field label="Name">
                <LocalizedInput
                  value={draft.name}
                  onChange={(name) =>
                    patch(
                      draft.id
                        ? { name }
                        : { name, id: slugify(name.en || name.fr) },
                    )
                  }
                />
              </Field>

              <Field label="Id">
                <TextInput value={draft.id} onChange={(id) => patch({ id })} />
              </Field>

              {draft.sourceSwag && (
                <a
                  href={`/admin?view=ticket-tiers&edit=${draft.sourceSwag.tierId}`}
                  className="inline-flex w-fit items-center gap-1.5 rounded-pill border border-black02/25 bg-pastel px-3 py-1.5 font-mono text-caption font-bold text-black02 hover:bg-pastel/70"
                >
                  <LinkIcon size={12} weight="bold" aria-hidden />
                  From {tierNameFor(draft.sourceSwag.tierId)}&rsquo;s swag
                </a>
              )}

              <Field label="Description">
                <LocalizedInput
                  value={draft.description}
                  onChange={(description) => patch({ description })}
                  multiline
                />
              </Field>

              <Field label="Price (XAF)">
                <TextInput
                  type="number"
                  value={String(draft.priceXAF)}
                  onChange={(v) =>
                    patch({ priceXAF: Math.max(0, Number(v) || 0) })
                  }
                />
              </Field>

              <Field
                label="Images"
                hint="First image is the card cover. Drag to add several — each uploads immediately."
              >
                <MultiImageUpload
                  images={draft.images}
                  onChange={(images) => patch({ images })}
                  uploadPath={`products/${draft.id || "product"}`}
                  max={12}
                />
              </Field>

              <Field label="Status">
                <Segmented
                  name="product-status"
                  value={draft.status}
                  options={STATUSES}
                  onChange={(status) => patch({ status })}
                />
              </Field>

              <Field
                label="Sizes"
                hint="Leave every size off for a product with no size option."
              >
                <div className="flex flex-wrap gap-1.5">
                  {SIZES.map((size) => {
                    const on = draft.variants?.size?.includes(size) ?? false;
                    return (
                      <button
                        key={size}
                        type="button"
                        aria-pressed={on}
                        onClick={() => {
                          const current = draft.variants?.size ?? [];
                          const nextSizes = on
                            ? current.filter((s) => s !== size)
                            : [...current, size];
                          patch({
                            variants: {
                              ...draft.variants,
                              size: nextSizes.length ? nextSizes : undefined,
                            },
                          });
                        }}
                        className={`rounded-pill border-2 px-3 py-1 font-mono text-caption font-bold transition-colors ${
                          on
                            ? "border-black02 bg-primary text-black02"
                            : "border-black02/25 text-black02/60 hover:bg-pastel"
                        }`}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
              </Field>

              <Field
                label="Colors"
                hint="Leave empty for a product with no color option."
              >
                <ChipInput
                  values={draft.variants?.color ?? []}
                  onChange={(color) =>
                    patch({
                      variants: {
                        ...draft.variants,
                        color: color.length ? color : undefined,
                      },
                    })
                  }
                  placeholder="e.g. Noir"
                />
              </Field>

              <Field
                label="Stock per combination"
                hint="Omit a combination to leave it unlimited. Counted server-side against real orders — this number is a declared cap, not a live count."
              >
                <StockField
                  stock={draft.stock ?? []}
                  onChange={(stock) =>
                    patch({ stock: stock.length ? stock : undefined })
                  }
                />
              </Field>

              <Toggle
                checked={draft.published !== false}
                onChange={(published) => patch({ published })}
                label="Published"
                hint="Live on the public shop."
                disabled={draft.published === false && !canPublish}
                disabledHint="Add a price above 0 and at least one image before publishing."
              />
            </>
          );
        }}
      />
    </div>
  );
}

function StockField({
  stock,
  onChange,
}: {
  stock: { size?: string; color?: string; quantity: number }[];
  onChange: (v: { size?: string; color?: string; quantity: number }[]) => void;
}) {
  function update(i: number, changes: Partial<(typeof stock)[number]>) {
    onChange(stock.map((row, idx) => (idx === i ? { ...row, ...changes } : row)));
  }
  function remove(i: number) {
    onChange(stock.filter((_, idx) => idx !== i));
  }
  function add() {
    onChange([...stock, { quantity: 0 }]);
  }

  return (
    <div className="flex flex-col gap-2">
      {stock.map((row, i) => (
        <div key={i} className="flex flex-wrap items-center gap-2">
          <input
            value={row.size ?? ""}
            placeholder="Size (optional)"
            onChange={(e) => update(i, { size: e.target.value || undefined })}
            className="w-28 rounded-lg border border-black02/25 bg-offwhite px-2.5 py-1.5 font-sans text-caption text-black02"
          />
          <input
            value={row.color ?? ""}
            placeholder="Color (optional)"
            onChange={(e) => update(i, { color: e.target.value || undefined })}
            className="w-28 rounded-lg border border-black02/25 bg-offwhite px-2.5 py-1.5 font-sans text-caption text-black02"
          />
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() =>
                update(i, { quantity: Math.max(0, row.quantity - 1) })
              }
              className="rounded-pill border border-black02/25 p-1 text-black02 hover:bg-pastel"
              aria-label="Decrease quantity"
            >
              <Minus size={12} weight="bold" />
            </button>
            <input
              type="number"
              min={0}
              value={row.quantity}
              onChange={(e) =>
                update(i, { quantity: Math.max(0, Number(e.target.value) || 0) })
              }
              className="w-16 rounded-lg border border-black02/25 bg-offwhite px-2 py-1.5 text-center font-mono text-caption text-black02"
            />
            <button
              type="button"
              onClick={() => update(i, { quantity: row.quantity + 1 })}
              className="rounded-pill border border-black02/25 p-1 text-black02 hover:bg-pastel"
              aria-label="Increase quantity"
            >
              <Plus size={12} weight="bold" />
            </button>
          </div>
          <button
            type="button"
            onClick={() => remove(i)}
            className="rounded-pill border border-black02/20 px-2.5 py-1 text-caption font-bold text-black02 hover:bg-danger-pastel hover:text-danger"
          >
            Remove
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="inline-flex w-fit items-center gap-2 rounded-pill border border-black02/25 px-3.5 py-1.5 font-sans text-caption font-bold text-black02 hover:bg-pastel"
      >
        Add a combination
      </button>
    </div>
  );
}
