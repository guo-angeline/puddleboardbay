// Pure, DOM-free left-edge back-swipe decision algorithm.
// No React, no window, no DOM types at module scope: safe to unit test in
// node and to share with any caller (touch handlers wire the DOM events,
// this module only decides what a set of coordinates/timings mean).

export const BACK_SWIPE_CONFIG = {
  edgeZonePx: 24, // + env(safe-area-inset-left) applied by the caller
  decidePx: 10, // px of movement before locking a direction
  directionRatio: 1.5, // |dx| must exceed |dy| * 1.5 to commit as horizontal back-swipe
  minDxTrigger: 60, // px: fires immediately on touchmove, does not wait for touchend
  flickMinDx: 24, // px: a fast short flick still counts if...
  flickMaxMs: 200, // ...it completes within this time (checked on touchend)
  popstateFallbackMs: 400, // consumed by the hook/history model, exported here as the single source
};

export type BackSwipeConfig = typeof BACK_SWIPE_CONFIG;

export type DecidePhase = "tracking" | "committed" | "rejected";

export function isEdgeStart(
  clientX: number,
  safeAreaLeftPx: number,
  config: BackSwipeConfig = BACK_SWIPE_CONFIG,
): boolean {
  return clientX <= config.edgeZonePx + safeAreaLeftPx;
}

export function decidePhase(
  dx: number,
  dy: number,
  config: BackSwipeConfig = BACK_SWIPE_CONFIG,
): DecidePhase {
  if (Math.max(Math.abs(dx), Math.abs(dy)) <= config.decidePx) {
    return "tracking";
  }
  return dx > 0 && Math.abs(dx) > Math.abs(dy) * config.directionRatio ? "committed" : "rejected";
}

export function shouldTriggerOnMove(
  dx: number,
  config: BackSwipeConfig = BACK_SWIPE_CONFIG,
): boolean {
  return dx >= config.minDxTrigger;
}

export function shouldTriggerOnEnd(
  dx: number,
  elapsedMs: number,
  config: BackSwipeConfig = BACK_SWIPE_CONFIG,
): boolean {
  return dx >= config.flickMinDx && elapsedMs <= config.flickMaxMs;
}
