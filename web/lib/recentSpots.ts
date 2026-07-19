/**
 * Recently-viewed spot ids, kept in localStorage so a cold open can show a
 * personal "Recently checked" strip (ROADMAP item 26). Client-only; no network,
 * no account. Most-recent-first, deduped, capped. We store a few more than the
 * strip shows so that de-duping against the "Watching" section still leaves
 * enough to render.
 */

const KEY = "ptw-recent";
const MAX_STORED = 12;

/**
 * Pure core: the new recent-id list after viewing `id`. Most-recent-first,
 * `id` moved to front (deduped), capped at `max`. Extracted so it's testable
 * without localStorage.
 */
export function nextRecentIds(current: number[], id: number, max: number = MAX_STORED): number[] {
  return [id, ...current.filter((x) => x !== id)].slice(0, max);
}

/** Recently-viewed spot ids, most-recent-first. Safe on the server / private mode. */
export function getRecentSpotIds(): number[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x): x is number => typeof x === "number") : [];
  } catch {
    return [];
  }
}

/** Record a spot as just viewed. No-ops on the server or if storage is unavailable. */
export function recordRecentSpot(id: number): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(nextRecentIds(getRecentSpotIds(), id)));
  } catch {
    /* quota / private mode: recents are a nicety, never break the app for them */
  }
}
