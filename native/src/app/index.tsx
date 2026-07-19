import * as Location from "expo-location";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useSpotConditions } from "@/components/useSavedConditions";
import { distanceMiles } from "@/lib/distance";
import { emptyStateCopy } from "@/lib/emptyStateCopy";
import { nextRecentIds } from "@/lib/recentSpots";
import { searchSpots } from "@/lib/search";
import { ALL_SPOTS } from "@/lib/spots";
import { DIFFICULTY_LEGEND, type Spot } from "@/lib/types";
import FeedbackModal from "../components/FeedbackModal";
import FilterBar, { type Filters } from "../components/FilterBar";
import MapPane from "../components/MapPane";
import SpotList from "../components/SpotList";
import SpotSheet from "../components/SpotSheet";
import { setPersona, trackIntent } from "../lib/analytics";
import { emit } from "../state/events";
import {
  loadFavorites,
  loadRecentIds,
  saveFavorites,
  saveRecentIds,
} from "../storage/appStorage";
import { colors, fonts, radius } from "../theme/tokens";

const icon = require("../../assets/images/icon.png");

function applyFilters(spots: Spot[], filters: Filters): Spot[] {
  const structured = spots.filter((s) => {
    if (filters.region && s.region !== filters.region) return false;
    if (filters.difficulty && s.difficulty !== filters.difficulty) return false;
    if (filters.freeOnly && s.has_fee !== false) return false;
    return true;
  });
  return filters.search.trim() ? searchSpots(structured, filters.search) : structured;
}

