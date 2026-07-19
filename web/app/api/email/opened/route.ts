import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export const runtime = "nodejs";

/**
 * Email twin of /api/alerts/opened. Records an app-open from an alert EMAIL,
 * server-side, so email-cohort retention is measured without ITP-purgeable client
 * storage. The durable token rides the email deep link (emailOpenUrl), so the
 * ping carries it even after localStorage is wiped. Public. Returns the
 * subscription state as two booleans, `{ known, confirmed }`, so the client can
 * cache it and decide whether to re-prompt for enrollment. Never returns the
 * address or any other column: an unknown token and an unsubscribed one are
 * deliberately indistinguishable in the response.
 */
const UNKNOWN = { known: false, confirmed: false };

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(UNKNOWN);
  }

  const token = (body as { token?: unknown })?.token;
  const spotIdRaw = (body as { spot_id?: unknown })?.spot_id;
  if (typeof token !== "string" || token.length === 0 || token.length > 64) {
    return NextResponse.json(UNKNOWN);
  }
  const spotId = typeof spotIdRaw === "number" && Number.isInteger(spotIdRaw) ? spotIdRaw : null;

  try {
    const db = getSupabaseAdmin();
    const { data: sub } = await db
      .from("email_subscriptions")
      .select("id, confirmed_at, enabled")
      .eq("token", token)
      .maybeSingle();
    if (!sub) return NextResponse.json(UNKNOWN); // unknown token: no-op

    await db.from("email_opens").insert({ email_subscription_id: sub.id, spot_id: spotId });
    await db.from("email_subscriptions").update({ last_seen: new Date().toISOString() }).eq("id", sub.id);

    return NextResponse.json({
      known: sub.enabled === true,
      confirmed: sub.enabled === true && sub.confirmed_at != null,
    });
  } catch {
    return NextResponse.json(UNKNOWN);
  }
}
