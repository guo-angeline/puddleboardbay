import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import {
  formatFetchedAt,
  formatTideTime,
  getConditionsRun,
  isNextDay,
  type Paddleability,
  type TideOutcome,
  type WindInfo,
  type WindOutcome,
} from "@/lib/conditions";
import type { Spot } from "@/lib/types";
import { trackIntent, trackSystem } from "../lib/analytics";
import { useGenuineDwell } from "../lib/useGenuineDwell";
import { emit } from "../state/events";
import { colors, fonts, radius } from "../theme/tokens";
import NextGoodWindowPanel from "./NextGoodWindowPanel";

// Same values as the web ConditionsPanel's PADDLE_COPY.
const PADDLE_COPY: Record<Paddleability, { label: string; tone: string; bg: string; text: string }> = {
  calm: { label: "Calm", tone: "Light wind, good for flatwater.", bg: colors.calmFill, text: colors.calm },
  breezy: { label: "Breezy", tone: "Some chop likely, fine if you know the spot.", bg: colors.breezyFill, text: colors.breezy },
  windy: { label: "Windy", tone: "Strong wind, tough for beginners.", bg: colors.windAlertFill, text: colors.windAlert },
  unknown: { label: "", tone: "", bg: colors.fillAlt, text: colors.inkMuted },
};

// Same session semantics as the web: 3 distinct spots' conditions genuinely
// viewed → one conditionsinterest emit, reset on app relaunch.
const conditionsViewedSpots = new Set<number>();
let conditionsInterestFired = false;
function recordConditionsInterest(spotId: number) {
  conditionsViewedSpots.add(spotId);
  if (!conditionsInterestFired && conditionsViewedSpots.size >= 3) {
    conditionsInterestFired = true;
    emit("conditionsinterest");
  }
}

interface WindSlot {
  spotId: number;
  outcome: WindOutcome;
  fetchedAt: number;
}
interface TideSlot {
  spotId: number;
  outcome: TideOutcome;
  fetchedAt: number;
}

function Skeleton() {
  return (
    <View style={{ gap: 8 }}>
      <View style={[styles.skeleton, { width: 96, height: 12 }]} />
      <View style={[styles.skeleton, { height: 40 }]} />
      <View style={[styles.skeleton, { height: 40 }]} />
    </View>
  );
}

function WindReading({ wind, isFlatwater }: { wind: WindInfo; isFlatwater: boolean }) {
  const paddle = PADDLE_COPY[wind.paddleability];
  return (
    <View>
      {isFlatwater && wind.paddleability !== "unknown" && (
        <View style={[styles.paddlePill, { backgroundColor: paddle.bg }]}>
          <Text style={[styles.paddleLabel, { color: paddle.text }]}>{paddle.label}</Text>
          <Text style={[styles.paddleTone, { color: paddle.text }]}>{paddle.tone}</Text>
        </View>
      )}
      <View style={styles.windRow}>
        <Text style={styles.windSpeed}>
          {wind.speedMax === 0
            ? "Wind calm"
            : `Wind ${wind.speedMin === wind.speedMax ? wind.speedMax : `${wind.speedMin}-${wind.speedMax}`} mph`}
        </Text>
        {!!wind.direction && <Text style={styles.windDir}>from {wind.direction}</Text>}
      </View>
      <Text style={styles.forecastLine}>
        {wind.periodName}: {wind.shortForecast}
      </Text>
    </View>
  );
}

