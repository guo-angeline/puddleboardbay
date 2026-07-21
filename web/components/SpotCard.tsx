"use client";

import type { ReactNode } from "react";
import type { Spot } from "@/lib/types";
import { DIFFICULTY_LABEL } from "@/lib/types";
import type { SpotAggregate } from "@/lib/useReviewAggregates";

interface Props {
  spot: Spot;
  selected: boolean;
  onClick: () => void;
  distance?: number;
  isFavorite?: boolean;
  onToggleFavorite?: (id: number) => void;
  conditionsBadge?: ReactNode;
  /** Item 43: crowd rating, present only once the spot has 5+ published reviews. */
  crowd?: SpotAggregate;
}

const DIFF_STYLES: Record<string, string> = {
  flatwater: "bg-emerald-50 text-emerald-800",
  bay:       "bg-sky-50 text-sky-800",
  river:     "bg-orange-50 text-orange-800",
  unknown:   "bg-stone-100 text-stone-500",
};

function formatDistance(miles: number): string {
  return miles < 0.2
    ? `${Math.round(miles * 5280)} ft`
    : `${miles.toFixed(1)} mi`;
}

export default function SpotCard({ spot, selected, onClick, distance, isFavorite, onToggleFavorite, conditionsBadge, crowd }: Props) {
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
        selected ? "bg-white border-l-4 border-l-(--accent) pl-3" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-(--dark) text-sm leading-snug truncate">{spot.water}</p>
          {/* Item 39 (D21): owner rating inline in the subtitle, bare star +
              number, matching the drawer. See SpotDrawer for the lawyer-gate
              note; the owner accepted the aggregate-read risk. sr-only "out of 5"
              is scale only. */}
          <p className="text-xs text-(--muted) mt-0.5">
            {/* Item 43 (owner decision): once a spot has 5+ published crowd
                reviews the CROWD number takes this slot and the owner's rating
                moves into the sheet body. One number per spot in the list, so a
                bare star can never be mistaken for an aggregate it is not. The
                count is always shown, so it reads as arithmetic, not a verdict. */}
            {crowd ? (
              <span className="font-semibold text-(--dark)">
                <span aria-hidden className="text-(--accent)">&#9733;</span> {crowd.avg.toFixed(1)}
                <span className="sr-only"> out of 5 from {crowd.count} paddler reviews</span>
                <span aria-hidden className="font-normal text-(--muted)"> ({crowd.count})</span>
                {" · "}
              </span>
            ) : typeof spot.owner_rating === "number" ? (
              <span className="font-semibold text-(--dark)">
                <span aria-hidden className="text-(--accent)">&#9733;</span> {spot.owner_rating.toFixed(1)}
                <span className="sr-only"> out of 5</span>
                {" · "}
              </span>
            ) : null}
            {spot.city}
            {distance !== undefined
              ? <> &middot; <span className="font-medium text-(--accent)">{formatDistance(distance)}</span></>
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
    </div>
  );
}
