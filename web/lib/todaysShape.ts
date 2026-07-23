import { paddleabilityFromWind, isStormyForecast, type Paddleability } from "@/lib/conditions";

/**
 * Item 100. "Today's shape": the intra-day wind curve for the rest of today,
 * read from the SAME NWS hourly payload that NextGoodWindowPanel already fetches
 * (lib/nextWindow.ts shares one cached fetch), so the curve costs zero extra
 * requests. Pure and DOM-free, so it can be shared with the native twin later.
 *
 * This is deliberately NOT a second definition of "good": it reuses the exact
 * 6am-6pm daytime bound and the wind-calm classification the alert path uses
 * (evaluateGoodWindow in lib/alerts/conditions-window.ts, hour >= 6 && hour < 18,
 * paddleabilityFromWind). It never edits that protected module; it only reads the
 * same hourly periods, which are a structural superset of HourlyPeriod.
 */

/** Raw NWS hourly period. A superset of alerts/HourlyPeriod (adds the forecast
 * text the curve needs), so an array of these is assignable to HourlyPeriod[]
 * and can feed evaluateGoodWindow unchanged. */
export interface RawHourly {
  startTime: string; // ISO with the spot's local UTC offset, as NWS returns it
  windSpeed: string; // "7 mph" or "5 to 10 mph"
  windDirection?: string;
  shortForecast?: string;
  // Item 103: percent chance of precipitation, in the same payload. Feeds the
  // SOFT rain caveat (an in-app label only). NWS sometimes sends {value: null}.
  probabilityOfPrecipitation?: { value: number | null } | null;
}

export interface HourSample {
  /** Spot-local hour, 0-23. */
  hour: number;
  /** Peak wind mph for the hour, or null when unparseable (fails closed: not calm). */
  windMph: number | null;
  paddleability: Paddleability;
  stormy: boolean;
}

export interface TodayShape {
  /**
   * The one-line read of the day's shape, or null when there is nothing clean to
   * say. Null mirrors evaluateGoodWindow returning null rather than guessing: a
   * shape with more than one calm/not-calm transition (or an all-windy day the
   * current reading already conveys) gets no line, only the curve.
   */
  summary: string | null;
  /** Remaining daytime hours, in order, for the curve. Always >= 3 when non-null:
   * two bars is not a shape (late-day it rendered as two flat blocks), so below
   * three remaining hours we draw nothing and let the live wind pill cover "now". */
  samples: HourSample[];
}

/** Spot-local calendar fields, read straight off the offset-bearing ISO string
 * (identical to conditions-window's localParts, kept local to stay DOM/pure). */
function localParts(startTime: string): { date: string; hour: number } {
  return { date: startTime.slice(0, 10), hour: Number(startTime.slice(11, 13)) };
}

/**
 * Peak wind mph in a windSpeed string, or null when unusable. Mirrors the alert
 * path's fail-closed parse (item 107): a missing/garbage reading is NOT calm.
 * The literal NWS word "Calm" and a numeric "0 mph" are the two real zero cases.
 */
function parseMaxWind(raw: string | undefined): number | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (s.toLowerCase() === "calm") return 0;
  const nums = (s.match(/\d+/g) ?? []).map(Number);
  return nums.length ? Math.max(...nums) : null;
}

/** "2pm", "11am", "12pm" (noon), "12am" (midnight). Pure. */
export function formatShapeHour(hour: number): string {
  const meridiem = hour < 12 ? "am" : "pm";
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display}${meridiem}`;
}

/**
 * Build today's shape from hourly periods. Considers only the REST of today:
 * periods at or after `nowMs`, on the same spot-local date as the first such
 * period, within the 6am-6pm daytime bound. Returns null when fewer than three
 * such hours remain: two bars is not a shape (late in the day it degenerated to
 * two flat full-height blocks that said nothing), so below three we draw nothing
 * and leave "right now" to the live wind pill above. Pure.
 */
export function buildTodaysShape(periods: RawHourly[], nowMs: number): TodayShape | null {
  const HOUR_MS = 3600000;
  // "Today" is the spot-local date of the hour that CONTAINS now, so a late call
  // never treats tomorrow's daytime as today. Fall back to the first hour still
  // in progress when now precedes the forecast entirely.
  let todayDate: string | null = null;
  for (const p of periods) {
    const startMs = Date.parse(p.startTime);
    if (Number.isNaN(startMs)) continue;
    if (startMs <= nowMs && startMs + HOUR_MS > nowMs) {
      todayDate = localParts(p.startTime).date;
      break;
    }
  }
  if (todayDate === null) {
    for (const p of periods) {
      const startMs = Date.parse(p.startTime);
      if (Number.isNaN(startMs)) continue;
      if (startMs + HOUR_MS > nowMs) {
        todayDate = localParts(p.startTime).date;
        break;
      }
    }
  }
  if (todayDate === null) return null;

  // Rest-of-today, daytime only: include the current (partly-elapsed) hour, drop
  // fully-past hours, drop anything outside 6am-6pm or on another calendar date.
  const samples: HourSample[] = [];
  for (const p of periods) {
    const startMs = Date.parse(p.startTime);
    if (Number.isNaN(startMs) || startMs + HOUR_MS <= nowMs) continue;
    const { date, hour } = localParts(p.startTime);
    if (date !== todayDate || hour < 6 || hour >= 18) continue;
    const windMph = parseMaxWind(p.windSpeed);
    samples.push({
      hour,
      windMph,
      paddleability: windMph === null ? "unknown" : paddleabilityFromWind(windMph),
      stormy: isStormyForecast(p.shortForecast),
    });
  }

  if (samples.length < 3) return null;

  return { summary: summarize(samples), samples };
}

/** The summary line per item 100's copy spec, or null to omit. Pure. */
function summarize(samples: HourSample[]): string | null {
  // A storm strictly LATER in the day is the safety-relevant fact and wins. The
  // current hour's storm is already carried by the panel's live "Storm risk"
  // badge, so "later today" stays literally true.
  if (samples.slice(1).some((s) => s.stormy)) return "Storms possible later today.";

  // Calm vs not-calm sequence. A null-wind hour fails closed to not-calm, so a
  // data gap can never read as calm (same posture as item 107).
  const calm = samples.map((s) => s.paddleability === "calm");
  const changes: number[] = [];
  for (let i = 1; i < calm.length; i++) {
    if (calm[i] !== calm[i - 1]) changes.push(i);
  }

  if (changes.length === 0) {
    return calm[0] ? "Calm the rest of today." : null;
  }
  if (changes.length === 1) {
    const i = changes[0];
    const hour = formatShapeHour(samples[i].hour);
    // calm -> not-calm means wind arrives at that hour; the reverse means it eases.
    return calm[i]
      ? `Winds ease by ${hour}.`
      : `Winds pick up by ${hour}.`;
  }
  // More than one transition: no clean line. Draw the curve, say nothing.
  return null;
}
