import { describe, expect, it } from "vitest";
import { EXPERIMENTS } from "@/lib/experiments";

describe("EXPERIMENTS registry", () => {
  it("no longer registers enrollment_dual_cta (item 32 retired to 100% 2026-07-17)", () => {
    expect(EXPERIMENTS).not.toHaveProperty("enrollment_dual_cta");
  });

  it("keeps control-first ordering for every remaining experiment", () => {
    for (const def of Object.values(EXPERIMENTS)) {
      expect(def.variants[0]).toBe("control");
    }
  });
});
