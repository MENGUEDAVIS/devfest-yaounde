"use client";

import { useRef, useState } from "react";
import { DownloadSimple, UploadSimple } from "@phosphor-icons/react";
import {
  dryRun,
  parseCsv,
  MAX_CSV_BYTES,
  MAX_CSV_ROWS,
  type DryRun,
} from "@/lib/admin/csv";
import {
  SPEAKER_CSV_SPEC,
  TEAM_CSV_SPEC,
  speakersFromCsv,
  teamFromCsv,
} from "@/lib/content/from-csv";
import type { Speaker, TeamMember } from "@/data/types";
import type { MissingPhoto } from "@/lib/admin/shape";
import type { ContentCounts } from "../AdminShell";
import { DataTable, Panel } from "./shared";

const FILES: {
  label: string;
  id: string;
  count: (c: ContentCounts) => number;
}[] = [
  { label: "Speakers", id: "speakers", count: (c) => c.speakers },
  { label: "Team", id: "team", count: (c) => c.team },
  { label: "Sessions", id: "sessions", count: (c) => c.sessions },
  { label: "Sponsors", id: "sponsors", count: (c) => c.sponsors },
  { label: "FAQs", id: "faqs", count: (c) => c.faqs },
  { label: "Products", id: "products", count: (c) => c.products },
  { label: "Ticket tiers", id: "ticket-tiers", count: (c) => c.tiers },
];

const PHOTO_LIST: { id: string; label: string; field: "photoUrl" | "logoUrl" }[] =
  [
    { id: "speakers", label: "Speakers", field: "photoUrl" },
    { id: "team", label: "Team", field: "photoUrl" },
    { id: "sponsors", label: "Sponsors", field: "logoUrl" },
  ];

function needsPhoto(url: unknown): boolean {
  if (typeof url !== "string") return true;
  const value = url.trim();
  if (!value || value === "#") return true;
  return value.includes("/placeholders/");
}

