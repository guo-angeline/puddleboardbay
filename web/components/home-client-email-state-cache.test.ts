import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const src = fs.readFileSync(path.resolve(__dirname, "HomeClient.tsx"), "utf-8");

describe("HomeClient wires the email subscription state cache (item 47)", () => {
  it("imports cacheEmailSubscriptionState from @/lib/email/subscriptionState", () => {
    expect(src).toMatch(
      /import\s*\{\s*cacheEmailSubscriptionState\s*\}\s*from\s*["']@\/lib\/email\/subscriptionState["']/
    );
  });

  it("caches confirmed:true on the ?email_confirmed=1 landing", () => {
    const landingIdx = src.indexOf('params.get("email_confirmed") !== "1"');
    expect(landingIdx).toBeGreaterThan(-1);
    const cacheIdx = src.indexOf("cacheEmailSubscriptionState({ known: true, confirmed: true })");
    expect(cacheIdx).toBeGreaterThan(landingIdx);
  });

  it("caches the resolved state from a from=email open, without persisting the token or address", () => {
    const emailBranchIdx = src.indexOf('from === "email"');
    expect(emailBranchIdx).toBeGreaterThan(-1);
    const branchSrc = src.slice(emailBranchIdx);
    // found?.id, not found.id: this ping must fire even when the spot didn't
    // resolve (hidden after the send), see the HomeClient-email-token-strip
    // regression test for why.
    expect(branchSrc).toMatch(/reportEmailOpen\(token,\s*found\?\.id\)\s*\.then\(\s*\(state\)\s*=>\s*\{/);
    expect(branchSrc).toContain("cacheEmailSubscriptionState(state)");
  });

  it("strips the t param from the URL synchronously right after firing the open ping, not inside the async .then()", () => {
    const emailBranchIdx = src.indexOf('from === "email"');
    const thenIdx = src.indexOf(".then(", emailBranchIdx);
    const thenCloseIdx = src.indexOf("});", thenIdx) + "});".length;
    const deleteIdx = src.indexOf('params.delete("t")', thenCloseIdx);
    const replaceStateIdx = src.indexOf("window.history.replaceState", deleteIdx);
    expect(thenIdx).toBeGreaterThan(emailBranchIdx);
    // params.delete("t") and the replaceState call sit AFTER the complete
    // reportEmailOpen(...).then(...) statement, not nested inside its
    // callback, so they run synchronously on this pass, before PostHogProvider's
    // later-mounting effect can capture $current_url with a live t= in it.
    expect(deleteIdx).toBeGreaterThan(thenCloseIdx);
    expect(replaceStateIdx).toBeGreaterThan(deleteIdx);
  });

  it("no longer fires the open ping without deleting t from the URL (old bare call is gone)", () => {
    expect(src).not.toMatch(/if\s*\(token\)\s*reportEmailOpen\(token,\s*found\.id\);/);
  });
});
