"use client";

import dynamic from "next/dynamic";
import { useState, useMemo, useEffect, useRef } from "react";
import type { Spot } from "@/lib/types";
import { DIFFICULTY_LEGEND } from "@/lib/types";
import spotsData from "@/data/spots.json";
import FilterBar, { type Filters } from "@/components/FilterBar";
import SpotList from "@/components/SpotList";
import SpotDrawer from "@/components/SpotDrawer";
import AlertInterstitial from "@/components/AlertInterstitial";
import FeedbackModal from "@/components/FeedbackModal";
import { distanceMiles } from "@/lib/distance";
import { searchSpots } from "@/lib/search";
import { trackIntent, trackSystem, setPersona, type SpotViewedSource } from "@/lib/analytics";
import { useSavedConditions } from "@/components/useSavedConditions";
import { syncWatchedSpots, reportAlertOpen } from "@/lib/push";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

const ALL_SPOTS = spotsData as Spot[];


function applyFilters(spots: Spot[], filters: Filters): Spot[] {
  const structured = spots.filter((s) => {
    if (filters.region && s.region !== filters.region) return false;
    if (filters.difficulty && s.difficulty !== filters.difficulty) return false;
    if (filters.freeOnly && s.has_fee !== false) return false;
    return true;
  });
  // Free-text search is relevance-ranked (see lib/search.ts), applied after the
  // structured filters so it only ranks within the already-narrowed set.
  return filters.search.trim() ? searchSpots(structured, filters.search) : structured;
}

interface Props {
  initialSpotId?: number;
}

