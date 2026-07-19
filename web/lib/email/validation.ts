// Pure validation for the email alert channel. No I/O, unit-tested.

const MAX_WATCHED = 200;
const MAX_EMAIL_LEN = 254; // RFC 5321 max

// Deliberately permissive but bans the obvious junk: exactly one @, a dot in the
// domain, no whitespace. We rely on double opt-in (a real inbox must click the
// confirm link) for true validity, not a clever regex.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface EmailSubscribePayload {
  email: string; // normalized: trimmed + lowercased
  watchedSpotIds: number[];
  anonId?: string;
}

export type EmailValidationResult =
  | { ok: true; value: EmailSubscribePayload }
  | { ok: false; error: string };

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

/** True when `raw` looks like a deliverable-shaped address. Case-insensitive. */
export function isValidEmail(raw: unknown): raw is string {
  return typeof raw === "string" && raw.length <= MAX_EMAIL_LEN && EMAIL_RE.test(raw.trim());
}

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function validateEmailSubscribe(body: unknown): EmailValidationResult {
  if (!isObject(body)) return { ok: false, error: "body must be an object" };

  if (!isValidEmail(body.email)) return { ok: false, error: "a valid email is required" };
  const email = normalizeEmail(body.email);

  let watchedSpotIds: number[] = [];
  if (body.watchedSpotIds !== undefined) {
    if (
      !Array.isArray(body.watchedSpotIds) ||
      body.watchedSpotIds.some((n) => !Number.isInteger(n) || n <= 0)
    ) {
      return { ok: false, error: "watchedSpotIds must be an array of positive integers" };
    }
    if (body.watchedSpotIds.length > MAX_WATCHED) {
      return { ok: false, error: "watchedSpotIds exceeds maximum length" };
    }
    // Dedup so a repeated spot id doesn't violate the (sub, spot) primary key.
    watchedSpotIds = [...new Set(body.watchedSpotIds as number[])];
  }

  const anonId = typeof body.anonId === "string" ? body.anonId.slice(0, 100) : undefined;

  return { ok: true, value: { email, watchedSpotIds, anonId } };
}
