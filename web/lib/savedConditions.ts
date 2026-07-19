import type { Spot } from "@/lib/types";
import type { Conditions, Paddleability } from "@/lib/conditions";

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

export type ConditionsGetter = (
  spotId: number,
  lat: number,
  lng: number,
  tideSensitive: boolean
) => Promise<Conditions>;

/**
 * Fetch paddle-ability for every saved spot, in parallel. The getter is injected
 * so tests can run without the network; production passes lib/conditions
 * getConditions, which caches + dedupes per spot id. Resolves to a complete map;
 * any failure or missing wind degrades that spot to "unknown" rather than
 * rejecting the whole batch.
 */
export async function fetchSavedConditions(
  spots: Spot[],
  get: ConditionsGetter
): Promise<Record<number, Paddleability>> {
  const entries = await Promise.all(
    spots.map(async (s): Promise<[number, Paddleability]> => {
      try {
        const c = await get(s.id, s.lat, s.lng, s.tide_sensitive);
        return [s.id, c.wind?.paddleability ?? "unknown"];
      } catch {
        return [s.id, "unknown"];
      }
    })
  );
  return Object.fromEntries(entries);
}
