import { describe, it, expect } from "vitest";
import { validateSubscribePayload } from "@/lib/subscribe-validation";

const good = {
  anonId: "abc-123",
  subscription: { endpoint: "https://push.example/x", keys: { p256dh: "p", auth: "a" } },
  watchedSpotIds: [2, 3],
};

describe("validateSubscribePayload", () => {
  it("accepts a well-formed payload", () => {
    const r = validateSubscribePayload(good);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.subscription.endpoint).toBe("https://push.example/x");
  });

  it("accepts a missing anonId (optional)", () => {
    const { ...noAnon } = good;
    delete (noAnon as { anonId?: string }).anonId;
    expect(validateSubscribePayload(noAnon).ok).toBe(true);
  });

  it("rejects a missing endpoint", () => {
    const bad = { ...good, subscription: { keys: { p256dh: "p", auth: "a" } } };
    const r = validateSubscribePayload(bad);
    expect(r.ok).toBe(false);
  });

  it("rejects missing keys", () => {
    const bad = { ...good, subscription: { endpoint: "https://push.example/x" } };
    expect(validateSubscribePayload(bad).ok).toBe(false);
  });

  it("rejects non-numeric watchedSpotIds", () => {
    const bad = { ...good, watchedSpotIds: [2, "x"] };
    expect(validateSubscribePayload(bad).ok).toBe(false);
  });

  it("rejects a non-object body", () => {
    expect(validateSubscribePayload(null).ok).toBe(false);
    expect(validateSubscribePayload("nope").ok).toBe(false);
  });

  it("defaults watchedSpotIds to [] when absent", () => {
    const r = validateSubscribePayload({ subscription: good.subscription });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.watchedSpotIds).toEqual([]);
  });
});
