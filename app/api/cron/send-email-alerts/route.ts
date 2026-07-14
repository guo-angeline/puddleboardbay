import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { findGoodWindow, type GoodWindow } from "@/lib/alerts/conditions-window";
import { selectAlertSpots, sentKey, type SpotWindow } from "@/lib/alerts/select";
import { composeAlertEmail, alertVariantForDay } from "@/lib/email/templates";
import { sendEmail, emailAlertsEnabled } from "@/lib/email/sender";
import spotsData from "@/data/spots.json";
import type { Spot } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const ALL_SPOTS = spotsData as Spot[];
const spotById = new Map(ALL_SPOTS.map((s) => [s.id, s]));

// Email twin of check-conditions. Same evaluator (findGoodWindow), same 1/UTC-day
// cap and per-(spot,window) dedup, over the parallel email_* tables. Never touches
// the protected push tables. Runs daily; see vercel.json.
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const dry = new URL(req.url).searchParams.get("dry") === "1";

  // Kill switch (DECISIONS D6): stop all sends instantly without a code change.
  if (!emailAlertsEnabled()) {
    return NextResponse.json({ ok: true, disabled: "killswitch", emailsSent: 0 });
  }

  const nowMs = Date.now();
  const db = getSupabaseAdmin();

  // 1. Load CONFIRMED, enabled email subs + their watched spots + recent sends.
  const { data: subs, error: subErr } = await db
    .from("email_subscriptions")
    .select("id, email, token")
    .eq("enabled", true)
    .not("confirmed_at", "is", null);
  if (subErr) return NextResponse.json({ error: "db" }, { status: 500 });

  const { data: watched, error: watchedErr } = await db
    .from("email_watched_spots")
    .select("email_subscription_id, spot_id");
  if (watchedErr) return NextResponse.json({ error: "db" }, { status: 500 });
  const { data: sends, error: sendsErr } = await db
    .from("email_sends")
    .select("email_subscription_id, spot_id, window_key, sent_at");
  if (sendsErr) return NextResponse.json({ error: "db" }, { status: 500 });

  const watchedBySub = new Map<string, number[]>();
  for (const w of watched ?? []) {
    const arr = watchedBySub.get(w.email_subscription_id) ?? [];
    arr.push(w.spot_id);
    watchedBySub.set(w.email_subscription_id, arr);
  }
  const startOfUtcDay = new Date();
  startOfUtcDay.setUTCHours(0, 0, 0, 0);
  const sentKeysBySub = new Map<string, Set<string>>();
  const sentTodayBySub = new Map<string, number>();
  for (const s of sends ?? []) {
    const keys = sentKeysBySub.get(s.email_subscription_id) ?? new Set<string>();
    keys.add(sentKey(s.spot_id, s.window_key));
    sentKeysBySub.set(s.email_subscription_id, keys);
    if (Date.parse(s.sent_at) >= startOfUtcDay.getTime()) {
      sentTodayBySub.set(s.email_subscription_id, (sentTodayBySub.get(s.email_subscription_id) ?? 0) + 1);
    }
  }

  // 2. Fetch conditions ONCE per unique watched spot (shared with the push cron's
  //    evaluator, so email and push never disagree).
  const uniqueSpotIds = [...new Set((watched ?? []).map((w) => w.spot_id))];
  const windowBySpot = new Map<number, SpotWindow>();
  for (const spotId of uniqueSpotIds) {
    const spot = spotById.get(spotId);
    if (!spot) continue;
    const win: GoodWindow | null = await findGoodWindow(spot.lat, spot.lng, nowMs);
    if (win) {
      windowBySpot.set(spotId, {
        spotId,
        spotName: spot.water,
        windowKey: win.windowKey,
        label: win.label,
        startHour: win.startHour,
        endHour: win.endHour,
        maxWindMph: win.maxWindMph,
      });
    }
  }

  // 3. Per sub: pick, send ONE email for the soonest spot, log, respect the cap.
  let emailsSent = 0;
  let failed = 0;
  // Copy rotation: one wording per UTC send day, shared by every email that day
  // so day-over-day emails to the same subscriber never repeat.
  const variant = alertVariantForDay(nowMs);
  const planned: { email_subscription_id: string; spots: number[] }[] = [];
  for (const sub of subs ?? []) {
    const watchedIds = watchedBySub.get(sub.id) ?? [];
    const capReached = (sentTodayBySub.get(sub.id) ?? 0) > 0;
    const picks = selectAlertSpots(watchedIds, windowBySpot, sentKeysBySub.get(sub.id) ?? new Set(), capReached);
    if (picks.length === 0) continue;
    planned.push({ email_subscription_id: sub.id, spots: picks.map((p) => p.spotId) });
    if (dry) continue;

    const first = picks[0];
    const msg = composeAlertEmail({
      spotName: first.spotName,
      spotId: first.spotId,
      windowKey: first.windowKey,
      startHour: first.startHour ?? 0,
      endHour: first.endHour ?? 0,
      maxWindMph: first.maxWindMph,
      notes: spotById.get(first.spotId)?.notes ?? undefined,
      extras: picks.slice(1).map((p) => ({
        name: p.spotName,
        windowKey: p.windowKey,
        startHour: p.startHour ?? 0,
        endHour: p.endHour ?? 0,
      })),
      token: sub.token,
      variant,
    });
    const result = await sendEmail(sub.email, msg, sub.token);
    if (result.ok) {
      emailsSent += 1;
      const { error: insertErr } = await db.from("email_sends").insert(
        picks.map((p) => ({
          email_subscription_id: sub.id,
          spot_id: p.spotId,
          window_key: p.windowKey,
          sent_at: new Date().toISOString(),
        }))
      );
      if (insertErr) console.error("email_sends insert failed for", sub.id, insertErr.message);
    } else {
      failed += 1;
      console.error("email send failed for", sub.id, result.error);
    }
  }

  return NextResponse.json({
    ok: true,
    dry,
    subscriptions: subs?.length ?? 0,
    spotsChecked: uniqueSpotIds.length,
    goodSpots: windowBySpot.size,
    emailsSent,
    failed,
    planned: dry ? planned : undefined,
  });
}
