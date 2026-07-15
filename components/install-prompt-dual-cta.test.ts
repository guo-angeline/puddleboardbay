import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const src = fs.readFileSync(path.resolve(__dirname, "InstallPrompt.tsx"), "utf-8");

describe("InstallPrompt dual-CTA (item 32, enrollment_dual_cta flag)", () => {
  it("wires the enrollment_dual_cta experiment and exposure logging", () => {
    expect(src).toContain('useExperiment("enrollment_dual_cta")');
    expect(src).toContain("logExposure");
  });

  it("emits the channel:\"both\" dual-CTA value alongside the existing leadChannel fallback", () => {
    expect(src).toContain('"both"');
    expect(src).toContain("leadChannel");
  });

  it("has the treatment push button labels", () => {
    expect(src).toContain("Turn on push");
    expect(src).toContain("Turning on...");
    expect(src).toContain("Add to Home Screen for push");
  });

  it("has the treatment shared subheads", () => {
    expect(src).toContain("Push or email, your call. We'll let you know when a spot's good to paddle.");
    expect(src).toContain("Push or email, your call. Install for push, or leave your email below.");
    expect(src).toContain("Push or email, your call.");
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
    expect(src).toContain("🚣");
  });

  it("has no em dashes and never uses 'Calm' for the alert promise", () => {
    expect(src).not.toContain("—");
    expect(src).not.toContain("Calm");
  });
});
