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
