import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import posthog from "posthog-js";
import { trackIntent, trackSystem } from "@/lib/analytics";

// ready() only needs `window` to exist; a bare stub keeps this in the default
// node environment (jsdom is not a dependency).
const g = globalThis as { window?: unknown };

/**
 * Events fired before PostHog initializes must be queued and flushed, not
 * dropped: React runs effects child-first, so mount-effect events always
 * beat PostHogProvider's init (how the first detected_standalone install
 * event was lost).
 */
describe("pre-init event queue", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    g.window = {};
    posthog.__loaded = false;
  });
  afterEach(() => {
    vi.useRealTimers();
    delete g.window;
    posthog.__loaded = false;
    vi.restoreAllMocks();
  });

  it("queues events fired before init and flushes them once loaded", () => {
    const capture = vi.spyOn(posthog, "capture").mockImplementation(() => undefined);

    trackIntent("pwa_installed", { platform: "ios", outcome: "detected_standalone" });
    expect(capture).not.toHaveBeenCalled();

    posthog.__loaded = true;
    vi.advanceTimersByTime(300);

    expect(capture).toHaveBeenCalledWith("pwa_installed", {
      platform: "ios",
      outcome: "detected_standalone",
      event_category: "intent",
    });
  });

  it("delivers queued events in order along with post-init ones", () => {
    const capture = vi.spyOn(posthog, "capture").mockImplementation(() => undefined);

    trackSystem("saved_conditions_loaded", { count: 1, calm_count: 0, latency_ms: 5 });
    posthog.__loaded = true;
    trackIntent("favorite_toggled", { spot_id: 18 });
    vi.advanceTimersByTime(300);

    const names = capture.mock.calls.map((c) => c[0]);
    expect(names).toEqual(["favorite_toggled", "saved_conditions_loaded"]);
  });

  it("captures immediately when already loaded", () => {
    posthog.__loaded = true;
    const capture = vi.spyOn(posthog, "capture").mockImplementation(() => undefined);
    trackIntent("favorite_toggled", { spot_id: 1 });
    expect(capture).toHaveBeenCalledTimes(1);
  });

  it("emits email_confirm_resend_clicked as an intent event", () => {
    posthog.__loaded = true;
    const capture = vi.spyOn(posthog, "capture").mockImplementation(() => undefined);

    trackIntent("email_confirm_resend_clicked", {
      platform: "ios",
      trigger: "first_save",
      watched_count: 2,
    });

    expect(capture).toHaveBeenCalledWith("email_confirm_resend_clicked", {
      platform: "ios",
      trigger: "first_save",
      watched_count: 2,
      event_category: "intent",
    });

    trackIntent("email_confirm_failed", { reason: "stale_token" });

    expect(capture).toHaveBeenCalledWith("email_confirm_failed", {
      reason: "stale_token",
      event_category: "intent",
    });
  });
});
