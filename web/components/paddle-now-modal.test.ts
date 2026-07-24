import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const read = (p: string) => fs.readFileSync(path.resolve(__dirname, p), "utf-8");
const modal = read("PaddleNowModal.tsx");
const home = read("HomeClient.tsx");

describe("PaddleNowModal (item 137, location-first redesign)", () => {
  it("asks first with the owner's copy, then labels the results step", () => {
    expect(modal).toContain("Want to paddle today?");
    expect(modal).toContain("find spots near you where the wind and water are calm");
    expect(modal).toContain("Calm spots near you");
  });

  it("names the actual thing (calm conditions), never the old vague 'good to go'", () => {
    expect(modal).not.toContain("good to go");
  });

  it("co-renders the canonical safety caveat verbatim, in full", () => {
    expect(modal).toContain("Guidance only, not a safety guarantee. Conditions shift fast on the water.");
    expect(modal).not.toContain("—");
  });

  it("the ask step has a location button wired to onFindSpots", () => {
    expect(modal).toContain("Find calm spots near me");
    expect(modal).toMatch(/onClick=\{onFindSpots\}/);
  });

  it("is an accessible dialog: role=dialog, aria-modal, 44px close, Escape, focus trap", () => {
    expect(modal).toMatch(/role="dialog"/);
    expect(modal).toMatch(/aria-modal="true"/);
    expect(modal).toMatch(/h-11 w-11/); // 44px close target
    expect(modal).toMatch(/e\.key === "Escape"/);
    expect(modal).toMatch(/e\.key === "Tab"/); // trap
  });

  it("writes the once-per-day flag ON RENDER (not on eligibility resolution)", () => {
    expect(modal).toMatch(/localStorage\.setItem\(PADDLE_NOW_SEEN_KEY/);
    expect(modal).toMatch(/trackIntent\(["']paddle_now_shown["']/);
  });

  it("fires the click + dismiss events with method", () => {
    expect(modal).toMatch(/trackIntent\(["']paddle_now_spot_clicked["']/);
    expect(modal).toMatch(/trackIntent\(["']paddle_now_dismissed["'], \{ method/);
    expect(modal).toMatch(/onSelectSpot\(entry\.spot\)/);
  });
});

describe("HomeClient paddle-now gating (item 137, location-first redesign)", () => {
  it("is behind the paddle-now kill switch", () => {
    expect(home).toMatch(/useKillSwitch\(["']paddle-now["']\)/);
  });

  it("never mounts on a deep-link arrival (home page only)", () => {
    expect(home).toMatch(/initialSpotId !== undefined \|\| !!Number\(params\.get\("spot"\)/);
    expect(home).toMatch(/params\.get\("from"\)/);
  });

  it("ranks ONLY by real location, never a statewide anchor (the 'random nearest' bug)", () => {
    // candidates bail out entirely without a real userLocation, and rank by it.
    expect(home).toMatch(/if \(!paddleNowGate \|\| !userLocation\) return \[\];/);
    expect(home).toMatch(/distanceMiles\(userLocation, a\)/);
  });

  it("requests location on demand and records the outcome", () => {
    expect(home).toMatch(/function requestPaddleNowLocation\(\)/);
    expect(home).toMatch(/navigator\.geolocation\.getCurrentPosition/);
    expect(home).toMatch(/trackIntent\(["']paddle_now_located["'], \{ outcome: "granted" \}\)/);
    expect(home).toMatch(/trackIntent\(["']paddle_now_located["'], \{ outcome: "denied" \}\)/);
  });

  it("shows the modal on the once-per-day gate itself (primer), not gated on resolved spots", () => {
    expect(home).toMatch(/const showPaddleNow = paddleNowGate;/);
  });
});