export default function HomeScreen() {
  const [filters, setFilters] = useState<Filters>({
    region: "",
    difficulty: "",
    freeOnly: false,
    search: "",
  });
  const [selected, setSelected] = useState<Spot | null>(null);
  const [activeTab, setActiveTab] = useState<"map" | "list">("map");
  const [searchOpen, setSearchOpen] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState(false);
  const [geoErrorReason, setGeoErrorReason] = useState<"denied" | "unsupported" | null>(null);
  const [favorites, setFavorites] = useState<Set<number>>(new Set());
  const [favoritesLoaded, setFavoritesLoaded] = useState(false);
  const [recentIds, setRecentIds] = useState<number[]>([]);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const geoErrorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadFavorites().then((favs) => {
      if (cancelled) return;
      setFavorites(favs);
      setFavoritesLoaded(true);
    });
    loadRecentIds().then((ids) => {
      if (!cancelled) setRecentIds(ids);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Signal sheet open/closed to the enrollment prompt (web: ptw:drawerchange).
  useEffect(() => {
    emit("drawerchange", { open: !!selected });
  }, [selected]);

  useEffect(() => {
    if (!favoritesLoaded) return;
    void saveFavorites(favorites);
  }, [favorites, favoritesLoaded]);

  // Auto-locate on launch ONLY if permission was already granted, mirroring the
  // web's Permissions API discipline: opening the app never triggers a prompt.
  const autoLocated = useRef(false);
  useEffect(() => {
    if (autoLocated.current) return;
    let cancelled = false;
    Location.getForegroundPermissionsAsync()
      .then(async (status) => {
        if (cancelled || !status.granted) return;
        autoLocated.current = true;
        try {
          const pos = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          if (cancelled) return;
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setPersona({ uses_geolocation: true });
        } catch {
          /* GPS unavailable: stay on the Bay default, no error surface */
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  function flashGeoError(reason: "denied" | "unsupported") {
    setGeoError(true);
    setGeoErrorReason(reason);
    if (geoErrorTimer.current) clearTimeout(geoErrorTimer.current);
    geoErrorTimer.current = setTimeout(() => {
      setGeoError(false);
      setGeoErrorReason(null);
    }, 4000);
  }

  async function handleNearMe() {
    if (userLocation) {
      setUserLocation(null);
      trackIntent("near_me_toggled", { enabled: false });
      return;
    }
    setLocating(true);
    try {
      const { granted } = await Location.requestForegroundPermissionsAsync();
      if (!granted) {
        setLocating(false);
        flashGeoError("denied");
        trackIntent("near_me_toggled", { enabled: true, outcome: "denied" });
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      setLocating(false);
      setActiveTab("list");
      trackIntent("near_me_toggled", { enabled: true, outcome: "granted" });
      setPersona({ uses_geolocation: true });
    } catch {
      setLocating(false);
      flashGeoError("unsupported");
      trackIntent("near_me_toggled", { enabled: true, outcome: "unsupported" });
    }
  }

  function toggleFavorite(id: number) {
    const adding = !favorites.has(id);
    const spot = ALL_SPOTS.find((s) => s.id === id);
    setFavorites((prev) => {
      const next = new Set(prev);
      if (adding) next.add(id);
      else next.delete(id);
      trackIntent("favorite_toggled", {
        spot_id: id,
        spot_name: spot?.water,
        region: spot?.region,
        action: adding ? "add" : "remove",
        total_favorites: next.size,
      });
      setPersona({ saves_spots: true, favorite_count: next.size });
      return next;
    });
    if (adding) emit("spotsaved", { spotName: spot?.water ?? "this spot" });
  }

  function deselect() {
    setSelected(null);
  }

  function handleSelect(spot: Spot, source: string = "list") {
    setSelected(spot);
    // Remember it for the cold-open "Recently checked" strip. Fire and forget.
    setRecentIds((prev) => {
      const next = nextRecentIds(prev, spot.id);
      void saveRecentIds(next);
      return next;
    });
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
  }

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

  const isFiltered = !!(
    filters.region ||
    filters.difficulty ||
    filters.freeOnly ||
    filters.search.trim()
  );
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
    if (!userLocation || filters.search.trim()) return filtered;
    return [...filtered].sort(
      (a, b) => distanceMiles(userLocation, a) - distanceMiles(userLocation, b)
    );
  }, [filtered, userLocation, filters.search]);

  // Debounced search analytics, once typing settles.
  useEffect(() => {
    const q = filters.search.trim();
    if (!q) return;
    const t = setTimeout(() => {
      trackIntent("spot_search", { query: q, results: sortedFiltered.length });
    }, 500);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.search]);

  const savedSpots = useMemo(() => ALL_SPOTS.filter((s) => favorites.has(s.id)), [favorites]);
  const { condBySpot } = useSpotConditions(savedSpots);

  const recentSpots = useMemo(() => {
    const byId = new Map(ALL_SPOTS.map((s) => [s.id, s] as const));
    return recentIds
      .map((id) => byId.get(id))
      .filter((s): s is Spot => !!s && !favorites.has(s.id))
      .slice(0, 6);
  }, [recentIds, favorites]);
  const { condBySpot: recentCond } = useSpotConditions(recentSpots);

  const distanceMap = useMemo<Record<number, number> | undefined>(() => {
    if (!userLocation) return undefined;
    return Object.fromEntries(ALL_SPOTS.map((s) => [s.id, distanceMiles(userLocation, s)]));
  }, [userLocation]);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={goHome} style={styles.wordmarkRow} accessibilityRole="button">
          <Image source={icon} style={styles.headerIcon} />
          <Text style={styles.wordmark}>Paddle to Water</Text>
        </Pressable>
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => setSearchOpen((o) => !o)}
            style={styles.searchToggle}
            accessibilityRole="button"
            accessibilityLabel={searchOpen ? "Close search" : "Open search"}
          >
            <Text style={styles.searchToggleText}>🔍</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setFeedbackOpen(true);
              trackIntent("feedback_opened", {});
            }}
            style={styles.feedbackButton}
            accessibilityRole="button"
          >
            <Text style={styles.feedbackButtonText}>Feedback</Text>
          </Pressable>
        </View>
      </View>

      {/* Expanded search bar */}
      {searchOpen && (
        <View style={styles.searchBar}>
          <View style={styles.searchInputWrap}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              autoFocus
              value={filters.search}
              onChangeText={setSearch}
              placeholder="Search spots, towns, wildlife…"
              placeholderTextColor={colors.inkFaint}
              style={styles.searchInput}
              autoCorrect={false}
              clearButtonMode="while-editing"
            />
          </View>
          <Pressable onPress={() => setSearchOpen(false)} hitSlop={8}>
            <Text style={styles.searchClose}>Close</Text>
          </Pressable>
        </View>
      )}

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

      {/* Map / List tab bar */}
      <View style={styles.tabBar}>
        {(["map", "list"] as const).map((tab) => (
          <Pressable
            key={tab}
            onPress={() => {
              setActiveTab(tab);
              trackIntent("view_switched", { view: tab });
            }}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === "map" ? `Map (${sortedFiltered.length})` : "List"}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Main content: both stay mounted, tabs toggle visibility (map keeps its
          camera; the web does the same with display:none). */}
      <View style={styles.content}>
        <View style={[styles.pane, activeTab !== "list" && styles.paneHidden]}>
          <SpotList
            spots={sortedFiltered}
            selected={selected}
            onSelect={handleSelect}
            onClearFilters={onEmptyClear}
            emptyState={emptyState}
            distanceMap={distanceMap}
            savedSpots={savedSpots}
            favorites={favorites}
            onToggleFavorite={toggleFavorite}
            condBySpot={condBySpot}
            recentSpots={recentSpots}
            recentCondBySpot={recentCond}
          />
        </View>
        <View style={[styles.pane, activeTab !== "map" && styles.paneHidden]}>
          <MapPane
            spots={sortedFiltered}
            selected={selected}
            onSelect={handleSelect}
            userLocation={userLocation}
            fitToSpots={isFiltered}
          />

          {sortedFiltered.length === 0 && (
            <View style={styles.mapEmpty}>
              <Text style={styles.emptyTitle}>{emptyState.title}</Text>
              <Pressable onPress={onEmptyClear} style={styles.emptyButton}>
                <Text style={styles.emptyButtonText}>{emptyState.clearLabel}</Text>
              </Pressable>
            </View>
          )}

          {/* Legend */}
          <View style={styles.legend} pointerEvents="none">
            {DIFFICULTY_LEGEND.map(({ color, label }) => (
              <View key={label} style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: color }]} />
                <Text style={styles.legendLabel}>{label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Full-screen spot detail (native twin of the web mobile sheet) */}
        {selected && (
          <SpotSheet
            spot={selected}
            onClose={deselect}
            isFavorite={favorites.has(selected.id)}
            onToggleFavorite={toggleFavorite}
          />
        )}
      </View>

      {feedbackOpen && <FeedbackModal onClose={() => setFeedbackOpen(false)} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    backgroundColor: colors.bg,
  },
  wordmarkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerIcon: {
    width: 28,
    height: 28,
    borderRadius: 6,
  },
  wordmark: {
    fontFamily: fonts.displaySemibold,
    fontSize: 20,
    color: colors.dark,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchToggle: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchToggleText: {
    fontSize: 14,
  },
  feedbackButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  feedbackButtonText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.accent,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    backgroundColor: colors.bg,
  },
  searchInputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: 10,
  },
  searchIcon: {
    fontSize: 12,
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 8,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.dark,
  },
  searchClose: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.muted,
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomColor: colors.accent,
  },
  tabText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.muted,
  },
  tabTextActive: {
    color: colors.accent,
  },
  content: {
    flex: 1,
  },
  pane: {
    ...(StyleSheet.absoluteFill as object),
  },
  paneHidden: {
    display: "none",
  },
  mapEmpty: {
    ...(StyleSheet.absoluteFill as object),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(238, 245, 251, 0.85)",
    paddingHorizontal: 16,
  },
  emptyTitle: {
    fontFamily: fonts.bodySemibold,
    fontSize: 15,
    color: colors.dark,
    textAlign: "center",
  },
  emptyButton: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: colors.white,
  },
  emptyButtonText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.muted,
  },
  legend: {
    position: "absolute",
    bottom: 16,
    left: 16,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: radius.xl,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendLabel: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: "#4B5563",
  },
});
