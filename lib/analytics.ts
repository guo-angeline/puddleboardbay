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

/** Where a spot_viewed open originated, for funnel segmentation. */
export type SpotViewedSource = "list" | "map" | "deeplink" | "alert" | "related";

type EventName =
  | "spot_viewed"
  // Bottom-of-funnel intent: clicking Get Directions / Share / Photos in the
  // spot drawer (the real "I'm going here" signals, distinguished by `action`).
  | "spot_action"
  | "filter_changed"
  | "spot_search"
  | "near_me_toggled"
  | "favorite_toggled"
  // Saved-spot conditions surfaced in the "Your Spots" list. Fired once per
  // session after the first batch resolves, to measure whether ranking saved
  // spots by paddle-ability is what brings people back.
  | "saved_conditions_viewed"
  | "feedback_opened"
  | "view_switched"
  | "pwa_prompt_shown"
  | "pwa_installed"
  // Mobile bottom-sheet drag: did people discover expand-to-full, and how do
  // they close the sheet (drag vs button)?
  | "spot_sheet_resized"
  | "spot_sheet_dismissed"
  // Live tide/wind conditions loaded for a spot. The return hook: fires once per
  // spot open after the fetch settles, with the paddle-ability read attached so
  // we can tell if people check before going out.
  | "conditions_viewed"
  // Stage B push opt-in: the alert prompt was shown (after first save), and the
  // result of attempting to enable notifications. `result` distinguishes
  // granted / denied / unsupported / install_needed so we can see where the
  // funnel leaks.
  | "alert_optin_shown"
  | "alert_optin_result"
  // Fired when the app is opened from a push notification (URL contains from=alert).
  | "alert_clicked";

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
