import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { Spot } from "@/lib/types";
import { DIFFICULTY_LABEL } from "@/lib/types";
import { colors, fonts, radius } from "../theme/tokens";

interface Props {
  spot: Spot;
  selected: boolean;
  onPress: () => void;
  distance?: number;
  isFavorite?: boolean;
  onToggleFavorite?: (id: number) => void;
  conditionsBadge?: ReactNode;
}

// Same tints as the web SpotCard's difficulty pill (tailwind emerald/sky/orange
// 50-tier equivalents, kept as the web renders them).
const DIFF_STYLES: Record<string, { bg: string; text: string }> = {
  flatwater: { bg: "#ECFDF5", text: "#065F46" },
  bay: { bg: "#F0F9FF", text: "#075985" },
  river: { bg: "#FFF7ED", text: "#9A3412" },
  unknown: { bg: "#F5F5F4", text: "#78716C" },
};

function formatDistance(miles: number): string {
  return miles < 0.2 ? `${Math.round(miles * 5280)} ft` : `${miles.toFixed(1)} mi`;
}

export default function SpotCard({
  spot,
  selected,
  onPress,
  distance,
  isFavorite,
  onToggleFavorite,
  conditionsBadge,
}: Props) {
  const diff = DIFF_STYLES[spot.difficulty] ?? DIFF_STYLES.unknown;
  return (
    <Pressable
      onPress={onPress}
      style={[styles.card, selected && styles.cardSelected]}
      accessibilityRole="button"
    >
      <View style={styles.row}>
        <View style={styles.main}>
          <Text numberOfLines={1} style={styles.title}>
            {spot.water}
          </Text>
          <Text numberOfLines={1} style={styles.subtitle}>
            {typeof spot.owner_rating === "number" && (
              <Text style={styles.rating}>
                <Text style={{ color: colors.accent }}>★</Text>
                {` ${spot.owner_rating.toFixed(1)} · `}
              </Text>
            )}
            {spot.city}
            {distance !== undefined ? (
              <>
                {" · "}
                <Text style={styles.distance}>{formatDistance(distance)}</Text>
              </>
            ) : (
              ` · ${spot.region}`
            )}
          </Text>
          {conditionsBadge ? <View style={styles.badgeRow}>{conditionsBadge}</View> : null}
        </View>
        <View style={styles.side}>
          <View style={[styles.diffPill, { backgroundColor: diff.bg }]}>
            <Text style={[styles.diffText, { color: diff.text }]}>
              {DIFFICULTY_LABEL[spot.difficulty]}
            </Text>
          </View>
          {onToggleFavorite && (
            <Pressable
              onPress={() => onToggleFavorite(spot.id)}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={isFavorite ? "Stop watching this spot" : "Watch this spot"}
              style={styles.heartButton}
            >
              <Text style={[styles.heart, { color: isFavorite ? colors.saved : colors.muted }]}>
                {isFavorite ? "♥" : "♡"}
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    backgroundColor: colors.bg,
  },
  cardSelected: {
    backgroundColor: colors.white,
    borderLeftWidth: 4,
    borderLeftColor: colors.accent,
    paddingLeft: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  main: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontFamily: fonts.bodySemibold,
    fontSize: 14,
    color: colors.dark,
    lineHeight: 19,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  rating: {
    fontFamily: fonts.bodySemibold,
    color: colors.dark,
  },
  distance: {
    fontFamily: fonts.bodyMedium,
    color: colors.accent,
  },
  badgeRow: {
    marginTop: 6,
  },
  side: {
    alignItems: "flex-end",
    gap: 6,
  },
  diffPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  diffText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
  },
  heartButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -8,
    marginRight: -6,
  },
  heart: {
    fontSize: 20,
    lineHeight: 22,
  },
});
