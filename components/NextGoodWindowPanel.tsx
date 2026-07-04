"use client";

import { useEffect, useRef, useState } from "react";
import type { Spot } from "@/lib/types";
import { getNextWindow, formatNextWindow, noWindowLine, type NextWindowResult } from "@/lib/nextWindow";
import { DEFAULT_HORIZON_DAYS } from "@/lib/alerts/conditions-window";
import { trackIntent } from "@/lib/analytics";
import { useExperiment } from "@/lib/experiments";
import { useGenuineView } from "@/lib/useGenuineView";

// Keyed result so we can tell whether `result` belongs to the current spot
// without a synchronous reset-setState in the effect (mirrors ConditionsPanel).
interface Loaded {
  spotId: number;
  result: NextWindowResult;
}

/**
 * "Next good window" block in the spot drawer: previews the soonest upcoming
 * calm window ahead of the PaddlePass paywall (ROADMAP retention loop), behind
 * the next_good_window experiment. Fetches and evaluates for BOTH arms so
 * exposure can be logged symmetrically; only treatment renders the block.
 */
export default function NextGoodWindowPanel({ spot }: { spot: Spot }) {
  const { variant, ready, logExposure } = useExperiment("next_good_window");
  const isTreatment = ready && variant === "treatment";

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

  // EXPOSURE: corrected symmetric pattern (git 3e68e09). Both arms already
  // compute the window; logExposure fires here for BOTH arms once the
  // evaluation resolves with ok:true, NOT inside the isTreatment-gated render
  // branch. Never logged for a still-loading or failed (ok:false) result,
  // since nothing renders for either arm in that case.
  useEffect(() => {
    if (!ready) return;
    if (!result || result.ok === false) return;
    logExposure();
  }, [ready, result, logExposure]);

  // Fade-in over 0.2s once the treatment block actually has something to show
  // (instant under prefers-reduced-motion via the motion-reduce: variant).
  // Tracks the spot id the fade has completed for, rather than resetting a
  // boolean synchronously in the effect body (avoids cascading-render lint).
  const [visibleForSpotId, setVisibleForSpotId] = useState<number | null>(null);
  const shouldShow = isTreatment && !!result && result.ok === true;
  const appeared = shouldShow && visibleForSpotId === spot.id;
  useEffect(() => {
    if (!shouldShow || visibleForSpotId === spot.id) return;
    const id = requestAnimationFrame(() => setVisibleForSpotId(spot.id));
    return () => cancelAnimationFrame(id);
  }, [shouldShow, spot.id, visibleForSpotId]);

  // INTENT diagnostic: dwell-gated genuine view of the block, treatment only.
  // Read `result` via a ref so the one-shot callback sees the latest value.
  const resultRef = useRef<NextWindowResult | null>(null);
  useEffect(() => {
    resultRef.current = result;
  });
  const viewRef = useGenuineView({
    key: spot.id,
    enabled: isTreatment && !!result && result.ok === true,
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

  if (!isTreatment) return null;
  if (!result || result.ok === false) return null;

  return (
    <div
      ref={viewRef}
      className={`border-t border-gray-100 pt-2.5 transition-opacity duration-200 motion-reduce:transition-none ${
        appeared ? "opacity-100" : "opacity-0"
      }`}
    >
      <p className="text-xs font-semibold text-[--muted] uppercase tracking-wide mb-1">Looking ahead</p>
      {result.window ? (
        <p className="text-sm text-[--dark]">
          Next calm window: <span className="font-semibold text-[--accent]">{formatNextWindow(result.window)}</span>
        </p>
      ) : (
        <p className="text-sm text-[--muted]">{noWindowLine(DEFAULT_HORIZON_DAYS)}</p>
      )}
    </div>
  );
}