export default function HomeClient({ initialSpotId }: Props = {}) {
  const [filters, setFilters] = useState<Filters>({ region: "", difficulty: "", freeOnly: false, search: "" });
  const [selected, setSelected] = useState<Spot | null>(null);
  const [activeTab, setActiveTab] = useState<"map" | "list">("map");
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState(false);
  // Start empty so the first client render matches the static server HTML, then
  // hydrate from localStorage in an effect. Reading storage in the initializer
  // rendered the "Your saved spots" section the server never had → React #418
  // hydration mismatch (a flash) for exactly the returning savers we care about.
  const [favorites, setFavorites] = useState<Set<number>>(new Set());
  const [favoritesLoaded, setFavoritesLoaded] = useState(false);
  // Set only when the app opened from a push alert with a window label to
  // show (see composeAlert in lib/alerts/select.ts). Cleared on dismiss or
  // once the user navigates away from the alerted spot.
  const [alertBanner, setAlertBanner] = useState<{ spotId: number; windowLabel: string } | null>(null);

  useEffect(() => {
    // Loading persisted state from an external store (localStorage) on mount is a
    // legitimate effect-driven setState, same pattern as the deep-link effect below.
    try {
      const raw = localStorage.getItem("ptw-favorites");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setFavorites(new Set(JSON.parse(raw) as number[]));
    } catch { /* private mode / bad JSON */ }
    setFavoritesLoaded(true);
  }, []);

  // Pre-select from prop (spot pages) or ?spot= URL param (home page)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = initialSpotId ?? Number(params.get("spot") || 0);
    if (id) {
      const found = ALL_SPOTS.find((s) => s.id === id);
      if (found) {
        // Deferred to an effect on purpose: the spot id comes from window /
        // the URL, so resolving it during render would break SSR hydration.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSelected(found);
        const from = params.get("from");
        const source: SpotViewedSource = from === "alert" ? "alert" : "deeplink";
        if (from === "alert") {
          trackIntent("alert_clicked", {
            spot_id: found.id,
            spot_name: found.water,
            region: found.region,
          });
          // Durable, server-side return signal for long-horizon subscriber
          // retention. The token rode the deep link, so this works even after
          // ITP has purged client storage. See /api/alerts/opened.
          const token = params.get("t");
          if (token) reportAlertOpen(token, found.id);
          const windowLabel = params.get("window");
          if (windowLabel) setAlertBanner({ spotId: found.id, windowLabel });
        }
        trackIntent("spot_viewed", {
          spot_id: found.id,
          spot_name: found.water,
          region: found.region,
          difficulty: found.difficulty,
          has_fee: found.has_fee,
          source,
        });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync URL to selected spot. On spot pages, rebase to root so the URL
  // stays honest as the user explores other spots.
  useEffect(() => {
    if (initialSpotId !== undefined) {
      window.history.replaceState(null, "", selected ? `/?spot=${selected.id}` : "/");
    } else {
      window.history.replaceState(null, "", selected ? `?spot=${selected.id}` : window.location.pathname);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  useEffect(() => {
    // Don't write until we've loaded, or the empty initial set would clobber
    // saved favorites on first mount before the load effect runs.
    if (!favoritesLoaded) return;
    try { localStorage.setItem("ptw-favorites", JSON.stringify([...favorites])); }
    catch { /* storage full / private mode */ }
  }, [favorites, favoritesLoaded]);

  function toggleFavorite(id: number) {
    const adding = !favorites.has(id);
    const spot = ALL_SPOTS.find((s) => s.id === id);
    setFavorites((prev) => {
      const next = new Set(prev);
      if (adding) next.add(id); else next.delete(id);
      trackIntent("favorite_toggled", {
        spot_id: id,
        spot_name: spot?.water,
        region: spot?.region,
        action: adding ? "add" : "remove",
        total_favorites: next.size,
      });
      // Persona: anyone who saves a spot is an engaged, returning-intent user.
      setPersona({ saves_spots: true, favorite_count: next.size });
      return next;
    });
    if (adding) {
      window.dispatchEvent(
        new CustomEvent("ptw:spotsaved", { detail: { spotName: spot?.water ?? "this spot" } })
      );
    }
  }

  // Signal drawer state to the install banner (rendered in the root layout) so it
  // can hide while a spot is open instead of covering Get Directions.
  useEffect(() => {
    document.body.dataset.drawerOpen = selected ? "true" : "false";
    window.dispatchEvent(new Event("ptw:drawerchange"));
  }, [selected]);

  // The alert interstitial is tied to the specific spot the push named; once
  // the user navigates elsewhere it would be stale context, so every path that
  // changes or clears `selected` below also clears it.
  function deselect() {
    setSelected(null);
    setAlertBanner(null);
  }

  // Only fit the map to the visible spots once the user has narrowed them. On the
  // full set, fitting all 140 spans the whole state; keep the Bay default instead.
  const isFiltered = !!(filters.region || filters.difficulty || filters.freeOnly || filters.search.trim());

  const filtered = useMemo(() => applyFilters(ALL_SPOTS, filters), [filters]);

  const sortedFiltered = useMemo(() => {
    // When searching, keep relevance order; otherwise sort by distance if located.
    if (!userLocation || filters.search.trim()) return filtered;
    return [...filtered].sort(
      (a, b) => distanceMiles(userLocation, a) - distanceMiles(userLocation, b)
    );
  }, [filtered, userLocation, filters.search]);

  // Debounced search analytics: fire once after typing settles, not per keystroke.
  useEffect(() => {
    const q = filters.search.trim();
    if (!q) return;
    const t = setTimeout(() => {
      trackIntent("spot_search", { query: q, results: sortedFiltered.length });
    }, 500);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.search]);

  const savedSpots = useMemo(
    () => ALL_SPOTS.filter((s) => favorites.has(s.id)),
    [favorites]
  );

  const savedIdsKey = savedSpots.map((s) => s.id).sort((a, b) => a - b).join(",");
  useEffect(() => {
    if (!favoritesLoaded) return;
    void syncWatchedSpots(savedSpots.map((s) => s.id));
  // savedIdsKey is the stable trigger; favoritesLoaded gates post-hydration only.
  // syncWatchedSpots no-ops without a subscription, so non-subscribed users never POST.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedIdsKey, favoritesLoaded]);

  const { condBySpot, loading: conditionsLoading, latencyMs: savedCondLatency } = useSavedConditions(savedSpots);

  // SYSTEM event: fire once per session after the first saved-conditions batch
  // resolves. This is availability only (data loaded) — whether the user actually
  // looked at the "Your saved spots" section is the dwell-gated INTENT event
  // `saved_conditions_viewed`, logged in SpotList.
  const loggedSavedConditions = useRef(false);
  useEffect(() => {
    if (loggedSavedConditions.current) return;
    if (savedSpots.length === 0 || conditionsLoading) return;
    loggedSavedConditions.current = true;
    const calm = Object.values(condBySpot).filter((p) => p === "calm").length;
    trackSystem("saved_conditions_loaded", {
      count: savedSpots.length,
      calm_count: calm,
      latency_ms: savedCondLatency ?? 0,
    });
  }, [savedSpots.length, conditionsLoading, condBySpot, savedCondLatency]);

  const distanceMap = useMemo<Record<number, number> | undefined>(() => {
    if (!userLocation) return undefined;
    return Object.fromEntries(
      ALL_SPOTS.map((s) => [s.id, distanceMiles(userLocation, s)])
    );
  }, [userLocation]);

  function handleNearMe() {
    if (userLocation) {
      setUserLocation(null);
      trackIntent("near_me_toggled", { enabled: false });
      return;
    }
    if (!navigator.geolocation) {
      setGeoError(true);
      setTimeout(() => setGeoError(false), 4000);
      trackIntent("near_me_toggled", { enabled: true, outcome: "unsupported" });
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
        setActiveTab("list");
        trackIntent("near_me_toggled", { enabled: true, outcome: "granted" });
        // Persona: local user paddling near home vs. someone trip-planning.
        setPersona({ uses_geolocation: true });
      },
      () => {
        setLocating(false);
        setGeoError(true);
        setTimeout(() => setGeoError(false), 4000);
        trackIntent("near_me_toggled", { enabled: true, outcome: "denied" });
      },
      { timeout: 8000 }
    );
  }

  function handleSelect(spot: Spot, source: SpotViewedSource = "list") {
    setSelected(spot);
    if (alertBanner && alertBanner.spotId !== spot.id) setAlertBanner(null);
    trackIntent("spot_viewed", {
      spot_id: spot.id,
      spot_name: spot.water,
      region: spot.region,
      difficulty: spot.difficulty,
      has_fee: spot.has_fee,
      source,
    });
  }

  function handleFilterChange(f: Filters) {
    setFilters(f);
    deselect();
    trackIntent("filter_changed", {
      region: f.region || null,
      difficulty: f.difficulty || null,
      free_only: f.freeOnly,
    });
    // Persona / segmentation: budget-conscious paddlers and region affinity.
    setPersona({
      ...(f.freeOnly ? { prefers_free: true } : {}),
      ...(f.region ? { preferred_region: f.region } : {}),
      ...(f.difficulty ? { preferred_difficulty: f.difficulty } : {}),
    });
  }

  // Wordmark click: reset to the default home view. The header only ever renders
  // on "/", so "home" means clearing filters/search/selection rather than a
  // navigation (which on the same route wouldn't reset this state).
  function goHome() {
    setFilters({ region: "", difficulty: "", freeOnly: false, search: "" });
    setUserLocation(null);
    setSearchOpen(false);
    setActiveTab("map");
    deselect();
    trackIntent("nav_home_clicked", {});
  }

  function handleClearAll() {
    setFilters({ region: "", difficulty: "", freeOnly: false, search: "" });
    setUserLocation(null);
    deselect();
    setSearchOpen(false);
    trackIntent("filter_changed", { cleared: true });
  }

  function setSearch(value: string) {
    setFilters((f) => ({ ...f, search: value }));
    deselect();
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="shrink-0 px-4 py-3 border-b border-gray-200 bg-[--bg] flex items-center justify-between">
        <button
          type="button"
          onClick={goHome}
          className="font-['Newsreader'] text-xl font-bold text-[--dark] rounded-sm hover:opacity-80 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-[--accent]"
          aria-label="Paddle to Water, return home"
        >
          Paddle to Water
        </button>
        <div className="flex items-center gap-2 md:gap-3">
          <span className="hidden lg:inline text-xs text-[--muted]">Paddleboard &amp; kayak spots across the Bay Area</span>

          {/* Desktop inline search */}
          <div className="relative hidden md:block">
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search spots, towns…"
              aria-label="Search spots"
              className="w-52 rounded-lg border border-gray-200 bg-white pl-8 pr-7 py-1.5 text-xs text-[--dark] placeholder-gray-400 focus:outline-none focus:border-[--accent]"
            />
            <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">🔍</span>
            {filters.search && (
              <button
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[--dark] text-sm leading-none"
              >
                ✕
              </button>
            )}
          </div>

          {/* Mobile search toggle */}
          <button
            onClick={() => setSearchOpen((o) => !o)}
            aria-label={searchOpen ? "Close search" : "Open search"}
            aria-expanded={searchOpen}
            className="md:hidden text-base px-2 py-1.5 rounded-lg border border-gray-200 text-[--muted] hover:border-[--accent] hover:text-[--dark] transition-colors"
          >
            🔍
          </button>

          <button
            onClick={() => { setFeedbackOpen(true); trackIntent("feedback_opened", {}); }}
            className="text-xs font-medium px-3 py-1.5 rounded-lg border border-[--accent] text-[--accent] hover:bg-[--accent] hover:text-white transition-colors"
          >
            Feedback
          </button>
        </div>
      </header>

      {/* Mobile expanded search bar */}
      {searchOpen && (
        <div className="md:hidden shrink-0 px-4 py-2 border-b border-gray-200 bg-[--bg] flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              autoFocus
              value={filters.search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search spots, towns, wildlife…"
              aria-label="Search spots"
              className="w-full rounded-lg border border-gray-200 bg-white pl-8 pr-7 py-2 text-base text-[--dark] placeholder-gray-400 focus:outline-none focus:border-[--accent]"
            />
            <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
            {filters.search && (
              <button
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[--dark]"
              >
                ✕
              </button>
            )}
          </div>
          <button
            onClick={() => setSearchOpen(false)}
            className="shrink-0 text-xs font-medium text-[--muted] hover:text-[--dark] transition-colors"
          >
            Close
          </button>
        </div>
      )}

      {/* Filter bar */}
      <FilterBar
        filters={filters}
        onChange={handleFilterChange}
        total={ALL_SPOTS.length}
        filtered={sortedFiltered.length}
        nearMe={!!userLocation}
        locating={locating}
        geoError={geoError}
        onToggleNearMe={handleNearMe}
        onClearAll={handleClearAll}
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
            onClick={() => { setActiveTab(tab); trackIntent("view_switched", { view: tab }); }}
          >
            {tab === "map" ? `Map (${sortedFiltered.length})` : `List`}
          </button>
        ))}
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* List panel */}
        <div
          className={`flex flex-col w-full md:w-80 md:shrink-0 bg-[--bg] border-r border-gray-200 border-l-4 border-l-[--accent] md:flex
            ${activeTab === "list" ? "flex" : "hidden md:flex"}`}
        >
          <SpotList
            spots={sortedFiltered}
            selected={selected}
            onSelect={handleSelect}
            distanceMap={distanceMap}
            onClearFilters={handleClearAll}
            savedSpots={savedSpots}
            favorites={favorites}
            onToggleFavorite={toggleFavorite}
            condBySpot={condBySpot}
          />
        </div>

        {/* Map panel */}
        <div
          className={`flex-1 relative min-h-0
            ${activeTab === "map" ? "flex" : "hidden md:flex"}`}
        >
          <MapView spots={sortedFiltered} selected={selected} onSelect={handleSelect} userLocation={userLocation} fitToSpots={isFiltered} />

          {/* Empty state — the List has one, but the map is the default mobile tab,
              so an over-filtered user would otherwise just see a blank map. */}
          {sortedFiltered.length === 0 && (
            <div className="absolute inset-0 z-[400] flex flex-col items-center justify-center bg-[--bg]/80 backdrop-blur-sm text-center px-4">
              <p className="text-3xl mb-3">🏄</p>
              <p className="text-[--dark] font-semibold">No spots match your filters</p>
              <button
                onClick={handleClearAll}
                className="mt-3 px-4 py-1.5 rounded-full text-sm font-medium border border-gray-200 text-[--muted] hover:border-[--accent] hover:text-[--dark] transition-colors bg-white"
              >
                Clear filters
              </button>
            </div>
          )}

          {/* Legend */}
          <div className="absolute bottom-4 left-4 z-10 bg-white/90 backdrop-blur-sm rounded-xl px-3 py-2 shadow text-xs space-y-1">
            {DIFFICULTY_LEGEND.map(({ color, label }) => (
              <div key={label} className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ background: color }} />
                <span className="text-gray-600">{label}</span>
              </div>
            ))}
            <div className="border-t border-gray-200 mt-0.5 pt-1.5">
              <a href="/disclaimer" className="text-gray-400 hover:text-gray-600 transition-colors">
                Disclaimer
              </a>
            </div>
          </div>
        </div>

        {/* Detail drawer */}
        {selected && (
          <SpotDrawer
            spot={selected}
            onClose={deselect}
            onSelect={handleSelect}
            allSpots={ALL_SPOTS}
            isFavorite={selected ? favorites.has(selected.id) : false}
            onToggleFavorite={toggleFavorite}
          />
        )}

        {/* Alert deep-link interstitial: repeats the push's calm-window timing
            and put-in notes over the drawer. Monitored 100% rollout as of
            2026-07-08 (D2(a)); mount is gated only on the alert context. */}
        {selected && alertBanner && alertBanner.spotId === selected.id && (
          <AlertInterstitial
            spot={selected}
            windowLabel={alertBanner.windowLabel}
            onDismiss={() => setAlertBanner(null)}
          />
        )}
      </div>

      {feedbackOpen && <FeedbackModal onClose={() => setFeedbackOpen(false)} />}
    </div>
  );
}
