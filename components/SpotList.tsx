"use client";

import { useRef, useEffect } from "react";
import type { Spot } from "@/lib/types";
import SpotCard from "./SpotCard";

interface Props {
  spots: Spot[];
  selected: Spot | null;
  onSelect: (spot: Spot) => void;
  onClearFilters: () => void;
}

export default function SpotList({ spots, selected, onSelect, onClearFilters }: Props) {
  const selectedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selected && selectedRef.current) {
      selectedRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [selected]);

  if (spots.length === 0) {
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
      {spots.map((spot) => (
        <div key={spot.id} ref={selected?.id === spot.id ? selectedRef : null}>
          <SpotCard
            spot={spot}
            selected={selected?.id === spot.id}
            onClick={() => onSelect(spot)}
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
