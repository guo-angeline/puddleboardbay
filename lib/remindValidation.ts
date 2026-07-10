/**
 * Validates the body of POST /api/alerts/remind: a request to schedule a
 * launch-time push reminder for one spot's calm window. Pure and unit-tested.
 */
export interface RemindPayload {
  endpoint: string; // identifies the caller's existing push subscription
  spotId: number;
  spotName?: string;
  windowKey: string; // YYYY-MM-DD, spot-local
  fireAt: string; // ISO timestamp: when to send (window start minus lead)
}

export type RemindValidation = { ok: true; value: RemindPayload } | { ok: false; error: string };

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

const YMD = /^\d{4}-\d{2}-\d{2}$/;

export function validateRemindPayload(body: unknown, nowMs: number = Date.now()): RemindValidation {
  if (!isObject(body)) return { ok: false, error: "body must be an object" };

  if (typeof body.endpoint !== "string" || !body.endpoint) {
    return { ok: false, error: "endpoint is required" };
  }
  if (!Number.isInteger(body.spotId) || (body.spotId as number) <= 0) {
    return { ok: false, error: "spotId must be a positive integer" };
  }
  if (typeof body.windowKey !== "string" || !YMD.test(body.windowKey)) {
    return { ok: false, error: "windowKey must be YYYY-MM-DD" };
  }
  if (typeof body.fireAt !== "string") {
    return { ok: false, error: "fireAt is required" };
  }
  const fireMs = Date.parse(body.fireAt);
  if (Number.isNaN(fireMs)) return { ok: false, error: "fireAt must be an ISO timestamp" };
  // Reject the past (allow a small skew) and anything absurdly far out (> 7 days):
  // reminders are for windows within the 3-day horizon.
  if (fireMs < nowMs - 60_000) return { ok: false, error: "fireAt is in the past" };
  if (fireMs > nowMs + 7 * 86_400_000) return { ok: false, error: "fireAt is too far in the future" };

  const spotName = typeof body.spotName === "string" ? body.spotName.slice(0, 120) : undefined;

  return {
    ok: true,
    value: {
      endpoint: body.endpoint,
      spotId: body.spotId as number,
      spotName,
      windowKey: body.windowKey,
      fireAt: new Date(fireMs).toISOString(),
    },
  };
}
