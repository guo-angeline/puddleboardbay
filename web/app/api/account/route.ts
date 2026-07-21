import { NextResponse } from "next/server";
import { getServerAuthSupabase } from "@/lib/supabase/server-auth";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { validateDisplayName } from "@/lib/account/displayName";
import { ALL_SPOTS_INCLUDING_HIDDEN } from "@/lib/spots";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Item 78: the account-management resource. One signed-in user, their own data.
//   GET    -> everything the account holds (name, own reviews, saved count, alerts)
//   PATCH  -> set the display name, propagating it to their existing reviews
//   DELETE -> delete the account, following docs/legal/account-deletion-runbook.md
//
// Ownership is always taken from the verified session, NEVER from the request,
// so a caller can only ever read or change their own account.

async function requireUser() {
  const authed = await getServerAuthSupabase();
  if (!authed) return null;
  const { data, error } = await authed.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}

// A review can sit on a spot that was later hidden; the author should still see
// its name in their own list, so this looks in the full set including hidden.
function spotName(spotId: number): string {
  return ALL_SPOTS_INCLUDING_HIDDEN.find((s) => s.id === spotId)?.water ?? "A spot";
}

/** GET /api/account -> the signed-in account's own data. */
export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "not signed in" }, { status: 401 });

  const admin = getSupabaseAdmin();

  const [reviewsRes, savedRes, emailRes, pushRes] = await Promise.all([
    admin
      .from("spot_reviews")
      .select("id, spot_id, rating, body, status, created_at")
      .eq("user_id", user.id)
      .neq("status", "removed")
      .order("created_at", { ascending: false }),
    admin.from("user_saved_spots").select("spot_id", { count: "exact", head: true }).eq("user_id", user.id),
    admin.from("email_subscriptions").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("enabled", true),
    admin.from("push_subscriptions").select("id", { count: "exact", head: true }).eq("user_id", user.id),
  ]);

  const parsed = validateDisplayName(user.user_metadata?.display_name);

  return NextResponse.json({
    email: user.email ?? null,
    displayName: parsed.ok ? parsed.value : "",
    reviews: (reviewsRes.data ?? []).map((r) => ({
      id: r.id as string,
      spotId: r.spot_id as number,
      spotName: spotName(r.spot_id as number),
      rating: r.rating as number,
      body: (r.body as string | null) ?? null,
      status: r.status as string,
      createdAt: r.created_at as string,
    })),
    savedCount: savedRes.count ?? 0,
    emailAlerts: (emailRes.count ?? 0) > 0,
    pushAlerts: (pushRes.count ?? 0) > 0,
  });
}

/** PATCH /api/account { displayName } -> set the byline everywhere it shows. */
export async function PATCH(request: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "not signed in" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const checked = validateDisplayName((body as { displayName?: unknown })?.displayName);
  if (!checked.ok) return NextResponse.json({ error: checked.error }, { status: 400 });
  const name = checked.value; // "" means "no byline"

  const admin = getSupabaseAdmin();

  // 1. The account metadata (the source used for FUTURE reviews). Merge, so
  //    Google profile fields (avatar, full_name) survive.
  const { error: metaErr } = await admin.auth.admin.updateUserById(user.id, {
    user_metadata: { ...user.user_metadata, display_name: name },
  });
  if (metaErr) return NextResponse.json({ error: "could not save" }, { status: 500 });

  // 2. Item 78 propagation: display_name is denormalised onto each review row,
  //    so an account rename that did not reach existing reviews would be
  //    cosmetic. Only touch the rows that are (or may become) public; a removed
  //    review stays dissociated with a null byline.
  const { error: revErr } = await admin
    .from("spot_reviews")
    .update({ display_name: name === "" ? null : name })
    .eq("user_id", user.id)
    .in("status", ["published", "pending", "rejected"]);
  if (revErr) return NextResponse.json({ error: "saved name, but reviews did not update" }, { status: 500 });

  return NextResponse.json({ displayName: name });
}

/**
 * DELETE /api/account -> delete the signed-in account and everything with it.
 * Implements docs/legal/account-deletion-runbook.md, "delete everything" scope,
 * in the runbook's order (subscriptions and reviews before the account, so the
 * user_id is still present to find them by).
 */
export async function DELETE() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "not signed in" }, { status: 401 });

  const admin = getSupabaseAdmin();
  const email = user.email ?? "";

  // Every step is checked and the sequence ABORTS on the first failure, because
  // a half-done deletion is worse than a retryable one: the account must not be
  // torn down while a bylined public review still points at it. All steps are
  // naturally idempotent, so a client retry after an abort completes cleanly.

  // 1. Alert subscriptions. Deleting these two parents cascades their whole
  //    trail (watched_spots, sends, opens). Match user_id OR the address, since
  //    an anonymous subscription may never have been claimed to the account.
  //    (Known edge, same as the manual runbook: an anonymous alert under a
  //    DIFFERENT address than the account email is not caught here.)
  const emailDel = await admin
    .from("email_subscriptions")
    .delete()
    .or(`user_id.eq.${user.id}${email ? `,email.ilike.${email}` : ""}`);
  if (emailDel.error) return NextResponse.json({ error: "delete failed" }, { status: 500 });

  const pushDel = await admin.from("push_subscriptions").delete().eq("user_id", user.id);
  if (pushDel.error) return NextResponse.json({ error: "delete failed" }, { status: 500 });

  // 2. Reviews: NOT deleted. The Contributor Terms promise the review is
  //    unpublished and dissociated AND that a moderation record survives up to
  //    three years. So unpublish and strip the byline; the auth.users delete
  //    below then nulls user_id via the FK, completing the dissociation. This
  //    MUST succeed before the account delete, or a public bylined review could
  //    be orphaned.
  const revUpd = await admin
    .from("spot_reviews")
    .update({ status: "removed", display_name: null })
    .eq("user_id", user.id);
  if (revUpd.error) return NextResponse.json({ error: "delete failed" }, { status: 500 });

  // 3. The account itself. Cascades user_saved_spots.
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return NextResponse.json({ error: "delete failed" }, { status: 500 });

  return NextResponse.json({ deleted: true });
}
