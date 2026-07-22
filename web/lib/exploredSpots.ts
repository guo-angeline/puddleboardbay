/**
 * Item 83: the set of spots this device has looked at CLOSELY, with the region
 * of each. Feeds the "Scouted" and "Around the bay" marks.
 *
 * Deliberately a sibling of `recentSpots.ts` rather than a change to it. That
 * module is capped at 12 by design (it backs a 6-item strip and needs headroom
 * for de-duping); this one is uncapped, because a log that forgets is not a log.
 * Two different jobs, two different stores.
 *
 * "Closely" means dwell-qualified: the caller records only after the same
 * IntersectionObserver + dwell gate that qualifies `conditions_viewed`
 * (`lib/useGenuineView.ts`). A scroll-past does not count. That gate is what
 * keeps this from being a tally of accidental taps, and it makes casual farming
 * cost real seconds per spot.
 *
 * Device-local, so it is forgeable by anyone willing to edit their own
 * localStorage, and lost when they clear it. Both are acceptable because marks
 * are private and confer nothing. Persisting server-side is staged for 25+
 * accounts, and it is the one piece of this feature that needs a migration.
 */

const KEY = "ptw-explored";

/** spot id -> region, so the region mark needs no lookup against spots.json. */
export type ExploredMap = Record<number, string>;

/** Pure core, testable without localStorage. Idempotent per spot. */
export function nextExplored(current: ExploredMap, id: number, region: string): ExploredMap {
  if (current[id] === region) return current;
  return { ...current, [id]: region };
}

export function getExplored(): ExploredMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: ExploredMap = {};
    for (const [k, v] of Object.entries(parsed)) {
      const id = Number(k);
      if (Number.isInteger(id) && typeof v === "string") out[id] = v;
    }
    return out;
  } catch {
    return {};
  }
}

/** Record a dwell-qualified look at a spot. Never call this on mount. */
export function recordExplored(id: number, region: string): void {
  if (typeof window === "undefined") return;
  try {
    const next = nextExplored(getExplored(), id, region);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* quota / private mode: the log is a nicety, never break the app for it */
  }
}

/** The regions of every explored spot, one entry per spot (duplicates kept). */
export function exploredRegions(map: ExploredMap = getExplored()): string[] {
  return Object.values(map);
}
