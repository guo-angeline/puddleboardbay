"use client";

import { useEffect, useState } from "react";
import type { Spot } from "@/lib/types";
import { getHourlyPeriods } from "@/lib/nextWindow";
import { evaluateGoodToday, selectGoodToday, type GoodTodayEntry, type GoodTodaySignal } from "@/lib/goodToday";

const UNKNOWN: GoodTodaySignal = { goodToday: false, nowPaddleability: "unknown", window: null };

/**
 * Item 8. Resolve ONE spot's good-today signal, to decide whether the opened
 * spot is "blown out" (no calm window left today) and should offer alternatives.
 * Rides the same shared `getHourlyPeriods` cache the drawer's NextGoodWindowPanel
 * already fills for this spot, so it costs no extra fetch. `signal` is null until
 * resolved for the current spot; `loading` follows the resolved-id pattern (no
 * synchronous setState in the effect body).
 */
export function useGoodTodaySignal(
  spot: Spot,
  enabled = true
): { signal: GoodTodaySignal | null; loading: boolean } {
  const [signal, setSignal] = useState<GoodTodaySignal | null>(null);
  const [resolvedId, setResolvedId] = useState<number | null>(null);
  const loading = enabled && resolvedId !== spot.id;

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    const now = Date.now();
    getHourlyPeriods(spot.id, spot.lat, spot.lng)
      .then((r) => {
        if (!alive) return;
        setSignal(r.ok ? evaluateGoodToday(r.periods, now) : UNKNOWN);
        setResolvedId(spot.id);
      })
      .catch(() => {
        if (!alive) return;
        setSignal(UNKNOWN);
        setResolvedId(spot.id);
      });
    return () => {
      alive = false;
    };
  }, [enabled, spot.id, spot.lat, spot.lng]);

  return { signal: resolvedId === spot.id ? signal : null, loading };
}

/**
 * Item 61. Resolve "good to paddle today" for a BOUNDED candidate set and return
 * the top `limit` worth surfacing. Each candidate costs one hourly fetch via the
 * shared `getHourlyPeriods` cache (same payload the drawer's next-good-window /
 * today's-shape use), so this never fans out per-signal or beyond the candidate
 * set. Refetches only when the candidate id set changes (joined-id key), not on
 * every render; distance is applied at SELECTION time so a geolocation grant
 * re-ranks the already-fetched set without refetching.
 *
 * `loading` follows the useSpotConditions pattern (resolvedKey vs idsKey) so
 * there is no synchronous setState in the effect body.
 */
interface Resolved {
  signal: GoodTodaySignal;
  /** Whether the hourly fetch itself succeeded, to tell "checked, none calm"
   * (some ok, none good) apart from "check failed" (every candidate errored). */
  fetchOk: boolean;
}

export function useGoodTodaySpots(
  candidates: Spot[],
  distanceMap: Record<number, number> | undefined,
  enabled = true,
  limit = 3
): { spots: GoodTodayEntry[]; loading: boolean; failed: boolean } {
  const [resolvedBySpot, setResolvedBySpot] = useState<Record<number, Resolved>>({});
  const [resolvedKey, setResolvedKey] = useState<string | null>(null);
  const idsKey = candidates.map((s) => s.id).sort((a, b) => a - b).join(",");
  const loading = enabled && candidates.length > 0 && resolvedKey !== idsKey;

  useEffect(() => {
    if (!enabled || candidates.length === 0) return;
    let alive = true;
    const now = Date.now();
    Promise.all(
      candidates.map(async (s): Promise<[number, Resolved]> => {
        try {
          const r = await getHourlyPeriods(s.id, s.lat, s.lng);
          return [s.id, r.ok ? { signal: evaluateGoodToday(r.periods, now), fetchOk: true } : { signal: UNKNOWN, fetchOk: false }];
        } catch {
          return [s.id, { signal: UNKNOWN, fetchOk: false }];
        }
      })
    ).then((pairs) => {
      if (!alive) return;
      setResolvedBySpot(Object.fromEntries(pairs));
      setResolvedKey(idsKey);
    });
    return () => {
      alive = false;
    };
    // idsKey + enabled are the only inputs that should retrigger the fetch;
    // distance is applied below, at selection time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey, enabled]);

  const resolvedForSet = candidates.map((s) => resolvedBySpot[s.id]).filter(Boolean) as Resolved[];
  const entries: GoodTodayEntry[] = candidates
    .filter((s) => resolvedBySpot[s.id])
    .map((s) => ({ spot: s, signal: resolvedBySpot[s.id].signal, distanceMi: distanceMap?.[s.id] }));
  const spots = enabled ? selectGoodToday(entries, limit) : [];
  // Failed only when every candidate's fetch errored (never when they simply are
  // not calm), so the honest "couldn't check" line never masks a real "nothing
  // calm" answer.
  const failed =
    enabled &&
    !loading &&
    resolvedForSet.length > 0 &&
    resolvedForSet.every((r) => !r.fetchOk);
  return { spots, loading, failed };
}
