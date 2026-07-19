import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "../..");
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf-8");

describe("reportEmailOpen (item 47)", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    global.fetch = originalFetch;
  });

  it("resolves to {known:true,confirmed:true} when fetch resolves ok with that JSON", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ known: true, confirmed: true }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const { reportEmailOpen } = await import("./client");
    const result = await reportEmailOpen("tok-123", 42);
    expect(result).toEqual({ known: true, confirmed: true });
  });

  it("resolves to null when res.ok is false", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ known: true, confirmed: true }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const { reportEmailOpen } = await import("./client");
    const result = await reportEmailOpen("tok-123", 42);
    expect(result).toBeNull();
  });

  it("resolves to null (does not reject) when fetch rejects", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("network down"));
    vi.stubGlobal("fetch", fetchMock);
    const { reportEmailOpen } = await import("./client");
    await expect(reportEmailOpen("tok-123", 42)).resolves.toBeNull();
  });

  it("resolves to null when the body is not JSON", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => {
        throw new SyntaxError("Unexpected token");
      },
    });
    vi.stubGlobal("fetch", fetchMock);
    const { reportEmailOpen } = await import("./client");
    const result = await reportEmailOpen("tok-123", 42);
    expect(result).toBeNull();
  });

  it("resolves to null for an empty token without calling fetch", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { reportEmailOpen } = await import("./client");
    const result = await reportEmailOpen("", 42);
    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("POSTs with keepalive:true and the {token, spot_id} body", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ known: false, confirmed: false }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const { reportEmailOpen } = await import("./client");
    await reportEmailOpen("tok-abc", 7);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/email/opened",
      expect.objectContaining({
        method: "POST",
        keepalive: true,
        body: JSON.stringify({ token: "tok-abc", spot_id: 7 }),
      }),
    );
  });
});

describe("/api/email/opened response shape", () => {
  const src = read("app/api/email/opened/route.ts");

  it("responds with NextResponse.json, not a bare 204", () => {
    expect(src).toContain("NextResponse.json");
    expect(src).not.toMatch(/status:\s*204/);
  });

  it("selects confirmed_at and enabled from the row", () => {
    expect(src).toMatch(/select\(\s*["'`]id,\s*confirmed_at,\s*enabled["'`]\s*\)/);
    expect(src).toContain(".maybeSingle()");
  });

  it("uses the email_subscriptions table, never email_subscribers", () => {
    expect(src).toContain("email_subscriptions");
    expect(src).not.toContain("email_subscribers");
  });

  it("gates confirmed on enabled, never confirmed_at alone", () => {
    expect(src).toMatch(/confirmed:\s*sub\.enabled\s*===\s*true\s*&&\s*sub\.confirmed_at\s*!=\s*null/);
    expect(src).not.toMatch(/confirmed:\s*sub\.confirmed_at\s*!=\s*null\s*[,}]/);
  });

  it("never returns the email address or any other column", () => {
    expect(src).not.toMatch(/\.select\(\s*["'`]email["'`]/);
    expect(src).not.toMatch(/json\(\{[^}]*email/i);
  });
});
