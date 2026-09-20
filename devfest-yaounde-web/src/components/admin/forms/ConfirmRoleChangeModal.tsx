"use client";

import { ShieldCheck, ShieldWarning } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import {
  confirmationMatches,
  type RoleAction,
} from "@/lib/admin/organiser-roles";

/**
 * The confirmation for giving or taking away admin access (PHASE23 §E).
 *
 * The same double-validation as every admin delete (`ConfirmDeleteModal`) —
 * a deliberate second action rather than a second click — and for the same
 * reason, because this is at least as consequential: it hands over, or
 * removes, control of the whole dashboard.
 *
 * What it will not do is undersell. Promoting is described as what it is:
 * full control over content, money and other people's data, including the
 * power to make more admins. Demoting says the loss is immediate.
 *
 * The typed address is checked here so the button stays disabled, but this is
 * convenience, not the control: the server checks it again against the real
 * account, so a request that never went through this screen is held to it too.
 */
export function ConfirmRoleChangeModal({
  action,
  target,
  isSelf,
  busy,
  error,
  onConfirm,
  onCancel,
}: {
  action: RoleAction;
  target: { name: string; email: string };
  /** The target is the person signed in — extra friction on demotion. */
  isSelf: boolean;
  busy: boolean;
  /** A refusal from the server, shown in place. */
  error: string | null;
  onConfirm: (input: { typedEmail: string; confirmSelf: boolean }) => void;
  onCancel: () => void;
}) {
  const [typed, setTyped] = useState("");
  const [understood, setUnderstood] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) {
        onCancel();
        return;
      }
      if (e.key === "Tab") {
        const node = dialogRef.current;
        if (!node) return;
        const focusable = node.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input, [tabindex]:not([tabindex="-1"])',
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
  }, [onCancel, busy]);

  const promote = action === "promote";
  const selfDemotion = !promote && isSelf;
  const nameMatches = confirmationMatches(typed, target.email);
  const ready = nameMatches && (!selfDemotion || understood) && !busy;

  return (
    <div className="fixed inset-0 z-80 flex items-center justify-center overflow-y-auto px-4 py-6">
      <button
        type="button"
        aria-label="Cancel"
        onClick={() => !busy && onCancel()}
        className="fixed inset-0 bg-black02/50"
      />
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="role-change-title"
        aria-describedby="role-change-body"
        className="relative flex w-full max-w-lg flex-col gap-4 rounded-lg border-2 border-black02 bg-offwhite p-6 shadow-[0_8px_0_0_var(--color-black02)]"
      >
        <div className="flex items-start gap-3">
          {promote ? (
            <ShieldCheck
              size={24}
              weight="fill"
              className="mt-0.5 shrink-0 text-black02"
              aria-hidden
            />
          ) : (
            <ShieldWarning
              size={24}
              weight="fill"
              className="mt-0.5 shrink-0 text-danger-ink"
              aria-hidden
            />
          )}
          <div>
            <h3
              id="role-change-title"
              className="font-sans text-body-l font-bold text-black02"
            >
              {promote
                ? `Make ${target.name} an admin?`
                : selfDemotion
                  ? "Remove your own admin access?"
                  : `Remove ${target.name}'s admin access?`}
            </h3>
            <p className="mt-1 break-all font-mono text-caption text-black02/70">
              {target.email}
              {isSelf && " (you)"}
            </p>
          </div>
        </div>

        <div
          id="role-change-body"
          className={`rounded-lg border-2 px-4 py-3 text-body-m text-black02 ${
            promote
              ? "border-black02/25 bg-pastel"
              : "border-danger bg-danger-pastel"
          }`}
        >
          {promote ? (
            <>
              <p className="font-bold">
                Admin access is full control of this dashboard — not just extra
                permissions.
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>Edit, publish and delete all site content.</li>
                <li>
                  See and change tickets, orders, transactions, discount codes
                  and every financial figure.
                </li>
                <li>
                  See other people&rsquo;s account data — names, email
                  addresses, what they bought.
                </li>
                <li>
                  <strong>
                    Make anyone else an admin, or remove any admin
                  </strong>{" "}
                  — including you.
                </li>
              </ul>
              <p className="mt-2">
                It takes effect immediately. Only give it to someone you would
                trust with the whole event&rsquo;s money and attendee data.
              </p>
            </>
          ) : (
            <>
              <p className="font-bold">
                {selfDemotion
                  ? "You will lose all admin access immediately."
                  : "They lose all admin access immediately."}
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>
                  {selfDemotion ? "Your" : "Their"} next request to the
                  dashboard, or to any admin action, is refused — including one
                  already open in another tab.
                </li>
                <li>
                  {selfDemotion ? "You" : "They"} can still sign in to the
                  public site as an ordinary attendee.
                </li>
                <li>
                  {selfDemotion
                    ? "Only another admin can give access back to you."
                    : "You can make them an admin again later."}
                </li>
              </ul>
            </>
          )}
          <p className="mt-2 text-caption text-black02/70">
            Every promotion and removal is recorded in the audit log with who
            made it and when.
          </p>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-caption font-bold uppercase tracking-wide text-black02/65">
            Type{" "}
            <span className="break-all font-mono normal-case text-black02">
              {target.email}
            </span>{" "}
            to confirm
          </span>
          <input
            ref={inputRef}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            disabled={busy}
            className="w-full rounded-lg border border-black02/25 bg-offwhite px-3 py-2 font-mono text-body-m text-black02 outline-none focus:border-black02"
          />
        </label>

        {selfDemotion && (
          <label className="flex items-start gap-2.5 text-body-m text-black02">
            <input
              type="checkbox"
              checked={understood}
              onChange={(e) => setUnderstood(e.target.checked)}
              disabled={busy}
              className="mt-1 h-5 w-5 shrink-0 rounded-sm border-2 border-black02 accent-[var(--color-primary)]"
            />
            <span>
              I understand I am removing <strong>my own</strong> admin access
              and will be locked out of this dashboard right away.
            </span>
          </label>
        )}

        {error && (
          <p
            role="alert"
            className="rounded-lg border-2 border-danger bg-danger-pastel px-4 py-3 text-body-m font-bold text-black02"
          >
            {error}
          </p>
        )}

        <div className="flex flex-wrap justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-pill border-2 border-black02 px-5 py-2 font-sans text-body-m font-bold text-black02 hover:bg-pastel disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!ready}
            onClick={() =>
              onConfirm({ typedEmail: typed.trim(), confirmSelf: selfDemotion })
            }
            className={`rounded-pill border-2 px-5 py-2 font-sans text-body-m font-bold disabled:cursor-not-allowed disabled:opacity-40 ${
              promote
                ? "border-black02 bg-primary text-black02 hover:bg-halftone"
                : "border-danger bg-danger-ink text-offwhite hover:opacity-90"
            }`}
          >
            {busy
              ? "Working…"
              : promote
                ? "Grant admin access"
                : "Remove admin access"}
          </button>
        </div>
      </div>
    </div>
  );
}
