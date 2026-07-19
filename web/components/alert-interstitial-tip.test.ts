import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { launchDirectionTip } from "@/lib/launchDirection";

/**
 * AlertInterstitial is a client component with async effects and no existing
 * full-mount render test (house pattern tests logic, not mount: see
 * components/*.test.ts). A full-mount render test that exercises the
 * getNextWindow().then() resolution timing is infeasible under the current
 * vitest setup (no jsdom/testing-library harness wired for this component),
 * so this pins two things instead: (1) the exact boolean contract the
 * component's render and its `launch_tip_shown` analytics prop both derive
 * from (`launchDirectionTip(...) !== null`), and (2) via source inspection,
 * that the component actually wires that contract into the render tree and
 * into the analytics call (source-string assertions, same pattern as
 * map-legend-stacking.test.ts).
 */
const interstitialSrc = fs.readFileSync(path.resolve(__dirname, "AlertInterstitial.tsx"), "utf-8");
const analyticsSrc = fs.readFileSync(path.resolve(__dirname, "..", "lib", "analytics.ts"), "utf-8");

describe("AlertInterstitial launch-direction tip contract", () => {
  it("renders/reports true for a qualifying direction and wind", () => {
    expect(launchDirectionTip("WNW", 12) !== null).toBe(true);
  });

  it("renders/reports false when direction is empty", () => {
    expect(launchDirectionTip("", 12) !== null).toBe(false);
  });

  it("renders/reports false when wind is under the 5 mph threshold", () => {
    expect(launchDirectionTip("WNW", 3) !== null).toBe(false);
  });

  it("imports launchDirectionTip and derives a tip from the resolved window", () => {
    expect(interstitialSrc).toContain('import { launchDirectionTip } from "@/lib/launchDirection"');
    expect(interstitialSrc).toMatch(/launchDirectionTip\(nextWindow\.windDirection,\s*nextWindow\.maxWindMph\)/);
  });

  it("renders the tip as a third subline paragraph using the existing subline classes", () => {
    expect(interstitialSrc).toMatch(/\{tip\s*&&\s*<p className="text-white\/85 text-sm mt-0\.5">\{tip\}<\/p>\}/);
  });

  it("does not fire alert_interstitial_shown from the bare mount effect", () => {
    const mountEffect = interstitialSrc.match(/useEffect\(\(\) => \{\s*trackIntent\("alert_interstitial_shown"[\s\S]*?\}, \[spot\.id\]\);/);
    expect(mountEffect).toBeNull();
  });

  it("fires alert_interstitial_shown with launch_tip_shown once the window resolves", () => {
    expect(interstitialSrc).toMatch(/trackIntent\("alert_interstitial_shown",\s*\{\s*spot_id:\s*spot\.id,\s*launch_tip_shown[^}]*\}\)/);
  });
});

describe("alert_interstitial_shown analytics prop", () => {
  it("EventPropMap requires a launch_tip_shown boolean alongside spot_id", () => {
    expect(analyticsSrc).toMatch(/alert_interstitial_shown:\s*\{\s*spot_id:\s*number;\s*launch_tip_shown:\s*boolean\s*\}/);
  });
});
