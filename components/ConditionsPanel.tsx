"use client";

import { useEffect, useRef, useState } from "react";
import type { Spot } from "@/lib/types";
import {
  getConditionsRun,
  formatTideTime,
  formatFetchedAt,
  isNextDay,
  type WindInfo,
  type WindOutcome,
  type TideOutcome,
  type Paddleability,
} from "@/lib/conditions";
import { trackSystem, trackIntent } from "@/lib/analytics";
import { useGenuineView } from "@/lib/useGenuineView";
import NextGoodWindowPanel from "@/components/NextGoodWindowPanel";

/**
 * Live tide + wind for the selected spot. Client-only: fetches NOAA tides and
 * the NWS forecast at runtime (the app is static). Both sources fail
 * independently and the panel degrades to whatever loaded. Wind leads because
 * it's the biggest factor for flatwater SUP.
 */

const PADDLE_COPY: Record<Paddleability, { label: string; tone: string; bg: string; text: string }> = {
  calm:    { label: "Calm",   tone: "Light wind, good for flatwater.",     bg: "#DBF3F0", text: "#0E7F78" },
  breezy:  { label: "Breezy", tone: "Some chop likely, fine if you know the spot.", bg: "#FEF3E8", text: "#B4671F" },
  windy:   { label: "Windy",  tone: "Strong wind, tough for beginners.",   bg: "#FEE9E0", text: "#CC5528" },
  unknown: { label: "",       tone: "",                                    bg: "#EEF3F9", text: "#8AA0B4" },
};

// Item 21: broaden the alerts offer beyond savers to the core paddle-decision
// behavior. Track distinct spots whose conditions were genuinely viewed (dwell-
// gated) this session; the 2nd distinct view means "I'm deciding where to
// paddle," which is exactly the alert use case. Fire once, then InstallPrompt
// surfaces the enrollment prompt (subject to its already-subscribed / snooze /
// opted-out guards). Module scope persists across drawer opens within a session
// and resets on full reload, which is the session boundary we want.
const conditionsViewedSpots = new Set<number>();
let conditionsInterestFired = false;
function recordConditionsInterest(spotId: number) {
  conditionsViewedSpots.add(spotId);
  if (!conditionsInterestFired && conditionsViewedSpots.size >= 2) {
    conditionsInterestFired = true;
    window.dispatchEvent(new Event("ptw:conditionsinterest"));
  }
}

function Skeleton() {
  return (
    <div className="space-y-2">
      <div className="h-3 w-24 rounded bg-gray-100 animate-pulse" />
      <div className="h-10 rounded-lg bg-gray-100 animate-pulse" />
      <div className="h-10 rounded-lg bg-gray-100 animate-pulse" />
    </div>
  );
}

// Each source is keyed by spot id so a resolve from a previously-open spot can't
// paint the current one, without a synchronous reset-setState in the effect
// (which would cascade renders). A null slot means "still loading for this spot".
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

function WindReading({ wind, isFlatwater }: { wind: WindInfo; isFlatwater: boolean }) {
  return (
    <div>
      {isFlatwater && wind.paddleability !== "unknown" && (
        <div
          className="inline-flex items-center gap-2 rounded-full px-2.5 py-1 mb-2 text-xs font-semibold"
          style={{
            background: PADDLE_COPY[wind.paddleability].bg,
            color: PADDLE_COPY[wind.paddleability].text,
          }}
        >
          <span>{PADDLE_COPY[wind.paddleability].label}</span>
          <span className="font-normal opacity-90">{PADDLE_COPY[wind.paddleability].tone}</span>
        </div>
      )}
      <div className="flex items-baseline gap-2">
        <span className="text-base font-semibold text-(--dark)">
          {wind.speedMax === 0 ? (
            "Wind calm"
          ) : (
            <>
              Wind{" "}
              {wind.speedMin === wind.speedMax
                ? `${wind.speedMax}`
                : `${wind.speedMin}-${wind.speedMax}`}{" "}
              mph
            </>
          )}
        </span>
        {wind.direction && <span className="text-sm text-(--muted)">from {wind.direction}</span>}
      </div>
      <p className="text-xs text-(--muted) mt-0.5">
        {wind.periodName}: {wind.shortForecast}
      </p>
    </div>
  );
}

