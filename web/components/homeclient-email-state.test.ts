import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const src = fs.readFileSync(path.resolve(__dirname, "HomeClient.tsx"), "utf-8");

describe("HomeClient email-state wiring and token strip (item 47)", () => {
  it("imports cacheEmailSubscriptionState from @/lib/email/subscriptionState", () => {
    expect(src).toContain('import { cacheEmailSubscriptionState } from "@/lib/email/subscriptionState";');
  });

  it("calls cacheEmailSubscriptionState at least twice, one per write point", () => {
    const matches = src.match(/cacheEmailSubscriptionState\(/g) || [];
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });

  it("caches confirmed:true on the confirm landing", () => {
    expect(src).toContain("cacheEmailSubscriptionState({ known: true, confirmed: true })");
  });

  it("strips the t param from the URL via history.replaceState", () => {
    expect(src).toContain('params.delete("t")');
    expect(src).toContain("window.history.replaceState");
  });

  it("issues the open ping before stripping the token (order is load-bearing)", () => {
    const reportIdx = src.indexOf("reportEmailOpen(");
    const deleteIdx = src.indexOf('params.delete("t")');
    expect(reportIdx).toBeGreaterThan(-1);
    expect(deleteIdx).toBeGreaterThan(-1);
    expect(reportIdx).toBeLessThan(deleteIdx);
  });

  it("does not gate the strip on the async response resolving", () => {
    // The strip must not live inside the .then() callback: a slow or failed
    // /api/email/opened must never leave the token in the URL.
    expect(/\.then\([\s\S]{0,400}params\.delete/.test(src)).toBe(false);
  });

  it("does not strip the other deep-link params", () => {
    expect(src).not.toContain('params.delete("spot")');
    expect(src).not.toContain('params.delete("from")');
    expect(src).not.toContain('params.delete("v")');
    expect(src).not.toContain('params.delete("pt")');
  });
});
