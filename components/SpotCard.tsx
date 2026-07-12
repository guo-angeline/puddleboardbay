"use client";

import type { ReactNode } from "react";
import type { Spot } from "@/lib/types";
import { DIFFICULTY_LABEL } from "@/lib/types";

interface Props {
  spot: Spot;
  selected: boolean;
  onClick: () => void;
  distance?: number;
  isFavorite?: boolean;
  onToggleFavorite?: (id: number) => void;
  conditionsBadge?: ReactNode;
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

export default function SpotCard({ spot, selected, onClick, distance, isFavorite, onToggleFavorite, conditionsBadge }: Props) {
  return (
    // role="button" rather than a real <button>: this card contains the
    // favorite-toggle button, and a <button> nested in a <button> is invalid
    // HTML that breaks hydration (the parser auto-closes the outer button).
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className={`w-full cursor-pointer text-left px-4 py-3.5 border-b border-gray-100 transition-colors hover:bg-white ${
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
          {conditionsBadge && <div className="mt-1.5">{conditionsBadge}</div>}
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${DIFF_STYLES[spot.difficulty]}`}>
            {DIFFICULTY_LABEL[spot.difficulty]}
          </span>
          {onToggleFavorite && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleFavorite(spot.id); }}
              aria-label={isFavorite ? "Stop watching this spot" : "Watch this spot"}
              aria-pressed={isFavorite}
              // 40px touch target (was a ~16px glyph nobody could hit or notice);
              // negative margin keeps the row height. Full opacity so it reads as
              // a real save control, not decoration.
              className="-my-2 -mr-1.5 flex h-10 w-10 items-center justify-center text-xl leading-none transition-transform hover:scale-110"
              style={{ color: isFavorite ? "#E23B54" : "var(--muted)" }}
            >
              {isFavorite ? "♥" : "♡"}
            </button>
          )}
        </div>
      </div>
      <Icons spot={spot} />
    </div>
  );
}