/** Live tide + wind for the selected spot. Port of the web ConditionsPanel. */
export default function ConditionsPanel({ spot }: { spot: Spot }) {
  const [wind, setWind] = useState<WindSlot | null>(null);
  const [tide, setTide] = useState<TideSlot | null>(null);
  const logged = useRef<number | null>(null);

  useEffect(() => {
    let alive = true;
    const startedAt = Date.now();
    logged.current = null;
    const run = getConditionsRun(spot.id, spot.lat, spot.lng, spot.tide_sensitive);
    run.wind.then((o) => {
      if (alive) setWind({ spotId: spot.id, outcome: o, fetchedAt: run.fetchedAt });
    });
    run.tide.then((o) => {
      if (alive) setTide({ spotId: spot.id, outcome: o, fetchedAt: run.fetchedAt });
    });
    Promise.all([run.wind, run.tide]).then(([w, t]) => {
      if (!alive || logged.current === spot.id) return;
      logged.current = spot.id;
      const windInfo = w.ok ? w.wind : null;
      trackSystem("conditions_loaded", {
        spot_id: spot.id,
        latency_ms: Date.now() - startedAt,
        failed: !w.ok && !t.ok,
        paddleability: windInfo?.paddleability ?? "unknown",
        has_tides: t.ok && t.tide !== null,
        has_wind: !!windInfo,
        surface: "spot_drawer",
        trigger: "mount",
      });
    });
    return () => {
      alive = false;
    };
  }, [spot.id, spot.lat, spot.lng, spot.tide_sensitive]);

  const isFlatwater = spot.difficulty === "flatwater";
  const windOutcome = wind && wind.spotId === spot.id ? wind.outcome : null;
  const tideOutcome = tide && tide.spotId === spot.id ? tide.outcome : null;
  const windLoading = windOutcome === null;
  const tideLoading = tideOutcome === null;
  const bothErrored = windOutcome?.ok === false && tideOutcome?.ok === false;
  const anyLoaded = !windLoading || !tideLoading;
  const fetchedAt =
    (wind && wind.spotId === spot.id ? wind.fetchedAt : null) ??
    (tide && tide.spotId === spot.id ? tide.fetchedAt : null);
  const windInfo = windOutcome?.ok ? windOutcome.wind : null;

  const viewRef = useRef({ paddleability: "unknown" as Paddleability, hadData: false });
  useEffect(() => {
    const tideInfo = tideOutcome?.ok ? tideOutcome.tide : null;
    viewRef.current = {
      paddleability: windInfo?.paddleability ?? "unknown",
      hadData: !!windInfo || !!tideInfo,
    };
  });
  useGenuineDwell({
    key: spot.id,
    onView: () => {
      trackIntent("conditions_viewed", {
        spot_id: spot.id,
        region: spot.region,
        difficulty: spot.difficulty,
        paddleability: viewRef.current.paddleability,
        had_data: viewRef.current.hadData,
      });
      recordConditionsInterest(spot.id);
    },
  });

  const tideInfo = tideOutcome?.ok ? tideOutcome.tide : null;

  return (
    <View style={styles.panel}>
      <View style={styles.headerRow}>
        <Text style={styles.heading}>CONDITIONS TODAY</Text>
        <Text style={styles.stamp}>
          {anyLoaded && !bothErrored && fetchedAt
            ? `Live as of ${formatFetchedAt(fetchedAt)}`
            : "NOAA · weather.gov"}
        </Text>
      </View>

      {bothErrored ? (
        <Text style={styles.unavailable}>
          Live conditions are unavailable right now. Check back before you head out.
        </Text>
      ) : (
        <View style={{ gap: 12 }}>
          {windLoading ? (
            <Skeleton />
          ) : windInfo ? (
            <WindReading wind={windInfo} isFlatwater={isFlatwater} />
          ) : (
            <Text style={styles.sourceNote}>Wind forecast unavailable.</Text>
          )}

          {spot.tide_sensitive &&
            (tideLoading ? (
              <View style={styles.tideBlock}>
                <View style={[styles.skeleton, { width: 160, height: 16 }]} />
              </View>
            ) : tideInfo ? (
              <View style={styles.tideBlock}>
                <View style={styles.tideEvents}>
                  {tideInfo.next.length > 0 ? (
                    tideInfo.next.slice(0, 2).map((t) => (
                      <Text key={t.time} style={styles.tideEvent}>
                        <Text style={styles.tideType}>{t.type === "H" ? "High" : "Low"}</Text>{" "}
                        {formatTideTime(t.time)}
                        {isNextDay(t.time) && <Text style={styles.tideMuted}> tomorrow</Text>}
                        <Text style={styles.tideMuted}> · {t.heightFt.toFixed(1)} ft</Text>
                      </Text>
                    ))
                  ) : (
                    <Text style={styles.tideMutedLine}>No more tide changes today.</Text>
                  )}
                </View>
                <Text style={styles.stationLine}>
                  Tides at {tideInfo.stationName} ({tideInfo.stationDistanceMi.toFixed(0)} mi)
                </Text>
              </View>
            ) : tideOutcome && !tideOutcome.ok ? (
              <Text style={[styles.sourceNote, styles.tideBlock]}>
                Tide data is unavailable right now.
              </Text>
            ) : (
              <Text style={[styles.sourceNote, styles.tideBlock]}>
                No tide station near this spot.
              </Text>
            ))}

          <Text style={styles.safetyLine}>
            Guidance only, not a safety guarantee. Conditions shift fast on the water.
          </Text>
        </View>
      )}

      <NextGoodWindowPanel spot={spot} />
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    marginBottom: 16,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: colors.white,
    padding: 14,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  heading: {
    fontFamily: fonts.bodySemibold,
    fontSize: 12,
    letterSpacing: 0.6,
    color: colors.muted,
  },
  stamp: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.inkFaint,
  },
  skeleton: {
    borderRadius: radius.lg,
    backgroundColor: "#F3F4F6",
  },
  paddlePill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 8,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 8,
  },
  paddleLabel: {
    fontFamily: fonts.bodySemibold,
    fontSize: 12,
  },
  paddleTone: {
    fontFamily: fonts.body,
    fontSize: 12,
    opacity: 0.9,
    flexShrink: 1,
  },
  windRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
  },
  windSpeed: {
    fontFamily: fonts.bodySemibold,
    fontSize: 16,
    color: colors.dark,
  },
  windDir: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.muted,
  },
  forecastLine: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  tideBlock: {
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    paddingTop: 10,
  },
  tideEvents: {
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: 16,
    rowGap: 4,
  },
  tideEvent: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.dark,
  },
  tideType: {
    fontFamily: fonts.bodySemibold,
  },
  tideMuted: {
    color: colors.muted,
  },
  tideMutedLine: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.muted,
  },
  stationLine: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkFaint,
    marginTop: 4,
  },
  unavailable: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.muted,
  },
  sourceNote: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.muted,
  },
  safetyLine: {
    fontFamily: fonts.body,
    fontSize: 10,
    lineHeight: 14,
    color: colors.inkFaint,
  },
});
