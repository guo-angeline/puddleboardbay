"use client";

import { useEffect, useState } from "react";

export interface SpotAggregate {
  avg: number;
  count: number;
}
export type Aggregates = Record<number, SpotAggregate>;

// Item 43: crowd ratings for the list and the spot sheet.
//
// One fetch for the whole app, shared through a module-level promise, because
// the list renders ~139 cards and a per-card request would be absurd. The
// endpoint only returns spots that have cleared the 5-review threshold, so this
// payload is empty until a spot actually earns a crowd rating.
let cache: Aggregates | null = null;
let inFlight: Promise<Aggregates> | null = null;

function load(): Promise<Aggregates> {
  if (cache) return Promise.resolve(cache);
  if (inFlight) return inFlight;
  inFlight = fetch("/api/reviews/aggregates")
    .then((r) => (r.ok ? r.json() : { aggregates: {} }))
    .then((j: { aggregates?: Aggregates }) => {
      cache = j.aggregates ?? {};
      return cache;
    })
    .catch(() => {
      // A failed aggregate fetch must never break the list. Falling back to an
      // empty map simply means every spot shows the owner's rating instead.
      cache = {};
      return cache;
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

export function useReviewAggregates(): Aggregates {
  const [aggregates, setAggregates] = useState<Aggregates>(cache ?? {});
  useEffect(() => {
    let active = true;
    void load().then((a) => {
      if (active) setAggregates(a);
    });
    return () => {
      active = false;
    };
  }, []);
  return aggregates;
}
