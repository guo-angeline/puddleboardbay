import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export const runtime = "nodejs";

// Unsubscribe by durable token. Two entry points, same effect (enabled=false +
// unsub_at stamp, mirroring the push disabled_at churn stamp):
//   GET  — the human clicks the footer link, we show a tiny confirmation page.
//   POST — Gmail/Yahoo one-click List-Unsubscribe (RFC 8058) hits it as a POST.
// Unsub is measured server-side from unsub_at (like alert_opens), no client event.

async function disableByToken(token: string): Promise<boolean> {
  if (!token || token.length > 64) return false;
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("email_subscriptions")
    .update({ enabled: false, unsub_at: new Date().toISOString() })
    .eq("token", token)
    .eq("enabled", true)
    .select("id");
  return !error && !!data && data.length > 0;
}

const PAGE = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Unsubscribed</title></head>
<body style="margin:0;background:#EEF5FB;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0B2A47">
<div style="max-width:420px;margin:12vh auto;padding:24px;text-align:center">
<p style="font-size:18px;font-weight:600;margin:0 0 8px">You're unsubscribed.</p>
<p style="font-size:14px;color:#6E8598;line-height:1.5;margin:0 0 20px">No more alerts. Changed your mind? Watch a spot again anytime.</p>
<a href="https://paddletowater.com" style="display:inline-block;background:#0E6FD1;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:10px 18px;border-radius:8px">Back to Paddle to Water</a>
</div></body></html>`;

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("t") ?? "";
  await disableByToken(token);
  // Always render the same page (never leak whether the token existed).
  return new NextResponse(PAGE, { status: 200, headers: { "content-type": "text/html; charset=utf-8" } });
}

export async function POST(req: Request) {
  const token = new URL(req.url).searchParams.get("t") ?? "";
  await disableByToken(token);
  return new NextResponse(null, { status: 200 });
}
