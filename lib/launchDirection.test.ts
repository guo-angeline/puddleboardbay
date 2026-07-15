import { describe, it, expect } from "vitest";
import { launchDirectionTip } from "./launchDirection";

describe("launchDirectionTip", () => {
  it("names the upwind compass direction in full words when wind qualifies", () => {
    expect(launchDirectionTip("WNW", 12)).toBe(
      "Head out toward the west-northwest so the wind helps push you back."
    );
  });

  it("expands every 16-point compass abbreviation to words", () => {
    const cases: Record<string, string> = {
      N: "north", NNE: "north-northeast", NE: "northeast", ENE: "east-northeast",
      E: "east", ESE: "east-southeast", SE: "southeast", SSE: "south-southeast",
      S: "south", SSW: "south-southwest", SW: "southwest", WSW: "west-southwest",
      W: "west", WNW: "west-northwest", NW: "northwest", NNW: "north-northwest",
    };
    for (const [abbr, words] of Object.entries(cases)) {
      expect(launchDirectionTip(abbr, 12)).toBe(
        `Head out toward the ${words} so the wind helps push you back.`
      );
    }
  });

  it("returns null when wind is under 5 mph", () => {
    expect(launchDirectionTip("WNW", 4)).toBeNull();
  });

  it("returns null when wind is undefined", () => {
    expect(launchDirectionTip("WNW", undefined)).toBeNull();
  });

  it("returns null when direction is empty", () => {
    expect(launchDirectionTip("", 12)).toBeNull();
  });

  it("returns null when direction is undefined", () => {
    expect(launchDirectionTip(undefined, 12)).toBeNull();
  });

  it("returns null when direction is 'variable' (lowercase)", () => {
    expect(launchDirectionTip("variable", 12)).toBeNull();
  });

  it("returns null when direction is 'VRB'", () => {
    expect(launchDirectionTip("VRB", 12)).toBeNull();
  });

  it("returns null when direction is 'Variable' (mixed case)", () => {
    expect(launchDirectionTip("Variable", 12)).toBeNull();
  });

  it("never contains an em dash", () => {
    const tip = launchDirectionTip("WNW", 12);
    expect(tip).not.toContain("—");
  });
});
