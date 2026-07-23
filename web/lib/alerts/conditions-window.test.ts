import { describe, it, expect } from "vitest";
import { evaluateGoodWindow, type HourlyPeriod } from "@/lib/alerts/conditions-window";

// 2026-07-01 is a Wednesday. Times are spot-local (PDT), like NWS hourly startTime.
const NOW = Date.parse("2026-07-01T08:00:00-07:00");
function h(day: string, hour: number, windSpeed: string, windDirection = ""): HourlyPeriod {
  return { startTime: `${day}T${String(hour).padStart(2, "0")}:00:00-07:00`, windSpeed, windDirection };
}

describe("evaluateGoodWindow (hourly)", () => {
  it("returns the soonest run of >=2 consecutive calm daytime hours", () => {
    const periods = [
      h("2026-07-01", 9, "12 mph"),
      h("2026-07-01", 10, "12 mph"),
      h("2026-07-02", 6, "7 mph"),
      h("2026-07-02", 7, "8 mph"),
      h("2026-07-02", 8, "11 mph"),
    ];
    const w = evaluateGoodWindow(periods, NOW, 3);
    expect(w).not.toBeNull();
    expect(w!.windowKey).toBe("2026-07-02");
    expect(w!.label).toBe("Thursday morning");
  });

  it("does not alert on a single isolated calm hour", () => {
    const periods = [
      h("2026-07-01", 9, "7 mph"),
      h("2026-07-01", 10, "14 mph"),
      h("2026-07-01", 11, "6 mph"),
      h("2026-07-01", 12, "15 mph"),
    ];
    expect(evaluateGoodWindow(periods, NOW, 3)).toBeNull();
  });

  it("ignores calm hours outside 6am to 6pm local", () => {
    const periods = [
      h("2026-07-01", 4, "2 mph"),
      h("2026-07-01", 5, "2 mph"),
      h("2026-07-01", 19, "3 mph"),
      h("2026-07-01", 20, "3 mph"),
    ];
    expect(evaluateGoodWindow(periods, NOW, 3)).toBeNull();
  });

  it("ignores hours already in the past", () => {
    const periods = [
      h("2026-07-01", 6, "5 mph"),
      h("2026-07-01", 7, "5 mph"), // both before NOW (8am)
      h("2026-07-01", 14, "16 mph"),
    ];
    expect(evaluateGoodWindow(periods, NOW, 3)).toBeNull();
  });

  it("ignores calm windows beyond the horizon", () => {
    const periods = [h("2026-07-05", 9, "3 mph"), h("2026-07-05", 10, "3 mph")];
    expect(evaluateGoodWindow(periods, NOW, 3)).toBeNull();
  });

  it("labels afternoon windows as afternoon", () => {
    const periods = [h("2026-07-03", 13, "6 mph"), h("2026-07-03", 14, "7 mph")];
    const w = evaluateGoodWindow(periods, NOW, 3);
    expect(w!.label).toBe("Friday afternoon");
    expect(w!.windowKey).toBe("2026-07-03");
  });

  it("requires the hours to be consecutive, not just same-day", () => {
    const periods = [
      h("2026-07-02", 8, "6 mph"),
      h("2026-07-02", 10, "6 mph"),
      h("2026-07-02", 12, "6 mph"),
    ];
    expect(evaluateGoodWindow(periods, NOW, 3)).toBeNull();
  });

  it("treats a wind range by its max", () => {
    const periods = [h("2026-07-02", 9, "5 to 10 mph"), h("2026-07-02", 10, "5 to 10 mph")];
    expect(evaluateGoodWindow(periods, NOW, 3)).toBeNull();
  });

  it("returns startHour and endHour of the selected run", () => {
    const periods = [
      h("2026-07-02", 7, "6 mph"),
      h("2026-07-02", 8, "6 mph"),
      h("2026-07-02", 9, "6 mph"),
      h("2026-07-02", 10, "14 mph"),
    ];
    const w = evaluateGoodWindow(periods, NOW, 3);
    expect(w).not.toBeNull();
    expect(w!.startHour).toBe(7);
    expect(w!.endHour).toBe(10);
    expect(w!.windowKey).toBe("2026-07-02");
    expect(w!.label).toBe("Thursday morning");
  });

  it("reports maxWindMph as the peak wind across the calm run", () => {
    const periods = [
      h("2026-07-02", 7, "3 mph"),
      h("2026-07-02", 8, "6 mph"),
      h("2026-07-02", 9, "4 mph"),
      h("2026-07-02", 10, "14 mph"),
    ];
    const w = evaluateGoodWindow(periods, NOW, 3);
    expect(w).not.toBeNull();
    expect(w!.maxWindMph).toBe(6); // 6 is the max among the calm hours; the 14 mph hour is excluded
  });

  it("extends endHour across the whole calm run, not just minHours", () => {
    const periods = [
      h("2026-07-02", 7, "6 mph"),
      h("2026-07-02", 8, "6 mph"),
      h("2026-07-02", 9, "6 mph"),
      h("2026-07-02", 10, "6 mph"),
      h("2026-07-02", 11, "6 mph"),
      h("2026-07-02", 12, "14 mph"),
    ];
    const w = evaluateGoodWindow(periods, NOW, 3);
    expect(w).not.toBeNull();
    expect(w!.endHour).toBe(12);
  });

  it("samples windDirection at the peak-wind hour of the run", () => {
    const periods = [
      h("2026-07-02", 7, "5 mph", "N"),
      h("2026-07-02", 8, "8 mph", "WNW"),
      h("2026-07-02", 9, "6 mph", "SW"),
      h("2026-07-02", 10, "14 mph", "S"),
    ];
    const w = evaluateGoodWindow(periods, NOW, 3);
    expect(w).not.toBeNull();
    expect(w!.windDirection).toBe("WNW");
  });

  it("reports an empty windDirection when the peak-wind hour had no direction", () => {
    const periods = [
      h("2026-07-02", 7, "5 mph"),
      h("2026-07-02", 8, "8 mph"),
      h("2026-07-02", 9, "14 mph"),
    ];
    const w = evaluateGoodWindow(periods, NOW, 3);
    expect(w).not.toBeNull();
    expect(w!.windDirection).toBe("");
  });

  it("does not advance to a later longer run", () => {
    const periods = [
      // earlier, shorter run: locks the window
      h("2026-07-01", 9, "6 mph"),
      h("2026-07-01", 10, "6 mph"),
      h("2026-07-01", 11, "14 mph"),
      // later, longer run on a different day
      h("2026-07-02", 6, "6 mph"),
      h("2026-07-02", 7, "6 mph"),
      h("2026-07-02", 8, "6 mph"),
      h("2026-07-02", 9, "6 mph"),
    ];
    const w = evaluateGoodWindow(periods, NOW, 3);
    expect(w).not.toBeNull();
    expect(w!.startHour).toBe(9);
    expect(w!.windowKey).toBe("2026-07-01");
  });
});

