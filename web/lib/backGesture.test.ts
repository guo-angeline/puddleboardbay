import { describe, it, expect } from "vitest";
import {
  BACK_SWIPE_CONFIG,
  isEdgeStart,
  decidePhase,
  shouldTriggerOnMove,
  shouldTriggerOnEnd,
} from "@/lib/backGesture";

describe("BACK_SWIPE_CONFIG", () => {
  it("has the brief's exact numeric values", () => {
    expect(BACK_SWIPE_CONFIG).toEqual({
      edgeZonePx: 24,
      decidePx: 10,
      directionRatio: 1.5,
      minDxTrigger: 60,
      flickMinDx: 24,
      flickMaxMs: 200,
      popstateFallbackMs: 400,
    });
  });
});

describe("isEdgeStart", () => {
  it("is true for a touch well inside the edge zone", () => {
    expect(isEdgeStart(5, 0)).toBe(true);
  });

  it("is false for a touch far from the edge", () => {
    expect(isEdgeStart(200, 0)).toBe(false);
  });

  it("widens the zone by the safe-area inset", () => {
    expect(isEdgeStart(30, 10)).toBe(true);
  });
});

describe("decidePhase", () => {
  it("stays tracking below the decide threshold", () => {
    expect(decidePhase(2, 3)).toBe("tracking");
  });

  it("commits a clear horizontal left-to-right drag", () => {
    expect(decidePhase(80, 10)).toBe("committed");
  });

  it("rejects a mostly-vertical swipe, preserving list scroll", () => {
    expect(decidePhase(10, 120)).toBe("rejected");
  });

  it("rejects a right-to-left drag", () => {
    expect(decidePhase(-80, 5)).toBe("rejected");
  });

  it("rejects when dx does not exceed dy * directionRatio", () => {
    expect(decidePhase(30, 30)).toBe("rejected");
  });
});

describe("shouldTriggerOnMove", () => {
  it("triggers at the minDxTrigger threshold", () => {
    expect(shouldTriggerOnMove(60)).toBe(true);
  });

  it("does not trigger just below the threshold", () => {
    expect(shouldTriggerOnMove(59)).toBe(false);
  });
});

describe("shouldTriggerOnEnd", () => {
  it("triggers on a fast short flick", () => {
    expect(shouldTriggerOnEnd(30, 150)).toBe(true);
  });

  it("does not trigger when the flick is too slow", () => {
    expect(shouldTriggerOnEnd(30, 250)).toBe(false);
  });

  it("does not trigger when the movement is too short", () => {
    expect(shouldTriggerOnEnd(20, 100)).toBe(false);
  });
});
