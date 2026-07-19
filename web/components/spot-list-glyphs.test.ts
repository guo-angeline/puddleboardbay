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

  // Source-containment checks only: the ♥ nudge renders in the !isStandalone
  // branch and the label assertion guards against deleting the button text,
  // not against re-adding the 🔔 (the not.toContain above does that).
  it("SpotList.tsx has no 🏄 or 🔔 glyphs; button label and ♥ nudge remain in source", () => {
    expect(spotListSrc).not.toContain("🏄");
    expect(spotListSrc).not.toContain("🔔");
    expect(spotListSrc).toContain("Turn on alerts");
    expect(spotListSrc).toContain("emptyState");
    expect(spotListSrc).toContain("♥");
  });

  it("HomeClient.tsx has no 🏄 glyph and uses the shared empty-state copy helper", () => {
    expect(homeClientSrc).not.toContain("🏄");
    expect(homeClientSrc).toContain("emptyStateCopy");
  });

  it("SpotCard.tsx retains the functional favorite toggle control", () => {
    expect(spotCardSrc).toContain("♥");
    expect(spotCardSrc).toContain("♡");
    expect(spotCardSrc).toContain("aria-pressed");
  });
});
