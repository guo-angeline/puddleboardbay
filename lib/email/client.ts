"use client";

// Client-safe email helpers (no server-only imports). The transport/DB code lives
// in lib/email/sender.ts (server-only); this file is what components may import.

/**
 * Report an app-open from an alert EMAIL, server-side. Email twin of
 * reportAlertOpen: the token rides the email deep link (from=email&t=...), so the
 * durable email_opens ledger records the return even after ITP purges storage.
 * Fire-and-forget, same-origin keepalive POST (survives the navigation/paint).
 */
export function reportEmailOpen(token: string, spotId?: number): void {
  if (!token) return;
  try {
    void fetch("/api/email/opened", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, spot_id: spotId }),
      keepalive: true,
    });
  } catch {
    /* best-effort: a missed open just under-counts one return */
  }
}