describe("evaluateGoodWindow fails CLOSED on bad wind data (item 107)", () => {
  it("does NOT treat missing/garbage windSpeed as calm", () => {
    // The defect: parseMaxWind returned 0 for these, and 0 is "calm", so a data
    // gap produced a good window. Now null -> ineligible -> no window.
    const periods = [
      h("2026-07-01", 9, ""),
      h("2026-07-01", 10, "garbage"),
    ];
    expect(evaluateGoodWindow(periods, NOW, 3)).toBeNull();
  });

  it("still alerts on a real numeric 0 mph", () => {
    const periods = [
      h("2026-07-01", 9, "0 mph"),
      h("2026-07-01", 10, "0 mph"),
    ];
    const w = evaluateGoodWindow(periods, NOW, 3);
    expect(w).not.toBeNull();
    expect(w!.maxWindMph).toBe(0);
  });

  it("still alerts when NWS writes the word Calm for windSpeed", () => {
    const periods = [
      h("2026-07-01", 9, "Calm"),
      h("2026-07-01", 10, "calm"), // case-insensitive
    ];
    const w = evaluateGoodWindow(periods, NOW, 3);
    expect(w).not.toBeNull();
    expect(w!.maxWindMph).toBe(0);
  });

  it("a bad-data hour BREAKS a run rather than silently extending it", () => {
    // 6,7 are calm (would be a window), 8 is garbage. The garbage hour must not
    // become part of the locked run, and must not read as another calm hour.
    const periods = [
      h("2026-07-02", 6, "5 mph"),
      h("2026-07-02", 7, "6 mph"),
      h("2026-07-02", 8, "garbage"),
      h("2026-07-02", 9, "40 mph"),
    ];
    const w = evaluateGoodWindow(periods, NOW, 3);
    expect(w).not.toBeNull();
    // The run is 6-7 only; 8 (garbage) does not extend it, so endHour is 8.
    expect(w!.startHour).toBe(6);
    expect(w!.endHour).toBe(8);
    expect(w!.maxWindMph).toBe(6);
  });

  it("mixed valid+invalid: peak wind ignores the unusable hour", () => {
    const periods = [
      h("2026-07-02", 10, "3 mph", "W"),
      h("2026-07-02", 11, "7 mph", "NW"),
    ];
    const w = evaluateGoodWindow(periods, NOW, 3);
    expect(w!.maxWindMph).toBe(7);
    expect(w!.windDirection).toBe("NW");
  });
});

