"use client";

import dynamic from "next/dynamic";
import { useState, useMemo, useEffect, useRef } from "react";
import type { Spot } from "@/lib/types";
import { DIFFICULTY_LEGEND } from "@/lib/types";
import { ALL_SPOTS } from "@/lib/spots";
import FilterBar, { type Filters } from "@/components/FilterBar";
import SpotList from "@/components/SpotList";
import SpotDrawer from "@/components/SpotDrawer";
import AlertInterstitial from "@/components/AlertInterstitial";
import FeedbackModal from "@/components/FeedbackModal";
import ViewportDiagnostic from "@/components/ViewportDiagnostic";
import { distanceMiles } from "@/lib/distance";
import { searchSpots } from "@/lib/search";
import { emptyStateCopy } from "@/lib/emptyStateCopy";
import { trackIntent, trackSystem, setPersona, type SpotViewedSource } from "@/lib/analytics";
import { useSpotConditions } from "@/components/useSavedConditions";
import { recordRecentSpot, getRecentSpotIds } from "@/lib/recentSpots";
import { useKillSwitch } from "@/lib/experiments";
import { syncWatchedSpots, reportAlertOpen } from "@/lib/push";
import { reportEmailOpen } from "@/lib/email/client";
import { cacheEmailSubscriptionState } from "@/lib/email/subscriptionState";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });


