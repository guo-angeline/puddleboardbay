import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const src = fs.readFileSync(
  path.resolve(__dirname, "ConditionsPanel.tsx"),
  "utf-8"
);

describe("conditions_interest enrollment trigger threshold (item 65)", () => {
  it("fires on the 3rd distinct dwell-viewed spot, not the 2nd", () => {
    // Item 65 (2026-07-18): 2 was too weak a signal and fired the prompt too
    // early on 86% of exposures. Guard against a silent revert to >= 2.
    expect(src).toMatch(/conditionsViewedSpots\.size\s*>=\s*3/);
    expect(src).not.toMatch(/conditionsViewedSpots\.size\s*>=\s*2/);
  });
});
