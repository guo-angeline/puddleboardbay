import { paddleabilityFromWind } from "@/lib/conditions";

export interface HourlyPeriod {
  startTime: string; // ISO with the spot's local UTC offset, as NWS returns it
  windSpeed: string; // "7 mph" or "5 to 10 mph"
}

export interface GoodWindow {
  windowKey: string; // YYYY-MM-DD (spot-local) of the window, for dedup
  label: string;     // human label, e.g. "Thursday morning"
}

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function parseMaxWind(raw: string): number {
  const nums = (raw.match(/\d+/g) ?? []).map(Number);
  return nums.length ? Math.max(...nums) : 0;
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

/**
 * Soonest run of >= minHours consecutive calm daytime hours (6am to 6pm
 * spot-local) within `horizonDays`. Hourly, not day-period: a calm morning
 * inside a breezy afternoon still counts, which is the normal summer shape
 * here. Returns null if none. Past hours are skipped. Pure.
 */
export function evaluateGoodWindow(
  periods: HourlyPeriod[],
  nowMs: number,
  horizonDays = 3,
  minHours = 2
): GoodWindow | null {
  const horizonMs = nowMs + horizonDays * 86400000;
  let runStart: HourlyPeriod | null = null;
  let runLength = 0;
  let prevMs = NaN;
  for (const period of periods) {
    const startMs = Date.parse(period.startTime);
    const { hour } = localParts(period.startTime);
    const eligible =
      !Number.isNaN(startMs) &&
      startMs >= nowMs &&
      startMs <= horizonMs &&
      hour >= 6 &&
      hour < 18 &&
      paddleabilityFromWind(parseMaxWind(period.windSpeed)) === "calm";
    if (eligible && runLength > 0 && startMs - prevMs === 3600000) {
      runLength += 1;
    } else if (eligible) {
      runStart = period;
      runLength = 1;
    } else {
      runStart = null;
      runLength = 0;
    }
    prevMs = startMs;
    if (runStart && runLength >= minHours) {
      return { windowKey: localParts(runStart.startTime).date, label: windowLabel(runStart.startTime) };
    }
  }
  return null;
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
