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

const ACTIVE_STYLE = { background: "var(--accent)", color: "#fff", border: "none" };
const INACTIVE_STYLE = { background: "#fff", color: "var(--dark)", border: "1px solid #e5e7eb" };

export default function FilterBar({ filters, onChange, total, filtered }: Props) {
  const pill =
    "px-3 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer whitespace-nowrap";

  return (
    <div className="sticky top-0 z-10 bg-[--bg] border-b border-gray-200 px-4 py-3 space-y-2">
      {/* Region row */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {["All", ...REGIONS].map((r) => {
          const isActive = filters.region === r || (r === "All" && filters.region === "");
          return (
            <button
              key={r}
              className={pill}
              style={isActive ? ACTIVE_STYLE : INACTIVE_STYLE}
              onClick={() => onChange({ ...filters, region: r === "All" ? "" : r })}
            >
              {r}
            </button>
          );
        })}
      </div>

      {/* Difficulty + fee row */}
      <div className="flex gap-2 items-center flex-wrap">
        {DIFFICULTIES.map((d) => {
          const colors: Record<Difficulty, string> = {
            flatwater: "#4E6639",
            bay:       "#2D6A8F",
            river:     "#B45309",
            unknown:   "#6B7280",
          };
          const isActive = filters.difficulty === d;
          return (
            <button
              key={d}
              className={pill}
              style={isActive ? { backgroundColor: colors[d], color: "#fff", border: "none" } : INACTIVE_STYLE}
              onClick={() => onChange({ ...filters, difficulty: isActive ? "" : d })}
            >
              {DIFFICULTY_LABEL[d]}
            </button>
          );
        })}

        <button
          className={pill}
          style={filters.freeOnly ? ACTIVE_STYLE : INACTIVE_STYLE}
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
          <span className="text-sm text-[--muted] whitespace-nowrap">
            {filtered === total ? `${total} spots` : `${filtered} of ${total}`}
          </span>
        </div>
      </div>
    </div>
  );
}
