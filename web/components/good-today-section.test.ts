import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const read = (p: string) => fs.readFileSync(path.resolve(__dirname, p), "utf-8");
const spotList = read("SpotList.tsx");
const home = read("HomeClient.tsx");
const hook = read("useGoodToday.ts");

describe("Good-to-paddle-today wiring (item 61)", () => {
  it("is gated behind the good-today kill switch, default ON", () => {
    expect(home).toMatch(/useKillSwitch\(["']good-today["']\)/);
  });

  it("requires real location and bounds the candidate fan-out (nearest-K)", () => {
    expect(home).toMatch(/GOOD_TODAY_K\s*=\s*\d+/);
    expect(home).toMatch(/\.slice\(0, GOOD_TODAY_K\)/);
    expect(home).toMatch(/if \(!goodTodayEnabled \|\| !userLocation\) return \[\]/);
    expect(home).not.toMatch(/GOOD_TODAY_ANCHOR/);
  });

  it("dedups good-today spots out of the main list", () => {
    expect(spotList).toMatch(/goodTodayIdSet/);
    expect(spotList).toMatch(/!goodTodayIdSet\.has\(s\.id\)/);
  });

  it("fires the dwell-gated good_today_shown and per-row good_today_clicked", () => {
    expect(spotList).toMatch(/useGenuineView/);
    expect(spotList).toMatch(/trackIntent\(["']good_today_shown["']/);
    expect(spotList).toMatch(/trackIntent\(["']good_today_clicked["']/);
  });

  it("renders the section label and both honest empty/failed states, verbatim", () => {
    expect(spotList).toContain("Good to paddle today");
    expect(spotList).toContain("Nothing&rsquo;s calm nearby right now. Browse spots below.");
    expect(spotList).toContain("Couldn&rsquo;t check conditions right now. Browse spots below.");
  });

  it("co-renders the canonical safety caveat with the affirmative header (item 61 lawyer gate)", () => {
    expect(spotList).toContain("Guidance only, not a safety guarantee. Conditions shift fast on the water.");
  });

  it("hides the section when there is nothing to check (empty candidate set)", () => {
    // A heavy repeat user whose K nearest are all saved/recent leaves no
    // candidate; the section must not claim "nothing calm" for an unchecked set.
    expect(spotList).toMatch(/goodTodayEnabled && goodTodayHasCandidates/);
  });

  it("surfaces from the shared hourly cache and the calm-window bar, not a new fetch or a second definition", () => {
    expect(hook).toMatch(/getHourlyPeriods/);
    expect(hook).not.toMatch(/api\.weather\.gov/);
    expect(hook).not.toMatch(/\bfetch\(/);
    // The good-enough bar is evaluateGoodWindow (via evaluateGoodToday), reused.
    expect(read("../lib/goodToday.ts")).toMatch(/evaluateGoodWindow/);
  });

  it("carries no em dash in any new file", () => {
    const emDash = String.fromCharCode(0x2014); // escaped so a repo em-dash grep never false-matches this guard
    expect(hook).not.toContain(emDash);
    expect(read("../lib/goodToday.ts")).not.toContain(emDash);
  });
});
