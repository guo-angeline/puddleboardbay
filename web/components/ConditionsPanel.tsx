"use client";

import { useEffect, useRef, useState } from "react";
import type { Spot } from "@/lib/types";
import {
  getConditionsRun,
  formatTideTime,
  tideDirectionLine,
  formatFetchedAt,
  isNextDay,
  isStormyForecast,
  CACHE_TTL_MS,
  type WindInfo,
  type WindOutcome,
  type TideOutcome,
  type Paddleability,
} from "@/lib/conditions";
import { launchDirectionTip, COMPASS_WORDS } from "@/lib/launchDirection";
import { trackSystem, trackIntent } from "@/lib/analytics";
import { useKillSwitch } from "@/lib/experiments";
import { useGenuineView } from "@/lib/useGenuineView";
import { recordExplored } from "@/lib/exploredSpots";
import NextGoodWindowPanel from "@/components/NextGoodWindowPanel";
import TodaysShapePanel from "@/components/TodaysShapePanel";

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
// gated) this session. Item 65 (2026-07-18): raised the threshold to the 3rd
// distinct view, 2 was too weak a signal (still browsing) and fired the prompt
// too early on 86% of exposures; 3 means "I'm deciding where to paddle," which
// is the alert use case. Fire once, then InstallPrompt surfaces the enrollment
// prompt (subject to its already-subscribed / snooze / opted-out guards). Module
// scope persists across drawer opens within a session and resets on full reload,
// which is the session boundary we want.
const conditionsViewedSpots = new Set<number>();
let conditionsInterestFired = false;
function recordConditionsInterest(spotId: number) {
  conditionsViewedSpots.add(spotId);
  if (!conditionsInterestFired && conditionsViewedSpots.size >= 3) {
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

/**
 * Item 97. The weather line: forecast text, air temperature, and rain chance,
 * all from the payload wind already downloaded.
 * - "Air" prefix is deliberate: water temp is absent from the stack and cold
 *   shock, not air comfort, is the real safety variable, so a bare number must
 *   not be mistaken for a water reading.
 * - The rain clause shows only at >= 20%. "0% chance of rain" restates the
 *   default and is cut. It is also suppressed under a storm badge, which has
 *   already said the important thing.
 * - The temperature keeps its period name attached (via the caller) so a night
 *   "Tonight" low is never presented as today's paddling temperature.
 */
function weatherLine(wind: WindInfo, stormy: boolean, readoutOn: boolean): string {
  const base = `${wind.periodName}: ${wind.shortForecast}`;
  if (!readoutOn) return base;
  let line = base;
  if (wind.tempF !== null) line += `, Air ${wind.tempF}F`;
  if (!stormy && wind.precipPct !== null && wind.precipPct >= 20) {
    line += ` · ${wind.precipPct}% chance of rain`;
  }
  return line;
}

function WindReading({
  wind,
  isFlatwater,
  readoutOn,
}: {
  wind: WindInfo;
  isFlatwater: boolean;
  readoutOn: boolean;
}) {
  const stormy = readoutOn && isStormyForecast(wind.shortForecast);
  // launchDirectionTip returns null under 5mph and for variable wind, so it
  // carries its own empty state; the panel just does not render the line.
  const tip = launchDirectionTip(wind.direction, wind.speedMax);
  return (
    <div>
      {/* A storm badge OWNS the pill slot, for every difficulty (lightning is
          not a flatwater-only fact), and is mutually exclusive with the
          calm/breezy/windy pill: a green "Calm" next to a storm warning would
          undercut the warning. Reuses the --wind-alert token pair, already the
          Windy pill's colours. */}
      {stormy ? (
        <div
          className="inline-flex items-center gap-2 rounded-full px-2.5 py-1 mb-2 text-xs font-semibold"
          style={{ background: "var(--wind-alert-fill)", color: "var(--wind-alert)" }}
        >
          <span>⚠ Storm risk</span>
          <span className="font-normal opacity-90">Lightning risk on open water, per the forecast.</span>
        </div>
      ) : (
        isFlatwater &&
        wind.paddleability !== "unknown" && (
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
        )
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
        {wind.direction && (
          <span className="text-sm text-(--muted)">
            {/* Item 99: expand the raw NWS abbreviation. "from WNW" is data;
                "from the west-northwest" is legible. Falls back to the raw
                value for a direction outside the 16-point set. */}
            from{" "}
            {readoutOn ? COMPASS_WORDS[wind.direction.toUpperCase()] ?? wind.direction : wind.direction}
          </span>
        )}
      </div>
      <p className="text-xs text-(--muted) mt-0.5">{weatherLine(wind, stormy, readoutOn)}</p>
      {/* Item 99: the launch-direction tip, ported from the alert surfaces. It
          renders HERE, as an annotation on the wind fact and ABOVE the panel's
          disclaimer, per the lawyer gate: never below the disclaimer, never in
          or after NextGoodWindowPanel. It is the same already-gated string
          (lib/launchDirection.ts), reworded by a second gate for this public
          context. no-inducement.test.ts sweeps this file and asserts the
          disclaimer co-renders. Suppressed under a storm badge: a heading tip
          next to a lightning warning is the wrong emphasis. */}
      {readoutOn && !stormy && tip && (
        <p className="text-xs text-(--muted) mt-1">{tip}</p>
      )}
    </div>
  );
}

export default function ConditionsPanel({ spot }: { spot: Spot }) {
  // Item 83: one switch stops the marks UI and the collecting behind it.
  const collectablesOn = useKillSwitch("collectables");
  // Wind and tide resolve independently so the wind verdict (the ~300ms dominant
  // signal) paints without waiting on the slower tide hop. Keyed slots, see above.
  const [wind, setWind] = useState<WindSlot | null>(null);
  const [tide, setTide] = useState<TideSlot | null>(null);
  // SYSTEM event fires at most once per spot, when BOTH sources settle. This is an
  // availability signal (success rate + latency), NOT engagement — engagement is
  // the dwell-gated INTENT event below.
  const logged = useRef<number | null>(null);
  // Item 60: re-foregrounding the installed PWA refetches conditions when the
  // shown data is older than the cache TTL, so a returning user never reads a
  // stale morning forecast. Kill-switch flag (default ON, no A/B, DAU<100 rule).
  const refreshOn = useKillSwitch("conditions-foreground-refresh");
  // Item 97/98/99 bundle. One switch for the whole readout-completion set (air
  // temp, precip, storm badge, tide direction, split failure states). Default
  // ON per the DAU<100 kill-switch rule; a PostHog disable reverts the panel to
  // its pre-bundle output with no redeploy.
  const readoutOn = useKillSwitch("conditions-readout");
  const [refreshTick, setRefreshTick] = useState(0);
  const fetchedAtRef = useRef<number | null>(null);
  const lastFetchSpot = useRef<number | null>(null);

  useEffect(() => {
    let alive = true;
    const startedAt = performance.now();
    // "foreground" only when this run is a re-fetch of the SAME spot triggered by
    // refreshTick; a fresh open or spot change is "mount". Re-arm the once-per-run
    // availability log either way.
    const trigger = refreshTick > 0 && lastFetchSpot.current === spot.id ? "foreground" : "mount";
    lastFetchSpot.current = spot.id;
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
        latency_ms: Math.round(performance.now() - startedAt),
        failed: !w.ok && !t.ok,
        paddleability: windInfo?.paddleability ?? "unknown",
        has_tides: t.ok && t.tide !== null,
        has_wind: !!windInfo,
        surface: "spot_drawer",
        trigger,
      });
    });
    return () => {
      alive = false;
    };
  }, [spot.id, spot.lat, spot.lng, spot.water, spot.region, spot.difficulty, spot.tide_sensitive, refreshTick]);

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

  // Item 60: keep the shown data's age readable inside the visibility listener
  // without re-subscribing it every render.
  useEffect(() => {
    fetchedAtRef.current = fetchedAt;
  });
  // Refetch on re-foreground when the shown run is older than the cache TTL. The
  // TTL means getConditionsRun cache-misses and fetches fresh; bumping refreshTick
  // re-runs the fetch effect above. Only fires when stale, so a quick tab-away is
  // free. getConditionsRun already caps concurrency/dedupes per spot.
  useEffect(() => {
    if (!refreshOn) return;
    function onVisible() {
      if (document.visibilityState !== "visible") return;
      const at = fetchedAtRef.current;
      if (at != null && Date.now() - at > CACHE_TTL_MS) setRefreshTick((t) => t + 1);
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refreshOn]);

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
      // Item 83: the same dwell gate that qualifies conditions_viewed also
      // qualifies "known" in the log. Reusing it rather than adding a second
      // observer means a spot counts only when someone actually read its
      // conditions, which is what makes casual farming cost real seconds.
      //
      // Gated on the kill switch so switching the feature OFF stops the
      // collecting, not just the display. Writing a per-spot browsing record
      // while the surface that explains it is hidden is exactly the
      // policy-versus-practice drift this repo tests for elsewhere.
      if (collectablesOn) recordExplored(spot.id, spot.region);
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
          Right now
        </p>
        {anyLoaded && !bothErrored && fetchedAt ? (
          <span className="text-[10px] text-gray-400">Live as of {formatFetchedAt(fetchedAt)}</span>
        ) : (
          <span className="text-[10px] text-gray-400">NOAA &middot; weather.gov</span>
        )}
      </div>

      {bothErrored ? (
        <p className="text-sm text-(--muted)">
          Live conditions are unavailable right now. Check back for a current read.
        </p>
      ) : (
        <div className="space-y-3">
          {/* Wind first: the biggest factor for flatwater SUP, and the fastest
              source, so it paints while tides may still be loading. */}
          {windLoading ? (
            <Skeleton />
          ) : windInfo ? (
            <WindReading wind={windInfo} isFlatwater={isFlatwater} readoutOn={readoutOn} />
          ) : !readoutOn ? (
            <p className="text-xs text-(--muted)">Wind forecast unavailable.</p>
          ) : windOutcome?.ok ? (
            // Item 97: fetch succeeded, no forecast for this coordinate (outside
            // NWS coverage). A real, stable fact about the spot.
            <p className="text-xs text-(--muted)">No forecast available for this spot.</p>
          ) : (
            // Fetch errored: transient. Mirrors the tide side's wording so the
            // panel never conflates "no data exists" with "NWS is down".
            <p className="text-xs text-(--muted)">Wind data is unavailable right now.</p>
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
              // Item 98: direction first ("Rising, turns to falling at 4:53pm"),
              // then the raw event list demoted beneath it. Gated on the same
              // conditions-readout switch as item 97, so a disable reverts to
              // the raw-list-only presentation. The direction line needs a next
              // event; with none, we fall through to the existing raw block,
              // which shows "No more tide changes today."
              const dirLine = readoutOn ? tideDirectionLine(tideData.next) : null;
              return (
                <div className="border-t border-gray-100 pt-2.5">
                  {dirLine && (
                    <p className="text-sm font-semibold text-(--dark) mb-1">{dirLine}</p>
                  )}
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    {tideData.next.length > 0 ? (
                      tideData.next.slice(0, 2).map((t) => (
                        <span
                          key={t.time}
                          className={dirLine ? "text-sm text-(--muted)" : "text-sm text-(--dark)"}
                        >
                          <span className={dirLine ? "font-normal" : "font-semibold"}>
                            {t.type === "H" ? "High" : "Low"}
                          </span>{" "}
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
        </div>
      )}

      {/* Item 100: today's intra-day shape, then the multi-day look-ahead. Both
          draw from the one shared hourly fetch (getTodaysShape / getNextWindow),
          so this pair adds no requests beyond the single hourly call. */}
      <TodaysShapePanel spot={spot} />
      <NextGoodWindowPanel spot={spot} />

      {/* The safety disclaimer renders UNCONDITIONALLY at the foot of the panel,
          not inside the current-reading branch, so it always co-renders with the
          shape and look-ahead blocks. Those two run their own hourly fetch and
          can paint even when the current-reading fetch errored; a forecast read
          must never show without this line (item 100 lawyer gate). */}
      <p className="text-[10px] text-gray-400 leading-snug mt-3">
        Guidance only, not a safety guarantee. Conditions shift fast on the water.
      </p>
    </section>
  );
}
