import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const read = (p: string) => fs.readFileSync(path.resolve(__dirname, p), "utf-8");
const banner = read("MapColdOpenBanner.tsx");
const home = read("HomeClient.tsx");

describe("Mobile map cold-open banner (item 120)", () => {
  it("is gated behind its own kill switch, default ON, and is mobile-only", () => {
    expect(banner).toMatch(/useKillSwitch\(["']map-cold-open-banner["']\)/);
    expect(banner).toMatch(/md:hidden/);
  });

  it("shows the value prop by default (unblocked on any fetch) and swaps to good-today", () => {
    expect(banner).toContain("Paddleboard & kayak spots across California");
    expect(banner).toContain("Good today: ");
    // the value prop is a plain string, not derived from goodToday data
    expect(banner).toMatch(/const VALUE_PROP = /);
  });

  it("co-renders the canonical safety caveat with the good-today claim only", () => {
    expect(banner).toContain("Guidance only, not a safety guarantee. Conditions shift fast on the water.");
    // caveat is gated on the good-today variant (good && ...), not the value prop
    expect(banner).toMatch(/good && \(/);
  });

  it("drives the badge from the spot's live paddleability, never hardcoded", () => {
    expect(banner).toMatch(/state=\{good\.signal\.nowPaddleability\}/);
    expect(banner).not.toMatch(/state=\{["']calm["']\}/);
  });

  it("dismiss is session-scoped, not permanent", () => {
    expect(banner).toMatch(/sessionStorage\.setItem\(DISMISS_KEY/);
    expect(banner).not.toMatch(/localStorage/);
  });

  it("logs a SYSTEM loaded, an INTENT click (source map_banner) and dismiss", () => {
    expect(banner).toMatch(/trackSystem\(["']map_banner_loaded["']/);
    expect(banner).toMatch(/trackIntent\(["']map_banner_clicked["']/);
    expect(banner).toMatch(/trackIntent\(["']map_banner_dismissed["']/);
    expect(banner).toMatch(/onSelect\(good\.spot, ["']map_banner["']\)/);
  });

  it("carries no em dash", () => {
    expect(banner).not.toContain(String.fromCharCode(0x2014));
  });

  it("HomeClient renders it only on the mobile map tab with a non-empty result set", () => {
    expect(home).toMatch(/activeTab === "map" && sortedFiltered\.length > 0 && \(\s*<MapColdOpenBanner/);
    expect(home).toMatch(/topSpot=\{goodTodaySpots\[0\] \?\? null\}/);
  });
});
