"use client";

import { useRef, useEffect, useState } from "react";
import type { Spot } from "@/lib/types";
import { trackIntent, type SpotViewedSource } from "@/lib/analytics";
import { readStashedSubscription } from "@/lib/push";
import { useGenuineView } from "@/lib/useGenuineView";
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

  // Item 15: an always-available way back into alerts for users with saved spots.
  // Shown in the saved-spots header when not yet subscribed; dispatches the event
  // InstallPrompt listens for (which bypasses the dismiss snooze). Reads the
  // subscription in an effect (localStorage) to avoid an SSR hydration mismatch,
  // and hides once alerts are enabled.
  const [alertsOn, setAlertsOn] = useState(true);
  // item 18 recovery floor: iOS gives the installed PWA a storage partition
  // separate from Safari, so favorites saved in Safari are gone on first launch
  // (repro confirmed, D7). We can't rehydrate them (the anon id is partitioned
  // too), so the empty-favorites state on an INSTALLED app shows an explicit
  // re-save nudge instead of the generic first-run one, which makes the item-14
  // alert re-offer reachable once they re-save.
  const [isStandalone, setIsStandalone] = useState(false);
  useEffect(() => {
    const sync = () => setAlertsOn(!!readStashedSubscription());
    sync();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsStandalone(
      ("standalone" in navigator && (navigator as Navigator & { standalone?: boolean }).standalone === true) ||
        window.matchMedia("(display-mode: standalone)").matches
    );
    window.addEventListener("ptw:alertsenabled", sync);
    return () => window.removeEventListener("ptw:alertsenabled", sync);
  }, []);

  // INTENT: the "Your saved spots" section was genuinely scrolled into view, the
  // real "I came back to check my spots" signal. Re-arms when the saved set
  // changes. Distinct from `saved_conditions_loaded` (data merely resolved).
  const savedIdsKey = savedSpots.map((s) => s.id).sort((a, b) => a - b).join(",");
  const savedSectionRef = useGenuineView({
    key: savedIdsKey,
    enabled: savedSpots.length > 0,
    onView: () => {
      const calm = savedSpots.filter((s) => condBySpot[s.id] === "calm").length;
      trackIntent("saved_conditions_viewed", { count: savedSpots.length, calm_count: calm });
    },
  });

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
          {isStandalone ? (
            <>Re-save your spots here to get calm-window alerts. Saves from Safari don&rsquo;t carry into the installed app.</>
          ) : (
            <>Tap <span style={{ color: "#E23B54" }}>♥</span> to watch a spot&rsquo;s conditions.</>
          )}
        </p>
      )}

      {/* Saved spots section — pinned at top regardless of filters */}
      {savedSpots.length > 0 && (
        <div ref={savedSectionRef}>
          <div className="px-4 pt-3 pb-1.5 flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-[--muted] uppercase tracking-wider">Watching</span>
            <span className="text-[11px] text-[--muted] opacity-60">({savedSpots.length})</span>
            {!alertsOn && (
              <button
                onClick={() => window.dispatchEvent(new Event("ptw:enablealerts"))}
                className="ml-auto text-[11px] font-semibold text-[--accent] hover:opacity-80"
              >
                🔔 Turn on alerts
              </button>
            )}
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
