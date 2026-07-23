import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const panel = fs.readFileSync(path.resolve(__dirname, "TodaysShapePanel.tsx"), "utf-8");
const conditions = fs.readFileSync(path.resolve(__dirname, "ConditionsPanel.tsx"), "utf-8");

describe("TodaysShapePanel wiring (item 100)", () => {
  it("is gated behind the todays-shape kill switch, default ON", () => {
    expect(panel).toMatch(/useKillSwitch\(["']todays-shape["']\)/);
  });

  it("fires the dwell-gated todays_shape_viewed intent (never on mount)", () => {
    expect(panel).toMatch(/useGenuineView/);
    expect(panel).toMatch(/trackIntent\(["']todays_shape_viewed["']/);
  });

  it("draws from getTodaysShape, the shared cached hourly fetch, not a new one", () => {
    expect(panel).toMatch(/getTodaysShape/);
    // Must NOT open its own weather.gov request path.
    expect(panel).not.toMatch(/api\.weather\.gov/);
    expect(panel).not.toMatch(/\bfetch\(/);
  });

  it("carries no em dash in any copy", () => {
    expect(panel).not.toContain("—");
  });
});

describe("ConditionsPanel re-cut (item 100)", () => {
  it("renames the live-reading eyebrow to 'Right now' so two sections don't both say today", () => {
    expect(conditions).toMatch(/Right now/);
    expect(conditions).not.toMatch(/Conditions today/);
  });

  it("renders TodaysShapePanel above the multi-day look-ahead", () => {
    const shapeIdx = conditions.indexOf("<TodaysShapePanel");
    const nextIdx = conditions.indexOf("<NextGoodWindowPanel");
    expect(shapeIdx).toBeGreaterThan(-1);
    expect(nextIdx).toBeGreaterThan(-1);
    expect(shapeIdx).toBeLessThan(nextIdx);
  });
});
