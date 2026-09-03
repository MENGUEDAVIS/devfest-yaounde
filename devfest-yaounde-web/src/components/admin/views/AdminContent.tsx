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
import type { ContentCounts } from "../AdminShell";
import { DataTable, Panel } from "./shared";

const SPEAKER_SPEC = [
  { column: "id", required: true, maxLength: 60 },
  { column: "name", required: true, maxLength: 120 },
  { column: "role_en", required: true, maxLength: 160 },
  { column: "role_fr", required: true, maxLength: 160 },
  { column: "company", maxLength: 120 },
  { column: "bio_en", maxLength: 600 },
  { column: "bio_fr", maxLength: 600 },
  { column: "photoUrl", maxLength: 300 },
];

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

export function AdminContent({ content }: { content: ContentCounts }) {
  const [result, setResult] = useState<DryRun | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const jsonInput = useRef<HTMLInputElement>(null);
  const [jsonTarget, setJsonTarget] = useState<string | null>(null);

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
    setResult(dryRun(parsed, SPEAKER_SPEC));
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

  async function publishJson(id: string, file: File | undefined) {
    if (!file) return;
    setError(null);
    setNotice(null);
    setBusy(id);
    try {
      const payload = JSON.parse(await file.text()) as unknown;
      const res = await fetch(`/api/admin/content/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload }),
      });
      const body = (await res.json().catch(() => null)) as {
        error?: string;
        detail?: string;
      } | null;
      if (!res.ok) {
        setError(body?.detail ?? body?.error ?? "Publish failed.");
        return;
      }
      setNotice(`${id} published. Reload to see the new counts.`);
    } catch {
      setError("That file is not valid JSON.");
    } finally {
      setBusy(null);
      setJsonTarget(null);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <Panel
        title="Content"
        subtitle="Live collections. Until you publish, the site still reads the JSON files in the repo."
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
        {notice && (
          <p className="mt-4 rounded-lg border-2 border-black02 bg-success-pastel px-4 py-3 text-body-m font-bold text-black02">
            {notice}
          </p>
        )}
        {error && (
          <p className="mt-4 rounded-lg border-2 border-danger bg-danger-pastel px-4 py-3 text-body-m font-bold text-black02">
            {error}
          </p>
        )}
      </Panel>

      <Panel
        title="Check a speakers CSV"
        subtitle="Validates a sheet against the speakers columns. Publishing still happens as JSON above."
      >
        <button
          type="button"
          onClick={() => input.current?.click()}
          className="inline-flex items-center gap-2 rounded-pill border-2 border-black02 bg-primary px-5 py-2.5 font-sans text-body-m font-bold text-black02"
        >
          <UploadSimple size={18} weight="bold" aria-hidden />
          Choose a CSV
        </button>
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
              empty="No problems found — the sheet matches the schema."
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
    </div>
  );
}
