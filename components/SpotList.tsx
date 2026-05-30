"use client";

import { useRef, useEffect } from "react";
import type { Spot } from "@/lib/types";
import SpotCard from "./SpotCard";

interface Props {
  spots: Spot[];
  selected: Spot | null;
  onSelect: (spot: Spot) => void;
}

export default function SpotList({ spots, selected, onSelect }: Props) {
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
        <p className="text-sm text-[--muted] mt-1">Try removing a filter</p>
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
    </div>
  );
}
