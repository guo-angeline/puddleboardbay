import posthog from "posthog-js";
import type { Paddleability } from "@/lib/conditions";

/**
 * Thin, type-safe wrapper around PostHog. Every call is a no-op until PostHog
 * is initialized (see components/PostHogProvider.tsx), and stays a no-op when
 * NEXT_PUBLIC_POSTHOG_KEY is unset, so the app runs fine without analytics.
 *
 * Events are split into two categories so "data became available" can never be
 * read as "a human looked" (the bug that made `conditions_viewed` count fetch
 * settles, not engagement):
 *
 * - SYSTEM events (`trackSystem`) auto-fire when data settles. They describe the
 *   system — availability, latency, failure — never intent. Name them with
 *   data-lifecycle verbs: `_loaded`, `_failed`.
 * - INTENT events (`trackIntent`) fire only on a deliberate human act: a click,
 *   toggle, typed query, or a dwell-gated genuine view (see lib/useGenuineView).
 *   Name them with human verbs: `_viewed`, `_clicked`, `_toggled`, `_changed`.
 *
 * Each wrapper stamps `event_category` so a SYSTEM event can never be silently
 * counted as engagement in a query or dashboard. Any change here must be logged
 * in analytics/INSTRUMENTATION_CHANGELOG.md (a guard hook will remind you).
 */

/** Where a spot_viewed open originated, for funnel segmentation. */
export type SpotViewedSource = "list" | "map" | "deeplink" | "alert" | "related";

/**
 * SYSTEM / availability events. Auto-fire on data settling. Emit via
 * `trackSystem`. These measure reliability, not user attention.
 */
type SystemEventName =
  // Live tide/wind fetch settled for the open spot. Fires once per spot open
  // regardless of whether the user ever looks at the panel — it is an
  // availability signal (fetch success rate, latency), NOT engagement.
  | "conditions_loaded"
  // Saved-spots conditions batch resolved on app load. Availability only.
  | "saved_conditions_loaded"
  // The POST persisting a push subscription to /api/alerts/subscribe failed.
  // Without this, a "granted" opt-in that never reached the backend is
  // indistinguishable from a working one. Success is silent; failure is loud.
  | "alert_subscribe_failed";

/**
 * INTENT / engagement events. Fire only on a deliberate user act or a
 * dwell-gated genuine view. Emit via `trackIntent`.
 */
type IntentEventName =
  | "spot_viewed"
  // Bottom-of-funnel intent: clicking Get Directions / Share / Photos in the
  // spot drawer (the real "I'm going here" signals, distinguished by `action`).
  | "spot_action"
  | "filter_changed"
  | "spot_search"
  | "near_me_toggled"
  | "favorite_toggled"
  // The "Your saved spots" section was genuinely scrolled into view (dwell-gated
  // via lib/useGenuineView). The real "I came back to check my spots" signal —
  // distinct from `saved_conditions_loaded`, which only means the data resolved.
  | "saved_conditions_viewed"
  | "feedback_opened"
  | "view_switched"
  // The "Paddle to Water" wordmark in the header was clicked to return home
  // (resets filters/selection via a full navigation to "/").
  | "nav_home_clicked"
  // Actual installs only (Chromium appinstalled event, or an iOS install
  // detected on first standalone launch), plus the declined native dialog
  // (outcome: "dismissed"). The old auto-shown banner event `pwa_prompt_shown`
  // is gone; prompt exposure is `alert_optin_shown` now.
  | "pwa_installed"
  // Mobile bottom-sheet drag: did people discover expand-to-full, and how do
  // they close the sheet (drag vs button)?
  | "spot_sheet_resized"
  | "spot_sheet_dismissed"
  // The live-conditions panel was genuinely viewed: on screen, dwell-gated.
  // This is the true engagement metric and is much smaller than the old
  // fetch-settle count — that's the point. Pairs with `conditions_loaded`.
  | "conditions_viewed"
  // Stage B push opt-in: the alert prompt was shown (after first save), and the
  // result of attempting to enable notifications. `result` distinguishes
  // granted / denied / unsupported / install_needed so we can see where the
  // funnel leaks.
  | "alert_optin_shown"
  | "alert_optin_result"
  | "alert_optin_dismissed"
  // Fired when the app is opened from a push notification (URL contains from=alert).
  | "alert_clicked"
  // The alert deep-link interstitial (treatment variant) rendered over the
  // spot drawer: an alert-originated open with a window label to show.
  | "alert_interstitial_shown"
  // How the interstitial was left: dismissed with no further action, or the
  // user tapped through to directions.
  | "alert_interstitial_result"
  // Dwell-gated genuine view of the "Next good window" block in the spot
  // drawer (see lib/useGenuineView). Treatment-only diagnostic for the
  // next_good_window experiment, not the experiment's primary metric.
  | "next_window_viewed"
  // Experiment exposure: fired once per session when a variant-dependent UI
  // actually renders (see lib/experiments.ts). Exposure = the user saw the
  // treatment, not merely that they were bucketed.
  | "experiment_exposed";

