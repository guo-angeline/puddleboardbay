"use client";

import { useRef, useEffect } from "react";
import type { Spot } from "@/lib/types";
import type { SpotViewedSource } from "@/lib/analytics";
import SpotCard from "./SpotCard";
import { rankSavedSpotsByConditions, type SavedConditionState } from "@/lib/savedConditions";
import ConditionsBadge from "./ConditionsBadge";

interface Props {
  spots: Spot[];
  selected: Spot | null;
  onSelect: (spot: Spot, source?: SpotViewedSource) => void;
  onClearFilters: () => void;
  distanceMap?: Record<number, number>;
  savedSpots?: Spot[];
  favorites?: Set<number>;
  onToggleFavorite?: (id: number) => void;
  condBySpot?: Record<number, SavedConditionState>;
}

export default function SpotList({
  spots, selected, onSelect, onClearFilters, distanceMap,
  savedSpots = [], favorites = new Set(), onToggleFavorite, condBySpot = {},
}: Props) {
  const selectedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selected && selectedRef.current) {
      selectedRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [selected]);

  // Remove saved spots from the main list to avoid duplicates
  const mainSpots = spots.filter((s) => !favorites.has(s.id));

  if (mainSpots.length === 0 && savedSpots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-4">
        <p className="text-3xl mb-3">🏄</p>
        <p className="text-[--dark] font-semibold">No spots match your filters</p>
        <button
          onClick={onClearFilters}
          className="mt-3 px-4 py-1.5 rounded-full text-sm font-medium border border-gray-200 text-[--muted] hover:border-[--accent] hover:text-[--dark] transition-colors"
        >
          Clear filters
        </button>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto flex-1">
      {/* First-run nudge: the save feature was invisible (0 saves in week 1), so
          tell people it exists. Drops away the moment they save anything. */}
      {savedSpots.length === 0 && onToggleFavorite && mainSpots.length > 0 && (
        <p className="px-4 pt-2.5 pb-1 text-[11px] text-[--muted]">
          Tap <span style={{ color: "#e11d48" }}>♥</span> to save spots for later.
        </p>
      )}

      {/* Saved spots section — pinned at top regardless of filters */}
      {savedSpots.length > 0 && (
        <div>
          <div className="px-4 pt-3 pb-1.5 flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-[--muted] uppercase tracking-wider">Your saved spots</span>
            <span className="text-[11px] text-[--muted] opacity-60">({savedSpots.length})</span>
          </div>
          {rankSavedSpotsByConditions(savedSpots, condBySpot).map((spot) => (
            <div key={spot.id} ref={selected?.id === spot.id ? selectedRef : null}>
              <SpotCard
                spot={spot}
                selected={selected?.id === spot.id}
                onClick={() => onSelect(spot, "list")}
                distance={distanceMap?.[spot.id]}
                isFavorite={true}
                onToggleFavorite={onToggleFavorite}
                conditionsBadge={<ConditionsBadge state={condBySpot[spot.id] ?? "loading"} />}
              />
            </div>
          ))}
          <div className="mx-4 my-1.5 border-t border-gray-200" />
        </div>
      )}

      {/* Main list */}
      {mainSpots.map((spot) => (
        <div key={spot.id} ref={selected?.id === spot.id ? selectedRef : null}>
          <SpotCard
            spot={spot}
            selected={selected?.id === spot.id}
            onClick={() => onSelect(spot, "list")}
            distance={distanceMap?.[spot.id]}
            isFavorite={favorites.has(spot.id)}
            onToggleFavorite={onToggleFavorite}
          />
        </div>
      ))}

      <div className="px-4 py-4 text-center border-t border-gray-100">
        <a href="/disclaimer" className="text-xs text-[--muted]/60 hover:text-[--muted] transition-colors">
          Disclaimer
        </a>
      </div>
    </div>
  );
}
