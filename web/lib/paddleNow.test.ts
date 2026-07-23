import { describe, it, expect } from "vitest";
import { evaluatePaddleNow, selectPaddleNow, type PaddleNowEntry, type PaddleNowSignal } from "@/lib/paddleNow";
import type { RawHourly } from "@/lib/todaysShape";
import type { Spot } from "@/lib/types";

const OFF = "-07:00";
const DAY = "2026-07-01";
const TOMORROW = "2026-07-02";
const NOW = Date.parse(`${DAY}T08:00:00${OFF}`); // 8am local
function p(hour: number, windSpeed: string, date = DAY): RawHourly {
  return { startTime: `${date}T${String(hour).padStart(2, "0")}:00:00${OFF}`, windSpeed, windDirection: "NW", shortForecast: "Sunny" };
}
const CALM = "5 mph";
const WINDY = "20 mph";

describe("evaluatePaddleNow", () => {
  it("goodSoon when the calm window's first hour starts within the next 60 min", () => {
    // calm 8,9 -> window starts 8:00, which is <= now(8:00)+60min
    const sig = evaluatePaddleNow([p(8, CALM), p(9, CALM), p(10, WINDY)], NOW);
    expect(sig.window?.startHour).toBe(8);
    expect(sig.goodSoon).toBe(true);
  });

  it("NOT goodSoon when the soonest window is later today (beyond +60 min)", () => {
    // windy now; calm only at noon -> window starts 12:00, > 9:00 (now+60)
    const sig = evaluatePaddleNow([p(8, WINDY), p(9, WINDY), p(12, CALM), p(13, CALM)], NOW);
    expect(sig.window?.startHour).toBe(12);
    expect(sig.goodSoon).toBe(false);
  });

  it("NOT goodSoon when the only window is tomorrow", () => {
    const sig = evaluatePaddleNow([p(8, WINDY), p(9, WINDY), p(8, CALM, TOMORROW), p(9, CALM, TOMORROW)], NOW);
    expect(sig.window?.windowKey).toBe(TOMORROW);
    expect(sig.goodSoon).toBe(false);
  });

  it("NOT goodSoon when there is no calm window at all", () => {
    const sig = evaluatePaddleNow([p(8, WINDY), p(9, WINDY), p(10, WINDY)], NOW);
    expect(sig.window).toBeNull();
    expect(sig.goodSoon).toBe(false);
  });

  it("carries the current-hour paddleability (reused from evaluateGoodToday)", () => {
    expect(evaluatePaddleNow([p(8, CALM), p(9, CALM)], NOW).nowPaddleability).toBe("calm");
  });
});

function spot(id: number): Spot {
  return { id, region: "South Bay", city: "X", water: `Spot ${id}`, difficulty: "flatwater", lat: 37.4, lng: -122, has_fee: null, tide_sensitive: false, notes: "" } as unknown as Spot;
}
function sig(goodSoon: boolean, now: Paddleab = "calm", startHour = 8): PaddleNowSignal {
  return {
    goodToday: goodSoon, goodSoon, nowPaddleability: now, windowStartMs: NOW,
    window: goodSoon ? { windowKey: DAY, label: "", startHour, endHour: startHour + 2, maxWindMph: 5, windDirection: "NW" } : null,
  };
}
type Paddleab = "calm" | "breezy" | "windy" | "unknown";
function entry(id: number, goodSoon: boolean, opts: { distanceMi?: number; now?: Paddleab; startHour?: number } = {}): PaddleNowEntry {
  return { spot: spot(id), signal: sig(goodSoon, opts.now ?? "calm", opts.startHour ?? 8), distanceMi: opts.distanceMi };
}

describe("selectPaddleNow", () => {
  it("drops spots not good in the next hour", () => {
    const out = selectPaddleNow([entry(1, false), entry(2, true), entry(3, false)]);
    expect(out.map((e) => e.spot.id)).toEqual([2]);
  });
  it("ranks nearest-first, capped at limit (3)", () => {
    const out = selectPaddleNow([entry(1, true, { distanceMi: 40 }), entry(2, true, { distanceMi: 3 }), entry(3, true, { distanceMi: 18 }), entry(4, true, { distanceMi: 1 })]);
    expect(out.map((e) => e.spot.id)).toEqual([4, 2, 3]);
  });
  it("does not mutate the input", () => {
    const input = [entry(1, true, { distanceMi: 9 }), entry(2, true, { distanceMi: 1 })];
    const before = input.map((e) => e.spot.id);
    selectPaddleNow(input);
    expect(input.map((e) => e.spot.id)).toEqual(before);
  });
});