export type EventName = SystemEventName | IntentEventName;

/**
 * Required-prop contracts for the events that carry load-bearing semantics.
 * Events not listed fall back to a loose prop bag. Extend this when you add a
 * metric a report depends on, so call sites can't omit a needed property.
 */
interface EventPropMap {
  conditions_loaded: {
    spot_id: number;
    latency_ms: number;
    failed: boolean;
    paddleability: Paddleability;
    has_tides: boolean;
    has_wind: boolean;
    surface: "spot_drawer";
  };
  conditions_viewed: {
    spot_id: number;
    region: string;
    difficulty: string;
    paddleability: Paddleability;
    /** Was conditions data actually present when the panel was seen. */
    had_data: boolean;
  };
  saved_conditions_loaded: { count: number; calm_count: number; latency_ms: number };
  alert_subscribe_failed: { status: number | null; watched_count: number };
  saved_conditions_viewed: { count: number; calm_count: number };
  // Values mirror lib/push.ts OptInResult; kept inline to avoid a cycle
  // (push.ts imports trackSystem from this module).
  alert_optin_shown: {
    platform: "standalone" | "ios" | "android";
    // What surfaced the prompt: the first save (item 1), an installed standalone
    // relaunch re-offer (item 14), or an explicit tap on the always-available
    // "Turn on alerts" entry point in the saved-spots header (item 15).
    trigger: "first_save" | "standalone_relaunch" | "manual" | "return_session";
  };
  // Prompt dismissed (item 15): dismissal is a 14-day snooze, not a permanent
  // kill. `trigger` is which surfacing was dismissed.
  alert_optin_dismissed: {
    platform: "standalone" | "ios" | "android";
    trigger: "first_save" | "standalone_relaunch" | "manual" | "return_session";
  };
  alert_optin_result: {
    platform: "standalone" | "ios" | "android";
    result: "granted" | "denied" | "unsupported";
  };
  alert_interstitial_shown: { spot_id: number };
  alert_interstitial_result: { spot_id: number; outcome: "dismissed" | "reminder" };
  next_window_viewed: {
    spot_id: number;
    region: string;
    difficulty: string;
    /** Block rendered with a real window vs. the quiet no-window line. */
    had_window: boolean;
  };
  experiment_exposed: { experiment: string; variant: string };
}

type PropsFor<E extends EventName> = E extends keyof EventPropMap
  ? EventPropMap[E]
  : Record<string, unknown>;

function ready(): boolean {
  return typeof window !== "undefined" && posthog.__loaded === true;
}

/**
 * React runs effects child-first, so an event fired in a component's mount
 * effect happens BEFORE PostHogProvider's init effect. Dropping those events
 * silently is how the first `pwa_installed` (detected_standalone) was lost.
 * Queue anything emitted pre-init and flush once PostHog loads. Bounded to
 * ~10s of retries so environments without a key don't poll forever.
 */
const preReadyQueue: Array<() => void> = [];
let flushAttempts = 0;
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleFlush() {
  if (flushTimer || flushAttempts >= 40) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flushAttempts += 1;
    if (ready()) {
      flushAttempts = 0;
      for (const fn of preReadyQueue.splice(0)) fn();
    } else if (preReadyQueue.length) {
      scheduleFlush();
    }
  }, 250);
}

function runOrQueue(fn: () => void) {
  if (ready()) {
    fn();
    return;
  }
  if (typeof window === "undefined") return; // SSR: nothing will ever load
  preReadyQueue.push(fn);
  scheduleFlush();
}

/** Emit a SYSTEM/availability event (auto-fired on data settling). */
export function trackSystem<E extends SystemEventName>(event: E, props: PropsFor<E>) {
  runOrQueue(() => posthog.capture(event, { ...props, event_category: "system" }));
}

/** Emit an INTENT/engagement event (a deliberate act or dwell-gated view). */
export function trackIntent<E extends IntentEventName>(event: E, props: PropsFor<E>) {
  runOrQueue(() => posthog.capture(event, { ...props, event_category: "intent" }));
}

/**
 * Set durable person properties used to build cohorts / personas in PostHog.
 * `$set` sticks to the user across sessions; `$set_once` only writes the first
 * time, so we can tell first-touch behavior from latest behavior.
 */
export function setPersona(
  set: Record<string, unknown>,
  setOnce?: Record<string, unknown>
) {
  runOrQueue(() => posthog.setPersonProperties(set, setOnce));
}
