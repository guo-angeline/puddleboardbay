import { describe, it, expect } from "vitest";
import { precomputedForecastUrl } from "./conditions";
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
