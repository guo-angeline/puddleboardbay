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

  it("has the unified dual-CTA subhead (item 66 copy)", () => {
    // Item 66 unified the three platform sublines to one short line.
    expect(src).toContain("Push or email, your call.");
    expect(src).toContain("Get alerts for your spots");
    expect(src).toContain("Turn on alerts for your spots");
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
