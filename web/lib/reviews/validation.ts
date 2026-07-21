// Item 43: submit-payload validation for crowd reviews. Pure and DOM-free so it
// unit-tests without a server, same shape as lib/email/validation.ts.

export const TERMS_VERSION = "v1.1";
export const MAX_BODY_LENGTH = 1500;

export interface ReviewInput {
  spotId: number;
  rating: number;
  body: string | null;
  termsVersion: string;
  termsHash: string;
}

export type ReviewParse =
  | { ok: true; value: ReviewInput }
  | { ok: false; error: string };

export function validateReviewSubmit(body: unknown): ReviewParse {
  if (typeof body !== "object" || body === null) return { ok: false, error: "body must be an object" };
  const b = body as Record<string, unknown>;

  if (typeof b.spotId !== "number" || !Number.isInteger(b.spotId) || b.spotId <= 0) {
    return { ok: false, error: "spotId must be a positive integer" };
  }

  // A rating is required and must be a whole star. Fractions are the owner's
  // editorial scale (item 39), not something a contributor gets to submit.
  if (typeof b.rating !== "number" || !Number.isInteger(b.rating) || b.rating < 1 || b.rating > 5) {
    return { ok: false, error: "rating must be a whole number from 1 to 5" };
  }

  // Text is optional. Empty/whitespace-only normalises to null so a blank
  // textarea does not become an empty published review.
  let text: string | null = null;
  if (b.body !== undefined && b.body !== null) {
    if (typeof b.body !== "string") return { ok: false, error: "body must be a string" };
    const trimmed = b.body.trim();
    if (trimmed.length > MAX_BODY_LENGTH) {
      return { ok: false, error: `body must be ${MAX_BODY_LENGTH} characters or fewer` };
    }
    text = trimmed.length > 0 ? trimmed : null;
  }

  // Assent is not optional and not inferable. The liability cap and the
  // class-action waiver bind only the version the contributor actually saw, so
  // a submission that cannot name its version is rejected outright rather than
  // defaulted to the current one.
  if (typeof b.termsVersion !== "string" || b.termsVersion.length === 0 || b.termsVersion.length > 20) {
    return { ok: false, error: "termsVersion is required" };
  }
  if (typeof b.termsHash !== "string" || b.termsHash.length === 0 || b.termsHash.length > 128) {
    return { ok: false, error: "termsHash is required" };
  }

  return {
    ok: true,
    value: {
      spotId: b.spotId,
      rating: b.rating,
      body: text,
      termsVersion: b.termsVersion,
      termsHash: b.termsHash,
    },
  };
}
