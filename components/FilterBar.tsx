"use client";

import { REGIONS, DIFFICULTIES, DIFFICULTY_LABEL, type Difficulty } from "@/lib/types";

export interface Filters {
  region: string;
  difficulty: string;
  freeOnly: boolean;
}

interface Props {
  filters: Filters;
  onChange: (f: Filters) => void;
  total: number;
  filtered: number;
}

const EMPTY_FILTERS: Filters = { region: "", difficulty: "", freeOnly: false };

function hasActiveFilters(f: Filters) {
  return f.region !== "" || f.difficulty !== "" || f.freeOnly;
}

// Row 1 — region pills: outlined/neutral inactive, solid accent active
const R_ACTIVE:   React.CSSProperties = { background: "var(--accent)", color: "#fff", border: "none" };
const R_INACTIVE: React.CSSProperties = { background: "#fff", color: "var(--dark)", border: "1px solid #e5e7eb" };

// Row 2 — always softly tinted; each type has its own colour family
const DIFF_PALETTE: Record<Difficulty, { bg: string; lightBg: string; color: string }> = {
  flatwater: { bg: "#4E6639", lightBg: "#eef4ea", color: "#3a5c29" },
  bay:       { bg: "#2D6A8F", lightBg: "#e8f3fa", color: "#1e4d6b" },
  river:     { bg: "#B45309", lightBg: "#fef3e7", color: "#92400e" },
  unknown:   { bg: "#6B7280", lightBg: "#f3f4f6", color: "#374151" },
};
const FREE_ACTIVE:   React.CSSProperties = { background: "#16a34a", color: "#fff" };
const FREE_INACTIVE: React.CSSProperties = { background: "#f0fdf4", color: "#166534" };

export default function FilterBar({ filters, onChange, total, filtered }: Props) {
  // Row 1: larger pills
  const pillLg = "px-3 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer whitespace-nowrap";
  // Row 2: smaller pills — size alone signals secondary/attribute role
  const pillSm = "px-2.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer whitespace-nowrap";

  return (
    <div className="sticky top-0 z-10 bg-[--bg] border-b border-gray-200 px-4 py-3 space-y-2">
      {/* Row 1 — region (outlined, larger) */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {["All", ...REGIONS].map((r) => {
          const isActive = filters.region === r || (r === "All" && filters.region === "");
          return (
            <button
              key={r}
              className={pillLg}
              style={isActive ? R_ACTIVE : R_INACTIVE}
              onClick={() => onChange({ ...filters, region: (r === "All" || filters.region === r) ? "" : r })}
            >
              {r}
            </button>
          );
        })}
      </div>

      {/* Row 2 — type + fee (always-tinted, smaller) */}
      <div className="flex gap-2 items-center flex-wrap">
        {DIFFICULTIES.map((d) => {
          const { bg, lightBg, color } = DIFF_PALETTE[d];
          const isActive = filters.difficulty === d;
          return (
            <button
              key={d}
              className={pillSm}
              style={isActive
                ? { background: bg, color: "#fff" }
                : { background: lightBg, color }}
              onClick={() => onChange({ ...filters, difficulty: isActive ? "" : d })}
            >
              {DIFFICULTY_LABEL[d]}
            </button>
          );
        })}

        <button
          className={pillSm}
          style={filters.freeOnly ? FREE_ACTIVE : FREE_INACTIVE}
          onClick={() => onChange({ ...filters, freeOnly: !filters.freeOnly })}
        >
          Free only
        </button>

        <div className="ml-auto flex items-center gap-2">
          {hasActiveFilters(filters) && (
            <button
              onClick={() => onChange(EMPTY_FILTERS)}
              className="text-xs text-[--muted] underline underline-offset-2 hover:text-[--dark] transition-colors whitespace-nowrap"
            >
              Clear all
            </button>
          )}
          <span className="text-xs text-[--muted] whitespace-nowrap">
            {filtered === total ? `${total} spots` : `${filtered} of ${total}`}
          </span>
        </div>
      </div>
    </div>
  );
}
