import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const spotCardSrc = fs.readFileSync(path.resolve(__dirname, "SpotCard.tsx"), "utf-8");
const spotListSrc = fs.readFileSync(path.resolve(__dirname, "SpotList.tsx"), "utf-8");
const homeClientSrc = fs.readFileSync(path.resolve(__dirname, "HomeClient.tsx"), "utf-8");

describe("spot list glyph removal", () => {
  it("SpotCard.tsx has no amenity emoji glyphs or the Icons component", () => {
    expect(spotCardSrc).not.toContain("🐕");
    expect(spotCardSrc).not.toContain("🌊");
    expect(spotCardSrc).not.toContain("🚣");
    expect(spotCardSrc).not.toContain("⛵");
    expect(spotCardSrc).not.toContain("function Icons");
  });

  it("SpotList.tsx has no 🏄 or 🔔 glyphs but keeps its text and retained ♥ nudge", () => {
    expect(spotListSrc).not.toContain("🏄");
    expect(spotListSrc).not.toContain("🔔");
    expect(spotListSrc).toContain("Turn on alerts");
    expect(spotListSrc).toContain("No spots match your filters");
    expect(spotListSrc).toContain("♥");
  });

  it("HomeClient.tsx has no 🏄 glyph but keeps its empty-state copy", () => {
    expect(homeClientSrc).not.toContain("🏄");
    expect(homeClientSrc).toContain("No spots match your filters");
    expect(homeClientSrc).toContain("Clear filters");
  });

  it("SpotCard.tsx retains the functional favorite toggle control", () => {
    expect(spotCardSrc).toContain("♥");
    expect(spotCardSrc).toContain("♡");
    expect(spotCardSrc).toContain("aria-pressed");
  });
});
