import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { SITE_URL } from "@/lib/structured-data";

export const runtime = "nodejs";

// Double opt-in landing. The confirm link in the sign-up email hits this; we set
// confirmed_at (the consent record) and clear the single-use confirm_token, then
// bounce into the app where the client logs email_capture_confirmed and shows a
// short confirmation. Idempotent-ish: a stale/again-clicked token just lands home.
export async function GET(req: Request) {
  const t = new URL(req.url).searchParams.get("t");
  if (!t || t.length > 64) {
    return NextResponse.redirect(new URL(SITE_URL));
  }

  const db = getSupabaseAdmin();
  const { data: sub } = await db
    .from("email_subscriptions")
    .select("id")
    .eq("confirm_token", t)
    .eq("enabled", true)
    .maybeSingle();

  if (!sub) {
    // Unknown or already-consumed token: send them into the app quietly.
    return NextResponse.redirect(new URL(SITE_URL));
  }

  await db
    .from("email_subscriptions")
    .update({ confirmed_at: new Date().toISOString(), confirm_token: null, last_seen: new Date().toISOString() })
    .eq("id", sub.id);

  return NextResponse.redirect(new URL(`${SITE_URL}/?email_confirmed=1`));
}
