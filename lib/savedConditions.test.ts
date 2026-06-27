import { describe, it, expect } from "vitest";
import type { Spot } from "@/lib/types";
import { paddleabilityRank, rankSavedSpotsByConditions } from "@/lib/savedConditions";

function spot(id: number, water: string): Spot {
  // Only the fields the ranking touches need to be real; cast the rest.
  return { id, water } as Spot;
}

describe("paddleabilityRank", () => {
  it("orders calm < breezy < windy < unknown < loading", () => {
    expect(paddleabilityRank("calm")).toBeLessThan(paddleabilityRank("breezy"));
    expect(paddleabilityRank("breezy")).toBeLessThan(paddleabilityRank("windy"));
    expect(paddleabilityRank("windy")).toBeLessThan(paddleabilityRank("unknown"));
    expect(paddleabilityRank("unknown")).toBeLessThan(paddleabilityRank("loading"));
  });
});

describe("rankSavedSpotsByConditions", () => {
  it("sorts calm-first and keeps input order within a tie", () => {
    const spots = [spot(1, "A"), spot(2, "B"), spot(3, "C"), spot(4, "D")];
    const condBySpot = { 1: "windy", 2: "calm", 3: "calm", 4: "breezy" } as const;
    const ranked = rankSavedSpotsByConditions(spots, condBySpot);
    expect(ranked.map((s) => s.id)).toEqual([2, 3, 4, 1]);
  });

  it("treats a missing spot id as loading and sinks it to the bottom", () => {
    const spots = [spot(1, "A"), spot(2, "B")];
    const condBySpot = { 2: "calm" } as Record<number, "calm">;
    const ranked = rankSavedSpotsByConditions(spots, condBySpot);
    expect(ranked.map((s) => s.id)).toEqual([2, 1]);
  });

  it("does not mutate the input array", () => {
    const spots = [spot(1, "A"), spot(2, "B")];
    const condBySpot = { 1: "windy", 2: "calm" } as const;
    rankSavedSpotsByConditions(spots, condBySpot);
    expect(spots.map((s) => s.id)).toEqual([1, 2]);
  });
});
