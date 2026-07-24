import { describe, it, expect } from "vitest";
import { evaluateGoodToday, selectGoodToday, type GoodTodayEntry } from "@/lib/goodToday";
import type { RawHourly } from "@/lib/todaysShape";
import type { Spot } from "@/lib/types";

const OFF = "-07:00";
const DAY = "2026-07-23";
const TOMORROW = "2026-07-24";
function p(hour: number, windSpeed: string, date = DAY): RawHourly {
  const hh = String(hour).padStart(2, "0");
  return { startTime: `${date}T${hh}:00:00${OFF}`, windSpeed, windDirection: "NW", shortForecast: "Sunny" };
}
const CALM = "6 mph";
const WINDY = "21 mph";

describe("evaluateGoodToday", () => {
  it("flags a spot good today when a calm daytime window still lies ahead today", () => {
    const now = Date.parse(`${DAY}T06:30:00${OFF}`);
    const periods = [p(6, WINDY), p(7, CALM), p(8, CALM), p(9, CALM), p(10, WINDY)];
    const sig = evaluateGoodToday(periods, now);
    expect(sig.goodToday).toBe(true);
    expect(sig.window?.windowKey).toBe(DAY);
    // Current hour (6) is windy, even though the window comes later today.
    expect(sig.nowPaddleability).toBe("windy");
  });

  it("is NOT good today when the soonest calm window is tomorrow", () => {
    // Late afternoon, today's remaining hours are windy; tomorrow morning is calm.
    const now = Date.parse(`${DAY}T16:30:00${OFF}`);
    const periods = [
      p(16, WINDY), p(17, WINDY),
      p(7, CALM, TOMORROW), p(8, CALM, TOMORROW), p(9, CALM, TOMORROW),
    ];
    const sig = evaluateGoodToday(periods, now);
    expect(sig.window?.windowKey).toBe(TOMORROW);
    expect(sig.goodToday).toBe(false);
  });

  it("is not good today when there is no calm window at all", () => {
    const now = Date.parse(`${DAY}T09:30:00${OFF}`);
    const periods = [p(9, WINDY), p(10, WINDY), p(11, WINDY)];
    const sig = evaluateGoodToday(periods, now);
    expect(sig.goodToday).toBe(false);
    expect(sig.window).toBeNull();
  });

  it("reports the current-hour paddleability for the badge", () => {
    const now = Date.parse(`${DAY}T08:30:00${OFF}`);
    const periods = [p(8, CALM), p(9, CALM), p(10, CALM)];
    expect(evaluateGoodToday(periods, now).nowPaddleability).toBe("calm");
  });

  it("fails closed: an unparseable current wind reads unknown, and is not calm", () => {
    const now = Date.parse(`${DAY}T08:30:00${OFF}`);
    const periods = [p(8, "garbage"), p(9, CALM), p(10, CALM)];
    expect(evaluateGoodToday(periods, now).nowPaddleability).toBe("unknown");
  });
});

// Minimal Spot stub (only fields the selector touches are id-bearing; the rest
// satisfy the type).
function spot(id: number): Spot {
  return { id, name: `Spot ${id}`, region: "South Bay", water: "", difficulty: "flatwater",
    lat: 37.4, lng: -122.0, has_fee: null, tide_sensitive: false, notes: "" } as unknown as Spot;
}
function entry(id: number, goodToday: boolean, opts: Partial<{ distanceMi: number; now: "calm" | "breezy" | "windy" | "unknown"; startHour: number }> = {}): GoodTodayEntry {
  return {
    spot: spot(id),
    signal: {
      goodToday,
      nowPaddleability: opts.now ?? "calm",
      window: goodToday ? { windowKey: DAY, label: "", startHour: opts.startHour ?? 9, endHour: 12, maxWindMph: 5, windDirection: "NW" } : null,
    },
    distanceMi: opts.distanceMi,
  };
}

describe("selectGoodToday", () => {
  it("drops spots that are not good today", () => {
    const out = selectGoodToday([entry(1, false), entry(2, true), entry(3, false)]);
    expect(out.map((e) => e.spot.id)).toEqual([2]);
  });

  it("orders by nearest distance when geolocated", () => {
    const out = selectGoodToday([
      entry(1, true, { distanceMi: 40 }),
      entry(2, true, { distanceMi: 3 }),
      entry(3, true, { distanceMi: 18 }),
    ]);
    expect(out.map((e) => e.spot.id)).toEqual([2, 3, 1]);
  });

  it("without distances, ranks calmer-now first, then earlier window", () => {
    const out = selectGoodToday([
      entry(1, true, { now: "breezy", startHour: 8 }),
      entry(2, true, { now: "calm", startHour: 11 }),
      entry(3, true, { now: "calm", startHour: 9 }),
    ]);
    // both calm ones first (3 before 2 by earlier window), breezy last
    expect(out.map((e) => e.spot.id)).toEqual([3, 2, 1]);
  });

  it("caps at the limit", () => {
    const out = selectGoodToday(
      [entry(1, true, { distanceMi: 1 }), entry(2, true, { distanceMi: 2 }), entry(3, true, { distanceMi: 3 }), entry(4, true, { distanceMi: 4 })],
      3
    );
    expect(out.map((e) => e.spot.id)).toEqual([1, 2, 3]);
  });

  it("does not mutate the input array", () => {
    const input = [entry(1, true, { distanceMi: 9 }), entry(2, true, { distanceMi: 1 })];
    const before = input.map((e) => e.spot.id);
    selectGoodToday(input);
    expect(input.map((e) => e.spot.id)).toEqual(before);
  });
});
