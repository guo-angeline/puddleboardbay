"use client";

// Client-safe email helpers (no server-only imports). The transport/DB code lives
// in lib/email/sender.ts (server-only); this file is what components may import.

import type { EmailSubscriptionState } from "@/lib/email/subscriptionState";

/**
 * Report an app-open from an alert EMAIL, server-side. Email twin of
 * reportAlertOpen: the token rides the email deep link (from=email&t=...), so the
 * durable email_opens ledger records the return even after ITP purges storage.
 * Same-origin keepalive POST (survives the navigation/paint). Also returns the
 * subscription state the server resolved for that token, `{ known, confirmed }`,
 * so the caller can cache it. Never throws and never rejects: a caching failure
 * cannot break the email return path, so a missed open or a missed state read
 * just under-counts one return / leaves the prompt free to re-show.
 */
export async function reportEmailOpen(
  token: string,
  spotId?: number,
): Promise<EmailSubscriptionState | null> {
  if (!token) return null;
  try {
    const res = await fetch("/api/email/opened", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, spot_id: spotId }),
      keepalive: true,
    });
    if (!res.ok) return null;
    return (await res.json()) as EmailSubscriptionState;
  } catch {
    /* best-effort: a missed open just under-counts one return */
    return null;
  }
}
