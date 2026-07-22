import { describe, it, expect } from "vitest";
import { displayRating, OWNER_WEIGHT, MIN_REVIEWS_WITHOUT_PRIOR } from "./rating";

describe("the displayed score blends the owner's prior with user reviews", () => {
  it("weights the owner's rating as exactly 5 user reviews", () => {
    expect(OWNER_WEIGHT).toBe(5);
  });

  it("shows the owner's rating alone when nobody has reviewed", () => {
    expect(displayRating(4.2, undefined)).toEqual({ value: 4.2, count: 0, blended: false });
    expect(displayRating(4.2, { sum: 0, count: 0 })).toEqual({ value: 4.2, count: 0, blended: false });
  });

  it("computes (5*owner + sum) / (5 + count)", () => {
    // owner 4.0, one 5-star -> (20 + 5) / 6 = 4.166…
    expect(displayRating(4.0, { sum: 5, count: 1 })).toEqual({ value: 4.2, count: 1, blended: true });
    // owner 4.0, ten 5-stars -> (20 + 50) / 15 = 4.66…
    expect(displayRating(4.0, { sum: 50, count: 10 })).toEqual({ value: 4.7, count: 10, blended: true });
  });

  it("damps a lone bad review instead of letting it read as a verdict", () => {
    // The whole reason the 5-review threshold could be dropped: one 1-star
    // moves a 4.0 spot to 3.5, not to 1.0. If this ever stops holding, the
    // safety rationale D24 was cleared on is gone.
    expect(displayRating(4.0, { sum: 1, count: 1 })!.value).toBe(3.5);
  });

  it("lets the crowd overtake the prior as reviews accumulate", () => {
    // 5 reviews in, the crowd carries half the weight; by 45 it dominates.
    expect(displayRating(2.0, { sum: 25, count: 5 })!.value).toBe(3.5);
    expect(displayRating(2.0, { sum: 225, count: 45 })!.value).toBe(4.7);
  });

  it("never moves outside the two inputs it blends", () => {
    for (const owner of [1, 2.5, 3.7, 5]) {
      for (const [sum, count] of [[5, 1], [12, 3], [40, 20], [100, 20]] as const) {
        const avg = sum / count;
        const { value } = displayRating(owner, { sum, count })!;
        expect(value).toBeGreaterThanOrEqual(Math.min(owner, avg) - 0.05);
        expect(value).toBeLessThanOrEqual(Math.max(owner, avg) + 0.05);
      }
    }
  });

  it("reports one decimal, rounded, never inflated", () => {
    // (5*4.0 + 4.4) / 6 = 4.066… -> 4.1, not 4.07 and not 4.2
    expect(displayRating(4.0, { sum: 4.4, count: 1 })!.value).toBe(4.1);
  });
});

describe("spots with no owner rating keep D24's threshold", () => {
  it("shows nothing below the threshold, since no prior damps a lone review", () => {
    expect(displayRating(null, { sum: 1, count: 1 })).toBeNull();
    expect(displayRating(undefined, { sum: 16, count: 4 })).toBeNull();
    expect(MIN_REVIEWS_WITHOUT_PRIOR).toBe(5);
  });

  it("shows a plain arithmetic average once the threshold is cleared", () => {
    expect(displayRating(null, { sum: 21, count: 5 })).toEqual({ value: 4.2, count: 5, blended: false });
  });

  it("shows nothing at all for a spot with neither rating nor reviews", () => {
    expect(displayRating(null, undefined)).toBeNull();
  });
});
