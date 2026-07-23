import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const read = (p: string) => fs.readFileSync(path.resolve(__dirname, p), "utf-8");
const alt = read("NearbyAlternatives.tsx");
const panel = read("ConditionsPanel.tsx");
const drawer = read("SpotDrawer.tsx");

describe("Go-here-instead wiring (item 8)", () => {
  it("is gated behind the go-here-instead kill switch, default ON", () => {
    expect(alt).toMatch(/useKillSwitch\(["']go-here-instead["']\)/);
  });

  it("only offers alternatives when the OPENED spot is blown out today", () => {
    expect(alt).toMatch(/useGoodTodaySignal/);
    expect(alt).toMatch(/!openedSignal\.goodToday/);
  });

  it("bounds the candidate fan-out to nearest-K of the OPENED spot", () => {
    expect(alt).toMatch(/CANDIDATE_K\s*=\s*\d+/);
    // spot-anchored nearest-K (from the OPENED spot), never user-anchored.
    expect(alt).toMatch(/nearbySpots\(spot, ALL_SPOTS, CANDIDATE_K\)/);
  });

  it("reuses the calm-window bar, never a new fetch or a second definition", () => {
    expect(alt).not.toMatch(/api\.weather\.gov/);
    expect(alt).not.toMatch(/\bfetch\(/);
    expect(read("../lib/goodToday.ts")).toMatch(/evaluateGoodWindow/);
  });

  it("fires the dwell-gated alt_suggested_shown and per-row alt_clicked", () => {
    expect(alt).toMatch(/useGenuineView/);
    expect(alt).toMatch(/trackIntent\(["']alt_suggested_shown["']/);
    expect(alt).toMatch(/trackIntent\(["']alt_clicked["']/);
    // the click opens the alternative via the threaded select handler
    expect(alt).toMatch(/onSelectSpot\?\.\(alt\)/);
  });

  it("shows the eyebrow and the honest lead line verbatim, no em dash", () => {
    expect(alt).toContain("Go here instead");
    expect(alt).toContain("No calm window left here today. Try one of these:");
    expect(alt).not.toContain("—");
  });

  it("hides entirely when the opened spot is fine or nothing nearby is calm", () => {
    expect(alt).toMatch(/if \(!shouldShow\) return null/);
    expect(alt).toMatch(/blownOut && alternatives\.length > 0/);
  });
});

describe("Drawer wiring (item 8)", () => {
  it("renders the block between Today's shape and Looking ahead, above the disclaimer", () => {
    const shape = panel.indexOf("<TodaysShapePanel");
    const near = panel.indexOf("<NearbyAlternatives");
    const next = panel.indexOf("<NextGoodWindowPanel");
    const disclaimer = panel.indexOf("Guidance only, not a safety guarantee");
    expect(shape).toBeGreaterThan(-1);
    expect(near).toBeGreaterThan(shape);
    expect(next).toBeGreaterThan(near);
    expect(disclaimer).toBeGreaterThan(next);
  });

  it("threads a select handler so a tap-through opens the alternative, and resets scroll on swap", () => {
    expect(drawer).toMatch(/onSelectSpot/);
    expect(drawer).toMatch(/panelRef\.current\?\.scrollTo\(\{ top: 0 \}\)/);
  });
});
