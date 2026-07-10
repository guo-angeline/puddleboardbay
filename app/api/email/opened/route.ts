import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export const runtime = "nodejs";

/**
 * Email twin of /api/alerts/opened. Records an app-open from an alert EMAIL,
 * server-side, so email-cohort retention is measured without ITP-purgeable client
 * storage. The durable token rides the email deep link (emailOpenUrl), so the
 * ping carries it even after localStorage is wiped. Public, quiet (204), unknown
 * token is a silent no-op (the token only appears in that address's own emails).
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
      .from("email_subscriptions")
      .select("id")
      .eq("token", token)
      .single();
    if (!sub) return new NextResponse(null, { status: 204 }); // unknown token: no-op

    await db.from("email_opens").insert({ email_subscription_id: sub.id, spot_id: spotId });
    await db.from("email_subscriptions").update({ last_seen: new Date().toISOString() }).eq("id", sub.id);
  } catch {
    return new NextResponse(null, { status: 204 });
  }

  return new NextResponse(null, { status: 204 });
}