export default function ConditionsPanel({ spot }: { spot: Spot }) {
  // Wind and tide resolve independently so the wind verdict (the ~300ms dominant
  // signal) paints without waiting on the slower tide hop. Keyed slots, see above.
  const [wind, setWind] = useState<WindSlot | null>(null);
  const [tide, setTide] = useState<TideSlot | null>(null);
  // SYSTEM event fires at most once per spot, when BOTH sources settle. This is an
  // availability signal (success rate + latency), NOT engagement — engagement is
  // the dwell-gated INTENT event below.
  const logged = useRef<number | null>(null);

  useEffect(() => {
    let alive = true;
    const startedAt = performance.now();
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
        latency_ms: Math.round(performance.now() - startedAt),
        failed: !w.ok && !t.ok,
        paddleability: windInfo?.paddleability ?? "unknown",
        has_tides: t.ok && t.tide !== null,
        has_wind: !!windInfo,
        surface: "spot_drawer",
      });
    });
    return () => {
      alive = false;
    };
  }, [spot.id, spot.lat, spot.lng, spot.water, spot.region, spot.difficulty, spot.tide_sensitive]);

  const isFlatwater = spot.difficulty === "flatwater";
  // A slot only counts for the spot now showing; otherwise it's still loading.
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

  // INTENT event: the panel was genuinely looked at (on screen + dwell), not just
  // fetched. Read the latest values via refs so the one-shot callback is current.
  const viewRef = useRef({ paddleability: "unknown" as Paddleability, hadData: false });
  useEffect(() => {
    const tideInfo = tideOutcome?.ok ? tideOutcome.tide : null;
    viewRef.current = {
      paddleability: windInfo?.paddleability ?? "unknown",
      hadData: !!windInfo || !!tideInfo,
    };
  });
  const conditionsRef = useGenuineView({
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

  return (
    <section
      ref={conditionsRef}
      aria-label="Live water conditions"
      aria-busy={windLoading && tideLoading}
      className="mb-4 rounded-xl border border-gray-200 bg-white p-3.5"
    >
      <div className="flex items-center justify-between mb-2.5">
        <p className="text-xs font-semibold text-(--muted) uppercase tracking-wide">
          Conditions today
        </p>
        {anyLoaded && !bothErrored && fetchedAt ? (
          <span className="text-[10px] text-gray-400">Live as of {formatFetchedAt(fetchedAt)}</span>
        ) : (
          <span className="text-[10px] text-gray-400">NOAA &middot; weather.gov</span>
        )}
      </div>

      {bothErrored ? (
        <p className="text-sm text-(--muted)">
          Live conditions are unavailable right now. Check back before you head out.
        </p>
      ) : (
        <div className="space-y-3">
          {/* Wind first: the biggest factor for flatwater SUP, and the fastest
              source, so it paints while tides may still be loading. */}
          {windLoading ? (
            <Skeleton />
          ) : windInfo ? (
            <WindReading wind={windInfo} isFlatwater={isFlatwater} />
          ) : (
            <p className="text-xs text-(--muted)">Wind forecast unavailable.</p>
          )}

          {/* Tides: only relevant on tidal spots. Distinguish a real "no station"
              (ok + null) from a transient fetch failure (errored) so the panel
              never claims there's no station when NOAA is merely down. */}
          {(() => {
            if (!spot.tide_sensitive) return null;
            if (tideLoading) {
              return (
                <div className="border-t border-gray-100 pt-2.5">
                  <div className="h-4 w-40 rounded bg-gray-100 animate-pulse" />
                </div>
              );
            }
            if (tideOutcome?.ok && tideOutcome.tide) {
              const tideData = tideOutcome.tide;
              return (
                <div className="border-t border-gray-100 pt-2.5">
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    {tideData.next.length > 0 ? (
                      tideData.next.slice(0, 2).map((t) => (
                        <span key={t.time} className="text-sm text-(--dark)">
                          <span className="font-semibold">{t.type === "H" ? "High" : "Low"}</span>{" "}
                          {formatTideTime(t.time)}
                          {isNextDay(t.time) && <span className="text-(--muted)"> tomorrow</span>}
                          <span className="text-(--muted)"> &middot; {t.heightFt.toFixed(1)} ft</span>
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-(--muted)">No more tide changes today.</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Tides at {tideData.stationName} ({tideData.stationDistanceMi.toFixed(0)} mi)
                  </p>
                </div>
              );
            }
            if (tideOutcome && !tideOutcome.ok) {
              return (
                <p className="text-xs text-(--muted) border-t border-gray-100 pt-2.5">
                  Tide data is unavailable right now.
                </p>
              );
            }
            // ok + null: genuinely no station within range.
            return (
              <p className="text-xs text-(--muted) border-t border-gray-100 pt-2.5">
                No tide station near this spot.
              </p>
            );
          })()}

          <p className="text-[10px] text-gray-400 leading-snug">
            Guidance only, not a safety guarantee. Conditions shift fast on the water.
          </p>
        </div>
      )}

      <NextGoodWindowPanel spot={spot} />
    </section>
  );
}
