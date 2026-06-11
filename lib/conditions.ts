/**
 * Live conditions (tides + wind) for a spot. Fully client-side: the app is
 * static with no backend, so every fetch runs in the browser at runtime.
 *
 * Data sources (both free, no API key, CORS `access-control-allow-origin: *`):
 * - Tides: NOAA CO-OPS. We bundle a small set of NorCal harmonic ("reference")
 *   tide stations and pick the nearest one to the spot by great-circle distance,
 *   then hit the predictions datagetter for today's hi/lo events. Bundling beats
 *   querying the 3,450-station metadata list on every load: it's a fixed, tiny
 *   region (Monterey to Mendocino, Bay + Delta) and avoids an extra round trip.
 * - Wind: US National Weather Service. `/points/{lat},{lng}` resolves a forecast
 *   gridpoint, then the gridpoint `/forecast` gives wind speed + direction.
 *
 * Results are cached per session (module-level Map) so reopening the same spot
 * doesn't refetch.
 */

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
  const params = new URLSearchParams({
    product: "predictions",
    application: "paddle-to-water",
    begin_date: ymd(today),
    end_date: ymd(end),
    datum: "MLLW",
    station: station.id,
    time_zone: "lst_ldt",
    interval: "hilo",
    units: "english",
    format: "json",
  });
  const url = `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?${params.toString()}`;
  const res = await fetch(url, { signal });
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

async function fetchWind(lat: number, lng: number, signal: AbortSignal): Promise<WindInfo | null> {
  // NWS wants 4-decimal coords; more precision 301-redirects.
  const pLat = lat.toFixed(4);
  const pLng = lng.toFixed(4);
  const pointRes = await fetch(`https://api.weather.gov/points/${pLat},${pLng}`, {
    signal,
    headers: { Accept: "application/geo+json" },
  });
  if (!pointRes.ok) throw new Error(`points ${pointRes.status}`);
  const point = (await pointRes.json()) as { properties?: { forecast?: string } };
  const forecastUrl = point.properties?.forecast;
  if (!forecastUrl) return null;

  const fRes = await fetch(forecastUrl, { signal, headers: { Accept: "application/geo+json" } });
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

interface CacheEntry {
  promise: Promise<Conditions>;
  createdAt: number;
}
const cache = new Map<number, CacheEntry>();

// Conditions go stale: wind shifts and tide events pass. Within a single long
// session (open a spot in the morning, reopen in the afternoon) we want fresh
// data, not the morning's forecast still labeled "today". After this window a
// reopen refetches instead of serving the warm cache.
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Fetch tides + wind for a spot. Each source fails independently: one can error
 * while the other still renders. `failed` is true only when both fail, so the
 * caller never blanks the drawer. Cached per spot id, refreshed after CACHE_TTL_MS.
 */
export function getConditions(
  spotId: number,
  lat: number,
  lng: number,
  tideSensitive: boolean,
  signal?: AbortSignal
): Promise<Conditions> {
  const cached = cache.get(spotId);
  if (cached && Date.now() - cached.createdAt < CACHE_TTL_MS) return cached.promise;

  // Internal AbortController is intentionally NOT wired to the caller signal:
  // we want the cached promise to complete and stay warm even if the first
  // viewer closes the drawer, so a reopen is instant.
  void signal;

  const promise = (async (): Promise<Conditions> => {
    const [tideRes, windRes] = await Promise.allSettled([
      fetchTides(lat, lng, tideSensitive, new AbortController().signal),
      fetchWind(lat, lng, new AbortController().signal),
    ]);
    const tide = tideRes.status === "fulfilled" ? tideRes.value : null;
    const wind = windRes.status === "fulfilled" ? windRes.value : null;
    const failed = tideRes.status === "rejected" && windRes.status === "rejected";
    return { tide, wind, failed, fetchedAt: Date.now() };
  })();

  cache.set(spotId, { promise, createdAt: Date.now() });
  // Don't cache a hard failure forever: let the next open retry.
  promise.then((c) => {
    if (c.failed) cache.delete(spotId);
  }).catch(() => cache.delete(spotId));

  return promise;
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
