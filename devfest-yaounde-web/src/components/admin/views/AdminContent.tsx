"use client";

import { useRef, useState } from "react";
import { UploadSimple } from "@phosphor-icons/react";
import {
  dryRun,
  parseCsv,
  MAX_CSV_BYTES,
  MAX_CSV_ROWS,
  type DryRun,
} from "@/lib/admin/csv";
import type { ContentCounts } from "../AdminShell";
import { DataTable, Panel, ReadOnlyNotice } from "./shared";

/** What a speakers sheet has to contain. Mirrors `src/data/speakers.json`. */
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
  file: string;
  count: (c: ContentCounts) => number;
}[] = [
  {
    label: "Speakers",
    file: "src/data/speakers.json",
    count: (c) => c.speakers,
  },
  { label: "Team", file: "src/data/team.json", count: (c) => c.team },
  {
    label: "Sessions",
    file: "src/data/sessions.json",
    count: (c) => c.sessions,
  },
  {
    label: "Sponsors",
    file: "src/data/sponsors.json",
    count: (c) => c.sponsors,
  },
  { label: "FAQs", file: "src/data/faqs.json", count: (c) => c.faqs },
  {
    label: "Products",
    file: "src/data/products.json",
    count: (c) => c.products,
  },
  {
    label: "Ticket tiers",
    file: "src/data/ticket-tiers.json",
    count: (c) => c.tiers,
  },
];

export function AdminContent({ content }: { content: ContentCounts }) {
  const [result, setResult] = useState<DryRun | null>(null);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  async function check(file: File | undefined) {
    setResult(null);
    setError(null);
    if (!file) return;
    // Size before reading: a refusal must not require loading the file first.
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

  return (
    <div className="flex flex-col gap-5">
      <Panel
        title="Content"
        subtitle="Everything the public site reads from its data files."
      >
        <ReadOnlyNotice>
          Read-only, and not because it is unfinished. This content lives in
          JSON files in the repository, and a deployed site cannot write to its
          own source — so editing it here would need it moved into a database or
          a CMS. That is an architecture decision with an ongoing cost:{" "}
          <strong>docs/decisions/0029-editorial-content-store.md</strong>.
          Editing today is `docs/guides/updating-content.md`.
        </ReadOnlyNotice>
        <DataTable
          headers={["What", "Records", "File"]}
          empty="No content files."
          rows={FILES.map((f) => [
            <span key="l" className="font-bold">
              {f.label}
            </span>,
            String(f.count(content)),
            <code key="f" className="font-mono text-caption">
              {f.file}
            </code>,
          ])}
        />
      </Panel>

      <Panel
        title="Check a speakers CSV"
        subtitle="Validates a sheet against the real schema and shows every problem at once."
      >
        {/*
          A dry run, and it STOPS THERE. There is nowhere to commit to — see
          the notice above — so there is no import button that would look like
          it saved. What this does is still worth having: it tells an organiser
          whether the sheet they are about to hand a developer is correct, and
          it is the same validation any future importer will need.
        */}
        <ReadOnlyNotice>
          Preview only. Nothing is saved, because there is nowhere to save it to
          yet. Use this to check a sheet before handing it over.
        </ReadOnlyNotice>

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

        {error && (
          <p className="mt-4 rounded-lg border-2 border-danger bg-danger-pastel px-4 py-3 text-body-m font-bold text-black02">
            {error}
          </p>
        )}

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
