"use client";

import { useEffect, useState } from "react";
import type { Spot } from "@/lib/types";
import { getHourlyPeriods } from "@/lib/nextWindow";
import { evaluatePaddleNow, selectPaddleNow, type PaddleNowEntry, type PaddleNowSignal } from "@/lib/paddleNow";

const UNKNOWN: PaddleNowSignal = { goodToday: false, goodSoon: false, nowPaddleability: "unknown", window: null, windowStartMs: null };

/**
 * Item 137. Resolve "good to paddle in the next hour" for a BOUNDED candidate
 * set and return the top `limit` worth surfacing in the modal. Mirrors item 61's
 * useGoodTodaySpots: one hourly fetch per candidate through the shared
 * getHourlyPeriods cache (no per-signal doubling), refetch only when the
 * candidate id set changes, distance applied at selection time. The only
 * difference is the eligibility (evaluatePaddleNow's next-60-min horizon).
 */
export function usePaddleNowSpots(
  candidates: Spot[],
  distanceMap: Record<number, number> | undefined,
  enabled = true,
  limit = 3
): { spots: PaddleNowEntry[]; loading: boolean } {
  const [signalBySpot, setSignalBySpot] = useState<Record<number, PaddleNowSignal>>({});
  const [resolvedKey, setResolvedKey] = useState<string | null>(null);
  const idsKey = candidates.map((s) => s.id).sort((a, b) => a - b).join(",");
  const loading = enabled && candidates.length > 0 && resolvedKey !== idsKey;

  useEffect(() => {
    if (!enabled || candidates.length === 0) return;
    let alive = true;
    const now = Date.now();
    Promise.all(
      candidates.map(async (s): Promise<[number, PaddleNowSignal]> => {
        try {
          const r = await getHourlyPeriods(s.id, s.lat, s.lng);
          return [s.id, r.ok ? evaluatePaddleNow(r.periods, now) : UNKNOWN];
        } catch {
          return [s.id, UNKNOWN];
        }
      })
    ).then((pairs) => {
      if (!alive) return;
      setSignalBySpot(Object.fromEntries(pairs));
      setResolvedKey(idsKey);
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey, enabled]);

  const entries: PaddleNowEntry[] = candidates
    .filter((s) => signalBySpot[s.id])
    .map((s) => ({ spot: s, signal: signalBySpot[s.id], distanceMi: distanceMap?.[s.id] }));
  const spots = enabled ? selectPaddleNow(entries, limit) : [];
  return { spots, loading };
}
