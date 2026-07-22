"use client";

import { useEffect, useState } from "react";

/**
 * Item 83: the spot ids the signed-in account has reported on, so the list can
 * mark them quietly. Shape and caching follow `useReviewAggregates`: one fetch
 * for the whole app through a module-level promise, because the list renders
 * ~139 cards and a per-card request would be absurd.
 *
 * Keyed by user id so signing out, or signing in as someone else, cannot serve
 * the previous account's set from cache.
 */
let cachedFor: string | null = null;
let cache: Set<number> = new Set();
let inFlight: Promise<Set<number>> | null = null;

function load(userId: string): Promise<Set<number>> {
  if (cachedFor === userId) return Promise.resolve(cache);
  if (inFlight) return inFlight;
  inFlight = fetch("/api/account")
    .then((r) => (r.ok ? r.json() : { reviews: [] }))
    .then((j: { reviews?: { spotId: number }[] }) => {
      cache = new Set((j.reviews ?? []).map((r) => r.spotId));
      cachedFor = userId;
      return cache;
    })
    .catch(() => {
      // A failed lookup just means no marks in the list. Never break the list.
      cache = new Set();
      cachedFor = userId;
      return cache;
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

export function useOwnReports(userId: string | null): Set<number> {
  const [ids, setIds] = useState<Set<number>>(cachedFor === userId ? cache : new Set());
  useEffect(() => {
    if (!userId) return;
    let active = true;
    void load(userId).then((s) => {
      if (active) setIds(s);
    });
    return () => {
      active = false;
    };
  }, [userId]);
  return userId ? ids : new Set();
}
