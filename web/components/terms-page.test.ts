import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "..");
const terms = fs.readFileSync(path.join(ROOT, "app", "terms", "page.tsx"), "utf-8");
const spotList = fs.readFileSync(path.join(ROOT, "components", "SpotList.tsx"), "utf-8");
const homeClient = fs.readFileSync(path.join(ROOT, "components", "HomeClient.tsx"), "utf-8");
const installPrompt = fs.readFileSync(path.join(ROOT, "components", "InstallPrompt.tsx"), "utf-8");

describe("item 35: /terms page (D25, container shipped, assent line HELD)", () => {
  it("ships the assented release clauses", () => {
    expect(terms).toContain("Terms of Use and Release");
    expect(terms).toMatch(/assumption of inherent risk/i);
    expect(terms).toMatch(/release, waive, and agree\s+not to sue/i);
    expect(terms).toMatch(/AS IS/);
    expect(terms).toMatch(/indemnify and hold harmless/i);
    expect(terms).toMatch(/governing law/i);
  });

  it("interlocks with the safety disclaimer wording (does not contradict it)", () => {
    expect(terms).toContain("guidance only, never a safety guarantee");
  });

  it("leaks none of the D25-held or draft-only content", () => {
    // Attorney bracket notes, the Civil Code 1542 quote/waiver, and the [DATE]/
    // [COUNTY] placeholders must never reach the public page.
    expect(terms).not.toContain("ATTORNEY");
    expect(terms).not.toContain("1542");
    expect(terms).not.toMatch(/\[DATE\]|\[COUNTY\]/);
    expect(terms).not.toContain("—"); // house rule: no em dashes
  });

  it("is linked from both footers", () => {
    expect(spotList).toContain('href="/terms"');
    expect(homeClient).toContain('href="/terms"');
  });

  it("does NOT ship the enrollment assent line (held for attorney per D25 Q1)", () => {
    // The sign-in-wrap "By turning on alerts, you agree to our Terms" line stays
    // out of InstallPrompt until the attorney blesses the waiver.
    expect(installPrompt).not.toMatch(/agree to (our|the) Terms/i);
  });
});
