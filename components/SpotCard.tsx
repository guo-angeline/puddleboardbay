"use client";

import type { Spot } from "@/lib/types";
import { DIFFICULTY_LABEL } from "@/lib/types";

interface Props {
  spot: Spot;
  selected: boolean;
  onClick: () => void;
  distance?: number;
  isFavorite?: boolean;
  onToggleFavorite?: (id: number) => void;
}

const DIFF_STYLES: Record<string, string> = {
  flatwater: "bg-emerald-50 text-emerald-800",
  bay:       "bg-sky-50 text-sky-800",
  river:     "bg-orange-50 text-orange-800",
  unknown:   "bg-stone-100 text-stone-500",
};

function Icons({ spot }: { spot: Spot }) {
  const icons = [];
  if (spot.dog_friendly)          icons.push({ emoji: "🐕", label: "Dog friendly" });
  if (spot.tide_sensitive)        icons.push({ emoji: "🌊", label: "Tide sensitive" });
  if (spot.rentals_available)     icons.push({ emoji: "🚣", label: "Rentals available" });
  if (spot.power_boats === false) icons.push({ emoji: "⛵", label: "No power boats" });
  if (!icons.length) return null;
  return (
    <div className="flex gap-2 mt-1.5">
      {icons.map(({ emoji, label }) => (
        <span key={label} title={label} className="text-base leading-none">{emoji}</span>
      ))}
    </div>
  );
}

function formatDistance(miles: number): string {
  return miles < 0.2
    ? `${Math.round(miles * 5280)} ft`
    : `${miles.toFixed(1)} mi`;
}

export default function SpotCard({ spot, selected, onClick, distance, isFavorite, onToggleFavorite }: Props) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3.5 border-b border-gray-100 transition-colors hover:bg-white ${
        selected ? "bg-white border-l-4 border-l-[--accent] pl-3" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[--dark] text-sm leading-snug truncate">{spot.water}</p>
          <p className="text-xs text-[--muted] mt-0.5">
            {spot.city}
            {distance !== undefined
              ? <> &middot; <span className="font-medium text-[--accent]">{formatDistance(distance)}</span></>
              : <> &middot; {spot.region}</>}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${DIFF_STYLES[spot.difficulty]}`}>
            {DIFFICULTY_LABEL[spot.difficulty]}
          </span>
          {onToggleFavorite && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleFavorite(spot.id); }}
              aria-label={isFavorite ? "Remove from saved" : "Save spot"}
              className="text-base leading-none transition-opacity hover:opacity-70"
              style={{ color: isFavorite ? "#e11d48" : "var(--muted)", opacity: isFavorite ? 1 : 0.4 }}
            >
              {isFavorite ? "♥" : "♡"}
            </button>
          )}
        </div>
      </div>
      <Icons spot={spot} />
    </button>
  );
}
