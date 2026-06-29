import { paddleabilityFromWind } from "@/lib/conditions";

export interface ForecastPeriod {
  name: string;
  startTime: string;
  isDaytime: boolean;
  windSpeed: string;
}

export interface GoodWindow {
  windowKey: string; // YYYY-MM-DD of the good period, for dedup
  label: string;     // human label, e.g. "Wednesday"
}

function parseMaxWind(raw: string): number {
  const nums = (raw.match(/\d+/g) ?? []).map(Number);
  return nums.length ? Math.max(...nums) : 0;
}

/**
 * Soonest daytime period within `horizonDays` whose wind reads "calm". Returns
 * null if none. Past periods and nighttime periods are skipped. Pure.
 */
export function evaluateGoodWindow(
  periods: ForecastPeriod[],
  nowMs: number,
  horizonDays = 3
): GoodWindow | null {
  const horizonMs = nowMs + horizonDays * 86400000;
  for (const period of periods) {
    if (!period.isDaytime) continue;
    const start = Date.parse(period.startTime);
    if (Number.isNaN(start) || start < nowMs || start > horizonMs) continue;
    if (paddleabilityFromWind(parseMaxWind(period.windSpeed)) !== "calm") continue;
    return { windowKey: period.startTime.slice(0, 10), label: period.name };
  }
  return null;
}

/** Fetch the NWS forecast for a spot and evaluate a good window. Returns null on any fetch failure. */
export async function findGoodWindow(lat: number, lng: number, nowMs: number): Promise<GoodWindow | null> {
  try {
    const pointRes = await fetch(`https://api.weather.gov/points/${lat.toFixed(4)},${lng.toFixed(4)}`, {
      headers: { Accept: "application/geo+json", "User-Agent": "paddle-to-water alerts" },
    });
    if (!pointRes.ok) return null;
    const point = (await pointRes.json()) as { properties?: { forecast?: string } };
    const forecastUrl = point.properties?.forecast;
    if (!forecastUrl) return null;
    const fRes = await fetch(forecastUrl, {
      headers: { Accept: "application/geo+json", "User-Agent": "paddle-to-water alerts" },
    });
    if (!fRes.ok) return null;
    const data = (await fRes.json()) as { properties?: { periods?: ForecastPeriod[] } };
    const periods = data.properties?.periods ?? [];
    return evaluateGoodWindow(periods, nowMs);
  } catch {
    return null;
  }
}
