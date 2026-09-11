"use client";

import { Warning } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";

/**
 * The double-confirmation every admin delete goes through.
 *
 * A single "Delete" pill (the previous behaviour in `EntityCrud`) is one
 * mis-click from destroying a real record. This asks for a deliberate second
 * action — typing the record's id — rather than a second click, which is too
 * easy to fire as fast as the first.
 *
 * `impact` optionally BLOCKS the delete outright, for records an integrity
 * rule says should never be hard-deleted (a tier with sold tickets, a product
 * linked to real orders) — the confirm control stays disabled and the reason
 * is stated plainly rather than left to be discovered as a 500.
 */
export function ConfirmDeleteModal({
  id,
  label,
  impact,
  busy,
  onConfirm,
  onCancel,
}: {
  /** The record's id — typed back to confirm. */
  id: string;
  /** What is being deleted, for the heading (e.g. "sponsor \"Acme\""). */
  label: string;
  impact: { blocked: boolean; message: string } | null;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [typed, setTyped] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onCancel();
        return;
      }
      // A minimal focus trap: Tab never leaves the dialog.
      if (e.key === "Tab") {
        const node = dialogRef.current;
        if (!node) return;
        const focusable = node.querySelectorAll<HTMLElement>(
          'button, input, [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onCancel]);

  const matches = typed.trim() === id;
  const canDelete = matches && !impact?.blocked;

  return (
    <div className="fixed inset-0 z-80 flex items-center justify-center px-4">
      <button
        type="button"
        aria-label="Cancel"
        onClick={onCancel}
        className="absolute inset-0 bg-black02/50"
      />
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-delete-title"
        className="relative flex w-full max-w-md flex-col gap-4 rounded-lg border-2 border-black02 bg-offwhite p-6 shadow-[0_8px_0_0_var(--color-black02)]"
      >
        <div className="flex items-start gap-3">
          <Warning
            size={22}
            weight="fill"
            className="mt-0.5 shrink-0 text-danger"
            aria-hidden
          />
          <div>
            <h3
              id="confirm-delete-title"
              className="font-sans text-body-l font-bold text-black02"
            >
              Delete {label}?
            </h3>
            <p className="mt-1 text-body-m text-black02/70">
              This cannot be undone.
            </p>
          </div>
        </div>

        {impact && (
          <p
            className={`rounded-lg border-2 px-4 py-3 text-body-m ${
              impact.blocked
                ? "border-danger bg-danger-pastel text-black02"
                : "border-black02/25 bg-pastel text-black02/80"
            }`}
          >
            {impact.message}
          </p>
        )}

        {!impact?.blocked && (
          <label className="flex flex-col gap-1.5">
            <span className="text-caption font-bold uppercase tracking-wide text-black02/60">
              Type <span className="font-mono text-black02">{id}</span> to
              confirm
            </span>
            <input
              ref={inputRef}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && canDelete) onConfirm();
              }}
              className="rounded-lg border-2 border-black02 bg-offwhite px-4 py-2.5 font-mono text-body-m text-black02"
              autoComplete="off"
              spellCheck={false}
            />
          </label>
        )}

        <div className="mt-2 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-pill border border-black02/25 px-4 py-2 font-sans text-body-m font-bold text-black02"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canDelete || busy}
            onClick={onConfirm}
            className="rounded-pill bg-danger px-5 py-2 font-sans text-body-m font-bold text-offwhite disabled:opacity-40"
          >
            {busy ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
