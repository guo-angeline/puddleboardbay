import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const spotListSrc = fs.readFileSync(path.resolve(__dirname, "SpotList.tsx"), "utf-8");

describe("SpotList alerts-on indicator covers the email channel (item 47)", () => {
  it("computes alertsOn as push OR email confirmed, not push only", () => {
    expect(spotListSrc).toContain("readStashedSubscription() || isEmailConfirmed()");
  });

  it("imports isEmailConfirmed from @/lib/email/subscriptionState", () => {
    expect(spotListSrc).toMatch(
      /import\s*\{\s*isEmailConfirmed\s*\}\s*from\s*["']@\/lib\/email\/subscriptionState["']/
    );
  });

  it("still sets alertsOn only inside an effect, not at render", () => {
    const setAlertsOnCalls = spotListSrc.match(/setAlertsOn\(/g) ?? [];
    expect(setAlertsOnCalls.length).toBe(1);

    const setAlertsOnIndex = spotListSrc.indexOf("setAlertsOn(");
    const firstUseEffectIndex = spotListSrc.indexOf("useEffect");
    expect(firstUseEffectIndex).toBeGreaterThan(-1);
    expect(setAlertsOnIndex).toBeGreaterThan(firstUseEffectIndex);
  });

  it("keeps the existing ptw:alertsenabled listener (no second listener/event)", () => {
    expect(spotListSrc).toContain('addEventListener("ptw:alertsenabled"');
  });

  it("keeps the Turn on alerts button gated on !alertsOn, and adds no second affordance", () => {
    expect(spotListSrc).toContain("{!alertsOn &&");
    expect(spotListSrc).toContain("Turn on alerts");
    expect(spotListSrc).not.toContain("Add push");
  });
});
