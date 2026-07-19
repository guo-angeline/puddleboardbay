import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const src = fs.readFileSync(path.resolve(__dirname, "InstallPrompt.tsx"), "utf-8");

describe("InstallPrompt dual-CTA (item 32, shipped at 100%)", () => {
  it("no longer gates the dual-CTA card behind an experiment flag", () => {
    // Retired to 100% 2026-07-17 (owner: no A/B until DAU > 100). The card must
    // render unconditionally on mobile, not behind useExperiment/logExposure.
    expect(src).not.toContain("useExperiment");
    expect(src).not.toContain("logExposure");
    expect(src).not.toContain("enrollment_dual_cta");
  });

  it("emits the channel:\"both\" dual-CTA value alongside the existing leadChannel fallback", () => {
    expect(src).toContain('"both"');
    expect(src).toContain("leadChannel");
  });

  it("has the treatment push button labels (item 66 copy)", () => {
    expect(src).toContain("Turn on push");
    expect(src).toContain("Turning on...");
    expect(src).toContain("Add to Home Screen");
    expect(src).toContain("Install app");
  });

  it("headline names the value (good to paddle), subhead names the channel choice (item 66)", () => {
    // Item 66 (owner copy fix 2026-07-18): the headline must say WHAT the alert
    // is for (good paddling conditions), not just "your spots". The channel
    // choice lives in the one-line subhead.
    expect(src).toContain("Push or email, your call.");
    expect(src).toContain("Get alerts when your spots are good to paddle");
    expect(src).toContain("is good to paddle"); // the first_save personalized headline
    // The vague pre-fix headlines must be gone.
    expect(src).not.toContain("Get alerts for your spots");
    expect(src).not.toContain("Turn on alerts for your spots");
  });

  it("dropped the email-frequency reassurance filler (item 66, owner)", () => {
    expect(src).not.toContain("One email a day, max, for the spots you watch");
    // The safety line stays (item 34), byte-identical to ConditionsPanel.
    expect(src).toContain("Guidance only, not a safety guarantee. Conditions shift fast on the water.");
  });

  it("renders an 'or' divider between the two channels", () => {
    expect(src).toContain(">or<");
  });

  it("preserves the platform detection, snooze/denied gating, and core handlers", () => {
    expect(src).toContain("isIOS");
    expect(src).toContain("isDesktopUA");
    expect(src).toContain("isInStandaloneMode");
    expect(src).toContain("DENIED_KEY");
    expect(src).toContain("SNOOZE_KEY");
    expect(src).toContain("handleEnable");
    expect(src).toContain("handleInstall");
    expect(src).toContain("handleDismiss");
  });

  it("has no em dashes and never uses 'Calm' for the alert promise", () => {
    expect(src).not.toContain("—");
    expect(src).not.toContain("Calm");
  });
});
