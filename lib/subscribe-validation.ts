export interface SubscribePayload {
  anonId?: string;
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } };
  watchedSpotIds: number[];
}

export type ValidationResult =
  | { ok: true; value: SubscribePayload }
  | { ok: false; error: string };

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

export function validateSubscribePayload(body: unknown): ValidationResult {
  if (!isObject(body)) return { ok: false, error: "body must be an object" };

  const sub = body.subscription;
  if (!isObject(sub)) return { ok: false, error: "subscription is required" };
  if (typeof sub.endpoint !== "string" || !sub.endpoint) {
    return { ok: false, error: "subscription.endpoint is required" };
  }
  const keys = sub.keys;
  if (!isObject(keys) || typeof keys.p256dh !== "string" || typeof keys.auth !== "string") {
    return { ok: false, error: "subscription.keys.p256dh and .auth are required" };
  }

  let watchedSpotIds: number[] = [];
  if (body.watchedSpotIds !== undefined) {
    if (!Array.isArray(body.watchedSpotIds) || body.watchedSpotIds.some((n) => typeof n !== "number")) {
      return { ok: false, error: "watchedSpotIds must be an array of numbers" };
    }
    watchedSpotIds = body.watchedSpotIds as number[];
  }

  const anonId = typeof body.anonId === "string" ? body.anonId : undefined;

  return {
    ok: true,
    value: {
      anonId,
      subscription: { endpoint: sub.endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth } },
      watchedSpotIds,
    },
  };
}
