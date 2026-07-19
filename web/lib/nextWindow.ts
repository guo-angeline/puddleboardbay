import { evaluateGoodWindow, DEFAULT_HORIZON_DAYS, type GoodWindow, type HourlyPeriod } from "@/lib/alerts/conditions-window";
import { precomputedForecastUrl } from "@/lib/conditions";

export type NextWindowResult = { ok: true; window: GoodWindow | null } | { ok: false };

interface CacheEntry {
  promise: Promise<NextWindowResult>;
  createdAt: number;
}
const cache = new Map<number, CacheEntry>();

// Mirrors getConditions' cache TTL (lib/conditions.ts): forecasts go stale
// within a session, so a reopen past this window should refetch.
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Fetch the NWS hourly forecast for a spot in the browser and evaluate the
 * next calm window via the shared evaluateGoodWindow. Fails quietly: any
 * fetch error, thrown exception, or non-ok response resolves { ok: false }
 * so the caller can render nothing, exactly like conditions. Cached per spot
 * id with in-flight dedup so concurrent opens share one fetch.
 */
export function getNextWindow(
  spotId: number,
  lat: number,
  lng: number,
  nowMs: number = Date.now()
): Promise<NextWindowResult> {
  const cached = cache.get(spotId);
  if (cached && Date.now() - cached.createdAt < CACHE_TTL_MS) return cached.promise;

  const promise = (async (): Promise<NextWindowResult> => {
    try {
      // The hourly forecast lives at the precomputed gridpoint URL + "/hourly"
      // (NWS's stable scheme), so a precomputed spot skips the /points hop. A spot
      // missing from the bundle resolves the gridpoint live (two hops).
      const precomputed = precomputedForecastUrl(lat, lng);
      let forecastUrl: string | null = precomputed ? `${precomputed}/hourly` : null;
      if (!forecastUrl) {
        const pointRes = await fetch(`https://api.weather.gov/points/${lat.toFixed(4)},${lng.toFixed(4)}`, {
          headers: { Accept: "application/geo+json" },
        });
        if (!pointRes.ok) return { ok: false };
        const point = (await pointRes.json()) as { properties?: { forecastHourly?: string } };
        forecastUrl = point.properties?.forecastHourly ?? null;
      }
      if (!forecastUrl) return { ok: false };
      const fRes = await fetch(forecastUrl, { headers: { Accept: "application/geo+json" } });
      if (!fRes.ok) return { ok: false };
      const data = (await fRes.json()) as { properties?: { periods?: HourlyPeriod[] } };
      const periods = data.properties?.periods ?? [];
      return { ok: true, window: evaluateGoodWindow(periods, nowMs) };
    } catch {
      return { ok: false };
    }
  })();

  cache.set(spotId, { promise, createdAt: Date.now() });
  // Don't cache a failure forever: let the next open retry.
  promise.then((r) => {
    if (!r.ok) cache.delete(spotId);
  }).catch(() => cache.delete(spotId));

  return promise;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAYS_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function formatHour12(hour: number): { display: number; meridiem: "am" | "pm" } {
  const meridiem = hour < 12 ? "am" : "pm";
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return { display, meridiem };
}

/** Full spot-local weekday of the window, e.g. "Saturday". Pure. */
export function windowDay(w: GoodWindow): string {
  return WEEKDAYS_FULL[new Date(`${w.windowKey}T00:00:00Z`).getUTCDay()];
}

/** The hour range alone, e.g. "7 to 10am" or "11am to 1pm". Pure. */
export function windowRange(w: GoodWindow): string {
  const start = formatHour12(w.startHour);
  const end = formatHour12(w.endHour);
  return start.meridiem === end.meridiem
    ? `${start.display} to ${end.display}${end.meridiem}`
    : `${start.display}${start.meridiem} to ${end.display}${end.meridiem}`;
}

/** Renders a GoodWindow as e.g. "Sat 7 to 10am" or "Sat 11am to 1pm". Pure. */
export function formatNextWindow(w: GoodWindow): string {
  const weekday = WEEKDAYS[new Date(`${w.windowKey}T00:00:00Z`).getUTCDay()];
  return `${weekday} ${windowRange(w)}`;
}

/** Quiet settled line when no calm window exists within the horizon. Pure. */
export function noWindowLine(horizonDays: number = DEFAULT_HORIZON_DAYS): string {
  return `No good window in the next ${horizonDays} days.`;
}
