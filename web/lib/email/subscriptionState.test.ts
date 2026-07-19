import { describe, it, expect, beforeEach, vi } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import {
  cacheEmailSubscriptionState,
  readEmailSubscriptionState,
  isEmailConfirmed,
  wasReconciledThisSession,
  __resetReconciledForTest,
  EMAIL_STATE_KEY,
} from "@/lib/email/subscriptionState";

describe("email subscription state cache (item 47)", () => {
  beforeEach(() => {
    const store: Record<string, string> = {};
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => (k in store ? store[k] : null),
      setItem: (k: string, v: string) => { store[k] = v; },
      removeItem: (k: string) => { delete store[k]; },
    });
    __resetReconciledForTest();
  });

  it("round-trips {known:true, confirmed:true} and isEmailConfirmed is true", () => {
    cacheEmailSubscriptionState({ known: true, confirmed: true });
    expect(readEmailSubscriptionState()).toEqual({ known: true, confirmed: true });
    expect(isEmailConfirmed()).toBe(true);
  });

  it("round-trips the pending case {known:true, confirmed:false} and isEmailConfirmed is false", () => {
    cacheEmailSubscriptionState({ known: true, confirmed: false });
    expect(readEmailSubscriptionState()).toEqual({ known: true, confirmed: false });
    expect(isEmailConfirmed()).toBe(false);
  });

  it("caching {known:false} removes the key so a previously-confirmed state is gone (cross-device unsubscribe)", () => {
    cacheEmailSubscriptionState({ known: true, confirmed: true });
    expect(readEmailSubscriptionState()).toEqual({ known: true, confirmed: true });

    cacheEmailSubscriptionState({ known: false, confirmed: false });
    expect(readEmailSubscriptionState()).toBeNull();
    expect(localStorage.getItem(EMAIL_STATE_KEY)).toBeNull();
  });

  it("isEmailConfirmed is false with nothing cached", () => {
    expect(isEmailConfirmed()).toBe(false);
  });

  it("isEmailConfirmed is false and does not throw when stored value is malformed JSON", () => {
    localStorage.setItem(EMAIL_STATE_KEY, "{not json");
    expect(() => isEmailConfirmed()).not.toThrow();
    expect(isEmailConfirmed()).toBe(false);
  });

  it("isEmailConfirmed is false and does not throw when localStorage.getItem throws (private mode)", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => { throw new Error("private mode"); },
      setItem: () => { throw new Error("private mode"); },
      removeItem: () => { throw new Error("private mode"); },
    });
    expect(() => isEmailConfirmed()).not.toThrow();
    expect(isEmailConfirmed()).toBe(false);
  });

  it("wasReconciledThisSession is false before any cache write and true after one, even a known:false write", () => {
    expect(wasReconciledThisSession()).toBe(false);
    cacheEmailSubscriptionState({ known: false, confirmed: false });
    expect(wasReconciledThisSession()).toBe(true);
  });

  it("wasReconciledThisSession is true after a confirmed write too", () => {
    __resetReconciledForTest();
    expect(wasReconciledThisSession()).toBe(false);
    cacheEmailSubscriptionState({ known: true, confirmed: true });
    expect(wasReconciledThisSession()).toBe(true);
  });

  it("coerces a hand-edited non-boolean value with Boolean()", () => {
    localStorage.setItem(EMAIL_STATE_KEY, JSON.stringify({ known: "yes", confirmed: 1 }));
    const state = readEmailSubscriptionState();
    expect(state).toEqual({ known: true, confirmed: true });
  });

  it("source has no TTL/expiry and never stores the address", () => {
    const src = readFileSync(join(__dirname, "subscriptionState.ts"), "utf8");
    expect(src).not.toMatch(/expires|ttl|stashedAt|maxAge/i);
    // "email" is unavoidable (file lives in lib/email/, type is
    // EmailSubscriptionState); what must never appear is an address field.
    expect(src).not.toMatch(/address/i);
  });
});
