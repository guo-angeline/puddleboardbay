import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export const runtime = "nodejs";

/**
 * Records an app-open from a push notification, server-side, so long-horizon
 * subscriber retention can be measured without depending on client storage that
 * Safari ITP purges. The durable token rides the notification deep link (see
 * composeAlert), so this ping carries it even after localStorage is wiped.
 *
 * Public (real users hit it, no CRON_SECRET). Forging an open requires knowing
 * an opaque per-subscription token that only appears in that device's own push
 * payloads, so the abuse surface is negligible; an unknown token is a silent
 * no-op. Success is intentionally quiet (204) and never leaks whether the token
 * existed.
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new NextResponse(null, { status: 204 });
  }

  const token = (body as { token?: unknown })?.token;
  const spotIdRaw = (body as { spot_id?: unknown })?.spot_id;
  if (typeof token !== "string" || token.length === 0 || token.length > 64) {
    return new NextResponse(null, { status: 204 });
  }
  const spotId = typeof spotIdRaw === "number" && Number.isInteger(spotIdRaw) ? spotIdRaw : null;

  try {
    const db = getSupabaseAdmin();
    const { data: sub } = await db
      .from("push_subscriptions")
      .select("id")
      .eq("token", token)
      .single();
    if (!sub) return new NextResponse(null, { status: 204 }); // unknown token: no-op

    await db.from("alert_opens").insert({ subscription_id: sub.id, spot_id: spotId });
    // Keep last_seen fresh: an open is the strongest liveness signal we get.
    await db.from("push_subscriptions").update({ last_seen: new Date().toISOString() }).eq("id", sub.id);
  } catch {
    // Best-effort telemetry: never surface a failure to the client.
    return new NextResponse(null, { status: 204 });
  }

  return new NextResponse(null, { status: 204 });
}
