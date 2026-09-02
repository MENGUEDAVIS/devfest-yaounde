"use client";

import { Check } from "@phosphor-icons/react";

/**
 * The step indicator, shared by the ticket and shop checkouts.
 *
 * Progress is carried by text and a number, not by colour alone: the current
 * step is named, completed ones get a tick, and the fill is a reinforcement
 * rather than the signal (DESIGN.md §2.6).
 */
export function CheckoutSteps({
  steps,
  current,
  label,
}: {
  steps: { key: string; label: string }[];
  current: number;
  label: (key: string) => string;
}) {
  return (
    <ol className="mb-10 flex flex-wrap items-center gap-x-3 gap-y-2">
      {steps.map((step, i) => (
        <li key={step.key} className="flex items-center gap-3">
          <span
            aria-current={i === current ? "step" : undefined}
            className={`flex items-center gap-2 font-mono text-mono-tag font-bold uppercase tracking-wide ${
              i <= current ? "text-black02" : "text-black02/40"
            }`}
          >
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-pill border-2 border-black02 text-caption ${
                i < current
                  ? "bg-black02 text-offwhite"
                  : i === current
                    ? "bg-primary text-black02"
                    : "bg-transparent text-black02/40"
              }`}
            >
              {i < current ? <Check size={12} weight="bold" /> : i + 1}
            </span>
            {label(step.key)}
          </span>
          {i < steps.length - 1 && (
            <span aria-hidden className="text-black02/25">
              /
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}
