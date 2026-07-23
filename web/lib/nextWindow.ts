import { evaluateGoodWindow, DEFAULT_HORIZON_DAYS, type GoodWindow } from "@/lib/alerts/conditions-window";
import { conditionsFetchConfig, precomputedForecastUrl } from "@/lib/conditions";
import { buildTodaysShape, type RawHourly, type TodayShape } from "@/lib/todaysShape";

export type NextWindowResult = { ok: true; window: GoodWindow | null } | { ok: false };
export type TodayShapeResult = { ok: true; shape: TodayShape | null } | { ok: false };
type HourlyOutcome = { ok: true; periods: RawHourly[] } | { ok: false };

interface CacheEntry {
  promise: Promise<HourlyOutcome>;
  createdAt: number;
}
const cache = new Map<number, CacheEntry>();

// Mirrors getConditions' cache TTL (lib/conditions.ts): forecasts go stale
// within a session, so a reopen past this window should refetch.
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Fetch (once per spot, 30-min TTL) the NWS hourly forecast and return its raw
 * periods. Item 100: this is the SINGLE hourly request per spot open. Both the
 * next-good-window and today's-shape derive from this one payload, so opening a
 * spot no longer makes two hourly fetches to the same gridpoint. Fails quietly:
 * any fetch error, throw, or non-ok resolves { ok: false }. Cached with in-flight
 * dedup so concurrent opens share one fetch.
 */
export function getHourlyPeriods(spotId: number, lat: number, lng: number): Promise<HourlyOutcome> {
  const cached = cache.get(spotId);
  if (cached && Date.now() - cached.createdAt < CACHE_TTL_MS) return cached.promise;

  const promise = (async (): Promise<HourlyOutcome> => {
    try {
      // The hourly forecast lives at the precomputed gridpoint URL + "/hourly"
      // (NWS's stable scheme), so a precomputed spot skips the /points hop. A spot
      // missing from the bundle resolves the gridpoint live (two hops).
      const precomputed = precomputedForecastUrl(lat, lng);
      let forecastUrl: string | null = precomputed ? `${precomputed}/hourly` : null;
      // Rides the same fetch adapter as lib/conditions.ts: no-op on web,
      // explicit NWS User-Agent on native (browsers forbid setting UA).
      const nwsHeaders = { Accept: "application/geo+json", ...conditionsFetchConfig().headers };
      if (!forecastUrl) {
        const pointRes = await fetch(`https://api.weather.gov/points/${lat.toFixed(4)},${lng.toFixed(4)}`, {
          headers: nwsHeaders,
        });
        if (!pointRes.ok) return { ok: false };
        const point = (await pointRes.json()) as { properties?: { forecastHourly?: string } };
        forecastUrl = point.properties?.forecastHourly ?? null;
      }
      if (!forecastUrl) return { ok: false };
      const fRes = await fetch(forecastUrl, { headers: nwsHeaders });
      if (!fRes.ok) return { ok: false };
      const data = (await fRes.json()) as { properties?: { periods?: RawHourly[] } };
      return { ok: true, periods: data.properties?.periods ?? [] };
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

/**
 * The next calm window via the shared evaluateGoodWindow, from the one hourly
 * fetch above. Evaluated against `nowMs` on each call (the fetch is cached, the
 * window is not, so a reopen re-reads "next" relative to the current time).
 */
export function getNextWindow(
  spotId: number,
  lat: number,
  lng: number,
  nowMs: number = Date.now()
): Promise<NextWindowResult> {
  return getHourlyPeriods(spotId, lat, lng).then((r) =>
    r.ok ? { ok: true, window: evaluateGoodWindow(r.periods, nowMs) } : { ok: false }
  );
}

/**
 * Today's intra-day shape (item 100), from the SAME cached hourly payload as
 * getNextWindow, so it adds no network request. `shape` is null when there is
 * nothing clean to draw (fewer than two daytime hours left).
 */
export function getTodaysShape(
  spotId: number,
  lat: number,
  lng: number,
  nowMs: number = Date.now()
): Promise<TodayShapeResult> {
  return getHourlyPeriods(spotId, lat, lng).then((r) =>
    r.ok ? { ok: true, shape: buildTodaysShape(r.periods, nowMs) } : { ok: false }
  );
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
