/**
 * Live conditions (tides + wind) for a spot. Fully client-side: the app is
 * static with no backend, so every fetch runs in the browser at runtime.
 *
 * Data sources (both free, no API key):
 * - Tides: NOAA CO-OPS, reached through our OWN same-origin route
 *   `/api/tides` (see app/api/tides/route.ts), NOT a direct browser fetch.
 *   NOAA sends `access-control-allow-origin: *` only intermittently, so a direct
 *   browser call was silently CORS-blocked about half the time and dropped the
 *   tide panel; the server-side proxy removes CORS from the path. We still bundle
 *   a small set of NorCal harmonic ("reference") tide stations and pick the
 *   nearest one to the spot by great-circle distance, then ask the proxy for
 *   today's hi/lo events. Bundling beats querying the 3,450-station metadata list
 *   on every load: it's a fixed, tiny region (Monterey to Mendocino, Bay + Delta).
 * - Wind: US National Weather Service, fetched directly from the browser.
 *   weather.gov DOES send `access-control-allow-origin: *` reliably, so it needs
 *   no proxy. The `/points/{lat},{lng}` -> forecast-gridpoint resolution is
 *   PRECOMPUTED offline (data/gridpoints.json, scripts/precompute_gridpoints.py),
 *   so the runtime wind fetch is one hop (the forecast) instead of two. A spot
 *   missing from the bundle, or a stale gridpoint, falls back to the live
 *   two-hop resolution.
 *
 * Results are cached per session (module-level Map) so reopening the same spot
 * doesn't refetch.
 */

import gridpointsData from "@/data/gridpoints.json";

/** Precomputed "<lat4>,<lng4>" -> NWS forecast URL. See precompute_gridpoints.py. */
const PRECOMPUTED_GRIDPOINTS = gridpointsData as Record<string, string>;

/**
 * Fetch adapter for the native app. The web build never calls configure: the
 * tides fetch stays same-origin (`/api/tides`) and NWS gets no extra headers
 * (browsers manage User-Agent themselves and forbid setting it). The React
 * Native app calls `configureConditionsFetch` once at startup with
 * `apiBase: "https://paddletowater.com"` (its tides proxy) and an explicit
 * User-Agent for api.weather.gov, whose rate limiter dislikes the default
 * CFNetwork agent. Keeping this here, not forked in native/, keeps one
 * conditions code path for both platforms.
 */
let conditionsApiBase = "";
let conditionsExtraHeaders: Record<string, string> = {};

export function configureConditionsFetch(opts: {
  apiBase?: string;
  headers?: Record<string, string>;
}): void {
  if (opts.apiBase !== undefined) conditionsApiBase = opts.apiBase.replace(/\/+$/, "");
  if (opts.headers !== undefined) conditionsExtraHeaders = { ...opts.headers };
}

/** Current adapter values; consumed by lib/nextWindow.ts so its NWS fetches ride the same config. */
export function conditionsFetchConfig(): { apiBase: string; headers: Record<string, string> } {
  return { apiBase: conditionsApiBase, headers: conditionsExtraHeaders };
}

/** The bundled forecast URL for a spot, or null if it wasn't precomputed. */
export function precomputedForecastUrl(lat: number, lng: number): string | null {
  return PRECOMPUTED_GRIDPOINTS[`${lat.toFixed(4)},${lng.toFixed(4)}`] ?? null;
}

export interface TideEvent {
  type: "H" | "L";
  /** ISO-ish local time string from NOAA, e.g. "2026-06-10 08:24" */
  time: string;
  /** Predicted height in feet (MLLW datum). */
  heightFt: number;
}

export interface TideInfo {
  stationName: string;
  stationDistanceMi: number;
  /** Upcoming events (future first), already filtered to "now and later". */
  next: TideEvent[];
}

export type Paddleability = "calm" | "breezy" | "windy" | "unknown";

export interface WindInfo {
  /** Low end of the forecast wind range, mph. */
  speedMin: number;
  /** High end of the forecast wind range, mph (== speedMin for a single value). */
  speedMax: number;
  /** Compass direction the wind comes from, e.g. "WNW". */
  direction: string;
  shortForecast: string;
  periodName: string;
  paddleability: Paddleability;
}

export interface Conditions {
  tide: TideInfo | null;
  wind: WindInfo | null;
  /** True only if both sources failed, so the UI can show one honest error. */
  failed: boolean;
  /** Epoch ms when this result was fetched, for a "live as of" freshness stamp. */
  fetchedAt: number;
}

/**
 * NorCal harmonic tide stations (NOAA type "R"). Curated from the CO-OPS
 * metadata list, trimmed to a representative spread so nearest-match stays
 * sensible across the Bay, Delta, outer coast and Monterey. id is the NOAA
 * station id used by the predictions API.
 */
