import posthog from "posthog-js";

/**
 * Thin, type-safe wrapper around PostHog. Every call is a no-op until PostHog
 * is initialized (see components/PostHogProvider.tsx), and stays a no-op when
 * NEXT_PUBLIC_POSTHOG_KEY is unset, so the app runs fine without analytics.
 *
 * Event names are explicit so the PostHog dashboard stays readable:
 * - retention is automatic (pageviews + a persistent anonymous distinct id)
 * - segmentation comes from event properties (region, difficulty, free_only)
 * - persona comes from person properties set via `setPersona`
 */

type EventName =
  | "spot_viewed"
  | "filter_changed"
  | "spot_search"
  | "near_me_toggled"
  | "favorite_toggled"
  | "feedback_opened"
  | "view_switched"
  | "pwa_prompt_shown"
  | "pwa_installed";

function ready(): boolean {
  return typeof window !== "undefined" && posthog.__loaded === true;
}

export function track(event: EventName, props?: Record<string, unknown>) {
  if (!ready()) return;
  posthog.capture(event, props);
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
  if (!ready()) return;
  posthog.setPersonProperties(set, setOnce);
}