// Item 103: the thunderstorm HARD exclusion. A thunderstorm hour is never part
// of a good window, on every surface (in-app, push, email), because they all
// evaluate through here. Plain rain is NOT excluded (soft in-app label only).
describe("evaluateGoodWindow thunderstorm exclusion (item 103)", () => {
  function hs(day: string, hour: number, windSpeed: string, shortForecast: string): HourlyPeriod {
    return { startTime: `${day}T${String(hour).padStart(2, "0")}:00:00-07:00`, windSpeed, windDirection: "NW", shortForecast };
  }

  it("a thunderstorm hour breaks a calm run so no window forms around it", () => {
    // Wind-calm 9,10,11 would be a 3-hour window (all future vs the 8am NOW), but
    // hour 10 is a thunderstorm, so the run splits into two 1-hour fragments
    // (neither reaches minHours=2).
    const periods = [
      hs("2026-07-01", 9, "5 mph", "Sunny"),
      hs("2026-07-01", 10, "5 mph", "Thunderstorms"),
      hs("2026-07-01", 11, "5 mph", "Sunny"),
    ];
    expect(evaluateGoodWindow(periods, NOW, 3)).toBeNull();
  });

  it("locks the window start AFTER a leading thunderstorm hour", () => {
    const periods = [
      hs("2026-07-01", 9, "5 mph", "Scattered Thunderstorms"),
      hs("2026-07-01", 10, "5 mph", "Sunny"),
      hs("2026-07-01", 11, "5 mph", "Sunny"),
    ];
    const w = evaluateGoodWindow(periods, NOW, 3);
    expect(w).not.toBeNull();
    expect(w!.startHour).toBe(10); // 9 is excluded (storm), the calm run is 10-11
  });

  it("does NOT exclude plain rain, only storms (rain is a comfort fact, soft label)", () => {
    const periods = [
      hs("2026-07-01", 9, "6 mph", "Rain Likely"),
      hs("2026-07-01", 10, "6 mph", "Chance Light Rain"),
    ];
    const w = evaluateGoodWindow(periods, NOW, 3);
    expect(w).not.toBeNull();
    expect(w!.startHour).toBe(9);
  });

  it("a missing shortForecast reads as not-stormy (matches the storm-badge contract)", () => {
    // h() sets no shortForecast; the run must still form.
    const periods = [
      h("2026-07-01", 9, "6 mph"),
      h("2026-07-01", 10, "6 mph"),
    ];
    expect(evaluateGoodWindow(periods, NOW, 3)).not.toBeNull();
  });
});
