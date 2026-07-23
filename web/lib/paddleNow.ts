import { evaluateGoodToday, type GoodTodaySignal } from "@/lib/goodToday";
import type { RawHourly } from "@/lib/todaysShape";
import type { Paddleability } from "@/lib/conditions";
import type { GoodWindow } from "@/lib/alerts/conditions-window";
import type { Spot } from "@/lib/types";

/**
 * Item 137. "Want to paddle now?": the tighter, PUSH-surface variant of the
 * conditions moat. A spot qualifies only if its calm window (the SAME
 * evaluateGoodWindow definition the drawer/cron/item 61 use, via evaluateGoodToday)
 * overlaps the next 60 minutes, i.e. the window's first calm hour starts within
 * [now, now+60min]. This never forks the calm-window math; it adds one horizon
 * filter on top of it. Pure, DOM-free.
 */

export const PADDLE_NOW_HORIZON_MS = 60 * 60000;

/** localStorage key for the once-per-user-per-day gate. Value is the local date
 * string, so the modal shows at most once per calendar day per device. */
export const PADDLE_NOW_SEEN_KEY = "ptw-paddle-now-seen";

/** Local calendar date (YYYY-MM-DD) of a Date, in the viewer's timezone. Pure
 * (takes the Date in), so it never runs Date.now() during render. */
export function localDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export interface PaddleNowSignal extends GoodTodaySignal {
  /** The window's first calm hour starts within the next 60 minutes. */
  goodSoon: boolean;
  /** Epoch ms of that first calm hour, for the horizon check and copy. */
  windowStartMs: number | null;
}

/** Epoch ms of the window's first calm hour, found in the periods it came from. */
function windowStartMs(periods: RawHourly[], window: GoodWindow): number | null {
  for (const p of periods) {
    if (p.startTime.slice(0, 10) === window.windowKey && Number(p.startTime.slice(11, 13)) === window.startHour) {
      const ms = Date.parse(p.startTime);
      return Number.isNaN(ms) ? null : ms;
    }
  }
  return null;
}

export function evaluatePaddleNow(
  periods: RawHourly[],
  nowMs: number,
  horizonMs: number = PADDLE_NOW_HORIZON_MS
): PaddleNowSignal {
  const base = evaluateGoodToday(periods, nowMs); // reuse: window + nowPaddleability
  const startMs = base.window ? windowStartMs(periods, base.window) : null;
  const goodSoon = startMs != null && startMs <= nowMs + horizonMs;
  return { ...base, goodSoon, windowStartMs: startMs };
}

export interface PaddleNowEntry {
  spot: Spot;
  signal: PaddleNowSignal;
  /** Miles from the user, when geolocated. Absent otherwise. */
  distanceMi?: number;
}

const PADDLE_ORDER: Record<Paddleability, number> = { calm: 0, breezy: 1, windy: 2, unknown: 3 };

/**
 * The spots good enough to launch in the next hour, nearest first, capped at
 * `limit`. Distance wins when geolocated (this is a "where do I go right now"
 * question); ties fall back to the calmer current reading, then the earlier
 * window start. Never mutates the input.
 */
export function selectPaddleNow(entries: PaddleNowEntry[], limit = 3): PaddleNowEntry[] {
  return entries
    .filter((e) => e.signal.goodSoon)
    .sort((a, b) => {
      if (a.distanceMi != null && b.distanceMi != null && a.distanceMi !== b.distanceMi) {
        return a.distanceMi - b.distanceMi;
      }
      const pa = PADDLE_ORDER[a.signal.nowPaddleability] - PADDLE_ORDER[b.signal.nowPaddleability];
      if (pa !== 0) return pa;
      return (a.signal.window?.startHour ?? 99) - (b.signal.window?.startHour ?? 99);
    })
    .slice(0, limit);
}
