import { describe, it, expect } from "vitest";
import { validateReviewSubmit, MAX_BODY_LENGTH, TERMS_VERSION } from "./validation";

const good = {
  spotId: 12,
  rating: 4,
  body: "Easy gravel put-in, parking was free on a Tuesday.",
  termsVersion: TERMS_VERSION,
  termsHash: "abc123",
};

describe("validateReviewSubmit (item 43)", () => {
  it("accepts a well-formed submission", () => {
    const r = validateReviewSubmit(good);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.rating).toBe(4);
      expect(r.value.spotId).toBe(12);
      expect(r.value.body).toContain("gravel put-in");
    }
  });

  it("requires a whole-star rating from 1 to 5", () => {
    for (const rating of [0, 6, -1, 3.5, "4", null, undefined, NaN]) {
      expect(validateReviewSubmit({ ...good, rating }).ok).toBe(false);
    }
    for (const rating of [1, 2, 3, 4, 5]) {
      expect(validateReviewSubmit({ ...good, rating }).ok).toBe(true);
    }
  });

  it("treats text as optional, normalising blank to null", () => {
    for (const body of [undefined, null, "", "   ", "\n\t "]) {
      const r = validateReviewSubmit({ ...good, body });
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.value.body).toBeNull();
    }
  });

  it("trims text and caps its length", () => {
    const ok = validateReviewSubmit({ ...good, body: "  spacious  " });
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(ok.value.body).toBe("spacious");

    expect(validateReviewSubmit({ ...good, body: "x".repeat(MAX_BODY_LENGTH) }).ok).toBe(true);
    expect(validateReviewSubmit({ ...good, body: "x".repeat(MAX_BODY_LENGTH + 1) }).ok).toBe(false);
  });

  it("REJECTS a submission that cannot prove which terms version was assented to", () => {
    // The liability cap and class-action waiver bind only the version the
    // contributor actually saw and checked, so this must never be defaulted.
    expect(validateReviewSubmit({ ...good, termsVersion: undefined }).ok).toBe(false);
    expect(validateReviewSubmit({ ...good, termsVersion: "" }).ok).toBe(false);
    expect(validateReviewSubmit({ ...good, termsHash: undefined }).ok).toBe(false);
    expect(validateReviewSubmit({ ...good, termsHash: "" }).ok).toBe(false);
  });

  it("rejects a bad spotId and a non-object body", () => {
    for (const spotId of [0, -3, 1.5, "12", undefined]) {
      expect(validateReviewSubmit({ ...good, spotId }).ok).toBe(false);
    }
    expect(validateReviewSubmit(null).ok).toBe(false);
    expect(validateReviewSubmit(42).ok).toBe(false);
  });
});
