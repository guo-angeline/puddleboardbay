import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Item 43: published-review totals for the list and the spot sheet.
 *
 * This route returns RAW totals (sum + count), not an average, and applies no
 * threshold. That is deliberate as of the 2026-07-21 owner direction: the
 * displayed number is now a weighted blend of the owner's rating with the user
 * reviews, and a pre-averaged, pre-thresholded payload cannot be blended (the
 * sum is unrecoverable from a rounded average, and a spot withheld below the
 * threshold has no reviews to blend at all).
 *
 * The display policy that used to live here, including D24's threshold for
 * spots with no owner rating to fall back on, now lives in `lib/rating.ts` so
 * there is exactly one place deciding what number a reader sees.
 *
 * (Note since item 79: star-only ratings feed these totals without human
 * review; written reviews are still held for moderation.)
 */

export interface SpotAggregate {
  /** Sum of published ratings. Blend with the owner prior via lib/rating. */
  sum: number;
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
    aggregates[spotId] = { sum: t.sum, count: t.count };
  }

  return NextResponse.json(
    { aggregates },
    // Cheap and non-critical; a minute of staleness is fine and keeps the list
    // render off the database on every load.
    { headers: { "cache-control": "public, s-maxage=60, stale-while-revalidate=300" } }
  );
}
