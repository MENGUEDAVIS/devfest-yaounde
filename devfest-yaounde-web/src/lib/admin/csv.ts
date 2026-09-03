/**
 * CSV in and out, safely.
 *
 * Both directions are an attack surface, and the dangerous one is the
 * direction people forget: EXPORT. A cell beginning `=`, `+`, `-`, `@`, tab
 * or carriage return is treated as a formula by Excel, Sheets and LibreOffice
 * when the file is opened — so a nickname of `=HYPERLINK("http://evil","Click")`
 * typed into the DP generator becomes a live link in an organiser's
 * spreadsheet. The data never has to be executed by us to hurt someone.
 *
 * OWASP calls this CSV injection. The fix is to prefix such a value with a
 * single quote, which spreadsheets read as "this is text".
 */

const FORMULA_START = /^[=+\-@\t\r]/;

/**
 * Make one value safe to put in a cell.
 *
 * Note the order: neutralise the formula first, then quote for CSV. Doing it
 * the other way round hides the leading character behind a quote and the
 * check stops matching.
 */
export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  let text = String(value);
  if (FORMULA_START.test(text)) text = `'${text}`;
  if (/[",\n\r]/.test(text)) text = `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers.map(csvCell).join(",")];
  for (const row of rows) lines.push(row.map(csvCell).join(","));
  // CRLF: what every spreadsheet expects, and what stops Excel merging rows.
  return lines.join("\r\n");
}

/** Anything that would make a spreadsheet run it rather than show it. */
export function looksLikeFormula(value: string): boolean {
  return FORMULA_START.test(value);
}

export interface ParsedCsv {
  headers: string[];
  rows: string[][];
}

/**
 * A small, strict CSV reader.
 *
 * Deliberately not a dependency: the job is a few hundred rows of organiser
 * spreadsheet, and the parsing rules that matter here — quoted fields,
 * doubled quotes, newlines inside quotes — are a dozen lines. A library would
 * be a new dependency and an ADR for something with no edge cases we care
 * about.
 *
 * It never evaluates anything. There is no expression support to abuse.
 */
export function parseCsv(text: string): ParsedCsv {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  const endField = () => {
    row.push(field);
    field = "";
  };
  const endRow = () => {
    endField();
    // Ignore the trailing newline's empty row.
    if (row.length > 1 || row[0] !== "") rows.push(row);
    row = [];
  };

  const source = text.replace(/^﻿/, ""); // strip a BOM from Excel
  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    if (quoted) {
      if (c === '"') {
        if (source[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += c;
      continue;
    }
    if (c === '"') quoted = true;
    else if (c === ",") endField();
    else if (c === "\n") endRow();
    else if (c === "\r") continue;
    else field += c;
  }
  if (field !== "" || row.length > 0) endRow();

  const headers = (rows.shift() ?? []).map((h) => h.trim());
  return { headers, rows };
}

export interface RowIssue {
  row: number;
  column: string;
  problem: string;
}

export interface DryRun {
  headers: string[];
  missingColumns: string[];
  unknownColumns: string[];
  rows: { values: Record<string, string>; issues: RowIssue[] }[];
  issues: RowIssue[];
}

/**
 * Check a file against a column spec and report, row by row, what is wrong.
 *
 * Reports rather than throws: an organiser with a 200-row sheet needs every
 * problem at once, not the first one.
 */
export function dryRun(
  parsed: ParsedCsv,
  spec: { column: string; required?: boolean; maxLength?: number }[],
): DryRun {
  const known = new Set(spec.map((s) => s.column));
  const missingColumns = spec
    .filter((s) => s.required && !parsed.headers.includes(s.column))
    .map((s) => s.column);
  const unknownColumns = parsed.headers.filter((h) => !known.has(h));

  const issues: RowIssue[] = [];
  const rows = parsed.rows.map((cells, index) => {
    const values: Record<string, string> = {};
    parsed.headers.forEach((h, i) => {
      values[h] = (cells[i] ?? "").trim();
    });

    const rowIssues: RowIssue[] = [];
    for (const rule of spec) {
      const value = values[rule.column] ?? "";
      if (rule.required && !value) {
        rowIssues.push({
          row: index + 2,
          column: rule.column,
          problem: "required, but empty",
        });
      }
      if (rule.maxLength && value.length > rule.maxLength) {
        rowIssues.push({
          row: index + 2,
          column: rule.column,
          problem: `longer than ${rule.maxLength} characters`,
        });
      }
      /* Flagged on the way IN as well as the way out. A sheet carrying
         formulas is either a mistake or an attempt, and either way an
         organiser should see it before it reaches anything. */
      if (value && looksLikeFormula(value)) {
        rowIssues.push({
          row: index + 2,
          column: rule.column,
          problem: "starts with a spreadsheet formula character",
        });
      }
    }
    issues.push(...rowIssues);
    return { values, issues: rowIssues };
  });

  return {
    headers: parsed.headers,
    missingColumns,
    unknownColumns,
    rows,
    issues,
  };
}

export const MAX_CSV_BYTES = 2 * 1024 * 1024;
export const MAX_CSV_ROWS = 2000;
