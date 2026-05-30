"use client";

import dynamic from "next/dynamic";
import { useState, useMemo } from "react";
import type { Spot } from "@/lib/types";
import spotsData from "@/data/spots.json";
import FilterBar, { type Filters } from "@/components/FilterBar";
import SpotList from "@/components/SpotList";
import SpotDrawer from "@/components/SpotDrawer";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

const ALL_SPOTS = spotsData as Spot[];

function applyFilters(spots: Spot[], filters: Filters): Spot[] {
  return spots.filter((s) => {
    if (filters.region && s.region !== filters.region) return false;
    if (filters.difficulty && s.difficulty !== filters.difficulty) return false;
    if (filters.freeOnly && s.has_fee !== false) return false;
    return true;
  });
}

export default function Home() {
  const [filters, setFilters] = useState<Filters>({ region: "", difficulty: "", freeOnly: false });
  const [selected, setSelected] = useState<Spot | null>(null);
  const [activeTab, setActiveTab] = useState<"map" | "list">("map");

  const filtered = useMemo(() => applyFilters(ALL_SPOTS, filters), [filters]);

  function handleSelect(spot: Spot) {
    setSelected(spot);
    // On mobile: stay on current tab so drawer overlays whatever is visible.
    // On desktop the drawer renders as a sidebar regardless of tab.
  }

  function handleFilterChange(f: Filters) {
    setFilters(f);
    setSelected(null);
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="shrink-0 px-4 py-3 border-b border-gray-200 bg-[--bg] flex items-center justify-between">
        <h1 className="font-['Libre_Baskerville'] text-xl font-bold text-[--dark]">
          PuddleboardBay
        </h1>
        <span className="text-xs text-[--muted]">SF Bay Area paddleboard spots</span>
      </header>

      {/* Filter bar */}
      <FilterBar
        filters={filters}
        onChange={handleFilterChange}
        total={ALL_SPOTS.length}
        filtered={filtered.length}
      />

      {/* Mobile tab bar */}
      <div className="md:hidden flex shrink-0 border-b border-gray-200 bg-white">
        {(["map", "list"] as const).map((tab) => (
          <button
            key={tab}
            className={`flex-1 py-2.5 text-sm font-medium capitalize transition-colors ${
              activeTab === tab
                ? "text-[--accent] border-b-2 border-[--accent]"
                : "text-[--muted]"
            }`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === "map" ? `Map (${filtered.length})` : `List`}
          </button>
        ))}
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* List panel — full on desktop, tab-driven on mobile */}
        <div
          className={`flex flex-col w-full md:w-80 md:shrink-0 bg-[--bg] border-r border-gray-200 border-l-4 border-l-[--accent] md:flex
            ${activeTab === "list" ? "flex" : "hidden md:flex"}`}
        >
          <SpotList spots={filtered} selected={selected} onSelect={handleSelect} />
        </div>

        {/* Map panel */}
        <div
          className={`flex-1 relative min-h-0
            ${activeTab === "map" ? "flex" : "hidden md:flex"}`}
        >
          <MapView spots={filtered} selected={selected} onSelect={setSelected} />

          {/* Legend */}
          <div className="absolute bottom-4 left-4 z-10 bg-white/90 backdrop-blur-sm rounded-xl px-3 py-2 shadow text-xs space-y-1">
            {[
              { color: "#4E6639", label: "Flatwater" },
              { color: "#2D6A8F", label: "Bay / Estuary" },
              { color: "#B45309", label: "River / Creek" },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ background: color }} />
                <span className="text-gray-600">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Detail drawer — overlays on mobile, sidebar on desktop */}
        {selected && (
          <SpotDrawer spot={selected} onClose={() => setSelected(null)} />
        )}
      </div>
    </div>
  );
}
