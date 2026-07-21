import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { getRequestUserId, getServerAuthSupabase } from "@/lib/supabase/server-auth";
import { validateReviewSubmit } from "@/lib/reviews/validation";
import { composeReviewModerationEmail } from "@/lib/email/templates";
import { sendOperatorEmail } from "@/lib/email/sender";
import { ALL_SPOTS } from "@/lib/spots";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODERATOR_EMAIL = "hello@paddletowater.com";

/**
 * GET /api/reviews?spot_id=N
 * PUBLISHED reviews for one spot. Never returns pending or rejected rows, and
 * never returns a user_id: the byline is the denormalised display_name only.
 */
export async function GET(req: Request) {
  const spotId = Number(new URL(req.url).searchParams.get("spot_id"));
  if (!Number.isInteger(spotId) || spotId <= 0) {
    return NextResponse.json({ error: "spot_id required" }, { status: 400 });
  }

  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("spot_reviews")
    .select("id, rating, body, display_name, created_at")
    .eq("spot_id", spotId)
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: "db" }, { status: 500 });
  return NextResponse.json({ reviews: data ?? [] });
}

/**
 * POST /api/reviews
 * Submit a review. Requires sign-in (D24 Q2). Always lands as `pending`; there
 * is no code path that publishes on submit, because D24 settled on binary
 * pre-moderation with no auto-publish ever.
 */
export async function POST(req: Request) {
  const userId = await getRequestUserId();
  if (!userId) return NextResponse.json({ error: "sign in to review" }, { status: 401 });

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const parsed = validateReviewSubmit(raw);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { spotId, rating, body, termsVersion, termsHash } = parsed.value;

  // The spot must actually exist and be visible. ALL_SPOTS is the chokepoint
  // that already excludes hidden records, so a review cannot be attached to a
  // spot that was deliberately withheld.
  const spot = ALL_SPOTS.find((s) => s.id === spotId);
  if (!spot) return NextResponse.json({ error: "unknown spot" }, { status: 404 });

  // Byline comes from the verified session, never from the request body.
  const authed = await getServerAuthSupabase();
  const { data: userData } = (await authed?.auth.getUser()) ?? { data: { user: null } };
  const email = userData?.user?.email ?? null;
  const displayName = email ? email.split("@")[0] : null;

  const db = getSupabaseAdmin();
  const { data: inserted, error } = await db
    .from("spot_reviews")
    .insert({
      spot_id: spotId,
      user_id: userId,
      rating,
      body,
      status: "pending",
      display_name: displayName,
      terms_version: termsVersion,
      terms_hash: termsHash,
      assented_at: new Date().toISOString(),
    })
    .select("id, moderation_token")
    .single();

  if (error) {
    // The partial unique index (user_id, spot_id) enforces ToS 2.3.
    if (error.code === "23505") {
      return NextResponse.json({ error: "You have already reviewed this spot." }, { status: 409 });
    }
    return NextResponse.json({ error: "db" }, { status: 500 });
  }

  // Notify the moderator. A failure here must NOT fail the submission: the row
  // is safely pending and invisible either way, and telling the contributor
  // their review vanished would be worse than a late approval.
  const msg = composeReviewModerationEmail({
    spotName: spot.water,
    spotId,
    rating,
    body,
    displayName,
    moderationToken: inserted.moderation_token,
  });
  const sent = await sendOperatorEmail(MODERATOR_EMAIL, msg);
  if (!sent.ok) console.error("[reviews] moderation email failed:", sent.error);

  return NextResponse.json({ status: "pending" }, { status: 201 });
}
