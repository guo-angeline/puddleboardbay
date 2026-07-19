import { describe, it, expect } from "vitest";
import type { Spot } from "@/lib/types";
import type { Conditions } from "@/lib/conditions";
import { paddleabilityRank, rankSavedSpotsByConditions, fetchSavedConditions } from "@/lib/savedConditions";

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

function conditions(paddleability: "calm" | "breezy" | "windy" | null): Conditions {
  return {
    tide: null,
    wind: paddleability
      ? { speedMin: 0, speedMax: 5, direction: "W", shortForecast: "x", periodName: "Today", paddleability }
      : null,
    failed: paddleability === null,
    fetchedAt: 0,
  };
}

describe("fetchSavedConditions", () => {
  it("maps each spot id to its paddleability", async () => {
    const spots = [
      { id: 1, lat: 1, lng: 1, tide_sensitive: false } as Spot,
      { id: 2, lat: 2, lng: 2, tide_sensitive: true } as Spot,
    ];
    const get = async (id: number) => conditions(id === 1 ? "calm" : "windy");
    const map = await fetchSavedConditions(spots, get);
    expect(map).toEqual({ 1: "calm", 2: "windy" });
  });

  it("falls back to unknown when wind is missing", async () => {
    const spots = [{ id: 7, lat: 0, lng: 0, tide_sensitive: false } as Spot];
    const get = async () => conditions(null);
    expect(await fetchSavedConditions(spots, get)).toEqual({ 7: "unknown" });
  });

  it("falls back to unknown when a fetch rejects, without failing the batch", async () => {
    const spots = [
      { id: 1, lat: 0, lng: 0, tide_sensitive: false } as Spot,
      { id: 2, lat: 0, lng: 0, tide_sensitive: false } as Spot,
    ];
    const get = async (id: number) => {
      if (id === 1) throw new Error("network");
      return conditions("calm");
    };
    expect(await fetchSavedConditions(spots, get)).toEqual({ 1: "unknown", 2: "calm" });
  });
});
