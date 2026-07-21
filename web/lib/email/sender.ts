import "server-only";
import { Resend } from "resend";
import { FROM, type EmailMessage } from "@/lib/email/templates";
import { unsubscribeUrl } from "@/lib/email/templates";

// A real reply-to reads as legitimate (not a no-reply blast), a small
// deliverability + trust signal. Point EMAIL_REPLY_TO at a monitored inbox;
// recommended: hello@paddletowater.com with Cloudflare Email Routing forwarding
// to your inbox (free), so replies actually land. Defaults to that address.
const REPLY_TO = process.env.EMAIL_REPLY_TO || "hello@paddletowater.com";

/**
 * Server-only email transport (Resend). Env-gated the same way the push sender is
 * VAPID-gated: throws if unconfigured, so a missing key fails loud in a route,
 * not silently. The daily send cron and the subscribe route are the only callers.
 */

// Kill switch (DECISIONS D6): email is a monitored 100% rollout, not an A/B. This
// env flag defaults ON and exists to disable the channel INSTANTLY (redeploy or
// Vercel env toggle) if deliverability or spam-complaint guardrails breach. Set
// EMAIL_ALERTS_ENABLED="false" to stop all sends without a code change.
export function emailAlertsEnabled(): boolean {
  return process.env.EMAIL_ALERTS_ENABLED !== "false";
}

let client: Resend | null = null;
function getResend(): Resend {
  if (client) return client;
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("Resend not configured: set RESEND_API_KEY");
  client = new Resend(key);
  return client;
}

export interface SendEmailResult {
  ok: boolean;
  id?: string;
  error?: string;
}

/**
 * Send one email. `unsubToken` is the subscription's durable token; it drives the
 * one-click List-Unsubscribe header (RFC 8058), which Gmail/Yahoo require and
 * which protects sender reputation. The visible footer link uses the same token.
 */
export async function sendEmail(
  to: string,
  msg: EmailMessage,
  unsubToken: string
): Promise<SendEmailResult> {
  const url = unsubscribeUrl(unsubToken);
  try {
    const { data, error } = await getResend().emails.send({
      from: FROM,
      to,
      replyTo: REPLY_TO,
      subject: msg.subject,
      html: msg.html,
      text: msg.text,
      headers: {
        "List-Unsubscribe": `<${url}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true, id: data?.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "send failed" };
  }
}

/**
 * Send one OPERATOR email: mail to the site owner about running the site, not
 * mail to a subscriber. Item 43's moderation queue is the first of these.
 *
 * Deliberately separate from sendEmail() because that function attaches
 * List-Unsubscribe headers keyed to a real subscription token. Operator mail has
 * no subscription behind it, and an unsubscribe affordance on your own
 * moderation queue is worse than useless: acting on it would silently stop
 * review approvals with no way to notice. CAN-SPAM's unsubscribe requirement
 * targets commercial messages to recipients, which this is not.
 */
export async function sendOperatorEmail(to: string, msg: EmailMessage): Promise<SendEmailResult> {
  try {
    const { data, error } = await getResend().emails.send({
      from: FROM,
      to,
      replyTo: REPLY_TO,
      subject: msg.subject,
      html: msg.html,
      text: msg.text,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true, id: data?.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "send failed" };
  }
}