// Same breakpoint SpotDrawer uses for its own mobile/desktop split. Item 42's
// full-height open only changes anything on mobile: the desktop drawer is a
// persistent, always-fully-visible sidebar.
function isMobileViewport(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches;
}


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
  // Item 9: one-shot hint to open the mobile sheet expanded, set only for a
  // shared-link arrival (from=share). Item 42 generalizes this to every
  // other mobile spot open; alert/email arrivals stay excluded (see the
  // deep-link effect below).
  const [startExpanded, setStartExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<"map" | "list">("map");
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState(false);
  const [geoErrorReason, setGeoErrorReason] = useState<"denied" | "unsupported" | null>(null);
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
  // Shown briefly after the email double-opt-in confirm link lands on /?email_confirmed=1.
  const [emailConfirmed, setEmailConfirmed] = useState(false);

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

  // Email double-opt-in landing: the confirm route redirects here. Fire the
  // activation event, show a short confirmation, and strip the param so a reload
  // doesn't re-fire it.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("email_confirmed") === "0") {
      const reason = params.get("reason");
      trackSystem("email_confirm_failed", { reason: reason === "stale" ? "stale_token" : "no_token" });
      params.delete("email_confirmed");
      params.delete("reason");
      const qs = params.toString();
      window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
      return;
    }
    if (params.get("email_confirmed") !== "1") return;
    let watched = 0;
    try {
      watched = (JSON.parse(localStorage.getItem("ptw-favorites") || "[]") as number[]).length;
    } catch { /* private mode */ }
    trackIntent("email_capture_confirmed", { watched_count: watched });
    // Item 47: this landing IS the confirm signal, cache confirmed:true
    // directly rather than waiting on a server round trip that would only
    // tell us what being on this URL already proves.
    cacheEmailSubscriptionState({ known: true, confirmed: true });
    // SpotList listens for this to re-sync its "alerts on" header state.
    window.dispatchEvent(new Event("ptw:alertsenabled"));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEmailConfirmed(true);
    const t = setTimeout(() => setEmailConfirmed(false), 5000);
    params.delete("email_confirmed");
    const qs = params.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
    return () => clearTimeout(t);
  }, []);

  // Pre-select from prop (spot pages) or ?spot= URL param (home page)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = initialSpotId ?? Number(params.get("spot") || 0);
    const from = params.get("from");
    // The subscription/open token. Read once up front so both the alert and
    // email pings below, and the single strip at the end of this effect, all
    // see the same value even after `params` is mutated by the strip.
    const token = params.get("t");
    if (id) {
      const found = ALL_SPOTS.find((s) => s.id === id);
      if (found) {
        // Deferred to an effect on purpose: the spot id comes from window /
        // the URL, so resolving it during render would break SSR hydration.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSelected(found);
        const source: SpotViewedSource =
          from === "alert" ? "alert" : from === "share" ? "share" : "deeplink";
        if (from === "share") {
          // Shared-link arrival: open the mobile sheet at full height so the
          // conditions view and the CTA row are visible without a drag (item 9).
          // Kept as its own branch even though item 42 now expands every open:
          // this one is not gated on the mobile breakpoint. SpotDrawer reads
          // this once on mount; harmless on desktop.
          setStartExpanded(true);
        } else if (from !== "alert" && from !== "email") {
          // Item 42: generalizes item 9 to every other spot open (plain
          // deeplink here; list/map/related opens are handled in
          // handleSelect below). Shipped at 100%, no flag, per owner
          // direction 2026-07-16 (D13): the D3/D6/D11 precedent, a
          // single-digit daily audience cannot power an A/B.
          // Alert and email arrivals stay excluded on purpose, same reason
          // item 9 excluded them: they carry the interstitial (from=alert)
          // or ride the same deep-link shape (from=email), and a
          // force-expanded sheet layers badly under it.
          if (isMobileViewport()) setStartExpanded(true);
        }
        if (from === "alert") {
          const windowLabel = params.get("window");
          // Item 46: a launch-reminder tap carries from=alert but NO window
          // param, so the AlertInterstitial (which carries the full safety line)
          // never renders and the sheet opens at peek with ConditionsPanel's
          // safety line below the fold. This is the one alert whose whole journey
          // showed no full safety line. Open it expanded on mobile so the safety
          // line clears the fold. Windowed alert opens keep the interstitial and
          // stay at peek (item 9), so only reminder taps expand.
          const reminderTap = !windowLabel;
          trackIntent("alert_clicked", {
            spot_id: found.id,
            spot_name: found.water,
            region: found.region,
            reminder_tap: reminderTap,
          });
          // Durable, server-side return signal for long-horizon subscriber
          // retention. The token rode the deep link, so this works even after
          // ITP has purged client storage. See /api/alerts/opened.
          if (token) reportAlertOpen(token, found.id);
          if (windowLabel) setAlertBanner({ spotId: found.id, windowLabel });
          else if (isMobileViewport()) setStartExpanded(true);
        } else if (from === "email") {
          // Email twin of the alert-open path. The durable open-ping fires
          // below, once, for both the resolved and hidden-spot case.
          // `v` is the email copy-variant index (0-6 rotation, lib/email/templates.ts).
          // `pt` is the pro-tip pool index (0-6, TECHNIQUE_TIPS, item 41).
          const v = params.get("v");
          const pt = params.get("pt");
          trackIntent("email_alert_opened", {
            spot_id: found.id,
            ...(v !== null && /^\d+$/.test(v) ? { variant: Number(v) } : {}),
            ...(pt !== null && /^\d+$/.test(pt) ? { tip_index: Number(pt) } : {}),
          });
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
      // Durable, server-side open ping for an email arrival. Fires even when
      // `found` is undefined (ALL_SPOTS filters out hidden spots, lib/spots.ts,
      // so a spot hidden after the send would otherwise never ping or strip).
      // Not awaited: caching the resolved subscription state and telling
      // SpotList to re-sync must not block the token strip below.
      if (from === "email" && token) {
        void reportEmailOpen(token, found?.id).then((state) => {
          if (state) {
            cacheEmailSubscriptionState(state);
            window.dispatchEvent(new Event("ptw:alertsenabled"));
          }
        });
      }
    }
    // Item 47 legal gate (D18 action 2): strip `t` from the URL AFTER both
    // the from=alert branch (reportAlertOpen) and the from=email branch
    // (reportEmailOpen) above have fired their pings, and before this effect
    // returns. The strip is synchronous and NOT gated on either promise: a
    // slow or failed ping must never leave a live unsubscribe token sitting
    // in window.location. This also runs before PostHogProvider's own mount
    // effect can capture $current_url, because React runs child effects
    // before parent effects and PostHogProvider wraps HomeClient (its
    // posthog.init() at components/PostHogProvider.tsx:63 has not run yet).
    // Covers both paths, same defect, same one line. Mirrors the
    // replaceState idiom used by the email-confirm landing effect above.
    // `spot`, `from`, `v`, and `pt` are left alone.
    if ((from === "alert" || from === "email") && token) {
      params.delete("t");
      const qs = params.toString();
      window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-locate on load for users who already granted permanent geolocation.
  // Uses the Permissions API so getCurrentPosition is only called when the state
  // is already "granted" — this NEVER triggers a permission prompt on open. The
  // effect mirrors the Near Me result (map flies to the user at zoom 11, list
  // sorts by distance) but keeps the map tab visible instead of switching to the
  // list, so a returning local lands on their nearest spots every time.
  const autoLocated = useRef(false);
  useEffect(() => {
    if (autoLocated.current) return;
    // Don't override a deep-linked spot: the map would fight FlyTo(spot) vs
    // FlyToUser. If the user opened a /spot URL or ?spot=, let the spot win.
    const params = new URLSearchParams(window.location.search);
    if (initialSpotId !== undefined || Number(params.get("spot") || 0)) return;
    if (!navigator.geolocation || !navigator.permissions?.query) return;
    let cancelled = false;
    navigator.permissions
      .query({ name: "geolocation" })
      .then((status) => {
        if (cancelled || status.state !== "granted") return;
        autoLocated.current = true;
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            if (cancelled) return;
            setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
            // SYSTEM: the app centered the map, the user did not act. Kept
            // distinct from near_me_toggled so Near Me intent isn't overstated.
            trackSystem("location_auto_applied", { source: "permission_granted" });
            setPersona({ uses_geolocation: true });
          },
          // Grant present but position unavailable (GPS off, etc.): stay on the
          // default Bay view, no error toast — the user didn't ask for anything.
          () => {},
          // A cached fix (<=5 min) makes this instant on open; fall back to an
          // 8s live lock otherwise.
          { timeout: 8000, maximumAge: 300000 }
        );
      })
      .catch(() => { /* Permissions API unsupported: silently skip auto-locate */ });
    return () => { cancelled = true; };
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

  // Defect C: empty-state copy and clear scope both need to know which axis
  // (search vs structured filters vs both) actually produced zero results, so
  // "Clear filters" never silently also wipes a typed search without saying so.
  const filtersActive = !!(filters.region || filters.difficulty || filters.freeOnly);
  const emptyState = emptyStateCopy(filters.search, filtersActive);
  const onEmptyClear =
    emptyState.clearKind === "search"
      ? clearSearchOnly
      : emptyState.clearKind === "filters"
      ? clearStructuredFilters
      : handleClearAll;

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

  const { condBySpot, loading: conditionsLoading, latencyMs: savedCondLatency } = useSpotConditions(savedSpots);

  // Cold-open "Recently checked" strip (item 26): the spots this device viewed
  // recently, with live paddleability. A pull-based return reason needing no
  // save/install/push. Snapshotted from localStorage after mount (empty on the
  // server + first client render, so no hydration mismatch), deduped against the
  // Watching set, capped. Gated behind a 100%-on kill switch, not an A/B.
  const recentEnabled = useKillSwitch("recent-spots");
  const [recentIds, setRecentIds] = useState<number[]>([]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRecentIds(getRecentSpotIds());
  }, []);
  const recentSpots = useMemo(() => {
    if (!recentEnabled) return [];
    const byId = new Map(ALL_SPOTS.map((s) => [s.id, s] as const));
    return recentIds
      .map((id) => byId.get(id))
      .filter((s): s is Spot => !!s && !favorites.has(s.id))
      .slice(0, 6);
  }, [recentEnabled, recentIds, favorites]);
  const { condBySpot: recentCond } = useSpotConditions(recentSpots);

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
      setGeoErrorReason("unsupported");
      setTimeout(() => {
        setGeoError(false);
        setGeoErrorReason(null);
      }, 4000);
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
        setGeoErrorReason("denied");
        setTimeout(() => {
          setGeoError(false);
          setGeoErrorReason(null);
        }, 4000);
        trackIntent("near_me_toggled", { enabled: true, outcome: "denied" });
      },
      { timeout: 8000 }
    );
  }

  function handleSelect(spot: Spot, source: SpotViewedSource = "list") {
    setSelected(spot);
    // Remember it for the cold-open "Recently checked" strip (item 26). Fire and
    // forget: recents are a return-reason nicety, never on a critical path.
    recordRecentSpot(spot.id);
    // Item 9 default was peek height for in-app selections (list/map/related).
    // Item 42 generalizes item 9's expanded sheet to these opens too, at 100%
    // per owner direction 2026-07-16 (D13). No alert/email exclusion needed
    // here: those sources only ever arrive via the deep-link effect above,
    // never through this in-app path.
    setStartExpanded(isMobileViewport());
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

  // Defect C: scoped clears so the empty-state "Clear search" / "Clear filters"
  // buttons only touch the axis their own copy named, instead of handleClearAll's
  // full reset silently also wiping whichever half the user didn't ask to clear.
  function clearSearchOnly() {
    setFilters((f) => ({ ...f, search: "" }));
    deselect();
    trackIntent("filter_changed", { cleared: true });
  }

  function clearStructuredFilters() {
    setFilters((f) => ({ region: "", difficulty: "", freeOnly: false, search: f.search }));
    setUserLocation(null);
    deselect();
    trackIntent("filter_changed", { cleared: true });
  }

  function setSearch(value: string) {
    setFilters((f) => ({ ...f, search: value }));
    deselect();
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="shrink-0 px-4 py-3 border-b border-gray-200 bg-(--bg) flex items-center justify-between">
        <button
          type="button"
          onClick={goHome}
          className="flex items-center gap-2 font-['Newsreader'] text-xl font-bold text-(--dark) rounded-sm hover:opacity-80 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-(--accent)"
          aria-label="Paddle to Water, return home"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon-192.png" alt="" width={28} height={28} className="h-7 w-7 shrink-0 rounded-[22%]" />
          Paddle to Water
        </button>
        <div className="flex items-center gap-2 md:gap-3">
          <span className="hidden lg:inline text-xs text-(--muted)">Paddleboard &amp; kayak spots across the Bay Area</span>

          {/* Desktop inline search */}
          <div className="relative hidden md:block">
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search spots, towns, wildlife…"
              aria-label="Search spots"
              className="w-52 rounded-lg border border-(--border) bg-white pl-8 pr-7 py-1.5 text-xs text-(--dark) placeholder-gray-400 focus:outline-none focus:border-(--accent)"
            />
            <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">🔍</span>
            {filters.search && (
              <button
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-(--dark) text-sm leading-none"
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
            className="md:hidden text-base px-2 py-1.5 rounded-lg border border-(--border) text-(--muted) hover:border-(--accent) hover:text-(--dark) transition-colors"
          >
            🔍
          </button>

          <button
            onClick={() => { setFeedbackOpen(true); trackIntent("feedback_opened", {}); }}
            className="text-xs font-medium px-3 py-1.5 rounded-lg border border-(--accent) text-(--accent) hover:bg-(--accent) hover:text-white transition-colors"
          >
            Feedback
          </button>
        </div>
      </header>

      {/* Mobile expanded search bar */}
      {searchOpen && (
        <div className="md:hidden shrink-0 px-4 py-2 border-b border-gray-200 bg-(--bg) flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              autoFocus
              value={filters.search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search spots, towns, wildlife…"
              aria-label="Search spots"
              className="w-full rounded-lg border border-(--border) bg-white pl-8 pr-7 py-2 text-base text-(--dark) placeholder-gray-400 focus:outline-none focus:border-(--accent)"
            />
            <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
            {filters.search && (
              <button
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-(--dark)"
              >
                ✕
              </button>
            )}
          </div>
          <button
            onClick={() => setSearchOpen(false)}
            className="shrink-0 text-xs font-medium text-(--muted) hover:text-(--dark) transition-colors"
          >
            Close
          </button>
        </div>
      )}

      {/* Filter bar */}
      <FilterBar
        filters={filters}
        onChange={handleFilterChange}
        nearMe={!!userLocation}
        locating={locating}
        geoError={geoError}
        geoErrorReason={geoErrorReason}
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
                ? "text-(--accent) border-b-2 border-(--accent)"
                : "text-(--muted)"
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
          className={`flex flex-col w-full md:w-80 md:shrink-0 bg-(--bg) border-r border-gray-200 border-l-4 border-l-(--accent) md:flex
            ${activeTab === "list" ? "flex" : "hidden md:flex"}`}
        >
          <SpotList
            spots={sortedFiltered}
            selected={selected}
            onSelect={handleSelect}
            distanceMap={distanceMap}
            onClearFilters={onEmptyClear}
            emptyState={emptyState}
            savedSpots={savedSpots}
            favorites={favorites}
            onToggleFavorite={toggleFavorite}
            condBySpot={condBySpot}
            recentSpots={recentSpots}
            recentCondBySpot={recentCond}
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
            <div className="absolute inset-0 z-[400] flex flex-col items-center justify-center bg-(--bg)/80 backdrop-blur-sm text-center px-4">
              <p className="text-(--dark) font-semibold">{emptyState.title}</p>
              <button
                onClick={onEmptyClear}
                className="mt-3 px-4 py-1.5 rounded-full text-sm font-medium border border-gray-200 text-(--muted) hover:border-(--accent) hover:text-(--dark) transition-colors bg-white"
              >
                {emptyState.clearLabel}
              </button>
            </div>
          )}

          {/* Legend */}
          <div data-testid="map-legend" className="absolute bottom-4 left-4 z-10 bg-white/90 backdrop-blur-sm rounded-xl px-3 py-2 shadow text-xs space-y-1">
            {DIFFICULTY_LEGEND.map(({ color, label }) => (
              <div key={label} className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ background: color }} />
                <span className="text-gray-600">{label}</span>
              </div>
            ))}
            <div className="border-t border-gray-200 mt-0.5 pt-1.5 flex items-center gap-2">
              <a href="/terms" className="text-(--muted) hover:text-(--dark) transition-colors">
                Terms
              </a>
              <span className="text-gray-300" aria-hidden="true">
                &middot;
              </span>
              <a href="/disclaimer" className="text-(--muted) hover:text-(--dark) transition-colors">
                Disclaimer
              </a>
              <span className="text-gray-300" aria-hidden="true">
                &middot;
              </span>
              <a href="/privacy" className="text-(--muted) hover:text-(--dark) transition-colors">
                Privacy
              </a>
            </div>
          </div>
        </div>

        {/* Detail drawer */}
        {selected && (
          <SpotDrawer
            spot={selected}
            onClose={deselect}
            startExpanded={startExpanded}
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

      {emailConfirmed && (
        <div
          role="status"
          className="fixed left-1/2 -translate-x-1/2 z-[1600] rounded-xl px-4 py-2.5 text-sm font-medium text-white shadow-lg"
          style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)", background: "#0B2A47", maxWidth: "calc(100% - 32px)" }}
        >
          Email alerts on. We&rsquo;ll ping you when your spots are good to paddle.
        </div>
      )}

      <ViewportDiagnostic />
    </div>
  );
}
