import type { Spot } from "@/lib/types";
import type { Paddleability } from "@/lib/conditions";

/** UI state for a saved spot's conditions: a resolved read, or still loading. */
export type SavedConditionState = Paddleability | "loading";

const RANK: Record<SavedConditionState, number> = {
  calm: 0,
  breezy: 1,
  windy: 2,
  unknown: 3,
  loading: 4,
};

export function paddleabilityRank(state: SavedConditionState): number {
  return RANK[state];
}

/**
 * Sort saved spots calm-first for the "Your Spots" section. Returns a new array
 * (never mutates the input). Ties preserve input order because Array.sort is
 * stable. A spot id absent from condBySpot is still loading, so it sinks last.
 */
export function rankSavedSpotsByConditions(
  spots: Spot[],
  condBySpot: Record<number, SavedConditionState>
): Spot[] {
  return [...spots].sort(
    (a, b) =>
      paddleabilityRank(condBySpot[a.id] ?? "loading") -
      paddleabilityRank(condBySpot[b.id] ?? "loading")
  );
}
