import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const src = fs.readFileSync(path.resolve(__dirname, "HomeClient.tsx"), "utf-8");
const drawerSrc = fs.readFileSync(path.resolve(__dirname, "SpotDrawer.tsx"), "utf-8");

describe("Mobile spot sheet opens full height for all opens (item 42, 100% per D13)", () => {
  it("ships unflagged: no experiment gate on the sheet height", () => {
    // Owner direction 2026-07-16 (D13, the D3/D6/D11 precedent): a single-digit
    // daily audience cannot power an A/B, so this ships at 100%. If someone
    // re-adds a flag here, that is a deliberate reversal, not a refactor.
    expect(src).not.toContain("spot_sheet_full_height");
    expect(src).not.toMatch(/useExperiment|getVariant/);
  });

  it("reuses the existing startExpanded prop instead of a parallel mechanism", () => {
    expect(src).toContain("startExpanded={startExpanded}");
    // SpotDrawer's prop surface is untouched: no second height-control prop.
    expect(drawerSrc).not.toMatch(/forceFullHeight|fullHeightFlag|spotSheetVariant/);
  });

  it("excludes alert and email arrivals from the expansion (item 9 exclusion preserved)", () => {
    // These carry the interstitial / ride the same deep-link shape, and a
    // force-expanded sheet layers badly under it.
    expect(src).toContain('from !== "alert" && from !== "email"');
  });

  it("keeps the share arrival unconditionally expanded (item 9)", () => {
    expect(src).toMatch(/from === "share"[\s\S]{0,500}setStartExpanded\(true\)/);
  });

  it("gates the expansion on the mobile breakpoint (desktop sidebar is unaffected)", () => {
    expect(src).toContain("(max-width: 767px)");
    expect(src).toContain("setStartExpanded(isMobileViewport())");
  });
});
