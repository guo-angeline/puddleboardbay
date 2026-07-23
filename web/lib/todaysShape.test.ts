import { describe, it, expect } from "vitest";
import { buildTodaysShape, formatShapeHour, type RawHourly } from "@/lib/todaysShape";
import { evaluateGoodWindow } from "@/lib/alerts/conditions-window";

// California local offset (PDT). NWS hourly startTimes carry this offset, and
// buildTodaysShape reads the local hour straight off the string.
const OFF = "-07:00";
const DAY = "2026-07-23";
// "Now" is 11:00 local, so the rest of today's daytime is hours 11..17.
const NOW = Date.parse(`${DAY}T11:00:00${OFF}`);

/** windSpeed for a paddleability tier: calm <=8, breezy <=15, else windy. */
function period(hour: number, windSpeed: string, shortForecast = "Sunny", date = DAY): RawHourly {
  const hh = String(hour).padStart(2, "0");
  return { startTime: `${date}T${hh}:00:00${OFF}`, windSpeed, windDirection: "NW", shortForecast };
}
const CALM = "5 mph";
const WINDY = "20 mph";

describe("formatShapeHour", () => {
  it("formats 12-hour clock with meridiem, no space", () => {
    expect(formatShapeHour(0)).toBe("12am");
    expect(formatShapeHour(6)).toBe("6am");
    expect(formatShapeHour(11)).toBe("11am");
    expect(formatShapeHour(12)).toBe("12pm");
    expect(formatShapeHour(13)).toBe("1pm");
    expect(formatShapeHour(18)).toBe("6pm");
  });
});

describe("buildTodaysShape summary copy", () => {
  it("all remaining daytime hours calm -> 'Calm the rest of today.'", () => {
    const periods = [11, 12, 13, 14, 15, 16, 17].map((h) => period(h, CALM));
    expect(buildTodaysShape(periods, NOW)?.summary).toBe("Calm the rest of today.");
  });

  it("one calm->windy transition -> 'Winds pick up by {h}{am/pm}.' at the change hour", () => {
    const periods = [
      period(11, CALM), period(12, CALM), period(13, CALM),
      period(14, WINDY), period(15, WINDY), period(16, WINDY),
    ];
    expect(buildTodaysShape(periods, NOW)?.summary).toBe("Winds pick up by 2pm.");
  });

  it("one windy->calm transition -> 'Winds ease by {h}{am/pm}.' at the change hour", () => {
    const periods = [
      period(11, WINDY), period(12, WINDY), period(13, WINDY), period(14, WINDY),
      period(15, CALM), period(16, CALM), period(17, CALM),
    ];
    expect(buildTodaysShape(periods, NOW)?.summary).toBe("Winds ease by 3pm.");
  });

  it("more than one transition -> summary omitted (null), curve still present", () => {
    const periods = [
      period(11, CALM), period(12, CALM),
      period(13, WINDY), period(14, WINDY),
      period(15, CALM), period(16, CALM),
    ];
    const shape = buildTodaysShape(periods, NOW);
    expect(shape?.summary).toBeNull();
    expect(shape?.samples.length).toBe(6);
  });

  it("all-windy day (no transition, not calm) -> summary omitted", () => {
    const periods = [11, 12, 13, 14, 15].map((h) => period(h, WINDY));
    expect(buildTodaysShape(periods, NOW)?.summary).toBeNull();
  });

  it("thunderstorm later today wins over wind copy", () => {
    const periods = [
      period(11, CALM), period(12, CALM),
      period(13, CALM, "Scattered Thunderstorms"), period(14, WINDY),
    ];
    expect(buildTodaysShape(periods, NOW)?.summary).toBe("Storms possible later today.");
  });

  it("storm only in the CURRENT hour does not trigger the 'later' line", () => {
    const periods = [
      period(11, CALM, "Thunderstorms"), period(12, CALM), period(13, CALM),
    ];
    // slice(1) has no storm -> falls through to the calm reading.
    expect(buildTodaysShape(periods, NOW)?.summary).toBe("Calm the rest of today.");
  });
});

describe("buildTodaysShape windowing", () => {
  it("excludes hours before now", () => {
    const periods = [7, 8, 9, 10, 11, 12, 13].map((h) => period(h, CALM));
    const shape = buildTodaysShape(periods, NOW);
    expect(shape?.samples[0].hour).toBe(11);
    expect(shape?.samples.every((s) => s.hour >= 11)).toBe(true);
  });

  it("excludes hours outside the 6am-6pm daytime bound", () => {
    const periods = [
      period(11, CALM), period(12, CALM), period(17, CALM),
      period(18, CALM), period(19, CALM), // 6pm+ excluded
    ];
    const shape = buildTodaysShape(periods, NOW);
    expect(shape?.samples.map((s) => s.hour)).toEqual([11, 12, 17]);
  });

  it("does not reach into tomorrow's daytime hours (anchors to today)", () => {
    const late = Date.parse(`${DAY}T17:30:00${OFF}`); // only 5pm-ish left today
    const periods = [
      period(17, CALM),
      period(7, CALM, "Sunny", "2026-07-24"),
      period(8, CALM, "Sunny", "2026-07-24"),
    ];
    // Only one daytime hour remains today (17), tomorrow is excluded -> null.
    expect(buildTodaysShape(periods, late)).toBeNull();
  });

  it("returns null when fewer than two daytime hours remain", () => {
    const periods = [period(17, CALM)];
    expect(buildTodaysShape(periods, NOW)).toBeNull();
  });
});

describe("buildTodaysShape fails closed on bad wind data", () => {
  it("an unparseable-wind hour is NOT calm, so it breaks 'calm the rest of today'", () => {
    const periods = [
      period(11, CALM), period(12, CALM),
      period(13, "garbage"), period(14, CALM),
    ];
    const shape = buildTodaysShape(periods, NOW);
    // hour 13 -> unknown (not calm): calm=[T,T,F,T] is two transitions -> null,
    // never "Calm the rest of today.".
    expect(shape?.summary).toBeNull();
    expect(shape?.samples[2].windMph).toBeNull();
    expect(shape?.samples[2].paddleability).toBe("unknown");
  });
});

describe("consolidation contract: RawHourly feeds evaluateGoodWindow unchanged", () => {
  it("the same period array drives both the shape and the good-window", () => {
    const periods = [11, 12, 13, 14, 15].map((h) => period(h, CALM));
    // If this type-checks and runs, one hourly fetch can serve both surfaces.
    const win = evaluateGoodWindow(periods, NOW);
    expect(win).not.toBeNull();
    expect(buildTodaysShape(periods, NOW)?.summary).toBe("Calm the rest of today.");
  });
});
