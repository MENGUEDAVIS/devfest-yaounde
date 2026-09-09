"use client";

import { useState } from "react";
import type { TeamMember } from "@/data/types";
import { slugify } from "@/lib/admin/form-helpers";
import { EntityCrud } from "../forms/EntityCrud";
import {
  ChipInput,
  Field,
  ImageField,
  LocalizedInput,
  Segmented,
  SocialLinks,
  TextInput,
} from "../forms/fields";
import { useToast } from "../forms/Toast";

const EMPTY = { fr: "", en: "" };

export function AdminTeam({ rows }: { rows: TeamMember[] }) {
  const toast = useToast();
  const [uploading, setUploading] = useState(false);

  /**
   * Photos go up separately, and only for a member who already exists.
   *
   * `POST /api/admin/content/:id/photo` looks the entry up by id and writes
   * the URL onto it, so the record has to be saved first — names first,
   * photos second. For a brand-new member the control is disabled and says
   * why rather than failing after the fact.
   */
  async function uploadPhoto(entryId: string, file: File) {
    setUploading(true);
    const body = new FormData();
    body.set("entryId", entryId);
    body.set("image", file);
    const res = await fetch("/api/admin/content/team/photo", {
      method: "POST",
      body,
    });
    setUploading(false);
    if (!res.ok) {
      toast.push("error", "That photo did not upload.");
      return;
    }
    toast.push("ok", "Photo saved. Reload to see it on the card.");
  }

  return (
    <div className="flex flex-col gap-5">
      <EntityCrud<TeamMember & { id: string }>
        collection="team"
        rows={rows as (TeamMember & { id: string })[]}
        addLabel="Add a member"
        emptyLabel="Nobody here yet."
        reorderable
        blank={() =>
          ({
            id: "",
            name: "",
            role: { ...EMPTY },
            contribution: { ...EMPTY },
            photoUrl: "",
            social: {},
          }) as TeamMember & { id: string }
        }
        renderRow={(row) => (
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 shrink-0 overflow-hidden rounded-pill border border-black02/20 bg-pastel">
              {row.photoUrl && !row.photoUrl.startsWith("/placeholders/") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={row.photoUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center font-sans text-caption font-bold text-black02/40">
                  {(row.name.trim()[0] ?? "?").toUpperCase()}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate font-sans text-body-m font-bold text-black02">
                {row.name}
                {row.alumni && (
                  <span className="ml-2 rounded-pill bg-black02/10 px-2 py-0.5 font-mono text-caption font-bold uppercase text-black02/60">
                    past
                  </span>
                )}
              </p>
              <p className="truncate text-caption text-black02/60">
                {row.role.en} · {row.contribution.en}
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
                  // The id is the URL and must never change under an existing
                  // member — only a new one gets it derived from the name.
                  patch(
                    draft.photoUrl || draft.role.en
                      ? { name }
                      : { name, id: slugify(name) },
                  )
                }
              />
            </Field>

            <Field
              label="Id"
              hint="Used in URLs and to attach photos. Leave it alone once it exists."
            >
              <TextInput value={draft.id} onChange={(id) => patch({ id })} />
            </Field>

            <Field label="Status">
              <Segmented
                name={`team-status-${draft.id || "new"}`}
                value={draft.alumni ? "past" : "current"}
                options={[
                  { value: "current", label: "Current organiser" },
                  { value: "past", label: "Past organiser" },
                ]}
                onChange={(v) =>
                  // `undefined` rather than `false`: the field is optional,
                  // and the public page filters on its presence.
                  patch({ alumni: v === "past" ? true : undefined })
                }
              />
            </Field>

            <Field
              label="Role"
              hint="Their GDG position — Lead, Organiser, Mentor."
            >
              <LocalizedInput
                value={draft.role}
                onChange={(role) => patch({ role })}
              />
            </Field>

            <Field
              label="Contribution"
              hint="What they did for this event. The public page groups by this."
            >
              <LocalizedInput
                value={draft.contribution}
                onChange={(contribution) => patch({ contribution })}
              />
            </Field>

            <Field label="Photo">
              <ImageField
                url={draft.photoUrl}
                name={draft.name}
                busy={uploading}
                disabled={!rows.some((r) => r.id === draft.id)}
                disabledHint="Save this member first — the upload attaches the picture to an existing record."
                onPick={(file) => void uploadPhoto(draft.id, file)}
              />
            </Field>

            <Field label="Links">
              <SocialLinks
                value={draft.social ?? {}}
                onChange={(social) => patch({ social })}
              />
            </Field>

            <Field
              label="One-liner"
              hint="Optional, and theirs to write — leave it empty rather than inventing one."
            >
              <LocalizedInput
                multiline
                value={draft.oneLiner ?? { ...EMPTY }}
                onChange={(oneLiner) =>
                  patch({
                    oneLiner: oneLiner.fr || oneLiner.en ? oneLiner : undefined,
                  })
                }
              />
            </Field>

            {draft.alumni && (
              <Field
                label="Years organised"
                hint="Alumni only, e.g. 2023–2024."
              >
                <ChipInput
                  values={draft.years ? draft.years.split(", ") : []}
                  onChange={(years) =>
                    patch({ years: years.join(", ") || undefined })
                  }
                  placeholder="2024"
                />
              </Field>
            )}
          </>
        )}
      />
    </div>
  );
}