export function AdminContent({
  content,
  initialMissing,
}: {
  content: ContentCounts;
  initialMissing: MissingPhoto[];
}) {
  const [result, setResult] = useState<DryRun | null>(null);
  const [csvKind, setCsvKind] = useState<"speakers" | "team">("speakers");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [missing, setMissing] = useState<MissingPhoto[]>(initialMissing);
  const input = useRef<HTMLInputElement>(null);
  const jsonInput = useRef<HTMLInputElement>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const [jsonTarget, setJsonTarget] = useState<string | null>(null);
  const [photoTarget, setPhotoTarget] = useState<MissingPhoto | null>(null);

  async function refreshMissing() {
    const rows: MissingPhoto[] = [];
    for (const col of PHOTO_LIST) {
      const res = await fetch(`/api/admin/content/${col.id}`);
      if (!res.ok) continue;
      const body = (await res.json()) as {
        payload?: { id?: unknown; name?: unknown }[];
      };
      for (const entry of body.payload ?? []) {
        if (typeof entry.id !== "string") continue;
        const record = entry as Record<string, unknown>;
        if (!needsPhoto(record[col.field])) continue;
        rows.push({
          collection: col.id,
          collectionLabel: col.label,
          id: entry.id,
          name: typeof entry.name === "string" ? entry.name : entry.id,
        });
      }
    }
    setMissing(rows);
  }

  async function check(file: File | undefined) {
    setResult(null);
    setError(null);
    if (!file) return;
    if (file.size > MAX_CSV_BYTES) {
      setError(
        `That file is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is 2 MB.`,
      );
      return;
    }
    if (!/\.csv$/i.test(file.name) && file.type !== "text/csv") {
      setError("That is not a .csv file.");
      return;
    }
    const parsed = parseCsv(await file.text());
    if (parsed.rows.length > MAX_CSV_ROWS) {
      setError(`${parsed.rows.length} rows. The limit is ${MAX_CSV_ROWS}.`);
      return;
    }
    const spec = csvKind === "speakers" ? SPEAKER_CSV_SPEC : TEAM_CSV_SPEC;
    setResult(dryRun(parsed, spec));
  }

  async function download(id: string) {
    setError(null);
    const res = await fetch(`/api/admin/content/${id}`);
    if (!res.ok) {
      setError("Could not load that collection.");
      return;
    }
    const { payload } = (await res.json()) as { payload: unknown };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function publishPayload(id: string, payload: unknown, label: string) {
    setError(null);
    setNotice(null);
    setBusy(id);
    const res = await fetch(`/api/admin/content/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payload }),
    });
    const body = (await res.json().catch(() => null)) as {
      error?: string;
      detail?: string;
    } | null;
    setBusy(null);
    if (!res.ok) {
      setError(body?.detail ?? body?.error ?? "Publish failed.");
      return;
    }
    setNotice(`${label} published. Attach photos below for anyone still missing one.`);
    await refreshMissing();
  }

  async function publishJson(id: string, file: File | undefined) {
    if (!file) return;
    try {
      const payload = JSON.parse(await file.text()) as unknown;
      await publishPayload(id, payload, id);
    } catch {
      setError("That file is not valid JSON.");
      setBusy(null);
    } finally {
      setJsonTarget(null);
    }
  }

  async function publishCsv() {
    if (!result || result.issues.length > 0 || result.missingColumns.length > 0) {
      return;
    }
    const current = await fetch(`/api/admin/content/${csvKind}`);
    const previous = current.ok
      ? ((await current.json()) as { payload?: unknown }).payload
      : [];
    const payload =
      csvKind === "speakers"
        ? speakersFromCsv(result, (previous as Speaker[]) ?? [])
        : teamFromCsv(result, (previous as TeamMember[]) ?? []);
    await publishPayload(csvKind, payload, csvKind);
  }

  async function uploadPhoto(row: MissingPhoto, file: File | undefined) {
    if (!file) return;
    setError(null);
    setNotice(null);
    setBusy(`${row.collection}:${row.id}`);
    const form = new FormData();
    form.set("entryId", row.id);
    form.set("image", file);
    const res = await fetch(`/api/admin/content/${row.collection}/photo`, {
      method: "POST",
      body: form,
    });
    const body = (await res.json().catch(() => null)) as {
      error?: string;
    } | null;
    setBusy(null);
    setPhotoTarget(null);
    if (!res.ok) {
      const reason =
        body?.error === "too_large"
          ? "That file is over 2.5 MB."
          : body?.error === "not_an_image"
            ? "That is not an image."
            : body?.error === "too_big_dimensions"
              ? "That image is too large in pixels."
              : "Could not upload the photo.";
      setError(reason);
      return;
    }
    setNotice(`Photo saved for ${row.name}.`);
    await refreshMissing();
  }

  const csvReady =
    result &&
    result.issues.length === 0 &&
    result.missingColumns.length === 0 &&
    result.rows.length > 0;

  return (
    <div className="flex flex-col gap-5">
      <Panel
        title="Content"
        subtitle="1. Publish the names (JSON or CSV). 2. Attach photos to whoever is still missing one."
      >
        <DataTable
          headers={["What", "Records", ""]}
          empty="No content files."
          rows={FILES.map((f) => [
            <span key="l" className="font-bold">
              {f.label}
            </span>,
            String(f.count(content)),
            <span key="a" className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void download(f.id)}
                className="inline-flex items-center gap-1 rounded-pill border-2 border-black02 px-3 py-1 text-caption font-bold"
              >
                <DownloadSimple size={14} weight="bold" aria-hidden />
                JSON
              </button>
              <button
                type="button"
                onClick={() => {
                  setJsonTarget(f.id);
                  jsonInput.current?.click();
                }}
                disabled={busy === f.id}
                className="inline-flex items-center gap-1 rounded-pill border-2 border-black02 bg-primary px-3 py-1 text-caption font-bold disabled:opacity-50"
              >
                <UploadSimple size={14} weight="bold" aria-hidden />
                {busy === f.id ? "Saving…" : "Publish JSON"}
              </button>
            </span>,
          ])}
        />
        <input
          ref={jsonInput}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (jsonTarget) void publishJson(jsonTarget, file);
          }}
        />
      </Panel>

      <Panel
        title="Photos still needed"
        subtitle="Empty, #, or a placeholder path. One file per row — the face you pick is the face that goes up."
      >
        <DataTable
          headers={["Collection", "Id", "Name", ""]}
          empty="Every profile has a real photo."
          rows={missing.map((row) => [
            row.collectionLabel,
            <code key="id" className="font-mono text-caption">
              {row.id}
            </code>,
            row.name,
            <button
              key="u"
              type="button"
              disabled={busy === `${row.collection}:${row.id}`}
              onClick={() => {
                setPhotoTarget(row);
                photoInput.current?.click();
              }}
              className="rounded-pill border-2 border-black02 bg-primary px-3 py-1 text-caption font-bold disabled:opacity-50"
            >
              {busy === `${row.collection}:${row.id}`
                ? "Uploading…"
                : "Upload photo"}
            </button>,
          ])}
        />
        <input
          ref={photoInput}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/*"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (photoTarget) void uploadPhoto(photoTarget, file);
          }}
        />
      </Panel>

      <Panel
        title="Publish a CSV of names"
        subtitle="Basic fields only. Photos can wait — existing pictures are kept if the sheet leaves photoUrl empty."
      >
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <label className="text-caption font-bold uppercase tracking-wide text-black02/70">
            Sheet is
            <select
              className="ml-2 rounded-lg border-2 border-black02 bg-offwhite px-3 py-2 font-sans text-body-m text-black02"
              value={csvKind}
              onChange={(e) => {
                setCsvKind(e.target.value as "speakers" | "team");
                setResult(null);
              }}
            >
              <option value="speakers">speakers</option>
              <option value="team">team</option>
            </select>
          </label>
          <button
            type="button"
            onClick={() => input.current?.click()}
            className="inline-flex items-center gap-2 rounded-pill border-2 border-black02 bg-primary px-5 py-2.5 font-sans text-body-m font-bold text-black02"
          >
            <UploadSimple size={18} weight="bold" aria-hidden />
            Choose a CSV
          </button>
          {csvReady && (
            <button
              type="button"
              onClick={() => void publishCsv()}
              disabled={busy === csvKind}
              className="inline-flex items-center gap-2 rounded-pill border-2 border-black02 px-5 py-2.5 font-sans text-body-m font-bold text-black02 disabled:opacity-50"
            >
              {busy === csvKind ? "Publishing…" : `Publish ${csvKind}`}
            </button>
          )}
        </div>
        <input
          ref={input}
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          onChange={(e) => void check(e.target.files?.[0])}
        />

        {result && (
          <div className="mt-5 flex flex-col gap-4">
            <p className="text-body-m font-bold text-black02">
              {result.rows.length} rows · {result.issues.length} problems
            </p>
            {result.missingColumns.length > 0 && (
              <p className="rounded-lg border-2 border-danger bg-danger-pastel px-4 py-3 text-body-m text-black02">
                Missing required columns: {result.missingColumns.join(", ")}
              </p>
            )}
            {result.unknownColumns.length > 0 && (
              <p className="rounded-lg border-2 border-black02 bg-pastel px-4 py-3 text-body-m text-black02">
                Columns that would be ignored:{" "}
                {result.unknownColumns.join(", ")}
              </p>
            )}
            <DataTable
              headers={["Row", "Column", "Problem"]}
              empty="No problems found — you can publish this sheet."
              rows={result.issues.slice(0, 100).map((i) => [
                String(i.row),
                <code key="c" className="font-mono text-caption">
                  {i.column}
                </code>,
                i.problem,
              ])}
            />
          </div>
        )}
      </Panel>

      {notice && (
        <p className="rounded-lg border-2 border-black02 bg-success-pastel px-4 py-3 text-body-m font-bold text-black02">
          {notice}
        </p>
      )}
      {error && (
        <p className="rounded-lg border-2 border-danger bg-danger-pastel px-4 py-3 text-body-m font-bold text-black02">
          {error}
        </p>
      )}
    </div>
  );
}
