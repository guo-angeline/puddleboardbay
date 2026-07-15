"use client";

import { REGIONS, DIFFICULTIES, DIFFICULTY_LABEL, type Difficulty } from "@/lib/types";

export interface Filters {
  region: string;
  difficulty: string;
  freeOnly: boolean;
  search: string;
}

interface Props {
  filters: Filters;
  onChange: (f: Filters) => void;
  nearMe?: boolean;
  locating?: boolean;
  geoError?: boolean;
  onToggleNearMe?: () => void;
  onClearAll?: () => void;
}

const EMPTY_FILTERS: Filters = { region: "", difficulty: "", freeOnly: false, search: "" };

function hasActiveFilters(f: Filters, nearMe?: boolean) {
  return f.region !== "" || f.difficulty !== "" || f.freeOnly || f.search.trim() !== "" || !!nearMe;
}

// Row 1 — region pills: outlined/neutral inactive, solid accent active
const R_ACTIVE:   React.CSSProperties = { background: "var(--accent)", color: "#fff", border: "none" };
const R_INACTIVE: React.CSSProperties = { background: "#fff", color: "var(--dark)", border: "1px solid var(--border)" };

// Row 2 — always softly tinted; each water type has its own Meltwater family
const DIFF_PALETTE: Record<Difficulty, { bg: string; lightBg: string; color: string }> = {
  flatwater: { bg: "#12A5B0", lightBg: "#DBF3F0", color: "#0E7F78" },
  bay:       { bg: "#0E6FD1", lightBg: "#E3EEFA", color: "#0B4E96" },
  river:     { bg: "#E06636", lightBg: "#FDEAE0", color: "#CC5528" },
  unknown:   { bg: "#8AA0B4", lightBg: "#EEF3F9", color: "#42607A" },
};
const FREE_ACTIVE:   React.CSSProperties = { background: "#2E9E5B", color: "#fff" };
const FREE_INACTIVE: React.CSSProperties = { background: "#E4F5EA", color: "#2E9E5B" };

const NEAR_ACTIVE:   React.CSSProperties = { background: "var(--accent)", color: "#fff" };
const NEAR_INACTIVE: React.CSSProperties = { background: "#E3EEFA", color: "#0B4E96" };
const NEAR_ERROR:    React.CSSProperties = { background: "#FEE9E0", color: "#CC5528" };

export default function FilterBar({
  filters, onChange,
  nearMe, locating, geoError, onToggleNearMe, onClearAll,
}: Props) {
  const pillLg = "px-3 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer whitespace-nowrap";

  function nearMeStyle(): React.CSSProperties {
    if (geoError) return NEAR_ERROR;
    if (nearMe)   return NEAR_ACTIVE;
    return NEAR_INACTIVE;
  }

  function nearMeLabel() {
    if (geoError)  return "Location unavailable";
    if (locating)  return "Locating…";
    if (nearMe)    return "Near me ✓";
    return "Near me";
  }

  return (
    <div className="sticky top-0 z-10 bg-[--bg] border-b border-[--border] px-4 py-3 space-y-2">
      {/* Row 1 — region (outlined, larger) */}
      <div className="-mr-4 overflow-hidden md:mr-0 md:overflow-visible">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none pr-4 md:pr-0">
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
      </div>

      {/* Row 2 — all 5 filters in one row */}
      <div className="grid grid-cols-5 gap-1">
        {DIFFICULTIES.map((d) => {
          const { bg, lightBg, color } = DIFF_PALETTE[d];
          const isActive = filters.difficulty === d;
          return (
            <button
              key={d}
              className="py-1 rounded-full text-[11px] font-medium transition-colors cursor-pointer text-center w-full"
              style={isActive ? { background: bg, color: "#fff" } : { background: lightBg, color }}
              onClick={() => onChange({ ...filters, difficulty: isActive ? "" : d })}
            >
              {DIFFICULTY_LABEL[d]}
            </button>
          );
        })}

        <button
          className="py-1 rounded-full text-[11px] font-medium transition-colors cursor-pointer text-center w-full"
          style={filters.freeOnly ? FREE_ACTIVE : FREE_INACTIVE}
          onClick={() => onChange({ ...filters, freeOnly: !filters.freeOnly })}
        >
          Free only
        </button>

        {onToggleNearMe && (
          <button
            className="py-1 rounded-full text-[11px] font-medium transition-colors cursor-pointer text-center w-full"
            style={nearMeStyle()}
            onClick={onToggleNearMe}
            disabled={locating}
            title={geoError ? "Location access was denied. Check your browser or device settings to enable it for this site." : undefined}
          >
            {nearMeLabel()}
          </button>
        )}
      </div>

      {/* Clear all — only when a filter is active, so the default header stays compact */}
      {hasActiveFilters(filters, nearMe) && (
        <div className="flex">
          <button
            onClick={() => onClearAll ? onClearAll() : onChange(EMPTY_FILTERS)}
            className="ml-auto text-xs text-[--muted] underline underline-offset-2 hover:text-[--dark] transition-colors"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
