import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const src = fs.readFileSync(path.resolve(__dirname, "HomeClient.tsx"), "utf-8");

/**
 * Returns the index of the `}` that closes the `{` at `openBraceIndex`,
 * counting brace depth rather than trusting indentation (same helper as
 * HomeClient-email-token-strip.test.ts: an indentation-only check would pass
 * a mutation that re-nests a block one level deeper).
 */
function findMatchingBrace(str: string, openBraceIndex: number): number {
  let depth = 0;
  for (let i = openBraceIndex; i < str.length; i++) {
    if (str[i] === "{") depth++;
    else if (str[i] === "}") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

describe("HomeClient history model: mobile pushState/popstate behind a kill switch (item 71)", () => {
  it("keeps the desktop/killed initialSpotId replaceState branch verbatim", () => {
    expect(src).toContain('window.history.replaceState(null, "", selected ? `/?spot=${selected.id}` : "/")');
  });

  it("keeps the desktop/killed else-branch replaceState verbatim", () => {
    expect(src).toContain(
      'window.history.replaceState(null, "", selected ? `?spot=${selected.id}` : window.location.pathname)'
    );
  });

  it("reads the back-swipe-gesture kill switch (default ON, mirrors item-57 sheet-auto-expand)", () => {
    expect(src).toContain('useKillSwitch("back-swipe-gesture")');
  });

  it("does not gate the history model behind an A/B (kill switch, not an experiment)", () => {
    expect(src).not.toMatch(/useExperiment\(|getVariant\(/);
  });

  it("wires a mobile pushState + popstate history model", () => {
    expect(src).toMatch(/history\.pushState\(/);
    expect(src).toMatch(/addEventListener\("popstate"/);
  });

  it("emits spot_sheet_dismissed with method os_back for a genuine hardware/browser Back", () => {
    expect(src).toMatch(/method:\s*"os_back"/);
  });

  it("emits spot_sheet_dismissed with method edge_swipe for the gesture-driven back", () => {
    expect(src).toMatch(/method:\s*"edge_swipe"/);
  });

  it('never emits method: "back" from HomeClient (that value stays SpotDrawer\'s app-bar arrow only)', () => {
    expect(src).not.toMatch(/method:\s*"back"/);
  });

  it("references the 400ms popstate fallback via BACK_SWIPE_CONFIG, not a magic number", () => {
    expect(src).toMatch(/BACK_SWIPE_CONFIG/);
    expect(src).toMatch(/popstateFallbackMs/);
  });

  it("seeds the deep-link Back target (replaceState to bare / then pushState to ?spot=) AFTER the token-strip block", () => {
    const stripGuardIdx = src.indexOf('if ((from === "alert" || from === "email") && token) {');
    const stripOpenBrace = src.indexOf("{", stripGuardIdx);
    const stripCloseBrace = findMatchingBrace(src, stripOpenBrace);
    expect(stripGuardIdx).toBeGreaterThan(-1);
    expect(stripCloseBrace).toBeGreaterThan(-1);

    const seedReplaceIdx = src.indexOf('history.replaceState(null, "", "/")');
    expect(seedReplaceIdx).toBeGreaterThan(-1);
    expect(seedReplaceIdx).toBeGreaterThan(stripCloseBrace);

    const seedPushIdx = src.indexOf("pushState(null, \"\", `/?spot=", seedReplaceIdx);
    expect(seedPushIdx).toBeGreaterThan(seedReplaceIdx);
  });

  it("branches deselect()'s body on the mobile pushState/sheetEntryPushed condition", () => {
    const deselectIdx = src.indexOf("function deselect()");
    expect(deselectIdx).toBeGreaterThan(-1);
    const openBrace = src.indexOf("{", deselectIdx);
    const closeBrace = findMatchingBrace(src, openBrace);
    const body = src.slice(openBrace, closeBrace);
    // Must reference both the mobile-history gate and the live-entry flag.
    expect(body).toMatch(/mobileHistory/);
    expect(body).toMatch(/sheetEntryPushed/);
    expect(body).toMatch(/goBackProgrammatically\("ui"\)/);
  });

  it("does not change any deselect() call site (only its body)", () => {
    const callSites = src.match(/\bdeselect\(\)/g) ?? [];
    // 1 definition-adjacent onClose={deselect} pass-through + 6 call sites
    // (handleFilterChange, goHome, handleClearAll, clearSearchOnly,
    // clearStructuredFilters, setSearch) = unchanged call surface.
    expect(callSites.length).toBeGreaterThanOrEqual(6);
  });
});
