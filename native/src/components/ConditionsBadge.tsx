import { StyleSheet, Text, View } from "react-native";

import type { SavedConditionState } from "@/lib/savedConditions";
import { colors, fonts, radius } from "../theme/tokens";

// Same values as web ConditionsBadge's STYLE map.
const STYLE: Record<SavedConditionState, { bg: string; text: string; label: string }> = {
  calm: { bg: colors.calmFill, text: colors.calm, label: "Calm" },
  breezy: { bg: colors.breezyFill, text: colors.breezy, label: "Breezy" },
  windy: { bg: colors.windAlertFill, text: colors.windAlert, label: "Windy" },
  unknown: { bg: colors.fillAlt, text: colors.inkMuted, label: "No data" },
  loading: { bg: colors.fillAlt, text: colors.inkMuted, label: "…" },
};

export default function ConditionsBadge({ state }: { state: SavedConditionState }) {
  const s = STYLE[state] ?? STYLE.unknown;
  return (
    <View style={[styles.badge, { backgroundColor: s.bg }]}>
      <Text style={[styles.text, { color: s.text }]}>{s.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  text: {
    fontFamily: fonts.bodySemibold,
    fontSize: 11,
  },
});
