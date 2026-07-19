import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const src = fs.readFileSync(path.resolve(__dirname, "InstallPrompt.tsx"), "utf-8");

describe("return_session enrollment-prompt frequency cap (item 67)", () => {
  it("has a once-per-session module guard for return_session", () => {
    // Mirrors ConditionsPanel's conditionsInterestFired; without it the
    // [platform] effect re-showed on every qualifying mount (one user saw it 31x).
    expect(src).toMatch(/let\s+returnSessionShownThisSession\s*=\s*false/);
    expect(src).toContain("if (returnSessionShownThisSession) return;");
    expect(src).toContain("returnSessionShownThisSession = true;");
  });

  it("has a persistent show-based back-off so an ignored (never-dismissed) offer is not re-shown indefinitely", () => {
    expect(src).toContain("RETURN_BACKOFF_KEY");
    expect(src).toContain("returnOfferedUntil()");
    // written WHEN SHOWN, not only on dismiss
    expect(src).toMatch(/localStorage\.setItem\(RETURN_BACKOFF_KEY/);
    expect(src).toMatch(/Date\.now\(\)\s*<\s*returnOfferedUntil\(\)/);
  });
});
