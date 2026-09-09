"use client";

import { Plus, X } from "@phosphor-icons/react";
import { useCallback, useId, useRef, useState } from "react";
import type { ReactNode } from "react";

/**
 * The admin's input vocabulary.
 *
 * The brief asked for controls that match the data rather than a column of
 * identical text boxes, and that is a usability point rather than a
 * decorative one: a segmented control shows both options at once, a chip
 * input shows what is already there, a switch shows its state without being
 * read. Every one of these is still an ordinary form control underneath —
 * real labels, real focus, keyboard-operable — because "playful" must not
 * cost an organiser the ability to tab through a form.
 */

export function Field({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={htmlFor}
        className="font-mono text-mono-tag font-bold uppercase tracking-wide text-black02/70"
      >
        {label}
      </label>
      {children}
      {hint && <p className="text-caption text-black02/60">{hint}</p>}
    </div>
  );
}

const INPUT =
  "w-full rounded-lg border border-black02/25 bg-offwhite px-3 py-2 font-sans text-body-m text-black02 outline-none transition-colors focus:border-black02";

export function TextInput({
  value,
  onChange,
  placeholder,
  id,
  type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  id?: string;
  type?: string;
}) {
  return (
    <input
      id={id}
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={INPUT}
    />
  );
}

export function TextArea({
  value,
  onChange,
  rows = 3,
  id,
}: {
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  id?: string;
}) {
  return (
    <textarea
      id={id}
      rows={rows}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`${INPUT} resize-y`}
    />
  );
}

/**
 * A French and an English box, side by side.
 *
 * Almost every editable string on this site is bilingual, and the two are
 * shown TOGETHER on purpose: a translation written next to its original is a
 * translation, and one written on a separate screen is a guess. It is also
 * the only arrangement where a missing half is obvious.
 */
export function LocalizedInput({
  value,
  onChange,
  multiline = false,
}: {
  value: { fr: string; en: string };
  onChange: (v: { fr: string; en: string }) => void;
  multiline?: boolean;
}) {
  const base = useId();
  const Control = multiline ? TextArea : TextInput;
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {(["en", "fr"] as const).map((lang) => (
        <div key={lang} className="flex flex-col gap-1">
          <label
            htmlFor={`${base}-${lang}`}
            className="font-mono text-caption font-bold uppercase text-black02/45"
          >
            {lang}
          </label>
          <Control
            id={`${base}-${lang}`}
            value={value[lang] ?? ""}
            onChange={(v: string) => onChange({ ...value, [lang]: v })}
          />
        </div>
      ))}
    </div>
  );
}

/** A switch. Reads as on/off at a glance, and is a real checkbox underneath. */
export function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    /*
      `relative` is load-bearing, not decoration.

      The input below is `sr-only`, which is `position: absolute`. Without a
      positioned ancestor here it anchors to the nearest one — the edit
      drawer's panel — so the real input sat at the panel's top-left corner
      while its switch was drawn hundreds of pixels lower. Clicking the switch
      focused an element the browser then scrolled into view, yanking the
      scroll container and making the whole drawer appear to jump and resize.

      Anchoring it to its own label puts the input where it looks like it is.
    */
    <label className="relative flex cursor-pointer items-start gap-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className={`mt-0.5 flex h-6 w-11 shrink-0 items-center rounded-pill border-2 border-black02 p-0.5 transition-colors peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 ${
          checked ? "bg-primary" : "bg-black02/10"
        }`}
      >
        <span
          className={`h-4 w-4 rounded-pill bg-black02 transition-transform motion-reduce:transition-none ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </span>
      <span className="min-w-0">
        <span className="block text-body-m font-bold text-black02">
          {label}
        </span>
        {hint && (
          <span className="block text-caption text-black02/60">{hint}</span>
        )}
      </span>
    </label>
  );
}

/**
 * A segmented control — every option visible, one selected.
 *
 * Used where a dropdown would hide the alternatives behind a click and the
 * set is small and stable: a team member is current or past, a sponsor sits
 * in one tier. Real radios underneath, so arrow keys work.
 */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  name,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  /**
   * Groups the radios. A CONSTANT per field, not per record: the drawer holds
   * one record at a time, so there is nothing to disambiguate — and a name
   * built from `draft.id` changes on every keystroke while the id is being
   * slugified from the name, which is a group that keeps re-forming under the
   * pointer.
   */
  name: string;
}) {
  return (
    <div
      role="radiogroup"
      className="inline-flex flex-wrap gap-1 rounded-pill border border-black02/25 bg-offwhite p-1"
    >
      {options.map((option) => (
        /* `relative` for the same reason as `Toggle` — see the note there. */
        <label key={option.value} className="relative cursor-pointer">
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
            className="peer sr-only"
          />
          <span
            className={`block rounded-pill px-3.5 py-1.5 font-sans text-body-m font-bold transition-colors peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 ${
              value === option.value
                ? "bg-primary text-black02"
                : "text-black02/60 hover:bg-black02/5 hover:text-black02"
            }`}
          >
            {option.label}
          </span>
        </label>
      ))}
    </div>
  );
}

