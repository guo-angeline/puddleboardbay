import { describe, expect, it } from "vitest";
import { EXPERIMENTS } from "@/lib/experiments";

describe("EXPERIMENTS registry", () => {
  it("registers enrollment_dual_cta with control-first variants", () => {
    expect(EXPERIMENTS.enrollment_dual_cta).toMatchObject({
      flag: "enrollment-dual-cta",
      variants: ["control", "treatment"],
      primaryMetric: "alert_optin_result",
      guardrails: ["email_capture_submitted", "alert_optin_dismissed"],
    });
    expect(EXPERIMENTS.enrollment_dual_cta.variants[0]).toBe("control");
  });
});
