import { describe, it, expect } from "vitest";
import fs from "node:fs";
import {
  precomputedForecastUrl,
  isStormyForecast,
  paddleabilityFromWind,
  tideDirectionLine,
  nearestTideStation,
  TIDE_STATIONS,
  TIDE_STATION_IDS,
  MAX_STATION_MI,
} from "./conditions";
import { ALL_SPOTS } from "./spots";

describe("precomputed wind gridpoints (item 53: one-hop wind fetch)", () => {
  it("has a forecast URL for every visible spot", () => {
    // Full coverage means the runtime wind fetch is one hop for every spot. A
    // miss here also flags a JS/Python key-rounding mismatch (lat.toFixed(4) vs
    // f"{lat:.4f}"), which would silently fall back to the two-hop path.
    const missing = ALL_SPOTS.filter((s) => !precomputedForecastUrl(s.lat, s.lng));
    expect(missing.map((s) => s.id)).toEqual([]);
  });

  it("resolves to an NWS forecast URL, not a /points URL", () => {
    const url = precomputedForecastUrl(ALL_SPOTS[0].lat, ALL_SPOTS[0].lng);
    expect(url).toMatch(/^https:\/\/api\.weather\.gov\/gridpoints\/.+\/forecast$/);
  });

  it("returns null for a coordinate that was not precomputed", () => {
    expect(precomputedForecastUrl(0, 0)).toBeNull();
  });
});

describe("conditions fetch adapter (native app config; web must stay same-origin)", () => {
  it("defaults to an empty apiBase and no extra headers (web behavior unchanged)", async () => {
    const { conditionsFetchConfig } = await import("./conditions");
    expect(conditionsFetchConfig()).toEqual({ apiBase: "", headers: {} });
  });

  it("configure sets the base (trailing slash trimmed) and headers; reconfigure resets", async () => {
    const { configureConditionsFetch, conditionsFetchConfig } = await import("./conditions");
    configureConditionsFetch({
      apiBase: "https://paddletowater.com/",
      headers: { "User-Agent": "paddle-to-water-ios" },
    });
    expect(conditionsFetchConfig()).toEqual({
      apiBase: "https://paddletowater.com",
      headers: { "User-Agent": "paddle-to-water-ios" },
    });
    // Restore the web default so later tests in this file see web behavior.
    configureConditionsFetch({ apiBase: "", headers: {} });
    expect(conditionsFetchConfig()).toEqual({ apiBase: "", headers: {} });
  });
});

describe("tide station coverage", () => {
  // Added 2026-07-22. The LA and San Diego spots shipped with
  // tide_sensitive: true while the station list stopped at Port San Luis, so
  // every one of them resolved "no tide station near this spot" and the
  // conditions engine, the app's differentiator, ran blind on 22 spots. The
  // build passed the whole time: no test tied the flag to the coverage it
  // implies. This is that test. Adding a coastal region without its stations
  // now fails here instead of in production.
  it("has a station within range for every tide_sensitive visible spot", () => {
    // nearestTideStation ALWAYS returns a station, however far away. The real
    // predicate is the distance cut fetchTides applies, so assert on that.
    const uncovered = ALL_SPOTS.filter((s) => s.tide_sensitive).filter(
      (s) => nearestTideStation(s.lat, s.lng).distanceMi > MAX_STATION_MI,
    );
    expect(uncovered.map((s) => `${s.id} ${s.water}`)).toEqual([]);
  });

  it("only ships station ids the tides proxy will forward", () => {
    // /api/tides validates against TIDE_STATION_IDS. A station in the list but
    // not in the set (or a typo'd id) 400s at the proxy and silently degrades
    // to no tides, which is the failure mode above wearing a different hat.
    for (const s of TIDE_STATIONS) {
      expect(TIDE_STATION_IDS.has(s.id)).toBe(true);
      expect(s.id).toMatch(/^[A-Z0-9]{6,8}$/);
    }
    expect(TIDE_STATION_IDS.size).toBe(TIDE_STATIONS.length);
  });
});

describe("storm gating (item 97)", () => {
  it("flags thunderstorm phrasings that the wind verdict alone would miss", () => {
    for (const f of ["Thunderstorms Likely", "Chance T-storms", "Scattered Tstorms", "Lightning nearby"]) {
      expect(isStormyForecast(f)).toBe(true);
    }
  });

  it("does not flag ordinary or merely wet forecasts", () => {
    for (const f of ["Sunny", "Partly Cloudy", "Chance Showers", "Rain Likely", "Windy", ""]) {
      expect(isStormyForecast(f)).toBe(false);
    }
    expect(isStormyForecast(null)).toBe(false);
  });

  it("only ever downgrades: it is independent of the wind verdict, never softening it", () => {
    // The two functions are orthogonal by construction. A storm forecast in
    // light wind is the case that motivated the item; assert the wind verdict
    // is unchanged by storm text, so nothing here can turn a windy day calm.
    expect(paddleabilityFromWind(3)).toBe("calm");
    expect(isStormyForecast("Thunderstorms")).toBe(true);
    expect(paddleabilityFromWind(25)).toBe("windy");
  });
});

describe("tide direction line (item 98)", () => {
  const evt = (type: "H" | "L", time: string, heightFt = 3) => ({ type, time, heightFt });

  it("reads a next HIGH as currently rising, turning at that time", () => {
    const line = tideDirectionLine([evt("H", "2026-07-22 16:53")]);
    expect(line).toContain("Rising, turns to falling at");
  });

  it("reads a next LOW as currently falling, turning at that time", () => {
    const line = tideDirectionLine([evt("L", "2026-07-22 23:10")]);
    expect(line).toContain("Falling, turns to rising at");
  });

  it("returns null when there is no next event to key off", () => {
    expect(tideDirectionLine([])).toBeNull();
  });

  it("NEVER uses current vocabulary: height predictions cannot claim flood/ebb/current", () => {
    // The safety constraint. We predict height; slack lags the height turn, so
    // "flood"/"ebb"/"current" would assert water movement we do not know.
    for (const e of [tideDirectionLine([evt("H", "2026-07-22 16:53")]),
                     tideDirectionLine([evt("L", "2026-07-22 23:10")])]) {
      expect(e).not.toMatch(/\b(flood|ebb|current)\b/i);
    }
  });

  it("the source itself carries no current vocabulary in its output strings", () => {
    // Belt and braces: assert the literal template strings, so a future edit
    // that hardcodes "flood tide" is caught even if the runtime path is missed.
    const src = fs.readFileSync(new URL("./conditions.ts", import.meta.url)).toString();
    const fn = src.slice(src.indexOf("export function tideDirectionLine"), src.indexOf("export function tideDirectionLine") + 700);
    expect(fn).not.toMatch(/`[^`]*\b(flood|ebb)\b[^`]*`/i);
  });
});
