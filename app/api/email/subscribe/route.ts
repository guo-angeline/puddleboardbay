import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { validateEmailSubscribe } from "@/lib/email/validation";
import { composeConfirmEmail } from "@/lib/email/templates";
import { sendEmail, emailAlertsEnabled } from "@/lib/email/sender";

export const runtime = "nodejs";

// Public capture endpoint. Double opt-in: this creates a PENDING row and sends a
// confirm email; nothing is ever sent to an address until it clicks the confirm
// link (that click is the consent record). Re-subscribing resurrects a prior
// unsubscribe (the unique index only covers enabled rows).
export async function POST(req: Request) {
  if (!emailAlertsEnabled()) {
    return NextResponse.json({ error: "email alerts are disabled" }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const parsed = validateEmailSubscribe(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { email, watchedSpotIds, anonId } = parsed.value;

  const db = getSupabaseAdmin();
  const confirmToken = crypto.randomUUID().replace(/-/g, "");

  // Existing enabled row for this address? (Same-case: we always store normalized.)
  const { data: existing, error: findErr } = await db
    .from("email_subscriptions")
    .select("id, token, confirmed_at")
    .eq("email", email)
    .eq("enabled", true)
    .maybeSingle();
  if (findErr) return NextResponse.json({ error: "db" }, { status: 500 });

  let subId: string;
  let token: string;
  let alreadyConfirmed = false;

  if (existing) {
    subId = existing.id;
    token = existing.token;
    alreadyConfirmed = !!existing.confirmed_at;
    if (!alreadyConfirmed) {
      // Re-arm the confirm token so a fresh confirm email is valid.
      const { error: upErr } = await db
        .from("email_subscriptions")
        .update({ confirm_token: confirmToken, last_seen: new Date().toISOString() })
        .eq("id", subId);
      if (upErr) return NextResponse.json({ error: "db" }, { status: 500 });
    }
  } else {
    const { data: inserted, error: insErr } = await db
      .from("email_subscriptions")
      .insert({ email, anon_id: anonId ?? null, confirm_token: confirmToken })
      .select("id, token")
      .single();
    if (insErr || !inserted) return NextResponse.json({ error: "db" }, { status: 500 });
    subId = inserted.id;
    token = inserted.token;
  }

  // Replace the watched set for this subscription (mirrors the push subscribe route).
  const { error: delErr } = await db.from("email_watched_spots").delete().eq("email_subscription_id", subId);
  if (delErr) return NextResponse.json({ error: "db" }, { status: 500 });
  if (watchedSpotIds.length > 0) {
    const { error: wErr } = await db
      .from("email_watched_spots")
      .insert(watchedSpotIds.map((spot_id) => ({ email_subscription_id: subId, spot_id })));
    if (wErr) return NextResponse.json({ error: "db" }, { status: 500 });
  }

  // Already confirmed: just resynced their spots, no need to re-confirm.
  if (alreadyConfirmed) {
    return NextResponse.json({ ok: true, status: "already_confirmed" });
  }

  const msg = composeConfirmEmail(confirmToken, token);
  const sent = await sendEmail(email, msg, token);
  if (!sent.ok) {
    // The row is stored; surface the failure so the client can log email_capture_failed.
    return NextResponse.json({ error: "send_failed" }, { status: 502 });
  }
  return NextResponse.json({ ok: true, status: "pending" });
}
