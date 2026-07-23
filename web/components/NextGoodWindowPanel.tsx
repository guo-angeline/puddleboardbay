"use client";

import { useEffect, useRef, useState } from "react";
import type { Spot } from "@/lib/types";
import { getNextWindow, formatNextWindow, noWindowLine, type NextWindowResult } from "@/lib/nextWindow";
import { DEFAULT_HORIZON_DAYS } from "@/lib/alerts/conditions-window";
import { trackIntent } from "@/lib/analytics";
import { useGenuineView } from "@/lib/useGenuineView";

// Keyed result so we can tell whether `result` belongs to the current spot
// without a synchronous reset-setState in the effect (mirrors ConditionsPanel).
interface Loaded {
  spotId: number;
  result: NextWindowResult;
}

/**
 * "Next good window" block in the spot drawer: previews the soonest upcoming
 * calm window. It is the one surface that makes opening the app cold (not via a
 * push) worthwhile, so it now ships to 100% (item 20): the `next_good_window`
 * A/B was retired because it needed ~430-680 exposed per arm (months at current
 * traffic) and could not power. Kept the dwell-gated `next_window_viewed` intent
 * event for a monitored rollout. See docs/experiments/next-good-window.md.
 */
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

  // Fade-in over 0.2s once the block has something to show (instant under
  // prefers-reduced-motion). Tracks the spot id the fade completed for, rather
  // than resetting a boolean synchronously in the effect (avoids cascading-render
  // lint).
  const [visibleForSpotId, setVisibleForSpotId] = useState<number | null>(null);
  const appeared = shouldShow && visibleForSpotId === spot.id;
  useEffect(() => {
    if (!shouldShow || visibleForSpotId === spot.id) return;
    const id = requestAnimationFrame(() => setVisibleForSpotId(spot.id));
    return () => cancelAnimationFrame(id);
  }, [shouldShow, spot.id, visibleForSpotId]);

  // INTENT diagnostic: dwell-gated genuine view of the block. Read `result` via
  // a ref so the one-shot callback sees the latest value.
  const resultRef = useRef<NextWindowResult | null>(null);
  useEffect(() => {
    resultRef.current = result;
  });
  const viewRef = useGenuineView({
    key: spot.id,
    enabled: shouldShow,
    onView: () => {
      const r = resultRef.current;
      if (!r || !r.ok) return;
      trackIntent("next_window_viewed", {
        spot_id: spot.id,
        region: spot.region,
        difficulty: spot.difficulty,
        had_window: !!r.window,
      });
    },
  });

  if (!result || result.ok === false) return null;

  return (
    <div
      ref={viewRef}
      className={`border-t border-gray-100 pt-2.5 transition-opacity duration-200 motion-reduce:transition-none ${
        appeared ? "opacity-100" : "opacity-0"
      }`}
    >
      <p className="text-xs font-semibold text-(--muted) uppercase tracking-wide mb-1">Looking ahead</p>
      {result.window ? (
        <p className="text-sm text-(--dark)">
          Next good window: <span className="font-semibold text-(--accent)">{formatNextWindow(result.window)}</span>
          {/* Item 103 soft caveat: a wet window is LABELLED, never suppressed
              (rain is a comfort fact the paddler judges). In-app only. */}
          {result.rain && <span className="text-(--muted)"> &middot; {result.rain}</span>}
        </p>
      ) : (
        <p className="text-sm text-(--muted)">{noWindowLine(DEFAULT_HORIZON_DAYS)}</p>
      )}
    </div>
  );
}
