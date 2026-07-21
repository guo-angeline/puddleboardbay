import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Item 43: the crowd rating shown in the list and the spot sheet.
 *
 * MIN_REVIEWS is the legally cleared threshold from D24: show a crowd rating
 * only past a handful of genuine moderated reviews, as a plain arithmetic fact.
 * Below it, a "4.0 average" off one review is noise that reads as a verdict, and
 * on a site carrying drowning-risk exposure an average that looks like a safety
 * judgement is the thing to avoid. Spots under the threshold are simply absent
 * from the payload, so the caller renders the owner's own rating instead.
 */
export const MIN_REVIEWS_FOR_AGGREGATE = 5;

export interface SpotAggregate {
  avg: number;
  count: number;
}

export async function GET() {
  const db = getSupabaseAdmin();
  // Published rows only. At this volume one sweep is far cheaper than a
  // per-spot query, and the payload is empty until a spot clears the threshold.
  const { data, error } = await db
    .from("spot_reviews")
    .select("spot_id, rating")
    .eq("status", "published");

  if (error) return NextResponse.json({ error: "db" }, { status: 500 });

  const totals = new Map<number, { sum: number; count: number }>();
  for (const row of data ?? []) {
    const t = totals.get(row.spot_id) ?? { sum: 0, count: 0 };
    t.sum += row.rating;
    t.count += 1;
    totals.set(row.spot_id, t);
  }

  const aggregates: Record<number, SpotAggregate> = {};
  for (const [spotId, t] of totals) {
    if (t.count < MIN_REVIEWS_FOR_AGGREGATE) continue;
    // One decimal, a plain arithmetic fact. Never rounded up to flatter a spot.
    aggregates[spotId] = { avg: Math.round((t.sum / t.count) * 10) / 10, count: t.count };
  }

  return NextResponse.json(
    { aggregates },
    // Cheap and non-critical; a minute of staleness is fine and keeps the list
    // render off the database on every load.
    { headers: { "cache-control": "public, s-maxage=60, stale-while-revalidate=300" } }
  );
}
