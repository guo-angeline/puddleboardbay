import { describe, it, expect, afterEach, vi } from "vitest";
import { getNextWindow, getTodaysShape, formatNextWindow, noWindowLine } from "@/lib/nextWindow";
import type { GoodWindow } from "@/lib/alerts/conditions-window";

// 2026-07-01 is a Wednesday.
const NOW = Date.parse("2026-07-01T08:00:00-07:00");

function pointsResponse(ok = true) {
  return {
    ok,
    json: async () => ({ properties: { forecastHourly: "https://api.weather.gov/gridpoints/XYZ/hourly" } }),
  };
}

function forecastResponse(periods: { startTime: string; windSpeed: string }[]) {
  return { ok: true, json: async () => ({ properties: { periods } }) };
}

const CALM_RUN = [
  { startTime: "2026-07-02T07:00:00-07:00", windSpeed: "6 mph" },
  { startTime: "2026-07-02T08:00:00-07:00", windSpeed: "6 mph" },
  { startTime: "2026-07-02T09:00:00-07:00", windSpeed: "6 mph" },
  { startTime: "2026-07-02T10:00:00-07:00", windSpeed: "14 mph" },
];

const NO_CALM_RUN = [
  { startTime: "2026-07-02T07:00:00-07:00", windSpeed: "20 mph" },
  { startTime: "2026-07-02T08:00:00-07:00", windSpeed: "20 mph" },
];

describe("formatNextWindow", () => {
  it("formats a same-period window with a single trailing meridiem", () => {
    const w: GoodWindow = { windowKey: "2026-07-04", label: "Saturday morning", startHour: 7, endHour: 10, maxWindMph: 6, windDirection: "NW" };
    expect(formatNextWindow(w)).toBe("Sat 7 to 10am");
  });

  it("formats a window that crosses noon with a meridiem on each end", () => {
    const w: GoodWindow = { windowKey: "2026-07-04", label: "Saturday midday", startHour: 11, endHour: 13, maxWindMph: 6, windDirection: "NW" };
    expect(formatNextWindow(w)).toBe("Sat 11am to 1pm");
  });
});

describe("noWindowLine", () => {
  it("renders the horizon days into a quiet settled line", () => {
    expect(noWindowLine(3)).toBe("No good window in the next 3 days.");
  });
});

describe("getNextWindow", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("resolves ok:true with a window when the points and forecast fetches succeed and a calm run exists", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.startsWith("https://api.weather.gov/points/")) return pointsResponse();
      return forecastResponse(CALM_RUN);
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await getNextWindow(1, 47.6, -122.3, NOW);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.window).not.toBeNull();
      expect(result.window!.startHour).toBe(7);
      expect(result.window!.endHour).toBe(10);
    }
  });

  it("resolves ok:false when the points response is not ok", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => pointsResponse(false)));
    const result = await getNextWindow(2, 47.6, -122.3, NOW);
    expect(result).toEqual({ ok: false });
  });

  it("resolves ok:true with a null window when no calm run exists", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.startsWith("https://api.weather.gov/points/")) return pointsResponse();
      return forecastResponse(NO_CALM_RUN);
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await getNextWindow(3, 47.6, -122.3, NOW);
    expect(result).toEqual({ ok: true, window: null });
  });

  it("resolves ok:false when fetch throws", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("network down"); }));
    const result = await getNextWindow(4, 47.6, -122.3, NOW);
    expect(result).toEqual({ ok: false });
  });

  it("dedupes concurrent calls for the same spot id into a single points fetch", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.startsWith("https://api.weather.gov/points/")) return pointsResponse();
      return forecastResponse(CALM_RUN);
    });
    vi.stubGlobal("fetch", fetchMock);

    const [a, b] = await Promise.all([
      getNextWindow(5, 47.6, -122.3, NOW),
      getNextWindow(5, 47.6, -122.3, NOW),
    ]);
    expect(a).toEqual(b);
    const pointsCalls = fetchMock.mock.calls.filter(([url]) => String(url).startsWith("https://api.weather.gov/points/"));
    expect(pointsCalls.length).toBe(1);
  });
});

// Item 100: the whole point of the consolidation. The next-good-window and
// today's-shape must come from ONE hourly forecast fetch per spot, not two.
describe("getNextWindow + getTodaysShape share one hourly fetch (item 100)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("resolves both surfaces from a single forecast request for the same spot", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.startsWith("https://api.weather.gov/points/")) return pointsResponse();
      return forecastResponse(CALM_RUN);
    });
    vi.stubGlobal("fetch", fetchMock);

    // Evaluate the shape relative to the CALM_RUN's own day so it has daytime
    // hours ahead of "now".
    const shapeNow = Date.parse("2026-07-02T06:30:00-07:00");
    const [win, shape] = await Promise.all([
      getNextWindow(9, 47.6, -122.3, NOW),
      getTodaysShape(9, 47.6, -122.3, shapeNow),
    ]);
    expect(win.ok).toBe(true);
    expect(shape.ok).toBe(true);

    const forecastCalls = fetchMock.mock.calls.filter(([url]) =>
      String(url).includes("/hourly")
    );
    expect(forecastCalls.length).toBe(1); // one hourly fetch, both surfaces
  });

  it("getTodaysShape resolves ok:false when the fetch fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => pointsResponse(false)));
    const shape = await getTodaysShape(10, 47.6, -122.3, NOW);
    expect(shape).toEqual({ ok: false });
  });
});
