import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { DEFAULT_HORIZON_DAYS } from "@/lib/alerts/conditions-window";
import { formatNextWindow, getNextWindow, noWindowLine, type NextWindowResult } from "@/lib/nextWindow";
import type { Spot } from "@/lib/types";
import { trackIntent } from "../lib/analytics";
import { useGenuineDwell } from "../lib/useGenuineDwell";
import { colors, fonts } from "../theme/tokens";

interface Loaded {
  spotId: number;
  result: NextWindowResult;
}

/** "Looking ahead" block: the soonest upcoming calm window. Port of the web panel. */
export default function NextGoodWindowPanel({ spot }: { spot: Spot }) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    let alive = true;
    getNextWindow(spot.id, spot.lat, spot.lng).then((result) => {
      if (!alive) return;
      setLoaded({ spotId: spot.id, result });
    });
    return () => {
      alive = false;
    };
  }, [spot.id, spot.lat, spot.lng]);

  const result = loaded && loaded.spotId === spot.id ? loaded.result : null;
  const shouldShow = !!result && result.ok === true;

  useGenuineDwell({
    key: spot.id,
    enabled: shouldShow,
    onView: () => {
      if (!result || !result.ok) return;
      trackIntent("next_window_viewed", {
        spot_id: spot.id,
        region: spot.region,
        difficulty: spot.difficulty,
        had_window: !!result.window,
      });
    },
  });

  if (!result || result.ok === false) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>LOOKING AHEAD</Text>
      {result.window ? (
        <Text style={styles.line}>
          Next good window:{" "}
          <Text style={styles.windowText}>{formatNextWindow(result.window)}</Text>
        </Text>
      ) : (
        <Text style={styles.noWindow}>{noWindowLine(DEFAULT_HORIZON_DAYS)}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    paddingTop: 10,
    marginTop: 12,
  },
  heading: {
    fontFamily: fonts.bodySemibold,
    fontSize: 12,
    letterSpacing: 0.6,
    color: colors.muted,
    marginBottom: 4,
  },
  line: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.dark,
  },
  windowText: {
    fontFamily: fonts.bodySemibold,
    color: colors.accent,
  },
  noWindow: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.muted,
  },
});
