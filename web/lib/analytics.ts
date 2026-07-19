import posthog from "posthog-js";
import type { IntentEventName, PropsFor, SystemEventName } from "@/lib/analytics-events";

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
 * The event-name unions and per-event prop contracts live in
 * lib/analytics-events.ts, SHARED with the native app's emitter
 * (native/src/lib/analytics.ts) so the two platforms cannot drift. Each
 * wrapper stamps `event_category` so a SYSTEM event can never be silently
 * counted as engagement in a query or dashboard. Any change must be logged in
 * analytics/INSTRUMENTATION_CHANGELOG.md (a guard hook will remind you).
 */

// Re-exports so existing call sites keep importing from "@/lib/analytics".
export type {
  EventName,
  EventPropMap,
  IntentEventName,
  SpotViewedSource,
  SystemEventName,
} from "@/lib/analytics-events";

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
