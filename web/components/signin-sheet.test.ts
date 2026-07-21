import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// Item 44 (email-first revision): email is the DEFAULT sign-in path and Google
// is secondary. These guards lock in the ordering and the code-not-link choice,
// because both are easy to silently regress in a later UI edit.
const sheet = fs.readFileSync(path.resolve(__dirname, "SignInSheet.tsx"), "utf-8");
const hook = fs.readFileSync(path.resolve(__dirname, "../lib/useAccount.ts"), "utf-8");
const button = fs.readFileSync(path.resolve(__dirname, "AccountButton.tsx"), "utf-8");

describe("sign-in is email-first (item 44 revision)", () => {
  it("offers email BEFORE Google in the markup", () => {
    const emailAt = sheet.indexOf('id="signin-email"');
    const googleAt = sheet.indexOf("Continue with Google");
    expect(emailAt).toBeGreaterThan(-1);
    expect(googleAt).toBeGreaterThan(-1);
    expect(emailAt).toBeLessThan(googleAt);
  });

  it("uses a typed 6-digit code, not a magic link", () => {
    expect(hook).toContain("signInWithOtp");
    expect(hook).toContain("verifyOtp");
    // A magic link would set emailRedirectTo; a code flow must not.
    expect(hook).not.toContain("emailRedirectTo");
    expect(sheet).toContain('autoComplete="one-time-code"');
    expect(sheet).toContain('inputMode="numeric"');
    expect(sheet).toMatch(/maxLength=\{CODE_LENGTH\}/);
    expect(sheet).toMatch(/const CODE_LENGTH = 6/);
  });

  it("keeps Google available as a secondary path", () => {
    expect(hook).toContain("signInWithOAuth");
    expect(sheet).toContain("signInWithGoogle");
  });

  it("verifies against every OTP type, not just 'email'", () => {
    // Supabase issues "magiclink" for an address that already has an account
    // and "signup" for a new one. Verifying only as "email" reports a fresh,
    // correct code as "Token has expired or is invalid". Real failure, guarded.
    expect(hook).toMatch(/const types = \["email", "magiclink", "signup"\] as const/);
    expect(hook).toMatch(/for \(const type of types\)/);
  });

  it("tags both sign-in paths with a method for comparison", () => {
    expect(hook).toContain('trackIntent("account_sign_in_started", { method: "email" })');
    expect(hook).toContain('trackIntent("account_sign_in_started", { method: "google" })');
    expect(hook).toContain('trackIntent("account_sign_in_completed", { method: "email" })');
  });

  it("is a real modal dialog with focus restore and Escape (item 70 pattern)", () => {
    expect(sheet).toContain('role="dialog"');
    expect(sheet).toContain('aria-modal="true"');
    expect(sheet).toContain('aria-labelledby="signin-title"');
    expect(sheet).toMatch(/e\.key === "Escape"/);
    expect(sheet).toContain("opener.focus({ preventScroll: true })");
  });

  it("still renders nothing without the kill switch or auth env", () => {
    expect(button).toMatch(/if \(!enabledSwitch \|\| !enabled \|\| loading\) return null/);
  });

  it("signed-in state separates identity from the Sign out action", () => {
    // The first version rendered one pill reading "name Sign out", which read
    // as a single ambiguous control.
    expect(button).toMatch(/>\s*Sign out\s*<\/button>/);
    expect(button).toMatch(/title=\{user\.email \?\? undefined\}/);
  });
});