/**
 * Chips you can add and remove — session ids, tracks, anything list-shaped.
 *
 * A comma-separated text box was the alternative, and it makes the person do
 * the parsing: they cannot see where one value ends, and a stray comma
 * silently splits a value in half. Chips show exactly what is stored.
 */
export function ChipInput({
  values,
  onChange,
  placeholder,
  id,
}: {
  values: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  id?: string;
}) {
  const [draft, setDraft] = useState("");

  function commit() {
    const value = draft.trim();
    // Silently ignoring a duplicate is right: the person's intent is "this
    // should be in the list", and it already is.
    if (value && !values.includes(value)) onChange([...values, value]);
    setDraft("");
  }

  return (
    <div className="flex flex-col gap-2">
      {values.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {values.map((value) => (
            <li key={value}>
              <span className="inline-flex items-center gap-1.5 rounded-pill border border-black02/25 bg-pastel px-2.5 py-1 font-mono text-caption text-black02">
                {value}
                <button
                  type="button"
                  onClick={() => onChange(values.filter((v) => v !== value))}
                  aria-label={`Remove ${value}`}
                  className="rounded-pill p-0.5 text-black02/60 hover:bg-black02/10 hover:text-black02"
                >
                  <X size={11} weight="bold" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <input
          id={id}
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            // Enter must not submit the surrounding form — here it means
            // "finish this chip".
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              commit();
            }
            if (e.key === "Backspace" && !draft && values.length > 0) {
              onChange(values.slice(0, -1));
            }
          }}
          onBlur={commit}
          className={INPUT}
        />
        <button
          type="button"
          onClick={commit}
          aria-label="Add"
          className="shrink-0 rounded-lg border border-black02/25 px-3 text-black02 hover:bg-pastel"
        >
          <Plus size={16} weight="bold" />
        </button>
      </div>
    </div>
  );
}

/** The x / LinkedIn / website trio, as one control. */
export function SocialLinks({
  value,
  onChange,
}: {
  value: { x?: string; linkedin?: string; website?: string };
  onChange: (v: { x?: string; linkedin?: string; website?: string }) => void;
}) {
  const base = useId();
  const rows: { key: "x" | "linkedin" | "website"; label: string }[] = [
    { key: "x", label: "X" },
    { key: "linkedin", label: "LinkedIn" },
    { key: "website", label: "Website / bio" },
  ];
  return (
    <div className="flex flex-col gap-2">
      {rows.map(({ key, label }) => (
        <div key={key} className="flex items-center gap-2">
          <label
            htmlFor={`${base}-${key}`}
            className="w-24 shrink-0 font-mono text-caption font-bold uppercase text-black02/45"
          >
            {label}
          </label>
          <input
            id={`${base}-${key}`}
            value={value[key] ?? ""}
            placeholder="https://…"
            onChange={(e) =>
              // Empty means "no link", which must be absent rather than an
              // empty string — the site filters on the field being missing.
              onChange({ ...value, [key]: e.target.value || undefined })
            }
            className={INPUT}
          />
        </div>
      ))}
    </div>
  );
}

/**
 * A picture, with the picture shown.
 *
 * Uploading happens through `POST /api/admin/content/:id/photo`, which
 * requires the entry to exist already — names first, photos second. So a
 * brand-new record saves itself before its picture goes up, and this control
 * says so rather than failing at the end.
 */
/**
 * A picture, saved or about to be.
 *
 * IT USED TO REFUSE A NEW RECORD. The upload endpoint attaches a photo to an
 * existing entry, so the button was disabled until the record had been saved
 * once — which meant filling a form, saving, finding the record again,
 * reopening it and only then adding the picture. Nobody thinks of a person
 * and their photograph as two separate errands.
 *
 * Now a picked file is held in the form and previewed immediately, and the
 * save does both things in the order the server needs: write the record, then
 * attach the photo to the record that now exists. Same endpoint, same rule —
 * the form absorbs the two-step instead of exposing it.
 */
export function ImageField({
  url,
  name,
  preview,
  disabled,
  disabledHint,
  onPick,
  busy,
}: {
  url: string;
  name: string;
  /** A local object URL for a file chosen but not yet uploaded. */
  preview?: string | null;
  disabled?: boolean;
  disabledHint?: string;
  onPick: (file: File) => void;
  busy?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const saved = Boolean(url && url.trim() && !url.startsWith("/placeholders/"));
  const shown = preview ?? (saved ? url : null);
  const has = Boolean(shown);

  return (
    <div className="flex items-center gap-4">
      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-black02/20 bg-pastel">
        {shown ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shown} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center font-sans text-heading-m font-bold text-black02/35">
            {(name.trim()[0] ?? "?").toUpperCase()}
          </div>
        )}
      </div>
      {/* `relative` anchors the sr-only file input here rather than at the
          drawer panel — see the note on `Toggle`. */}
      <div className="relative flex min-w-0 flex-col gap-1.5">
        <button
          type="button"
          disabled={disabled || busy}
          onClick={() => input.current?.click()}
          className="w-fit rounded-pill border border-black02/25 px-4 py-1.5 font-sans text-body-m font-bold text-black02 hover:bg-pastel disabled:cursor-not-allowed disabled:opacity-45"
        >
          {busy ? "Uploading…" : has ? "Replace photo" : "Upload photo"}
        </button>
        {disabled && disabledHint && (
          <p className="text-caption text-black02/60">{disabledHint}</p>
        )}
        {preview && !busy && (
          <p className="text-caption text-black02/60">
            Chosen — it uploads when you save.
          </p>
        )}
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onPick(file);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}

/**
 * A photograph chosen in a form but not uploaded yet.
 *
 * The object URL is created and revoked in the EVENT HANDLER, never in render
 * or an effect. `URL.createObjectURL` is a side effect that allocates: doing
 * it while rendering leaks a blob on every re-render, and doing it in an
 * effect means a `setState` in an effect body, which the lint rules refuse
 * for good reason. A click is exactly the right place for it.
 *
 * The previous URL is revoked before a replacement is made, so choosing four
 * photos in a row holds one blob, not four.
 */
export function usePendingPhoto() {
  const [pending, setPending] = useState<{
    file: File;
    preview: string;
  } | null>(null);
  const live = useRef<string | null>(null);

  const pick = useCallback((file: File) => {
    if (live.current) URL.revokeObjectURL(live.current);
    const preview = URL.createObjectURL(file);
    live.current = preview;
    setPending({ file, preview });
  }, []);

  const clear = useCallback(() => {
    if (live.current) URL.revokeObjectURL(live.current);
    live.current = null;
    setPending(null);
  }, []);

  return { pending, pick, clear };
}

/**
 * Search plus a few chips, above a list.
 *
 * Kept deliberately small. These lists are tens of records, not thousands —
 * the job is "find the one I came here to edit", which a name box and two or
 * three chips solve. A faceted panel would be more machinery than the data
 * justifies.
 *
 * The chips are a `Segmented` in everything but name; they are separate
 * because these are FILTERS, where "All" is a real option and the group can
 * be cleared, rather than a value the record has to have.
 */
export function FilterBar({
  query,
  onQuery,
  placeholder,
  chips,
}: {
  query: string;
  onQuery: (v: string) => void;
  placeholder: string;
  chips?: {
    label: string;
    value: string;
    options: { value: string; label: string }[];
    onChange: (v: string) => void;
  }[];
}) {
  const id = useId();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="relative">
        <label htmlFor={id} className="sr-only">
          {placeholder}
        </label>
        <input
          id={id}
          type="search"
          value={query}
          placeholder={placeholder}
          onChange={(e) => onQuery(e.target.value)}
          className="w-56 rounded-pill border border-black02/25 bg-offwhite px-4 py-1.5 font-sans text-body-m text-black02"
        />
      </span>

      {chips?.map((chip) => (
        <span key={chip.label} className="flex items-center gap-1.5">
          <span className="sr-only">{chip.label}</span>
          <span className="inline-flex flex-wrap gap-1 rounded-pill border border-black02/25 bg-offwhite p-1">
            {chip.options.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={chip.value === option.value}
                onClick={() => chip.onChange(option.value)}
                className={`rounded-pill px-3 py-1 font-sans text-caption font-bold transition-colors ${
                  chip.value === option.value
                    ? "bg-primary text-black02"
                    : "text-black02/60 hover:bg-black02/5 hover:text-black02"
                }`}
              >
                {option.label}
              </button>
            ))}
          </span>
        </span>
      ))}
    </div>
  );
}
