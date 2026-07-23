"use client";

import { useEffect, useRef, useState } from "react";
import type { Spot } from "@/lib/types";
import { getTodaysShape, type TodayShapeResult } from "@/lib/nextWindow";
import { formatShapeHour, type HourSample, type TodayShape } from "@/lib/todaysShape";
import { trackIntent } from "@/lib/analytics";
import { useKillSwitch } from "@/lib/experiments";
import { useGenuineView } from "@/lib/useGenuineView";

/**
 * Item 100. The intra-day "today's shape": a one-line read of how the rest of
 * today's daytime wind looks, plus a small hour-by-hour curve. It answers "when
 * today", which is the actual paddling question. It draws from the SAME cached
 * hourly fetch as the next-good-window (getTodaysShape shares getNextWindow's
 * cache), so it adds no network request. Renders nothing when there is nothing
 * clean to draw or when the kill switch is off.
 */

// The three wind tiers reuse the panel's PADDLE_COPY text tones exactly (calm
// teal, breezy amber, windy rust) so the curve reads with the same vocabulary as
// the live wind pill above it; "unknown" is a lighter neutral fill (a data gap,
// not a wind tier, so it should recede rather than match a pill colour).
const BAR_COLOR: Record<HourSample["paddleability"], string> = {
  calm: "#0E7F78",
  breezy: "#B4671F",
  windy: "#CC5528",
  unknown: "#B7C4D0",
};

interface Loaded {
  spotId: number;
  result: TodayShapeResult;
}

function Curve({ shape }: { shape: TodayShape }) {
  const winds = shape.samples.map((s) => s.windMph ?? 0);
  // Normalise to the day's own peak, with a floor so a flat-calm day shows a low
  // flat strip rather than full-height bars. Calm threshold (8 mph) marks where
  // "calm" ends, so the eye can see the crossover.
  const cap = Math.max(12, ...winds);
  const calmLinePct = Math.min(100, (8 / cap) * 100);
  return (
    <div className="mt-1.5">
      <div className="relative flex items-end gap-[3px] h-9">
        {/* Calm-threshold guide: below this line the hour is calm. */}
        <div
          className="absolute inset-x-0 border-t border-dashed border-gray-200"
          style={{ bottom: `${calmLinePct}%` }}
          aria-hidden
        />
        {shape.samples.map((s, i) => {
          const mph = s.windMph;
          const heightPct = mph === null ? 12 : Math.max(8, Math.min(100, (mph / cap) * 100));
          return (
            <div
              key={`${s.hour}-${i}`}
              className="flex-1 rounded-sm"
              style={{
                height: `${heightPct}%`,
                background: BAR_COLOR[s.paddleability],
                opacity: mph === null ? 0.4 : 1,
              }}
              aria-label={mph === null ? `${formatShapeHour(s.hour)}, wind unknown` : `${formatShapeHour(s.hour)}, ${mph} mph`}
            />
          );
        })}
      </div>
      <div className="flex justify-between text-[10px] text-gray-400 mt-1">
        <span>{formatShapeHour(shape.samples[0].hour)}</span>
        <span>{formatShapeHour(shape.samples[shape.samples.length - 1].hour)}</span>
      </div>
    </div>
  );
}

export default function TodaysShapePanel({ spot }: { spot: Spot }) {
  const shapeOn = useKillSwitch("todays-shape");
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    if (!shapeOn) return;
    let alive = true;
    getTodaysShape(spot.id, spot.lat, spot.lng).then((result) => {
      if (alive) setLoaded({ spotId: spot.id, result });
    });
    return () => {
      alive = false;
    };
  }, [shapeOn, spot.id, spot.lat, spot.lng]);

  const result = loaded && loaded.spotId === spot.id ? loaded.result : null;
  const shape = result && result.ok ? result.shape : null;
  const shouldShow = !!shape;

  // Dwell-gated genuine view. Read the shape via a ref so the one-shot callback
  // sees the latest value without re-subscribing the observer.
  const shapeRef = useRef<TodayShape | null>(null);
  useEffect(() => {
    shapeRef.current = shape;
  });
  const viewRef = useGenuineView({
    key: spot.id,
    enabled: shouldShow,
    onView: () => {
      const s = shapeRef.current;
      if (!s) return;
      trackIntent("todays_shape_viewed", {
        spot_id: spot.id,
        region: spot.region,
        has_summary: s.summary !== null,
        hours: s.samples.length,
      });
    },
  });

  if (!shapeOn || !shape) return null;

  return (
    <div ref={viewRef} className="border-t border-gray-100 pt-2.5">
      <p className="text-xs font-semibold text-(--muted) uppercase tracking-wide mb-1">Today&rsquo;s shape</p>
      {shape.summary && <p className="text-sm font-semibold text-(--dark)">{shape.summary}</p>}
      <Curve shape={shape} />
    </div>
  );
}
