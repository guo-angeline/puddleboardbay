import { describe, it, expect } from "vitest";
import { launchDirectionTip } from "./launchDirection";

describe("launchDirectionTip", () => {
  it("names the upwind compass direction verbatim when wind qualifies", () => {
    expect(launchDirectionTip("WNW", 12)).toBe(
      "Head out toward the WNW so the wind helps push you back."
    );
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
