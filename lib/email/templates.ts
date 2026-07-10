// Pure email composition for the alert channel. No I/O, unit-tested. House copy
// rules: no em dashes, one fact per line. The Resend wrapper adds the transport
// headers (List-Unsubscribe); these functions own subject + html + text + the
// URLs that carry the return token.

import { SITE_URL } from "@/lib/structured-data";

// Verified sending domain (DECISIONS D5 / DNS verified 2026-07-10). The alias is
// a subdomain so alert-sender reputation is isolated from the root domain.
export const FROM = "Paddle to Water <conditions@alerts.paddletowater.com>";

// CAN-SPAM requires a physical postal address in every email (DECISIONS D5).
export const POSTAL_ADDRESS = "500 Folsom St, San Francisco, CA 94105";

export interface EmailMessage {
  subject: string;
  html: string;
  text: string;
}

export function confirmUrl(confirmToken: string): string {
  return `${SITE_URL}/api/email/confirm?t=${encodeURIComponent(confirmToken)}`;
}

export function unsubscribeUrl(token: string): string {
  return `${SITE_URL}/api/email/unsubscribe?t=${encodeURIComponent(token)}`;
}

// Deep link the app opens from an alert email. `from=email` distinguishes it from
// push (`from=alert`) so the push interstitial does not show; `t` is the durable
// subscription token that rides the link so the open-ping works after ITP wipes
// client storage (mirrors the push token flow).
export function emailOpenUrl(spotId: number, token: string): string {
  return `${SITE_URL}/?spot=${spotId}&from=email&t=${encodeURIComponent(token)}`;
}

function shell(bodyHtml: string, unsubUrl: string, preheader: string): string {
  return `<!doctype html><html><body style="margin:0;background:#EEF5FB;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0B2A47">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;height:0;width:0">${preheader}</div>
  <div style="max-width:480px;margin:0 auto;padding:24px">
    ${bodyHtml}
    <hr style="border:none;border-top:1px solid #DCE7F0;margin:24px 0 12px">
    <p style="font-size:12px;color:#6E8598;line-height:1.5;margin:0">
      You're getting this because you signed up for calm-window alerts at paddletowater.com.<br>
      <a href="${unsubUrl}" style="color:#6E8598">Unsubscribe</a> &middot; Paddle to Water, ${POSTAL_ADDRESS}
    </p>
  </div></body></html>`;
}

export function composeConfirmEmail(confirmToken: string, token: string): EmailMessage {
  const url = confirmUrl(confirmToken);
  const subject = "Confirm your Paddle to Water alerts";
  const html = shell(
    `<p style="font-size:16px;font-weight:600;margin:0 0 8px">Confirm your alerts</p>
     <p style="font-size:14px;line-height:1.5;margin:0 0 12px">You asked us to keep an eye on your paddling spots. Confirm and we'll email you when one has a calm window worth getting on the water for.</p>
     <a href="${url}" style="display:inline-block;background:#0E6FD1;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:10px 18px;border-radius:8px">Confirm alerts</a>
     <p style="font-size:13px;color:#6E8598;line-height:1.5;margin:16px 0 0">One email a day at most, only when conditions are actually good. Unsubscribe any time in one tap.</p>
     <p style="font-size:13px;color:#6E8598;line-height:1.5;margin:8px 0 0">Didn't sign up? Ignore this email and nothing happens.</p>`,
    unsubscribeUrl(token),
    "Confirm to start getting calm-window alerts for your spots."
  );
  const text = `Confirm your Paddle to Water alerts.\n\nYou asked us to keep an eye on your paddling spots. Confirm and we'll email you when one has a calm window worth getting on the water for:\n${url}\n\nOne email a day at most, only when conditions are actually good. Unsubscribe any time in one tap.\n\nDidn't sign up? Ignore this email and nothing happens.`;
  return { subject, html, text };
}

export interface AlertEmailInput {
  spotName: string;
  spotId: number;
  windowLabel: string; // e.g. "Saturday morning"
  notes?: string; // put-in details from the spot
  extraCount: number; // additional good spots beyond the first
  token: string;
}

export function composeAlertEmail(input: AlertEmailInput): EmailMessage {
  const { spotName, spotId, windowLabel, notes, extraCount, token } = input;
  const tail = extraCount > 0 ? ` (+${extraCount} more looking good)` : "";
  const openUrl = emailOpenUrl(spotId, token);
  const subject = `${spotName} looks calm ${windowLabel}`;
  const notesHtml = notes
    ? `<p style="font-size:13px;color:#6E8598;line-height:1.5;margin:0 0 16px">${escapeHtml(notes)}</p>`
    : "";
  const html = shell(
    `<p style="font-size:16px;font-weight:600;margin:0 0 8px">${escapeHtml(spotName)} looks calm ${escapeHtml(windowLabel)}${tail ? escapeHtml(tail) : ""}</p>
     <p style="font-size:14px;line-height:1.5;margin:0 0 12px">A spot you watch has a calm window. Go while it lasts.</p>
     ${notesHtml}
     <a href="${openUrl}" style="display:inline-block;background:#0E6FD1;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:10px 18px;border-radius:8px">Open in the app</a>`,
    unsubscribeUrl(token),
    `${spotName} looks calm ${windowLabel}. Check the window before you go.`
  );
  const text = `${spotName} looks calm ${windowLabel}${tail}.\n\nA spot you watch has a calm window. Go while it lasts.\n${notes ? `\n${notes}\n` : ""}\nOpen in the app: ${openUrl}`;
  return { subject, html, text };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
