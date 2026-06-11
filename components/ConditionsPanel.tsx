"use client";

import { useEffect, useRef, useState } from "react";
import type { Spot } from "@/lib/types";
import {
  getConditions,
  formatTideTime,
  formatFetchedAt,
  isNextDay,
  type Conditions,
  type Paddleability,
} from "@/lib/conditions";
import { track } from "@/lib/analytics";

/**
 * Live tide + wind for the selected spot. Client-only: fetches NOAA tides and
 * the NWS forecast at runtime (the app is static). Both sources fail
 * independently and the panel degrades to whatever loaded. Wind leads because
 * it's the biggest factor for flatwater SUP.
 */

const PADDLE_COPY: Record<Paddleability, { label: string; tone: string; bg: string; text: string }> = {
  calm:    { label: "Calm",   tone: "Light wind, good for flatwater.",     bg: "#ECFDF5", text: "#065F46" },
  breezy:  { label: "Breezy", tone: "Some chop likely, fine if you know the spot.", bg: "#FEFCE8", text: "#854D0E" },
  windy:   { label: "Windy",  tone: "Strong wind, tough for beginners.",   bg: "#FEF2F2", text: "#991B1B" },
  unknown: { label: "",       tone: "",                                    bg: "#F5F5F4", text: "#78716C" },
};

function Skeleton() {
  return (
    <div className="space-y-2">
      <div className="h-3 w-24 rounded bg-gray-100 animate-pulse" />
      <div className="h-10 rounded-lg bg-gray-100 animate-pulse" />
      <div className="h-10 rounded-lg bg-gray-100 animate-pulse" />
    </div>
  );
}

// Keyed result so we can tell whether `data` belongs to the current spot
// without a synchronous reset-setState in the effect (which cascades renders).
interface Loaded {
  spotId: number;
  conditions: Conditions;
}

export default function ConditionsPanel({ spot }: { spot: Spot }) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  // Fire the analytics event at most once per spot.
  const logged = useRef<number | null>(null);

  useEffect(() => {
    let alive = true;
    getConditions(spot.id, spot.lat, spot.lng, spot.tide_sensitive)
      .then((c) => {
        if (!alive) return;
        setLoaded({ spotId: spot.id, conditions: c });
        if (logged.current !== spot.id) {
          logged.current = spot.id;
          track("conditions_viewed", {
            spot_id: spot.id,
            spot_name: spot.water,
            region: spot.region,
            difficulty: spot.difficulty,
            paddleability: c.wind?.paddleability ?? "unknown",
            wind_mph: c.wind?.speedMax ?? null,
            has_tides: !!c.tide,
            failed: c.failed,
          });
        }
      })
      .catch(() => {
        if (!alive) return;
        setLoaded({ spotId: spot.id, conditions: { tide: null, wind: null, failed: true, fetchedAt: Date.now() } });
      });
    return () => {
      alive = false;
    };
  }, [spot.id, spot.lat, spot.lng, spot.water, spot.region, spot.difficulty, spot.tide_sensitive]);

  // Loading whenever the resolved result doesn't match the spot now showing.
  const data = loaded && loaded.spotId === spot.id ? loaded.conditions : null;
  const loading = data === null;
  const isFlatwater = spot.difficulty === "flatwater";

  return (
    <section
      aria-label="Live water conditions"
      aria-busy={loading}
      className="mb-4 rounded-xl border border-gray-200 bg-white p-3.5"
    >
      <div className="flex items-center justify-between mb-2.5">
        <p className="text-xs font-semibold text-[--muted] uppercase tracking-wide">
          Conditions today
        </p>
        {!loading && data && !data.failed ? (
          <span className="text-[10px] text-gray-400">
            Live as of {formatFetchedAt(data.fetchedAt)}
          </span>
        ) : (
          <span className="text-[10px] text-gray-400">NOAA &middot; weather.gov</span>
        )}
      </div>

      {loading && <Skeleton />}

      {!loading && data && data.failed && (
        <p className="text-sm text-[--muted]">
          Live conditions are unavailable right now. Check back before you head out.
        </p>
      )}

      {!loading && data && !data.failed && (
        <div className="space-y-3">
          {/* Wind first: the biggest factor for flatwater SUP. */}
          {data.wind ? (
            <div>
              {isFlatwater && data.wind.paddleability !== "unknown" && (
                <div
                  className="inline-flex items-center gap-2 rounded-full px-2.5 py-1 mb-2 text-xs font-semibold"
                  style={{
                    background: PADDLE_COPY[data.wind.paddleability].bg,
                    color: PADDLE_COPY[data.wind.paddleability].text,
                  }}
                >
                  <span>{PADDLE_COPY[data.wind.paddleability].label}</span>
                  <span className="font-normal opacity-90">
                    {PADDLE_COPY[data.wind.paddleability].tone}
                  </span>
                </div>
              )}
              <div className="flex items-baseline gap-2">
                <span className="text-base font-semibold text-[--dark]">
                  {data.wind.speedMax === 0 ? (
                    "Wind calm"
                  ) : (
                    <>
                      Wind{" "}
                      {data.wind.speedMin === data.wind.speedMax
                        ? `${data.wind.speedMax}`
                        : `${data.wind.speedMin}-${data.wind.speedMax}`}{" "}
                      mph
                    </>
                  )}
                </span>
                {data.wind.direction && (
                  <span className="text-sm text-[--muted]">from {data.wind.direction}</span>
                )}
              </div>
              <p className="text-xs text-[--muted] mt-0.5">
                {data.wind.periodName}: {data.wind.shortForecast}
              </p>
            </div>
          ) : (
            <p className="text-xs text-[--muted]">Wind forecast unavailable.</p>
          )}

          {/* Tides */}
          {data.tide ? (
            <div className="border-t border-gray-100 pt-2.5">
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {data.tide.next.length > 0 ? (
                  data.tide.next.slice(0, 2).map((t) => (
                    <span key={t.time} className="text-sm text-[--dark]">
                      <span className="font-semibold">
                        {t.type === "H" ? "High" : "Low"}
                      </span>{" "}
                      {formatTideTime(t.time)}
                      {isNextDay(t.time) && (
                        <span className="text-[--muted]"> tomorrow</span>
                      )}
                      <span className="text-[--muted]"> &middot; {t.heightFt.toFixed(1)} ft</span>
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-[--muted]">No more tide changes today.</span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Tides at {data.tide.stationName} ({data.tide.stationDistanceMi.toFixed(0)} mi)
              </p>
            </div>
          ) : spot.tide_sensitive ? (
            <p className="text-xs text-[--muted] border-t border-gray-100 pt-2.5">
              No tide station near this spot.
            </p>
          ) : null}

          <p className="text-[10px] text-gray-400 leading-snug">
            Guidance only, not a safety guarantee. Conditions shift fast on the water.
          </p>
        </div>
      )}
    </section>
  );
}
