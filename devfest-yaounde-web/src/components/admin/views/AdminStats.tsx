"use client";

import { useState } from "react";
import type { Stat } from "@/data/types";
import { slugify } from "@/lib/admin/form-helpers";
import { EntityCrud } from "../forms/EntityCrud";
import {
  Field,
  ImageField,
  LocalizedInput,
  TextInput,
  usePendingPhoto,
} from "../forms/fields";
import { useToast } from "../forms/Toast";
import { InfoBanner } from "./shared";

const EMPTY = { fr: "", en: "" };

/**
 * The home page figures — "500+ developers" (PHASE21 §C1).
 *
 * On `EntityCrud`, so it gets the whole-array save with concurrency check
 * and audit entry, and the typed-id delete confirmation, like every list.
 *
 * REORDERABLE: the order here is left-to-right on the page. The image goes
 * through the shared photo endpoint after the save (it attaches to an entry
 * by id, so the entry has to exist first); that endpoint validates type and
 * size and re-encodes server-side.
 */
export function AdminStats({ rows }: { rows: Stat[] }) {
  const toast = useToast();
  const photo = usePendingPhoto();
  const [uploading, setUploading] = useState(false);

  async function uploadPending(entryId: string) {
    if (!photo.pending) return;
    setUploading(true);
    const body = new FormData();
    body.set("entryId", entryId);
    body.set("image", photo.pending.file);
    const res = await fetch("/api/admin/content/stats/photo", {
      method: "POST",
      body,
    });
    setUploading(false);
    if (res.ok) {
      photo.clear();
      return;
    }
    toast.push(
      "error",
      "The figure saved, but the image did not upload. Open it again and retry.",
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <InfoBanner>
        Three figures read best — the row is sized for three across. On a
        computer, hovering a number turns the cursor into its image; on a phone
        the image sits beside the number instead. A figure with no image just
        stays a number.
      </InfoBanner>

      <EntityCrud<Stat>
        collection="stats"
        rows={rows}
        reorderable
        addLabel="Add a figure"
        emptyLabel="No figures yet. With none, the home page skips this section."
        afterSave={(saved) => uploadPending(saved.id)}
        onClose={photo.clear}
        blank={() => ({ id: "", value: 0, suffix: "", label: { ...EMPTY } })}
        renderRow={(row) => (
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md border border-black02/15 bg-pastel">
              {row.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={row.imageUrl}
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
              <p className="truncate font-sans text-body-m font-bold tabular-nums text-black02">
                {row.value.toLocaleString("en")}
                {row.suffix}
              </p>
              <p className="truncate text-caption text-black02/60">
                {row.label.en} · {row.label.fr}
                {!row.imageUrl && " · no image"}
              </p>
            </div>
          </div>
        )}
        renderForm={(draft, patch) => (
          <>
            <div className="grid grid-cols-[1fr_7rem] gap-4">
              <Field
                label="Number"
                hint="Whole number, no separators — it rolls in digit by digit."
              >
                <TextInput
                  type="number"
                  value={String(draft.value)}
                  onChange={(v) =>
                    patch({
                      value: Math.min(
                        999_999_999,
                        Math.max(0, Math.floor(Number(v) || 0)),
                      ),
                    })
                  }
                />
              </Field>
              <Field label="After it" hint='e.g. "+"'>
                <TextInput
                  value={draft.suffix ?? ""}
                  onChange={(suffix) =>
                    patch({ suffix: suffix.slice(0, 8) || undefined })
                  }
                />
              </Field>
            </div>

            <Field label="Label" hint="What the number counts, both languages.">
              <LocalizedInput
                value={draft.label}
                onChange={(label) =>
                  patch(
                    draft.id
                      ? { label }
                      : { label, id: slugify(label.en || label.fr) },
                  )
                }
              />
            </Field>

            <Field
              label="Image"
              hint="Optional. Landscape works best — it is shown as a small card."
            >
              <ImageField
                url={draft.imageUrl ?? ""}
                name={draft.label.en || "#"}
                busy={uploading}
                preview={photo.pending?.preview}
                onPick={photo.pick}
              />
            </Field>

            {draft.imageUrl && (
              <button
                type="button"
                onClick={() => patch({ imageUrl: undefined })}
                className="w-fit rounded-pill border border-black02/20 px-3 py-1 text-caption font-bold text-black02 hover:bg-danger-pastel hover:text-danger"
              >
                Remove image
              </button>
            )}

            <Field label="Id" hint="Leave it alone once it exists.">
              <TextInput value={draft.id} onChange={(id) => patch({ id })} />
            </Field>
          </>
        )}
      />
    </div>
  );
}
