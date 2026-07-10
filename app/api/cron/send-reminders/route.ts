import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { sendPush } from "@/lib/alerts/push-sender";

export const runtime = "nodejs";

/**
 * Drains due launch reminders: for every pending row whose fire_at has passed,
 * send a "time to launch" push and mark it sent. Separate from the daily
 * conditions cron because reminders need sub-daily granularity.
 *
 * IMPORTANT (scheduler): this must be hit frequently (~every 15-30 min) for
 * reminders to fire near launch time. This account is on Vercel HOBBY, which
 * REJECTS sub-daily crons at deploy time, so this is deliberately NOT in
 * vercel.json. Wire it to a sub-daily scheduler instead: Supabase pg_cron +
 * pg_net calling this endpoint with the CRON_SECRET bearer (free), or Vercel
 * Pro. Until then, reminders are stored but never sent. See DECISIONS D4.
 *
 * Auth: Bearer CRON_SECRET, same as check-conditions. `?dry=1` reports due
 * counts without sending.
 */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const dry = new URL(req.url).searchParams.get("dry") === "1";

  try {
    const db = getSupabaseAdmin();
    const nowIso = new Date().toISOString();

    const { data: due, error: dueErr } = await db
      .from("launch_reminders")
      .select("id, spot_id, spot_name, subscription_id, push_subscriptions(endpoint, p256dh, auth)")
      .is("sent_at", null)
      .lte("fire_at", nowIso)
      .limit(100);
    if (dueErr) throw dueErr;

    if (dry) {
      return NextResponse.json({ dry: true, due: (due ?? []).length });
    }

    let sent = 0;
    let failed = 0;
    for (const r of due ?? []) {
      const sub = r.push_subscriptions as unknown as { endpoint: string; p256dh: string; auth: string } | null;
      if (!sub) {
        // Subscription gone (cascade should prevent this, but be safe): retire the row.
        await db.from("launch_reminders").update({ sent_at: nowIso }).eq("id", r.id);
        continue;
      }
      const name = r.spot_name ?? "your spot";
      const result = await sendPush(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        {
          title: "Time to launch",
          body: `${name} has a calm window right now. Go paddle.`,
          url: `/?spot=${r.spot_id}&from=alert`,
        }
      );
      if (result.ok || result.gone) {
        // Sent, or the endpoint is dead: mark done either way so it never retries.
        await db.from("launch_reminders").update({ sent_at: nowIso }).eq("id", r.id);
        if (result.gone) {
          await db
            .from("push_subscriptions")
            .update({ enabled: false, disabled_at: nowIso })
            .eq("id", r.subscription_id);
        }
        sent += 1;
      } else {
        failed += 1; // leave pending; a later run retries
      }
    }

    return NextResponse.json({ ok: true, sent, failed });
  } catch (err) {
    console.error("[send-reminders] failed", err);
    return NextResponse.json({ error: "send-reminders failed" }, { status: 500 });
  }
}
