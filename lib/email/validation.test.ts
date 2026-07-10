import { describe, it, expect } from "vitest";
import { isValidEmail, normalizeEmail, validateEmailSubscribe } from "./validation";

describe("isValidEmail", () => {
  it("accepts normal addresses", () => {
    expect(isValidEmail("a@b.com")).toBe(true);
    expect(isValidEmail("first.last+tag@sub.example.co")).toBe(true);
  });
  it("rejects junk", () => {
    expect(isValidEmail("")).toBe(false);
    expect(isValidEmail("nope")).toBe(false);
    expect(isValidEmail("a@b")).toBe(false); // no dot in domain
    expect(isValidEmail("a b@c.com")).toBe(false); // whitespace
    expect(isValidEmail("a@@b.com")).toBe(false);
    expect(isValidEmail(123)).toBe(false);
    expect(isValidEmail("x".repeat(255) + "@b.com")).toBe(false); // too long
  });
});

describe("normalizeEmail", () => {
  it("trims and lowercases", () => {
    expect(normalizeEmail("  Foo@BAR.com ")).toBe("foo@bar.com");
  });
});

describe("validateEmailSubscribe", () => {
  it("accepts a valid payload and normalizes the email", () => {
    const r = validateEmailSubscribe({ email: " Me@Example.COM ", watchedSpotIds: [1, 2] });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.email).toBe("me@example.com");
      expect(r.value.watchedSpotIds).toEqual([1, 2]);
    }
  });

  it("defaults watchedSpotIds to empty", () => {
    const r = validateEmailSubscribe({ email: "a@b.com" });
    expect(r.ok && r.value.watchedSpotIds).toEqual([]);
  });

  it("dedupes watched ids so the (sub, spot) PK is never violated", () => {
    const r = validateEmailSubscribe({ email: "a@b.com", watchedSpotIds: [3, 3, 4] });
    expect(r.ok && r.value.watchedSpotIds).toEqual([3, 4]);
  });

  it("rejects a non-object body", () => {
    expect(validateEmailSubscribe(null).ok).toBe(false);
    expect(validateEmailSubscribe("x").ok).toBe(false);
  });

  it("rejects an invalid email", () => {
    expect(validateEmailSubscribe({ email: "nope" }).ok).toBe(false);
    expect(validateEmailSubscribe({}).ok).toBe(false);
  });

  it("rejects non-positive-integer spot ids", () => {
    expect(validateEmailSubscribe({ email: "a@b.com", watchedSpotIds: [0] }).ok).toBe(false);
    expect(validateEmailSubscribe({ email: "a@b.com", watchedSpotIds: [1.5] }).ok).toBe(false);
    expect(validateEmailSubscribe({ email: "a@b.com", watchedSpotIds: "no" }).ok).toBe(false);
  });

  it("rejects an over-long watched list", () => {
    const many = Array.from({ length: 201 }, (_, i) => i + 1);
    expect(validateEmailSubscribe({ email: "a@b.com", watchedSpotIds: many }).ok).toBe(false);
  });

  it("keeps a string anonId, truncated", () => {
    const r = validateEmailSubscribe({ email: "a@b.com", anonId: "x".repeat(200) });
    expect(r.ok && r.value.anonId?.length).toBe(100);
  });
});
