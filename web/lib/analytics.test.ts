import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import posthog from "posthog-js";
import { trackIntent, trackSystem } from "@/lib/analytics";

const analyticsSrc = fs.readFileSync(
  path.resolve(__dirname, "analytics.ts"),
  "utf-8"
);

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

  it('emits alert_optin_shown with channel "both"', () => {
    const capture = vi.spyOn(posthog, "capture").mockImplementation(() => undefined);

    trackIntent("alert_optin_shown", { platform: "android", trigger: "first_save", channel: "both" });
    expect(capture).not.toHaveBeenCalled();

    posthog.__loaded = true;
    vi.advanceTimersByTime(300);

    expect(capture).toHaveBeenCalledWith("alert_optin_shown", {
      platform: "android",
      trigger: "first_save",
      channel: "both",
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

    trackSystem("email_confirm_failed", { reason: "stale_token" });

    expect(capture).toHaveBeenCalledWith("email_confirm_failed", {
      reason: "stale_token",
      event_category: "system",
    });
  });

  it("emits enrollment_prompt_suppressed as a SYSTEM event", () => {
    posthog.__loaded = true;
    const capture = vi.spyOn(posthog, "capture").mockImplementation(() => undefined);

    trackSystem("enrollment_prompt_suppressed", {
      trigger: "first_save",
      platform: "ios",
      reconciled_this_session: true,
    });

    expect(capture).toHaveBeenCalledWith("enrollment_prompt_suppressed", {
      trigger: "first_save",
      platform: "ios",
      reconciled_this_session: true,
      event_category: "system",
    });
  });

  it("emits enrollment_prompt_suppressed with platform unknown and a stale cache", () => {
    posthog.__loaded = true;
    const capture = vi.spyOn(posthog, "capture").mockImplementation(() => undefined);

    trackSystem("enrollment_prompt_suppressed", {
      trigger: "return_session",
      platform: "unknown",
      reconciled_this_session: false,
    });

    expect(capture).toHaveBeenCalledWith("enrollment_prompt_suppressed", {
      trigger: "return_session",
      platform: "unknown",
      reconciled_this_session: false,
      event_category: "system",
    });
  });
});

/**
 * Vitest strips types via esbuild and `next build` does not typecheck test
 * files, so a call-site test that only exercises the compiled runtime proves
 * nothing about which union `enrollment_prompt_suppressed` lives in: the
 * capture-based tests above pass identically whether the string sits in
 * SystemEventName or IntentEventName, because trackSystem/trackIntent are
 * plain functions at runtime with no type enforcement once transpiled. Only
 * `npx tsc --noEmit` catches a member moved to the wrong union, and no
 * project gate (npm test, npm run lint, npm run build) runs bare tsc against
 * test files. Sweep the source text directly so the guard bites under
 * `npm test`, per the house rule "tests must grep the tree, not your memory".
 */
describe("enrollment_prompt_suppressed source placement", () => {
  const systemBlock = analyticsSrc.slice(
    analyticsSrc.indexOf("type SystemEventName ="),
    analyticsSrc.indexOf("type IntentEventName =")
  );
  const intentBlock = analyticsSrc.slice(
    analyticsSrc.indexOf("type IntentEventName ="),
    analyticsSrc.indexOf("export type EventName =")
  );

  it("is a member of SystemEventName, not IntentEventName", () => {
    expect(systemBlock).toMatch(/\|\s*"enrollment_prompt_suppressed"/);
    expect(intentBlock).not.toMatch(/"enrollment_prompt_suppressed"/);
  });

  it("has an EventPropMap entry with trigger and platform (unknown included) and no channel prop", () => {
    const propMapBlock = analyticsSrc.slice(
      analyticsSrc.indexOf("interface EventPropMap"),
      analyticsSrc.indexOf("type PropsFor<E")
    );
    const entryStart = propMapBlock.indexOf("enrollment_prompt_suppressed:");
    expect(entryStart).toBeGreaterThan(-1);
    const entryEnd = propMapBlock.indexOf("};", entryStart) + 2;
    const entry = propMapBlock.slice(entryStart, entryEnd);

    expect(entry).toMatch(/platform:\s*"standalone"\s*\|\s*"ios"\s*\|\s*"android"\s*\|\s*"desktop"\s*\|\s*"unknown"/);
    expect(entry).toMatch(
      /trigger:\s*"first_save"\s*\|\s*"standalone_relaunch"\s*\|\s*"manual"\s*\|\s*"return_session"\s*\|\s*"conditions_interest"/
    );
    expect(entry).toMatch(/reconciled_this_session:\s*boolean/);
    expect(entry).not.toMatch(/channel:/);
  });
});
