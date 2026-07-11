import { describe, it, expect, vi, afterEach } from "vitest";
import {
  RESEND_COOLDOWN_MS,
  RESEND_SPAM_LINE,
  RESEND_LABEL,
  RESEND_SENDING_LABEL,
  RESEND_SENT_NOTE,
  RESEND_CONFIRMED_NOTE,
  RESEND_FAILED_NOTE,
  submitEmailCapture,
} from "./capture";

describe("copy constants", () => {
  it("RESEND_SPAM_LINE mentions spam or junk", () => {
    expect(RESEND_SPAM_LINE).toMatch(/spam|junk/i);
  });

  it("RESEND_LABEL is non-empty", () => {
    expect(RESEND_LABEL.length).toBeGreaterThan(0);
  });

  it("RESEND_COOLDOWN_MS is 20000", () => {
    expect(RESEND_COOLDOWN_MS).toBe(20000);
  });

  it("no exported string constant contains an em dash", () => {
    const strings = [
      RESEND_SPAM_LINE,
      RESEND_LABEL,
      RESEND_SENDING_LABEL,
      RESEND_SENT_NOTE,
      RESEND_CONFIRMED_NOTE,
      RESEND_FAILED_NOTE,
    ];
    for (const s of strings) {
      expect(s).not.toMatch(/—/);
    }
  });
});

describe("submitEmailCapture", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("posts to /api/email/subscribe with method POST, JSON content type, and the payload", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, status: "pending" }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    await submitEmailCapture("a@b.com", [1, 2], "anon-123");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/email/subscribe");
    expect(init.method).toBe("POST");
    expect(init.headers["Content-Type"]).toBe("application/json");
    const body = JSON.parse(init.body);
    expect(body).toEqual({ email: "a@b.com", watchedSpotIds: [1, 2], anonId: "anon-123" });
  });

  it("returns pending for an ok response with status pending", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, status: "pending" }),
    }) as unknown as typeof fetch;

    const result = await submitEmailCapture("a@b.com", [], null);
    expect(result).toEqual({ outcome: "pending", httpStatus: 200 });
  });

  it("returns already_confirmed for an ok response with status already_confirmed", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, status: "already_confirmed" }),
    }) as unknown as typeof fetch;

    const result = await submitEmailCapture("a@b.com", [], null);
    expect(result).toEqual({ outcome: "already_confirmed", httpStatus: 200 });
  });

  it("returns failed with the response status for a non-ok response", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({ error: "email alerts are disabled" }),
    }) as unknown as typeof fetch;

    const result = await submitEmailCapture("a@b.com", [], null);
    expect(result).toEqual({ outcome: "failed", httpStatus: 503 });
  });

  it("returns failed with null httpStatus when fetch rejects", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("network down")) as unknown as typeof fetch;

    const result = await submitEmailCapture("a@b.com", [], null);
    expect(result).toEqual({ outcome: "failed", httpStatus: null });
  });
});
