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
export type SpotViewedSource = "list" | "map" | "deeplink" | "alert" | "related" | "share";

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
  | "alert_subscribe_failed"
  // The POST to /api/email/subscribe failed (email channel, item 22). Availability
  // signal for the capture path; success is the intent event email_capture_submitted.
  // Note: email SENDS are ledgered server-side in the email_sends table, not here,
  // exactly like alert_sends (there is no client to fire a send event).
  | "email_capture_failed"
  // A confirm-link click landed on /?email_confirmed=0: the token was missing,
  // malformed, unknown, or already consumed, so the confirm route bounced it.
  // SYSTEM (a `_failed` availability signal about the confirm link), NOT intent:
  // it fires on the redirect landing, not on an in-app action. Never read its
  // volume as engagement. Pairs with email_capture_confirmed (the success twin).
  | "email_confirm_failed"
  // The home map auto-centered on the user because geolocation was ALREADY
  // granted (Permissions API === "granted"), applied on load with no click.
  // SYSTEM, not intent: the app acted, the user did not toggle Near Me this
  // session. Never read this as "people use Near Me" — that's near_me_toggled.
  | "location_auto_applied";

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
  | "experiment_exposed"
  // Email channel (item 22). Capture form submitted (an address was typed and
  // sent to /api/email/subscribe). Top of the email funnel.
  | "email_capture_submitted"
  // The double-opt-in confirm link was clicked (fires on the /?email_confirmed=1
  // landing after the confirm route). The consent + activation step.
  | "email_capture_confirmed"
  // App opened from an alert EMAIL deep link (URL contains from=email). Email twin
  // of alert_clicked; the durable return signal is the server email_opens ledger.
  | "email_alert_opened"
  // The Resend control on the pending post-submit card was tapped, re-triggering
  // the confirm email via /api/email/subscribe (same address, re-armed token).
  | "email_confirm_resend_clicked";

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
  location_auto_applied: { source: "permission_granted" };
  alert_subscribe_failed: { status: number | null; watched_count: number };
  saved_conditions_viewed: { count: number; calm_count: number };
  // Values mirror lib/push.ts OptInResult; kept inline to avoid a cycle
  // (push.ts imports trackSystem from this module).
  alert_optin_shown: {
    platform: "standalone" | "ios" | "android" | "desktop";
    // What surfaced the prompt: the first save (item 1), an installed standalone
    // relaunch re-offer (item 14), an explicit tap on the always-available "Turn
    // on alerts" entry point in the saved-spots header (item 15), or genuine
    // conditions interest (item 21: dwell-viewed conditions on 2+ distinct spots
    // in a session, the core paddle-decision behavior, a bigger pool than savers).
    trigger: "first_save" | "standalone_relaunch" | "manual" | "return_session" | "conditions_interest";
    // Which channel the enrollment card LED with (item 23): push (installable/
    // installed) vs email (desktop, iOS Safari, or a push-denied rescue), or
    // "both" when a dual-CTA surface shows push and email at equal weight
    // (item 32).
    channel: "push" | "email" | "both";
  };
  // Prompt dismissed (item 15): dismissal is a 14-day snooze, not a permanent
  // kill. `trigger` is which surfacing was dismissed.
  alert_optin_dismissed: {
    platform: "standalone" | "ios" | "android" | "desktop";
    trigger: "first_save" | "standalone_relaunch" | "manual" | "return_session" | "conditions_interest";
    channel: "push" | "email" | "both";
  };
  alert_optin_result: {
    platform: "standalone" | "ios" | "android" | "desktop";
    result: "granted" | "denied" | "unsupported";
  };
  alert_interstitial_shown: { spot_id: number; launch_tip_shown: boolean };
  alert_interstitial_result: { spot_id: number; outcome: "dismissed" | "reminder" };
  next_window_viewed: {
    spot_id: number;
    region: string;
    difficulty: string;
    /** Block rendered with a real window vs. the quiet no-window line. */
    had_window: boolean;
  };
  experiment_exposed: { experiment: string; variant: string };
  // Email channel (item 22). `trigger`/`platform` mirror the alert opt-in so the
  // email and push enrollment funnels segment the same way.
  email_capture_submitted: {
    platform: "standalone" | "ios" | "android" | "desktop";
    trigger:
      | "first_save"
      | "standalone_relaunch"
      | "manual"
      | "return_session"
      | "conditions_interest"
      | "push_denied";
    watched_count: number;
  };
  // `source` distinguishes the initial submit POST failing from a later Resend
  // POST failing (item 24). Only source:"submit" means "no email_subscriptions
  // row was created", so the Gap C submitter-correction in
  // analytics/queries/email_confirm_funnel.sql must subtract source:"submit"
  // failures only, never resend failures.
  email_capture_failed: { status: number | null; source: "submit" | "resend" };
  email_capture_confirmed: { watched_count: number };
  // `variant` is the email copy-rotation index (0-6, lib/email/templates.ts
  // ALERT_VARIANTS) that rode the deep link as `v`; absent on pre-rotation links.
  email_alert_opened: { spot_id: number; variant?: number };
  // Mirrors email_capture_submitted so the resend and submit funnels segment
  // the same way.
  email_confirm_resend_clicked: {
    platform: "standalone" | "ios" | "android" | "desktop";
    trigger:
      | "first_save"
      | "standalone_relaunch"
      | "manual"
      | "return_session"
      | "conditions_interest"
      | "push_denied";
    watched_count: number;
  };
  email_confirm_failed: { reason: "stale_token" | "no_token" };
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
