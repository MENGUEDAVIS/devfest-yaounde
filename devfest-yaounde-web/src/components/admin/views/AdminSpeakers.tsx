"use client";

import { useState } from "react";
import { EVENT_DATES } from "@/lib/calendar";
import type { Speaker } from "@/data/types";
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
  Toggle,
} from "../forms/fields";
import { useToast } from "../forms/Toast";
import { InfoBanner } from "./shared";

const EMPTY = { fr: "", en: "" };

export function AdminSpeakers({ rows }: { rows: Speaker[] }) {
  const toast = useToast();
  const [uploading, setUploading] = useState(false);

  async function uploadPhoto(entryId: string, file: File) {
    setUploading(true);
    const body = new FormData();
    body.set("entryId", entryId);
    body.set("image", file);
    const res = await fetch("/api/admin/content/speakers/photo", {
      method: "POST",
      body,
    });
    setUploading(false);
    toast.push(
      res.ok ? "ok" : "error",
      res.ok
        ? "Photo saved. Reload to see it on the card."
        : "That photo did not upload.",
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {rows.length === 0 && (
        <InfoBanner>
          No speakers yet, so `/speakers` and the home section are showing the
          call for speakers. Add one here and they switch to the lineup.
        </InfoBanner>
      )}

      <EntityCrud<Speaker>
        collection="speakers"
        rows={rows}
        addLabel="Add a speaker"
        emptyLabel="No speakers announced yet."
        blank={() => ({
          id: "",
          name: "",
          role: { ...EMPTY },
          company: "",
          photoUrl: "",
          bio: { ...EMPTY },
          track: { ...EMPTY },
          day: 1,
          sessionIds: [],
          social: {},
          icebreakerQuestion: { ...EMPTY },
          icebreakerAnswer: { ...EMPTY },
        })}
        renderRow={(row) => (
          <div className="min-w-0">
            <p className="truncate font-sans text-body-m font-bold text-black02">
              {row.name}
              {row.featured && (
                <span className="ml-2 rounded-pill bg-primary px-2 py-0.5 font-mono text-caption font-bold uppercase text-black02">
                  featured
                </span>
              )}
            </p>
            <p className="truncate text-caption text-black02/60">
              {row.role.en} · {row.company} · day {row.day}
            </p>
          </div>
        )}
        renderForm={(draft, patch) => (
          <>
            <Field label="Name">
              <TextInput
                value={draft.name}
                onChange={(name) =>
                  patch(
                    draft.company || draft.bio.en
                      ? { name }
                      : { name, id: slugify(name) },
                  )
                }
              />
            </Field>

            <Field
              label="Id"
              hint="Used in URLs. Do not change it once it exists."
            >
              <TextInput value={draft.id} onChange={(id) => patch({ id })} />
            </Field>

            <Field label="Role">
              <LocalizedInput
                value={draft.role}
                onChange={(role) => patch({ role })}
              />
            </Field>

            <Field label="Company">
              <TextInput
                value={draft.company}
                onChange={(company) => patch({ company })}
              />
            </Field>

            <Field label="Photo">
              <ImageField
                url={draft.photoUrl}
                name={draft.name}
                busy={uploading}
                disabled={!rows.some((r) => r.id === draft.id)}
                disabledHint="Save first — the upload attaches the picture to an existing speaker."
                onPick={(file) => void uploadPhoto(draft.id, file)}
              />
            </Field>

            <Field label="Bio">
              <LocalizedInput
                multiline
                value={draft.bio}
                onChange={(bio) => patch({ bio })}
              />
            </Field>

            <Field label="Track" hint="Drives the filter on /speakers.">
              <LocalizedInput
                value={draft.track}
                onChange={(track) => patch({ track })}
              />
            </Field>

            {/*
              Days come from EVENT_DATES, so this cannot offer a day the event
              does not have — and it shows the real date rather than a number
              nobody can check.
            */}
            <Field label="Day">
              <Segmented
                name={`speaker-day-${draft.id || "new"}`}
                value={String(draft.day)}
                options={EVENT_DATES.map((date, i) => ({
                  value: String(i + 1),
                  label: `Day ${i + 1} — ${new Date(`${date}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`,
                }))}
                onChange={(v) => patch({ day: Number(v) })}
              />
            </Field>

            <Field label="Sessions" hint="Session ids this speaker appears in.">
              <ChipInput
                values={draft.sessionIds}
                onChange={(sessionIds) => patch({ sessionIds })}
                placeholder="opening-keynote"
              />
            </Field>

            <Field label="Links">
              <SocialLinks
                value={draft.social ?? {}}
                onChange={(social) => patch({ social })}
              />
            </Field>

            <Field label="Icebreaker question">
              <LocalizedInput
                value={draft.icebreakerQuestion}
                onChange={(icebreakerQuestion) => patch({ icebreakerQuestion })}
              />
            </Field>

            <Field label="Their answer">
              <LocalizedInput
                multiline
                value={draft.icebreakerAnswer}
                onChange={(icebreakerAnswer) => patch({ icebreakerAnswer })}
              />
            </Field>

            <Toggle
              checked={Boolean(draft.featured)}
              onChange={(v) => patch({ featured: v || undefined })}
              label="Feature on the home page"
              hint="Featured speakers appear in the slider on the front page."
            />
          </>
        )}
      />
    </div>
  );
}
