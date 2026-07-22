import { paddleabilityFromWind } from "@/lib/conditions";

export interface HourlyPeriod {
  startTime: string; // ISO with the spot's local UTC offset, as NWS returns it
  windSpeed: string; // "7 mph" or "5 to 10 mph"
  windDirection?: string; // NWS wind-FROM compass direction, e.g. "WNW"
}

export interface GoodWindow {
  windowKey: string; // YYYY-MM-DD (spot-local) of the window, for dedup
  label: string;     // human label, e.g. "Thursday morning"
  startHour: number; // spot-local hour of the run's first calm period
  endHour: number;   // spot-local hour AFTER the run's last calm period
  maxWindMph: number; // peak wind (mph) across the calm run, for the alert copy
  /** Wind direction sampled at the run's peak-wind hour. Empty string when that period had no direction. */
  windDirection: string;
}

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/**
 * Peak wind in a windSpeed string, or null when there is no usable reading.
 *
 * Item 107 (2026-07-22). This used to return 0 for ANY string with no digits
 * ("", null-ish, "garbage"), and paddleabilityFromWind(0) is "calm", so a period
 * with missing or unparseable wind scored as DEAD CALM and eligible. On this
 * unattended alert path that means the absence of data could fire a "good to
 * paddle" push. A paddling app must fail CLOSED here, not open.
 *
 * The two legitimate low-wind cases are preserved: a numeric "0 mph" is real
 * calm, and NWS sometimes writes the literal word "Calm" for windSpeed. Anything
 * else with no number returns null, and the caller treats null as ineligible.
 * `raw` is typed string but the NWS response is cast unchecked (findGoodWindow),
 * so guard the runtime null/undefined too.
 */
function parseMaxWind(raw: string): number | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (s.toLowerCase() === "calm") return 0;
  const nums = (s.match(/\d+/g) ?? []).map(Number);
  return nums.length ? Math.max(...nums) : null;
}

/** Spot-local calendar fields, read straight off the offset-bearing ISO string. */
function localParts(startTime: string): { date: string; hour: number } {
  return { date: startTime.slice(0, 10), hour: Number(startTime.slice(11, 13)) };
}

function windowLabel(startTime: string): string {
  const { date, hour } = localParts(startTime);
  const weekday = WEEKDAYS[new Date(`${date}T00:00:00Z`).getUTCDay()];
  return `${weekday} ${hour < 12 ? "morning" : "afternoon"}`;
}

export const DEFAULT_HORIZON_DAYS = 3;

/**
 * Soonest run of >= minHours consecutive calm daytime hours (6am to 6pm
 * spot-local) within `horizonDays`. Hourly, not day-period: a calm morning
 * inside a breezy afternoon still counts, which is the normal summer shape
 * here. Once a qualifying run is found its start is locked; the scan then
 * keeps extending the end of that same run until it breaks, it never moves
 * on to a later run. Returns null if none. Past hours are skipped. Pure.
 */
export function evaluateGoodWindow(
  periods: HourlyPeriod[],
  nowMs: number,
  horizonDays = DEFAULT_HORIZON_DAYS,
  minHours = 2
): GoodWindow | null {
  const horizonMs = nowMs + horizonDays * 86400000;
  let runStart: HourlyPeriod | null = null;
  let runLength = 0;
  let runMaxWind = 0;
  let runMaxDir = "";
  let prevMs = NaN;
  let locked: { runStart: HourlyPeriod; lastPeriod: HourlyPeriod; maxWind: number; maxDir: string } | null = null;
  for (const period of periods) {
    const startMs = Date.parse(period.startTime);
    const { hour } = localParts(period.startTime);
    const wind = parseMaxWind(period.windSpeed);
    // w is only ever read inside the eligible branches below, where wind is
    // guaranteed non-null; coalescing keeps the types clean without an assertion.
    const w = wind ?? 0;
    const eligible =
      !Number.isNaN(startMs) &&
      startMs >= nowMs &&
      startMs <= horizonMs &&
      hour >= 6 &&
      hour < 18 &&
      // Item 107: null wind (missing/garbage) is NOT calm. It breaks the run,
      // so a data gap can never sit inside a "good window".
      wind !== null &&
      paddleabilityFromWind(wind) === "calm";

    if (locked) {
      if (eligible && startMs - prevMs === 3600000) {
        locked.lastPeriod = period;
        if (w > locked.maxWind) {
          locked.maxWind = w;
          locked.maxDir = period.windDirection ?? "";
        }
        prevMs = startMs;
        continue;
      }
      break;
    }

    if (eligible && runLength > 0 && startMs - prevMs === 3600000) {
      runLength += 1;
      if (w > runMaxWind) {
        runMaxWind = w;
        runMaxDir = period.windDirection ?? "";
      }
    } else if (eligible) {
      runStart = period;
      runLength = 1;
      runMaxWind = w;
      runMaxDir = period.windDirection ?? "";
    } else {
      runStart = null;
      runLength = 0;
      runMaxWind = 0;
      runMaxDir = "";
    }
    prevMs = startMs;
    if (runStart && runLength >= minHours) {
      locked = { runStart, lastPeriod: period, maxWind: runMaxWind, maxDir: runMaxDir };
    }
  }
  if (!locked) return null;
  return {
    windowKey: localParts(locked.runStart.startTime).date,
    label: windowLabel(locked.runStart.startTime),
    startHour: localParts(locked.runStart.startTime).hour,
    endHour: localParts(locked.lastPeriod.startTime).hour + 1,
    maxWindMph: locked.maxWind,
    windDirection: locked.maxDir,
  };
}

/** Fetch the NWS hourly forecast for a spot and evaluate a good window. Returns null on any fetch failure. */
export async function findGoodWindow(lat: number, lng: number, nowMs: number): Promise<GoodWindow | null> {
  try {
    const pointRes = await fetch(`https://api.weather.gov/points/${lat.toFixed(4)},${lng.toFixed(4)}`, {
      headers: { Accept: "application/geo+json", "User-Agent": "paddle-to-water alerts" },
    });
    if (!pointRes.ok) return null;
    const point = (await pointRes.json()) as { properties?: { forecastHourly?: string } };
    const forecastUrl = point.properties?.forecastHourly;
    if (!forecastUrl) return null;
    const fRes = await fetch(forecastUrl, {
      headers: { Accept: "application/geo+json", "User-Agent": "paddle-to-water alerts" },
    });
    if (!fRes.ok) return null;
    const data = (await fRes.json()) as { properties?: { periods?: HourlyPeriod[] } };
    const periods = data.properties?.periods ?? [];
    return evaluateGoodWindow(periods, nowMs);
  } catch {
    return null;
  }
}
