import { describe, it, expect, vi, afterEach } from "vitest";
import posthog from "posthog-js";
import { killSwitchOn } from "@/lib/experiments";

// killSwitchOn is a DEFAULT-ON kill switch: on unless the flag is explicitly
// false. This locks that semantics, since "fail closed" here would silently
// disable a shipped 100% rollout whenever flags are slow to load.
describe("killSwitchOn", () => {
  afterEach(() => vi.restoreAllMocks());

  it("is ON when the flag is unset (undefined) — fail-open while flags load", () => {
    vi.spyOn(posthog, "getFeatureFlag").mockReturnValue(undefined);
    expect(killSwitchOn("share-expand-sheet")).toBe(true);
  });

  it("is ON when the flag resolves truthy", () => {
    vi.spyOn(posthog, "getFeatureFlag").mockReturnValue(true);
    expect(killSwitchOn("share-expand-sheet")).toBe(true);
  });

  it("is OFF only when the flag is explicitly false", () => {
    vi.spyOn(posthog, "getFeatureFlag").mockReturnValue(false);
    expect(killSwitchOn("share-expand-sheet")).toBe(false);
  });
});
