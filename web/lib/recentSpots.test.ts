import { describe, it, expect } from "vitest";
import { nextRecentIds } from "./recentSpots";

describe("nextRecentIds (item 26 recently-checked)", () => {
  it("puts the just-viewed spot first", () => {
    expect(nextRecentIds([2, 3], 1)).toEqual([1, 2, 3]);
  });

  it("dedups: re-viewing moves it to front, no duplicate", () => {
    expect(nextRecentIds([1, 2, 3], 3)).toEqual([3, 1, 2]);
  });

  it("caps the list at max, dropping the oldest", () => {
    expect(nextRecentIds([1, 2, 3], 4, 3)).toEqual([4, 1, 2]);
  });

  it("is a no-op-shaped identity when re-viewing the current head", () => {
    expect(nextRecentIds([1, 2, 3], 1)).toEqual([1, 2, 3]);
  });
});
