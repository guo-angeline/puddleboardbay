import { useMemo, useRef } from "react";
import { FlatList, Linking, Pressable, StyleSheet, Text, View } from "react-native";

import { rankSavedSpotsByConditions, type SavedConditionState } from "@/lib/savedConditions";
import type { Spot } from "@/lib/types";
import { trackIntent } from "../lib/analytics";
import { colors, fonts, radius } from "../theme/tokens";
import ConditionsBadge from "./ConditionsBadge";
import SpotCard from "./SpotCard";

interface Props {
  spots: Spot[];
  selected: Spot | null;
  onSelect: (spot: Spot, source?: string) => void;
  onClearFilters: () => void;
  emptyState: { title: string; clearLabel: string };
  distanceMap?: Record<number, number>;
  savedSpots?: Spot[];
  favorites?: Set<number>;
  onToggleFavorite?: (id: number) => void;
  condBySpot?: Record<number, SavedConditionState>;
  recentSpots?: Spot[];
  recentCondBySpot?: Record<number, SavedConditionState>;
  alertsOn?: boolean;
  onEnableAlerts?: () => void;
}

const LEGAL_LINKS = [
  { label: "Terms", url: "https://paddletowater.com/terms" },
  { label: "Disclaimer", url: "https://paddletowater.com/disclaimer" },
  { label: "Privacy", url: "https://paddletowater.com/privacy" },
];

export default function SpotList({
  spots,
  selected,
  onSelect,
  onClearFilters,
  emptyState,
  distanceMap,
  savedSpots = [],
  favorites = new Set(),
  onToggleFavorite,
  condBySpot = {},
  recentSpots = [],
  recentCondBySpot = {},
  alertsOn = true,
  onEnableAlerts,
}: Props) {
  const listRef = useRef<FlatList<Spot>>(null);

  const recentIdSet = useMemo(() => new Set(recentSpots.map((s) => s.id)), [recentSpots]);
  const mainSpots = useMemo(
    () => spots.filter((s) => !favorites.has(s.id) && !recentIdSet.has(s.id)),
    [spots, favorites, recentIdSet]
  );
  const rankedSaved = useMemo(
    () => rankSavedSpotsByConditions(savedSpots, condBySpot),
    [savedSpots, condBySpot]
  );

  if (mainSpots.length === 0 && savedSpots.length === 0 && recentSpots.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>{emptyState.title}</Text>
        <Pressable onPress={onClearFilters} style={styles.emptyButton}>
          <Text style={styles.emptyButtonText}>{emptyState.clearLabel}</Text>
        </Pressable>
      </View>
    );
  }

  const header = (
    <View>
      {savedSpots.length === 0 && onToggleFavorite && mainSpots.length > 0 && (
        <Text style={styles.nudge}>
          Tap <Text style={{ color: colors.saved }}>♥</Text> to watch a spot&rsquo;s conditions.
        </Text>
      )}

      {savedSpots.length > 0 && (
        <View>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>WATCHING</Text>
            <Text style={styles.sectionCount}>({savedSpots.length})</Text>
            {!alertsOn && onEnableAlerts && (
              <Pressable onPress={onEnableAlerts} style={styles.alertsButton} hitSlop={8}>
                <Text style={styles.alertsButtonText}>Turn on alerts</Text>
              </Pressable>
            )}
          </View>
          {rankedSaved.map((spot) => (
            <SpotCard
              key={spot.id}
              spot={spot}
              selected={selected?.id === spot.id}
              onPress={() => onSelect(spot, "list")}
              distance={distanceMap?.[spot.id]}
              isFavorite
              onToggleFavorite={onToggleFavorite}
              conditionsBadge={<ConditionsBadge state={condBySpot[spot.id] ?? "loading"} />}
            />
          ))}
          <View style={styles.sectionDivider} />
        </View>
      )}

      {recentSpots.length > 0 && (
        <View>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>RECENTLY CHECKED</Text>
          </View>
          {recentSpots.map((spot) => (
            <SpotCard
              key={spot.id}
              spot={spot}
              selected={selected?.id === spot.id}
              onPress={() => {
                trackIntent("recent_spot_clicked", { spot_id: spot.id, region: spot.region });
                onSelect(spot, "list");
              }}
              distance={distanceMap?.[spot.id]}
              isFavorite={favorites.has(spot.id)}
              onToggleFavorite={onToggleFavorite}
              conditionsBadge={<ConditionsBadge state={recentCondBySpot[spot.id] ?? "loading"} />}
            />
          ))}
          <View style={styles.sectionDivider} />
        </View>
      )}
    </View>
  );

  const footer = (
    <View style={styles.footer}>
      {LEGAL_LINKS.map((l, i) => (
        <View key={l.label} style={styles.footerItem}>
          {i > 0 && <Text style={styles.footerDot}>·</Text>}
          <Pressable onPress={() => Linking.openURL(l.url)} hitSlop={6}>
            <Text style={styles.footerLink}>{l.label}</Text>
          </Pressable>
        </View>
      ))}
    </View>
  );

  return (
    <FlatList
      ref={listRef}
      data={mainSpots}
      keyExtractor={(s) => String(s.id)}
      renderItem={({ item }) => (
        <SpotCard
          spot={item}
          selected={selected?.id === item.id}
          onPress={() => onSelect(item, "list")}
          distance={distanceMap?.[item.id]}
          isFavorite={favorites.has(item.id)}
          onToggleFavorite={onToggleFavorite}
        />
      )}
      ListHeaderComponent={header}
      ListFooterComponent={footer}
      style={styles.list}
      contentInsetAdjustmentBehavior="never"
    />
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  nudge: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.muted,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
  },
  sectionTitle: {
    fontFamily: fonts.bodySemibold,
    fontSize: 11,
    letterSpacing: 1,
    color: colors.muted,
  },
  sectionCount: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.muted,
    opacity: 0.6,
  },
  alertsButton: {
    marginLeft: "auto",
  },
  alertsButtonText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 11,
    color: colors.accent,
  },
  sectionDivider: {
    marginHorizontal: 16,
    marginVertical: 6,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 64,
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
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  footerItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  footerDot: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkFaint,
  },
  footerLink: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.muted,
  },
});
