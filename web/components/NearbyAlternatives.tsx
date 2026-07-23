"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Spot } from "@/lib/types";
import { ALL_SPOTS } from "@/lib/spots";
import { nearbySpots } from "@/lib/distance";
import { windowRange } from "@/lib/nextWindow";
import { trackIntent } from "@/lib/analytics";
import { useKillSwitch } from "@/lib/experiments";
import { useGenuineView } from "@/lib/useGenuineView";
import { useReviewAggregates } from "@/lib/useReviewAggregates";
import { useGoodTodaySignal, useGoodTodaySpots } from "@/components/useGoodToday";
import type { GoodTodaySignal } from "@/lib/goodToday";
import SpotCard from "@/components/SpotCard";
import ConditionsBadge from "@/components/ConditionsBadge";

/**
 * Item 8. "Go here instead": the drawer's redirect when the OPENED spot has no
 * calm daytime window left today. Surfaces up to 2 nearest spots that DO, each a
 * tap-through. The vision's signature moat promise (a within-session reason to
 * keep exploring instead of leaving a blown-out spot).
 *
 * Reuses item 61's machinery: the good-enough bar is `evaluateGoodWindow` (same
 * calm-window definition as the cron, the drawer and item 61, so a recommended
 * alternative never contradicts that spot's own verdict), and each candidate
 * rides the shared `getHourlyPeriods` cache, so the fan-out is bounded to the
 * nearest K and only fires when the opened spot is blown out. Renders nothing
 * when the opened spot is fine, still loading, or nothing nearby is calm.
 *
 * The safety caveat is NOT repeated here: this block renders ABOVE the panel's
 * one foot disclaimer ("Guidance only, not a safety guarantee..."), which
 * co-renders with it (the item 100/61 lawyer-gate placement rule).
 */

const CANDIDATE_K = 8; // bounded fan-out: nearest 8 to the opened spot
const SHOW = 2; // up to 2 alternatives, per the acceptance

/** Badge for an alternative row: the live paddleability, plus, when it is not
 * calm right now but qualified via a later calm window today, a caption naming
 * that window so a Breezy/Windy pill doesn't read as a broken "good" promise. */
function AltBadge({ signal }: { signal: GoodTodaySignal }) {
  const laterWindow = signal.nowPaddleability !== "calm" && signal.window ? signal.window : null;
  return (
    <div className="flex flex-col gap-0.5">
      <ConditionsBadge state={signal.nowPaddleability} />
      {laterWindow && (
        <span className="text-[11px] text-(--muted)">Calm {windowRange(laterWindow)}</span>
      )}
    </div>
  );
}

export default function NearbyAlternatives({
  spot,
  onSelectSpot,
}: {
  spot: Spot;
  onSelectSpot?: (spot: Spot) => void;
}) {
  const enabled = useKillSwitch("go-here-instead") && !!onSelectSpot;
  const reviewsOn = useKillSwitch("reviews");
  const aggregates = useReviewAggregates();

  // The opened spot's own good-today read decides whether it is blown out. Rides
  // the same cached hourly fetch NextGoodWindowPanel already made for this spot.
  const { signal: openedSignal } = useGoodTodaySignal(spot, enabled);
  const blownOut = enabled && openedSignal !== null && !openedSignal.goodToday;

  // Nearest K to the OPENED spot (not the user), excluding the spot itself.
  // nearbySpots already returns the distances, so the row distance and the
  // candidate ranking share one computation, spot-anchored (never user-anchored).
  const nearby = useMemo(
    () => (enabled ? nearbySpots(spot, ALL_SPOTS, CANDIDATE_K) : []),
    [enabled, spot]
  );
  const candidates = useMemo(() => nearby.map((n) => n.spot), [nearby]);
  const distanceMap = useMemo(
    () => Object.fromEntries(nearby.map((n) => [n.spot.id, n.miles])),
    [nearby]
  );
  const { spots: alternatives } = useGoodTodaySpots(candidates, distanceMap, blownOut, SHOW);
  const shouldShow = blownOut && alternatives.length > 0;

  // Fade in once resolved (instant under reduced motion), tracking the spot the
  // fade completed for so it re-fades on a hop to another blown-out spot.
  const [visibleForSpotId, setVisibleForSpotId] = useState<number | null>(null);
  const appeared = shouldShow && visibleForSpotId === spot.id;
  useEffect(() => {
    if (!shouldShow || visibleForSpotId === spot.id) return;
    const id = requestAnimationFrame(() => setVisibleForSpotId(spot.id));
    return () => cancelAnimationFrame(id);
  }, [shouldShow, spot.id, visibleForSpotId]);

  // Dwell-gated impression, keyed to the blown-out spot + the alternatives shown.
  const altKey = alternatives.map((a) => a.spot.id).join(",");
  const countRef = useRef(0);
  useEffect(() => {
    countRef.current = alternatives.length;
  });
  const viewRef = useGenuineView({
    key: `${spot.id}:${altKey}`,
    enabled: shouldShow,
    onView: () => {
      trackIntent("alt_suggested_shown", { spot_id: spot.id, region: spot.region, count: countRef.current });
    },
  });

  if (!shouldShow) return null;

  return (
    <div
      ref={viewRef}
      className={`border-t border-gray-100 pt-2.5 transition-opacity duration-200 motion-reduce:transition-none ${
        appeared ? "opacity-100" : "opacity-0"
      }`}
    >
      <p className="text-xs font-semibold text-(--muted) uppercase tracking-wide mb-1">Go here instead</p>
      <p className="text-sm text-(--dark) mb-1.5">No calm window left here today. Try one of these:</p>
      <span className="sr-only" aria-live="polite">
        {alternatives.length} nearby {alternatives.length === 1 ? "spot has" : "spots have"} a calm window today
      </span>
      <div className="-mx-3.5">
        {alternatives.map(({ spot: alt, signal, distanceMi }) => (
          <SpotCard
            key={alt.id}
            spot={alt}
            selected={false}
            crowd={reviewsOn ? aggregates[alt.id] : undefined}
            distance={distanceMi}
            onClick={() => {
              trackIntent("alt_clicked", { spot_id: alt.id, region: alt.region, from_spot_id: spot.id });
              onSelectSpot?.(alt);
            }}
            conditionsBadge={<AltBadge signal={signal} />}
          />
        ))}
      </div>
    </div>
  );
}
