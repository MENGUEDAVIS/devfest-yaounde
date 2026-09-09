"use client";

import { useState } from "react";
import type { Sponsor } from "@/data/types";
import { slugify } from "@/lib/admin/form-helpers";
import { EntityCrud } from "../forms/EntityCrud";
import { Field, ImageField, Segmented, TextInput } from "../forms/fields";
import { useToast } from "../forms/Toast";
import { InfoBanner, PageHeader } from "./shared";

/**
 * `partner` sits in the same list as the sponsor tiers.
 *
 * It is a tier rather than a separate collection (ADR 0038): a Partner record
 * would be a byte-for-byte copy of a Sponsor, and the site renders one
 * marquee for both.
 */
const TIERS: { value: NonNullable<Sponsor["tier"]>; label: string }[] = [
  { value: "platinum", label: "Platinum" },
  { value: "gold", label: "Gold" },
  { value: "silver", label: "Silver" },
  { value: "community", label: "Community" },
  { value: "partner", label: "Partner" },
];

export function AdminSponsors({ rows }: { rows: Sponsor[] }) {
  const toast = useToast();
  const [uploading, setUploading] = useState(false);

  async function uploadLogo(entryId: string, file: File) {
    setUploading(true);
    const body = new FormData();
    body.set("entryId", entryId);
    body.set("image", file);
    const res = await fetch("/api/admin/content/sponsors/photo", {
      method: "POST",
      body,
    });
    setUploading(false);
    toast.push(
      res.ok ? "ok" : "error",
      res.ok ? "Logo saved. Reload to see it." : "That logo did not upload.",
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Sponsors & partners"
        blurb="Confirmed supporters. Each one fills a seat on the public strip, and their logo links to their own site."
      />

      {rows.length === 0 && (
        <InfoBanner>
          Nobody signed yet, so the public sponsor strip is hidden. Adding the
          first sponsor here brings it back.
        </InfoBanner>
      )}

      <EntityCrud<Sponsor>
        collection="sponsors"
        rows={rows}
        addLabel="Add a sponsor"
        emptyLabel="No sponsors confirmed yet."
        reorderable
        blank={() => ({
          id: "",
          name: "",
          logoUrl: "",
          tier: "community",
          websiteUrl: "",
        })}
        renderRow={(row) => (
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border border-black02/15 bg-pastel">
              {row.logoUrl && !row.logoUrl.startsWith("/placeholders/") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={row.logoUrl}
                  alt=""
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <span className="font-mono text-caption text-black02/40">
                  logo
                </span>
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate font-sans text-body-m font-bold text-black02">
                {row.name}
              </p>
              <p className="truncate text-caption capitalize text-black02/60">
                {row.tier ?? "community"}
              </p>
            </div>
          </div>
        )}
        renderForm={(draft, patch) => (
          <>
            <Field label="Name">
              <TextInput
                value={draft.name}
                onChange={(name) =>
                  patch(draft.logoUrl ? { name } : { name, id: slugify(name) })
                }
              />
            </Field>

            <Field label="Id">
              <TextInput value={draft.id} onChange={(id) => patch({ id })} />
            </Field>

            <Field label="Tier">
              <Segmented
                name={`sponsor-tier-${draft.id || "new"}`}
                value={draft.tier ?? "community"}
                options={TIERS}
                onChange={(tier) => patch({ tier })}
              />
            </Field>

            <Field label="Logo">
              <ImageField
                url={draft.logoUrl}
                name={draft.name}
                busy={uploading}
                disabled={!rows.some((r) => r.id === draft.id)}
                disabledHint="Save first — the upload attaches the logo to an existing sponsor."
                onPick={(file) => void uploadLogo(draft.id, file)}
              />
            </Field>

            <Field
              label="Website"
              hint="Where their logo links. Opens in a new tab on the public site."
            >
              <TextInput
                value={draft.websiteUrl ?? ""}
                onChange={(websiteUrl) =>
                  patch({ websiteUrl: websiteUrl || undefined })
                }
              />
            </Field>
          </>
        )}
      />
    </div>
  );
}
