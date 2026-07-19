import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { DIFFICULTIES, DIFFICULTY_LABEL, REGIONS, type Difficulty } from "@/lib/types";
import { colors, fonts, radius } from "../theme/tokens";

export interface Filters {
  region: string;
  difficulty: string;
  freeOnly: boolean;
  search: string;
}

interface Props {
  filters: Filters;
  onChange: (f: Filters) => void;
  nearMe: boolean;
  locating: boolean;
  geoError: boolean;
  geoErrorReason: "denied" | "unsupported" | null;
  onToggleNearMe: () => void;
  onClearAll: () => void;
}

// Same palette values as web FilterBar's DIFF_PALETTE.
const DIFF_PALETTE: Record<Difficulty, { bg: string; lightBg: string; color: string }> = {
  flatwater: { bg: "#12A5B0", lightBg: "#DBF3F0", color: "#0E7F78" },
  bay: { bg: "#0E6FD1", lightBg: "#E3EEFA", color: "#0B4E96" },
  river: { bg: "#E06636", lightBg: "#FDEAE0", color: "#CC5528" },
  unknown: { bg: "#8AA0B4", lightBg: "#EEF3F9", color: "#42607A" },
};

function hasActiveFilters(f: Filters, nearMe: boolean) {
  return f.region !== "" || f.difficulty !== "" || f.freeOnly || f.search.trim() !== "" || nearMe;
}

export default function FilterBar({
  filters,
  onChange,
  nearMe,
  locating,
  geoError,
  geoErrorReason,
  onToggleNearMe,
  onClearAll,
}: Props) {
  function nearMeLabel() {
    if (geoError) return "Location unavailable";
    if (locating) return "Locating…";
    if (nearMe) return "Near me ✓";
    return "Near me";
  }

  const nearMeColors = geoError
    ? { backgroundColor: colors.windAlertFill, textColor: colors.windAlert }
    : nearMe
      ? { backgroundColor: colors.accent, textColor: colors.white }
      : { backgroundColor: colors.accentLight, textColor: colors.accentInk };

  return (
    <View style={styles.container}>
      {/* Row 1 — region pills, horizontally scrollable */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.regionRow}
      >
        {["All", ...REGIONS].map((r) => {
          const isActive = filters.region === r || (r === "All" && filters.region === "");
          return (
            <Pressable
              key={r}
              onPress={() =>
                onChange({ ...filters, region: r === "All" || filters.region === r ? "" : r })
              }
              style={[styles.regionPill, isActive ? styles.regionPillActive : styles.regionPillIdle]}
            >
              <Text
                style={[
                  styles.regionPillText,
                  { color: isActive ? colors.white : colors.dark },
                ]}
              >
                {r}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Row 2 — difficulty + free + near me, one row of 5 like mobile web */}
      <View style={styles.smallRow}>
        {DIFFICULTIES.map((d) => {
          const { bg, lightBg, color } = DIFF_PALETTE[d];
          const isActive = filters.difficulty === d;
          return (
            <Pressable
              key={d}
              onPress={() => onChange({ ...filters, difficulty: isActive ? "" : d })}
              style={[styles.smallPill, { backgroundColor: isActive ? bg : lightBg }]}
            >
              <Text
                numberOfLines={1}
                style={[styles.smallPillText, { color: isActive ? colors.white : color }]}
              >
                {DIFFICULTY_LABEL[d]}
              </Text>
            </Pressable>
          );
        })}

        <Pressable
          onPress={() => onChange({ ...filters, freeOnly: !filters.freeOnly })}
          style={[
            styles.smallPill,
            { backgroundColor: filters.freeOnly ? colors.free : colors.freeFill },
          ]}
        >
          <Text
            numberOfLines={1}
            style={[styles.smallPillText, { color: filters.freeOnly ? colors.white : colors.free }]}
          >
            Free only
          </Text>
        </Pressable>

        <Pressable
          onPress={onToggleNearMe}
          disabled={locating}
          style={[styles.smallPill, { backgroundColor: nearMeColors.backgroundColor }]}
        >
          <Text
            numberOfLines={1}
            style={[styles.smallPillText, { color: nearMeColors.textColor }]}
          >
            {nearMeLabel()}
          </Text>
        </Pressable>
      </View>

      {/* Reason-specific recovery line for denied/unsupported location */}
      {geoErrorReason && (
        <View style={styles.geoErrorBox}>
          <Text style={styles.geoErrorText}>
            {geoErrorReason === "unsupported"
              ? "Location isn't available on this device. Try searching by name instead."
              : "Location access is off. Turn it on in Settings, then tap Near me again."}
          </Text>
        </View>
      )}

      {hasActiveFilters(filters, nearMe) && (
        <View style={styles.clearRow}>
          <Pressable onPress={onClearAll} hitSlop={8}>
            <Text style={styles.clearText}>Clear all</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  regionRow: {
    gap: 8,
    paddingRight: 16,
  },
  regionPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  regionPillActive: {
    backgroundColor: colors.accent,
  },
  regionPillIdle: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  regionPillText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
  },
  smallRow: {
    flexDirection: "row",
    gap: 4,
  },
  smallPill: {
    flex: 1,
    paddingVertical: 5,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  smallPillText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
  },
  geoErrorBox: {
    borderRadius: radius.lg,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.windAlertFill,
  },
  geoErrorText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.windAlert,
  },
  clearRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  clearText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.muted,
    textDecorationLine: "underline",
  },
});
