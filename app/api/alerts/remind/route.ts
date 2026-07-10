import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { validateRemindPayload } from "@/lib/remindValidation";

export const runtime = "nodejs";

/**
 * Schedule a launch-time push reminder for one spot's calm window.
 *
 * The interstitial calls this when the user taps "Remind me at launch time".
 * The caller is already push-subscribed (the card only shows on push-opens), so
 * we identify their subscription by its `endpoint` and store a pending row that
 * /api/cron/send-reminders drains once `fire_at` passes. One reminder per
 * (subscription, spot, window); a repeat tap just refreshes fire_at.
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const parsed = validateRemindPayload(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { endpoint, spotId, spotName, windowKey, fireAt } = parsed.value;

  try {
    const db = getSupabaseAdmin();

    const { data: sub, error: subErr } = await db
      .from("push_subscriptions")
      .select("id")
      .eq("endpoint", endpoint)
      .maybeSingle();
    if (subErr) throw subErr;
    if (!sub) return NextResponse.json({ error: "unknown subscription" }, { status: 404 });

    const { error: upErr } = await db.from("launch_reminders").upsert(
      {
        subscription_id: sub.id,
        spot_id: spotId,
        spot_name: spotName ?? null,
        window_key: windowKey,
        fire_at: fireAt,
        sent_at: null, // re-arm if a prior reminder for this window was already sent
      },
      { onConflict: "subscription_id,spot_id,window_key" }
    );
    if (upErr) throw upErr;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[remind] failed", err);
    return NextResponse.json({ error: "failed to schedule reminder" }, { status: 500 });
  }
}
