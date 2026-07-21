import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { getRequestUserId, getServerAuthSupabase } from "@/lib/supabase/server-auth";
import { validateReviewSubmit, TERMS_VERSION } from "@/lib/reviews/validation";
import { validateDisplayName } from "@/lib/account/displayName";
import { composeReviewModerationEmail } from "@/lib/email/templates";
import { sendOperatorEmail } from "@/lib/email/sender";
import { ALL_SPOTS } from "@/lib/spots";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Operator mail must NOT depend on a forwarding hop. `hello@paddletowater.com`
// is a Cloudflare Email Routing alias that forwards onward, and on 2026-07-21 a
// moderation notice bounced there ("Generic Temporary Delivery Failure"), so a
// real review sat pending with nobody told. Point this at a mailbox that
// receives directly; it falls back to the alias only if the env var is unset.
const MODERATOR_EMAIL = process.env.MODERATOR_EMAIL || "hello@paddletowater.com";

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

  // A cached bundle can post the PREVIOUS terms version while /contributor-terms
  // already serves the new one, which would stamp the assent record with text
  // the contributor never saw. The cap and the class waiver bind only the
  // version actually accepted, so a wrong stamp is a self-inflicted evidence
  // problem. Refuse it and make them re-accept, which is what s11.1 promises.
  if (termsVersion !== TERMS_VERSION) {
    return NextResponse.json(
      { error: "The contributor terms were updated. Reload the page and accept them to post." },
      { status: 409 }
    );
  }

  // Byline comes from the verified session, never from the request body.
  //
  // Item 77: it is the name the person CHOSE, held in user metadata. It was
  // previously taken from the local part of their address, which published a
  // piece of that address on a public page: for firstname.lastname@company.com
  // that is their real name. No chosen name means no byline; the UI renders
  // "A paddler". Never fall back to the address.
  const authed = await getServerAuthSupabase();
  const { data: userData } = (await authed?.auth.getUser()) ?? { data: { user: null } };
  const chosen = validateDisplayName(userData?.user?.user_metadata?.display_name);
  const displayName = chosen.ok && chosen.value !== "" ? chosen.value : null;

  // Owner decision 2026-07-21, amending D24's "no auto-publish ever": a rating
  // submitted with NO TEXT publishes immediately. Pre-publication review exists
  // to catch defamatory, unlawful, or abusive WORDS; a bare number carries none
  // of that risk, so holding it added delay without adding safety. Anything with
  // text still goes to a human, always. This distinction is a published promise
  // (Contributor Terms v1.1 s6.1), so it must not be loosened to auto-publish
  // text without amending those terms and bumping TERMS_VERSION again.
  const hasText = typeof body === "string" && body.trim() !== "";
  const status = hasText ? "pending" : "published";

  const db = getSupabaseAdmin();
  const { data: inserted, error } = await db
    .from("spot_reviews")
    .insert({
      spot_id: spotId,
      user_id: userId,
      rating,
      body,
      status,
      // Item 79 + legal gate: an auto-published rating publishes with NO name.
      // The display name is contributor-typed free text, and on this path no
      // human ever reads it before it goes live ("MarinaXdumpsfuel" fits in a
      // byline). A held review still gets its byline, because approving it is
      // the human check. This is what makes Contributor Terms v1.1 s6.1
      // literally true: nothing written reaches the page unreviewed.
      display_name: hasText ? displayName : null,
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

  // Notify the moderator, but only when there is a decision to make. An
  // auto-published rating has nothing to approve, so mailing about it would be
  // pure noise. A failure here must NOT fail the submission: the row is safely
  // pending and invisible either way, and telling the contributor their review
  // vanished would be worse than a late approval.
  if (hasText) {
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
  }

  return NextResponse.json({ status }, { status: 201 });
}
