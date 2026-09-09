"use client";

import { useState } from "react";
import type { TeamMember } from "@/data/types";
import { slugify } from "@/lib/admin/form-helpers";
import { EntityCrud } from "../forms/EntityCrud";
import {
  ChipInput,
  Field,
  FilterBar,
  ImageField,
  usePendingPhoto,
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
  const photo = usePendingPhoto();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");

  /*
    Name, role and id. Role is bilingual, so both are searched — an organiser
    thinking in French should not have to think in English to find someone.
  */
  const matches = (row: TeamMember) => {
    const q = query.trim().toLowerCase();
    if (
      q &&
      ![row.name, row.id, row.role?.fr, row.role?.en].some((v) =>
        v?.toLowerCase().includes(q),
      )
    )
      return false;
    if (status === "current" && row.alumni) return false;
    if (status === "past" && !row.alumni) return false;
    return true;
  };

  /**
   * Attach the picked file to a member who now exists.
   *
   * Called from `afterSave`, never from the picker: the endpoint updates an
   * entry by id and writes the URL onto it, so the entry has to have been
   * written first. That constraint is real — what changed is that the FORM
   * absorbs it instead of making somebody save, hunt for the record and
   * reopen it just to add a face.
   */
  async function uploadPending(entryId: string) {
    if (!photo.pending) return;
    setUploading(true);
    const body = new FormData();
    body.set("entryId", entryId);
    body.set("image", photo.pending.file);
    const res = await fetch("/api/admin/content/team/photo", {
      method: "POST",
      body,
    });
    setUploading(false);
    if (res.ok) {
      photo.clear();
      return;
    }
    // The member saved even if this did not, so say which half failed.
    toast.push(
      "error",
      "The member saved, but the picture did not upload. Open them again and retry.",
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <EntityCrud<TeamMember & { id: string }>
        collection="team"
        rows={rows as (TeamMember & { id: string })[]}
        filter={matches}
        toolbar={
          <FilterBar
            query={query}
            onQuery={setQuery}
            placeholder="Search name or role"
            chips={[
              {
                label: "Status",
                value: status,
                onChange: setStatus,
                options: [
                  { value: "all", label: "All" },
                  { value: "current", label: "Current" },
                  { value: "past", label: "Past" },
                ],
              },
            ]}
          />
        }
        addLabel="Add a member"
        emptyLabel="Nobody here yet."
        reorderable
        afterSave={(saved) => uploadPending(saved.id)}
        onClose={photo.clear}
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
                name="team-status"
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
                preview={photo.pending?.preview}
                onPick={photo.pick}
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