interface TideStation {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export const TIDE_STATIONS: TideStation[] = [
  { id: "9414290", name: "San Francisco (Golden Gate)", lat: 37.8063, lng: -122.4659 },
  { id: "9414750", name: "Alameda", lat: 37.772, lng: -122.3003 },
  { id: "9414816", name: "Berkeley", lat: 37.865, lng: -122.307 },
  { id: "9414863", name: "Richmond", lat: 37.9283, lng: -122.4 },
  { id: "9415056", name: "Pinole Point", lat: 38.015, lng: -122.363 },
  { id: "9414688", name: "San Leandro Marina", lat: 37.695, lng: -122.192 },
  { id: "9414575", name: "Coyote Creek, Alviso Slough", lat: 37.465, lng: -122.023 },
  { id: "9414509", name: "Dumbarton Bridge", lat: 37.5067, lng: -122.115 },
  { id: "9414523", name: "Redwood City, Wharf 5", lat: 37.5068, lng: -122.2119 },
  { id: "9414458", name: "San Mateo Bridge (west)", lat: 37.58, lng: -122.253 },
  { id: "9414131", name: "Pillar Point Harbor, Half Moon Bay", lat: 37.5025, lng: -122.4822 },
  { id: "9415020", name: "Point Reyes", lat: 37.9942, lng: -122.9736 },
  { id: "9414958", name: "Bolinas Lagoon", lat: 37.908, lng: -122.6785 },
  { id: "9414874", name: "Corte Madera Creek", lat: 37.9433, lng: -122.513 },
  { id: "9415338", name: "Sonoma Creek", lat: 38.1567, lng: -122.407 },
  { id: "9415218", name: "Mare Island", lat: 38.07, lng: -122.25 },
  { id: "9415102", name: "Martinez-Amorco Pier", lat: 38.0346, lng: -122.1252 },
  { id: "9415144", name: "Port Chicago, Suisun Bay", lat: 38.056, lng: -122.0395 },
  { id: "9415316", name: "Rio Vista", lat: 38.145, lng: -121.692 },
  { id: "9415064", name: "Antioch", lat: 38.02, lng: -121.815 },
  { id: "9416131", name: "Port of West Sacramento", lat: 38.5622, lng: -121.5463 },
  { id: "9413450", name: "Monterey", lat: 36.6089, lng: -121.8914 },
  { id: "9412110", name: "Port San Luis", lat: 35.1689, lng: -120.7542 },
  { id: "9413631", name: "Elkhorn Slough", lat: 36.8183, lng: -121.747 },
  { id: "9416409", name: "Green Cove", lat: 38.7043, lng: -123.4494 },
];

function haversineMi(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 3958.8; // earth radius, miles
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function nearestTideStation(lat: number, lng: number) {
  let best = TIDE_STATIONS[0];
  let bestD = Infinity;
  for (const s of TIDE_STATIONS) {
    const d = haversineMi(lat, lng, s.lat, s.lng);
    if (d < bestD) {
      bestD = d;
      best = s;
    }
  }
  return { station: best, distanceMi: bestD };
}

// If the nearest station is absurdly far, the spot is outside our coverage
// (e.g. an inland reservoir with no tide). Treat as "no nearby station".
const MAX_STATION_MI = 60;

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

// Fast-fail the tide hop. Wind + the paddleability verdict resolve in ~100ms,
// but the conditions panel waits on BOTH sources (getConditions Promise.allSettled),
// so a slow tide call skeletons the whole panel. When NOAA flaps, the /api/tides
// proxy can take its full timeout + retry (measured ~13s in prod), which would
// leave the panel loading that long. Cap the client's patience well under that:
// past this, give up on tides so the panel paints wind + the static-notes fallback.
// (ROADMAP item 53; the proxy's own per-attempt timeout was also tightened.)
const TIDE_CLIENT_TIMEOUT_MS = 4000;

async function fetchTides(
  lat: number,
  lng: number,
  tideSensitive: boolean,
  signal: AbortSignal
): Promise<TideInfo | null> {
  // Only show tides where the curated data says the spot is actually tidal.
  // Distance alone isn't enough: a freshwater lake or an inland reservoir can
  // sit well within 60mi of a coastal/Delta station (Folsom Lake, Lake
  // Berryessa, inland Russian River) and would otherwise get bogus predictions.
  if (!tideSensitive) return null;
  const { station, distanceMi } = nearestTideStation(lat, lng);
  if (distanceMi > MAX_STATION_MI) return null;

  // Pull a 2-day window (today + tomorrow) so there's always a "next" event
  // even late in the evening. Local station time, hi/lo only, feet, MLLW.
  const today = new Date();
  const end = new Date(today.getTime() + 24 * 60 * 60 * 1000);
  // Go through our same-origin proxy, never NOAA directly: a direct browser
  // fetch is CORS-blocked whenever NOAA omits the header (about half the time).
  // The proxy owns the fixed NOAA params, timeout, retry, and caching; we pass
  // only the station and the 2-day (today + tomorrow) window.
  const params = new URLSearchParams({
    station: station.id,
    begin_date: ymd(today),
    end_date: ymd(end),
  });
  // Abort on the earlier of: the caller's signal, or our own client timeout.
  const controller = new AbortController();
  const onCallerAbort = () => controller.abort();
  signal.addEventListener("abort", onCallerAbort);
  const timer = setTimeout(() => controller.abort(), TIDE_CLIENT_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${conditionsApiBase}/api/tides?${params.toString()}`, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", onCallerAbort);
  }
  if (!res.ok) throw new Error(`tides ${res.status}`);
  const data = (await res.json()) as {
    predictions?: { t: string; v: string; type: "H" | "L" }[];
    error?: { message: string };
  };
  if (data.error || !data.predictions) throw new Error(data.error?.message ?? "no predictions");

  const now = Date.now();
  const next = data.predictions
    .map((p) => ({
      type: p.type,
      time: p.t,
      heightFt: Number(p.v),
      // NOAA times are local-station wall-clock with no offset; the user is in
      // the same Pacific timezone as every station here, so parsing as local is
      // correct for the "is it still upcoming" comparison.
      ts: new Date(p.t.replace(" ", "T")).getTime(),
    }))
    .filter((p) => p.ts >= now)
    .slice(0, 4)
    .map(({ type, time, heightFt }) => ({ type, time, heightFt }));

  return { stationName: station.name, stationDistanceMi: distanceMi, next };
}

/** Parse "5 to 10 mph" or "7 mph" into [min, max]. */
function parseWindSpeed(raw: string): [number, number] {
  const nums = (raw.match(/\d+/g) ?? []).map(Number);
  if (nums.length === 0) return [0, 0];
  if (nums.length === 1) return [nums[0], nums[0]];
  return [Math.min(...nums), Math.max(...nums)];
}

/**
 * Honest, conservative read for flatwater paddling. Based on the high end of the
 * forecast range so it doesn't undersell a gusty afternoon. Guidance only.
 */
export function paddleabilityFromWind(maxMph: number): Paddleability {
  if (maxMph <= 8) return "calm";
  if (maxMph <= 15) return "breezy";
  return "windy";
}

/** Resolve a spot's forecast gridpoint live (the /points hop). NWS wants
 * 4-decimal coords; more precision 301-redirects. */
async function resolveGridpoint(key: string, signal: AbortSignal): Promise<string | null> {
  const pointRes = await fetch(`https://api.weather.gov/points/${key}`, {
    signal,
    headers: { Accept: "application/geo+json", ...conditionsExtraHeaders },
  });
  if (!pointRes.ok) throw new Error(`points ${pointRes.status}`);
  const point = (await pointRes.json()) as { properties?: { forecast?: string } };
  return point.properties?.forecast ?? null;
}

async function fetchWind(lat: number, lng: number, signal: AbortSignal): Promise<WindInfo | null> {
  const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  const precomputed = PRECOMPUTED_GRIDPOINTS[key] ?? null;
  // One hop when precomputed; otherwise resolve the gridpoint live (two hops).
  let forecastUrl = precomputed ?? (await resolveGridpoint(key, signal));
  if (!forecastUrl) return null;

  let fRes = await fetch(forecastUrl, {
    signal,
    headers: { Accept: "application/geo+json", ...conditionsExtraHeaders },
  });
  if (!fRes.ok && precomputed) {
    // A precomputed gridpoint can go stale if NWS re-grids (rare). Re-resolve
    // live once and retry before giving up, so a stale bundle self-heals.
    const fresh = await resolveGridpoint(key, signal);
    if (fresh && fresh !== forecastUrl) {
      forecastUrl = fresh;
      fRes = await fetch(forecastUrl, {
        signal,
        headers: { Accept: "application/geo+json", ...conditionsExtraHeaders },
      });
    }
  }
  if (!fRes.ok) throw new Error(`forecast ${fRes.status}`);
  const fData = (await fRes.json()) as {
    properties?: {
      periods?: {
        name: string;
        windSpeed: string;
        windDirection: string;
        shortForecast: string;
      }[];
    };
  };
  const period = fData.properties?.periods?.[0];
  if (!period) return null;

  const [speedMin, speedMax] = parseWindSpeed(period.windSpeed);
  return {
    speedMin,
    speedMax,
    direction: period.windDirection || "",
    shortForecast: period.shortForecast,
    periodName: period.name,
    paddleability: paddleabilityFromWind(speedMax),
  };
}

/**
 * Per-source outcome. Distinguishes "no data / not applicable" (a valid,
 * cacheable state, e.g. an inland spot with no tide station) from "the fetch
 * errored" (transient: NOAA down, timeout). The panel needs this to say "No tide
 * station near this spot" only when there truly is none, vs "temporarily
 * unavailable" when the fetch failed. `ok: true` with a null payload is the
 * former; `ok: false` is the latter.
 */
export type TideOutcome = { ok: true; tide: TideInfo | null } | { ok: false };
export type WindOutcome = { ok: true; wind: WindInfo | null } | { ok: false };

/**
 * One spot's conditions fetch, exposed as two INDEPENDENT promises so the drawer
 * can paint wind (the ~300ms dominant signal) the instant it resolves instead of
 * waiting on the slower tide hop. Both resolve, never reject.
 */
export interface ConditionsRun {
  tide: Promise<TideOutcome>;
  wind: Promise<WindOutcome>;
  fetchedAt: number;
}

interface CacheEntry {
  run: ConditionsRun;
  createdAt: number;
}
const cache = new Map<number, CacheEntry>();

// Conditions go stale: wind shifts and tide events pass. Within a single long
// session (open a spot in the morning, reopen in the afternoon) we want fresh
// data, not the morning's forecast still labeled "today". After this window a
// reopen refetches instead of serving the warm cache.
// Exported so the foreground-refresh path (item 60, ConditionsPanel) uses the
// exact same staleness threshold as the cache, no second copy to drift.
export const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Start (or reuse) a spot's conditions fetch and return its two independent
 * source promises. Cached per spot id for CACHE_TTL_MS; a run where BOTH sources
 * errored is evicted so the next open retries. This is the drawer's entry point:
 * it renders each source as it settles.
 */
export function getConditionsRun(
  spotId: number,
  lat: number,
  lng: number,
  tideSensitive: boolean
): ConditionsRun {
  const cached = cache.get(spotId);
  if (cached && Date.now() - cached.createdAt < CACHE_TTL_MS) return cached.run;

  // Internal AbortControllers are intentionally NOT wired to any caller signal:
  // a run stays warm even if the first viewer closes the drawer, so a reopen is
  // instant. Each source catches into an outcome, so neither promise rejects.
  const tide: Promise<TideOutcome> = fetchTides(lat, lng, tideSensitive, new AbortController().signal)
    .then((t) => ({ ok: true as const, tide: t }))
    .catch(() => ({ ok: false as const }));
  const wind: Promise<WindOutcome> = fetchWind(lat, lng, new AbortController().signal)
    .then((w) => ({ ok: true as const, wind: w }))
    .catch(() => ({ ok: false as const }));

  const run: ConditionsRun = { tide, wind, fetchedAt: Date.now() };
  cache.set(spotId, { run, createdAt: Date.now() });
  // Don't cache a hard failure forever: if BOTH sources errored, let the next
  // open retry.
  Promise.all([tide, wind]).then(([t, w]) => {
    if (!t.ok && !w.ok) cache.delete(spotId);
  });

  return run;
}

/**
 * Combined tides + wind for a spot. `failed` is true only when both sources
 * errored, so the caller never blanks the drawer. Used by the saved-spots batch
 * (which only needs the settled result); the spot drawer uses getConditionsRun
 * to paint each source as it settles. `signal` is vestigial and ignored.
 */
export function getConditions(
  spotId: number,
  lat: number,
  lng: number,
  tideSensitive: boolean,
  signal?: AbortSignal
): Promise<Conditions> {
  void signal;
  const run = getConditionsRun(spotId, lat, lng, tideSensitive);
  return Promise.all([run.tide, run.wind]).then(([t, w]) => ({
    tide: t.ok ? t.tide : null,
    wind: w.ok ? w.wind : null,
    failed: !t.ok && !w.ok,
    fetchedAt: run.fetchedAt,
  }));
}

/** Short "live as of" clock time, e.g. "8:24 AM", from an epoch ms timestamp. */
export function formatFetchedAt(epochMs: number): string {
  return new Date(epochMs).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/** Format "2026-06-10 08:24" to "8:24 AM". */
export function formatTideTime(noaaTime: string): string {
  const d = new Date(noaaTime.replace(" ", "T"));
  if (isNaN(d.getTime())) return noaaTime;
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/**
 * True when a NOAA event time falls on a later calendar day than now. Late in
 * the evening the next tide events are tomorrow's (the fetch pulls a 2-day
 * window), so the UI labels them "tomorrow" instead of letting them read as
 * today's under the "Conditions today" header.
 */
export function isNextDay(noaaTime: string): boolean {
  const d = new Date(noaaTime.replace(" ", "T"));
  if (isNaN(d.getTime())) return false;
  const now = new Date();
  const startOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return d.getTime() >= startOfTomorrow.getTime();
}
