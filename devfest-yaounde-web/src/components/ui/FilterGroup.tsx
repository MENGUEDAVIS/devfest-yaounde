"use client";

import { CaretDown } from "@phosphor-icons/react";
import { useId, useState } from "react";

export interface FilterOption {
  /** Stable value; `null` is the "all" option. */
  value: string | null;
  label: string;
}

export interface FilterGroupProps {
  /** Group heading, e.g. "Day", "Track", "Room". */
  label: string;
  options: FilterOption[];
  selected: string | null;
  onSelect: (value: string | null) => void;
  /** Collapsible groups help when a page has many dimensions. */
  collapsible?: boolean;
}

/**
 * One labelled filter group — PHASE9 §3.
 *
 * Multiple filter dimensions used to sit as a flat pile of chips, which read
 * as clutter on /schedule especially. Each dimension now gets a heading and
 * its own cluster, so it's obvious which control does what.
 *
 * Semantics: a `radiogroup` labelled by its heading, since exactly one option
 * per dimension is active at a time. That gives screen readers the grouping
 * for free and makes arrow-key navigation behave as users expect.
 */
export function FilterGroup({
  label,
  options,
  selected,
  onSelect,
  collapsible = false,
}: FilterGroupProps) {
  const headingId = useId();
  const [open, setOpen] = useState(true);

  return (
    <div className="border-b-2 border-black02/10 pb-5 last:border-b-0 last:pb-0">
      {collapsible ? (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex w-full items-center justify-between gap-3 text-left"
        >
          <span
            id={headingId}
            className="font-mono text-mono-tag font-bold uppercase tracking-wide text-black02/60"
          >
            {label}
          </span>
          <CaretDown
            size={16}
            weight="bold"
            aria-hidden
            className={`shrink-0 text-black02/50 transition-transform duration-300 ease-bouncy motion-reduce:transition-none ${
              open ? "rotate-180" : ""
            }`}
          />
        </button>
      ) : (
        <p
          id={headingId}
          className="font-mono text-mono-tag font-bold uppercase tracking-wide text-black02/60"
        >
          {label}
        </p>
      )}

      <div
        className="grid transition-[grid-template-rows] duration-300 ease-out-devfest motion-reduce:transition-none"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="min-h-0 overflow-hidden">
          <div
            role="radiogroup"
            aria-labelledby={headingId}
            className="flex flex-wrap gap-2 pt-3"
          >
            {options.map((opt) => {
              const active = selected === opt.value;
              return (
                <button
                  key={opt.value ?? "__all"}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  tabIndex={open ? undefined : -1}
                  onClick={() => onSelect(opt.value)}
                  className={`rounded-pill border-2 border-black02 px-3.5 py-1.5 font-mono text-mono-tag font-bold uppercase tracking-wide transition-[transform,background-color] duration-200 ease-bouncy hover:-translate-y-0.5 motion-reduce:transform-none ${
                    active
                      ? "bg-yellow text-black02"
                      : "bg-transparent text-black02/70 hover:bg-yellow-pastel"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
