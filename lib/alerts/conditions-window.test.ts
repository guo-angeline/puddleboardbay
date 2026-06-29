import { describe, it, expect } from "vitest";
import { evaluateGoodWindow, type ForecastPeriod } from "@/lib/alerts/conditions-window";

const NOW = Date.parse("2026-07-01T15:00:00Z");
function p(name: string, dayOffset: number, isDaytime: boolean, windSpeed: string): ForecastPeriod {
  const d = new Date(NOW + dayOffset * 86400000);
  return { name, startTime: d.toISOString(), isDaytime, windSpeed };
}

describe("evaluateGoodWindow", () => {
  it("returns the soonest daytime calm period within the horizon", () => {
    const periods = [
      p("This Afternoon", 0, true, "15 to 20 mph"), // windy
      p("Tonight", 0, false, "2 mph"),               // night, ignored
      p("Wednesday", 1, true, "5 to 8 mph"),         // calm -> this one
      p("Thursday", 2, true, "3 mph"),               // also calm but later
    ];
    const w = evaluateGoodWindow(periods, NOW, 3);
    expect(w).not.toBeNull();
    expect(w!.label).toBe("Wednesday");
    expect(w!.windowKey).toBe("2026-07-02"); // date of that period
  });

  it("ignores nighttime periods even if calm", () => {
    const periods = [p("Tonight", 0, false, "1 mph"), p("Tomorrow", 1, true, "20 mph")];
    expect(evaluateGoodWindow(periods, NOW, 3)).toBeNull();
  });

  it("returns null when nothing calm is within the horizon", () => {
    const periods = [p("Today", 0, true, "18 mph"), p("Day4", 4, true, "2 mph")];
    expect(evaluateGoodWindow(periods, NOW, 3)).toBeNull();
  });

  it("does not select periods already in the past", () => {
    const periods = [p("Yesterday", -1, true, "1 mph"), p("Today", 0, true, "30 mph")];
    expect(evaluateGoodWindow(periods, NOW, 3)).toBeNull();
  });
});
