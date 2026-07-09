import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { validateSubscribePayload } from "@/lib/subscribe-validation";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const parsed = validateSubscribePayload(raw);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const { anonId, subscription, watchedSpotIds } = parsed.value;

  try {
    const db = getSupabaseAdmin();

    const { data: sub, error: upsertErr } = await db
      .from("push_subscriptions")
      .upsert(
        {
          anon_id: anonId ?? null,
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          enabled: true,
          // Resurrecting a previously-disabled endpoint: clear the churn stamp
          // so retention counts it as continuous, not a new + churned device.
          disabled_at: null,
          last_seen: new Date().toISOString(),
        },
        { onConflict: "endpoint" }
      )
      .select("id")
      .single();
    if (upsertErr || !sub) throw upsertErr ?? new Error("upsert returned no row");

    // Replace this device's watched spots with the current set.
    const { error: delErr } = await db.from("watched_spots").delete().eq("subscription_id", sub.id);
    if (delErr) throw delErr;

    if (watchedSpotIds.length > 0) {
      const rows = watchedSpotIds.map((spot_id) => ({ subscription_id: sub.id, spot_id }));
      const { error: insErr } = await db.from("watched_spots").insert(rows);
      if (insErr) throw insErr;
    }

    return NextResponse.json({ ok: true });
  } catch {
    // Do not leak DB internals to the client.
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
