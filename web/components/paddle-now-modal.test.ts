import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const read = (p: string) => fs.readFileSync(path.resolve(__dirname, p), "utf-8");
const modal = read("PaddleNowModal.tsx");
const home = read("HomeClient.tsx");

describe("PaddleNowModal (item 137)", () => {
  it("uses the owner-specified title and both lead variants verbatim", () => {
    expect(modal).toContain("Want to paddle now?");
    expect(modal).toContain("Spots near you are good to go.");
    expect(modal).toContain("These spots are good to go right now.");
  });

  it("co-renders the canonical safety caveat verbatim", () => {
    expect(modal).toContain("Guidance only, not a safety guarantee. Conditions shift fast on the water.");
    expect(modal).not.toContain("—");
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
    // spot tap opens the spot
    expect(modal).toMatch(/onSelectSpot\(entry\.spot\)/);
  });
});

describe("HomeClient paddle-now gating (item 137)", () => {
  it("is behind the paddle-now kill switch", () => {
    expect(home).toMatch(/useKillSwitch\(["']paddle-now["']\)/);
  });

  it("never mounts on a deep-link arrival (home page only)", () => {
    expect(home).toMatch(/initialSpotId !== undefined \|\| !!Number\(params\.get\("spot"\)/);
    expect(home).toMatch(/params\.get\("from"\)/);
  });

  it("SUPPRESSES the modal unless resolved with >=1 good-soon spot (never opens empty/loading)", () => {
    expect(home).toMatch(/const showPaddleNow = paddleNowGate && !paddleNowLoading && paddleNowSpots\.length > 0/);
  });
});
