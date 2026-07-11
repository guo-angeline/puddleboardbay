// Dependency-free capture module: the resend network call, the cooldown
// constant, and the pending-state copy live here so the UI and its unit
// test share one source of truth. Do not import from lib/push, lib/alerts,
// or any cron/push module: the caller passes anonId.

export const RESEND_COOLDOWN_MS = 20000;

export const RESEND_SPAM_LINE = "Not there? Check spam or junk.";
export const RESEND_LABEL = "Resend confirm email";
export const RESEND_SENDING_LABEL = "Sending...";
export const RESEND_SENT_NOTE = "Sent again. Check spam too.";
export const RESEND_CONFIRMED_NOTE = "You are already confirmed. No need to resend.";
export const RESEND_FAILED_NOTE = "Resend did not go through. Try again later.";

export type EmailCaptureOutcome = "pending" | "already_confirmed" | "failed";

export interface EmailCaptureResult {
  outcome: EmailCaptureOutcome;
  httpStatus: number | null;
}

export async function submitEmailCapture(
  email: string,
  watchedSpotIds: number[],
  anonId: string | null
): Promise<EmailCaptureResult> {
  try {
    const res = await fetch("/api/email/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, watchedSpotIds, anonId }),
    });

    if (!res.ok) {
      return { outcome: "failed", httpStatus: res.status };
    }

    const data = await res.json();
    const outcome: EmailCaptureOutcome = data?.status === "already_confirmed" ? "already_confirmed" : "pending";
    return { outcome, httpStatus: res.status };
  } catch {
    return { outcome: "failed", httpStatus: null };
  }
}
