import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Item 43: one-click approve/reject from the moderation email, same durable-token
// idiom as app/api/email/unsubscribe/route.ts. The token is the authorisation:
// it is a 32-char random value that only ever appears in mail sent to the
// moderator address, and it is single-decision (a decided row no longer matches
// status='pending', so a leaked or replayed link cannot flip a later decision).

function page(title: string, detail: string): NextResponse {
  const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
<body style="margin:0;background:#EEF5FB;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0B2A47">
<div style="max-width:420px;margin:14vh auto;padding:28px;background:#fff;border:1px solid #DCE7F0;border-radius:12px;text-align:center">
<h1 style="font-family:Georgia,serif;font-size:22px;margin:0 0 10px">${title}</h1>
<p style="font-size:15px;line-height:1.6;color:#556A7E;margin:0">${detail}</p>
</div></body></html>`;
  return new NextResponse(html, { headers: { "content-type": "text/html; charset=utf-8" } });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("t") ?? "";
  const action = url.searchParams.get("action");

  if (!token || token.length > 64 || (action !== "approve" && action !== "reject")) {
    return page("Link not valid", "That moderation link is malformed. Open the email again.");
  }

  const db = getSupabaseAdmin();
  const nextStatus = action === "approve" ? "published" : "rejected";

  // Only a PENDING row can be decided. This makes the endpoint idempotent and
  // stops a replayed link from un-rejecting something later removed.
  const { data, error } = await db
    .from("spot_reviews")
    .update({ status: nextStatus, decided_at: new Date().toISOString() })
    .eq("moderation_token", token)
    .eq("status", "pending")
    .select("id, spot_id");

  if (error) return page("Something went wrong", "The decision was not saved. Try the link again.");

  if (!data || data.length === 0) {
    return page(
      "Already decided",
      "This review has already been approved or rejected. Nothing changed."
    );
  }

  return action === "approve"
    ? page("Published", "The review is now live on the spot page.")
    : page("Rejected", "The review will not be published. Nothing is visible to anyone.");
}
