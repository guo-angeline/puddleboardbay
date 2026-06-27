"use client";

import { useEffect, useState } from "react";
import type { Spot } from "@/lib/types";
import type { Paddleability } from "@/lib/conditions";
import { getConditions } from "@/lib/conditions";
import { fetchSavedConditions } from "@/lib/savedConditions";

/**
 * Resolve paddle-ability for the user's saved spots. Refetches only when the
 * set of saved ids changes (joined-id key), not on every render. getConditions
 * is cached + deduped per spot id, so re-running is cheap.
 *
 * `loading` is derived from whether resolvedKey matches idsKey — this avoids
 * any synchronous setState in the effect body (which triggers the
 * react-hooks/set-state-in-effect lint rule).
 */
export function useSavedConditions(savedSpots: Spot[]): {
  condBySpot: Record<number, Paddleability>;
  loading: boolean;
} {
  const [condBySpot, setCondBySpot] = useState<Record<number, Paddleability>>({});
  // Tracks which idsKey we have resolved results for. null = never fetched.
  const [resolvedKey, setResolvedKey] = useState<string | null>(null);
  const idsKey = savedSpots.map((s) => s.id).sort((a, b) => a - b).join(",");
  // Loading while: we have spots but haven't resolved for this exact set yet.
  const loading = resolvedKey !== idsKey && savedSpots.length > 0;

  useEffect(() => {
    let alive = true;
    fetchSavedConditions(savedSpots, getConditions).then((map) => {
      if (!alive) return;
      setCondBySpot(map);
      setResolvedKey(idsKey);
    });
    return () => { alive = false; };
  // idsKey captures the only input that should retrigger the fetch.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey]);

  return { condBySpot, loading };
}
