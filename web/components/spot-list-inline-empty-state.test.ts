import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = fs.readFileSync(path.resolve(__dirname, "SpotList.tsx"), "utf-8");

describe("SpotList zero-match state", () => {
  it("shows an accessible inline empty state for zero incoming matches with pinned content", () => {
    expect(source).toContain(
      "spots.length === 0 && (savedSpots.length > 0 || recentSpots.length > 0)",
    );
    expect(source).not.toContain(
      "mainSpots.length === 0 && (savedSpots.length > 0 || recentSpots.length > 0)",
    );

    const recentSection = source.indexOf("Recently checked (item 26)");
    const inlineState = source.indexOf("Inline zero-match state");
    const legalFooter = source.indexOf("The FULL-SIZE copy of the legal links");
    expect(recentSection).toBeLessThan(inlineState);
    expect(inlineState).toBeLessThan(legalFooter);

    expect(source.match(/role="status"/g)).toHaveLength(2);
    expect(source.match(/aria-live="polite"/g)).toHaveLength(2);
    expect(source.match(/aria-atomic="true"/g)).toHaveLength(2);
    expect(source.match(/min-h-11/g)).toHaveLength(2);
    expect(source.match(/focus-visible:outline /g)).toHaveLength(2);
  });
});
