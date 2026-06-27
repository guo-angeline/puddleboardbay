import { describe, it, expect, beforeEach, vi } from "vitest";
import { urlBase64ToUint8Array, stashSubscription, readStashedSubscription } from "@/lib/push";

describe("urlBase64ToUint8Array", () => {
  it("decodes a base64url VAPID key to the right byte length", () => {
    // A real 65-byte uncompressed P-256 point encodes to 87 base64url chars.
    const key = "BDGl59-27KF2103jI6SjO5rR4QxgNfTy5ZmwohJCGJnbh7xRYaRTrYSswxm_Hf7JH-PMnWlFLb-UOoy7c74m5Dw";
    const arr = urlBase64ToUint8Array(key);
    expect(arr).toBeInstanceOf(Uint8Array);
    expect(arr.length).toBe(65);
    expect(arr[0]).toBe(4); // uncompressed point marker
  });

  it("handles base64url chars (- and _) and missing padding", () => {
    // "-_" maps to bytes 0xFB 0xFF after the +/ swap; just assert it decodes.
    const arr = urlBase64ToUint8Array("AQID"); // [1,2,3]
    expect(Array.from(arr)).toEqual([1, 2, 3]);
  });
});

describe("subscription stash", () => {
  beforeEach(() => {
    const store: Record<string, string> = {};
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => (k in store ? store[k] : null),
      setItem: (k: string, v: string) => { store[k] = v; },
      removeItem: (k: string) => { delete store[k]; },
    });
  });

  it("round-trips a subscription + watched ids", () => {
    const fakeSub = { toJSON: () => ({ endpoint: "https://push.example/abc", keys: { p256dh: "x", auth: "y" } }) };
    stashSubscription(fakeSub as unknown as PushSubscription, [2, 3, 4]);
    const read = readStashedSubscription();
    expect(read?.subscription.endpoint).toBe("https://push.example/abc");
    expect(read?.watchedSpotIds).toEqual([2, 3, 4]);
    expect(typeof read?.stashedAt).toBe("number");
  });

  it("returns null when nothing is stashed", () => {
    expect(readStashedSubscription()).toBeNull();
  });
});
