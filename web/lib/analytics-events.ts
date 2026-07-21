import type { Paddleability } from "@/lib/conditions";

/**
 * PURE event-name unions + prop contracts, shared by BOTH analytics emitters:
 * web/lib/analytics.ts (posthog-js) and native/src/lib/analytics.ts
 * (posthog-react-native). No imports beyond types, no platform code, so the
 * native bundle can consume it through the Metro @/ alias.
 *
 * Event names and prop shapes are identical across platforms BY CONSTRUCTION:
 * both emitters compile against these unions. Segment platforms with the
 * `display_mode` super property ("standalone" | "browser" | "native_ios"),
 * never with divergent event names. Any change here must be logged in
 * analytics/INSTRUMENTATION_CHANGELOG.md (a guard hook will remind you).
 */

/** Where a spot_viewed open originated, for funnel segmentation. */
export type SpotViewedSource = "list" | "map" | "deeplink" | "alert" | "related" | "share";

/**
 * Enrollment-surface platform. Web values are the four web surfaces;
 * "native_ios" is the iOS app (2026-07-19, native port); "unknown" exists only
 * for enrollment_prompt_suppressed (see that entry).
 */
export type OptInPlatform = "standalone" | "ios" | "android" | "desktop" | "native_ios";

export type OptInTrigger =
  | "first_save"
  | "standalone_relaunch"
  | "manual"
  | "return_session"
  | "conditions_interest";

/**
 * SYSTEM / availability events. Auto-fire on data settling. Emit via
 * `trackSystem`. These measure reliability, not user attention.
 */
export type SystemEventName =
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
  | "email_capture_failed"
  // A confirm-link click landed on /?email_confirmed=0 (stale/missing token).
  | "email_confirm_failed"
  // The home map auto-centered because geolocation was ALREADY granted.
  // SYSTEM, not intent: the app acted, the user did not toggle Near Me.
  | "location_auto_applied"
  // An enrollment prompt was withheld for a confirmed email subscriber (item 47).
  | "enrollment_prompt_suppressed";

/**
 * INTENT / engagement events. Fire only on a deliberate user act or a
 * dwell-gated genuine view. Emit via `trackIntent`. (Per-event rationale lives
 * with the emitting call sites and the original comments in git history.)
 */
export type IntentEventName =
  | "spot_viewed"
  | "spot_action"
  | "filter_changed"
  | "spot_search"
  | "near_me_toggled"
  | "favorite_toggled"
  | "saved_conditions_viewed"
  | "spot_photo_viewed"
  | "recent_spots_shown"
  | "recent_spot_clicked"
  | "feedback_opened"
  | "view_switched"
  | "nav_home_clicked"
  | "pwa_installed"
  | "spot_sheet_resized"
  | "spot_sheet_dismissed"
  | "conditions_viewed"
  | "alert_optin_shown"
  | "alert_optin_result"
  | "alert_optin_dismissed"
  | "alert_clicked"
  | "alert_interstitial_shown"
  | "alert_interstitial_result"
  | "next_window_viewed"
  | "experiment_exposed"
  | "email_capture_submitted"
  | "email_capture_confirmed"
  | "email_alert_opened"
  | "email_confirm_resend_clicked"
  // Item 44: optional Google accounts. INTENT (deliberate taps); _completed
  // fires after the OAuth round-trip resolves to a signed-in session.
  | "account_sign_in_started"
  | "account_sign_in_completed"
  | "account_sign_out"
  // Item 43: crowd reviews. _opened is the tap on "Write a review" (fires for
  // signed-out users too, so the sign-in wall is measurable); _submitted is a
  // real submission landing in the moderation queue, NOT a publication;
  // reviews_viewed is dwell-gated, never a fetch settle.
  | "review_form_opened"
  | "review_submitted"
  | "reviews_viewed";

export type EventName = SystemEventName | IntentEventName;

/**
 * Required-prop contracts for the events that carry load-bearing semantics.
 * Events not listed fall back to a loose prop bag. Extend this when you add a
 * metric a report depends on, so call sites can't omit a needed property.
 */
export interface EventPropMap {
  conditions_loaded: {
    spot_id: number;
    latency_ms: number;
    failed: boolean;
    paddleability: Paddleability;
    has_tides: boolean;
    has_wind: boolean;
    surface: "spot_drawer";
    // Item 60: "mount" = first fetch when the panel opened; "foreground" = a
    // refetch triggered by re-foregrounding on stale data. Optional so
    // existing call sites (which are all "mount") stay valid.
    trigger?: "mount" | "foreground";
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
  spot_photo_viewed: { spot_id: number; region: string; license: string };
  // Item 46: `reminder_tap` is true when the app opened from a launch-reminder
  // push (from=alert with NO window param) vs a windowed alert open.
  alert_clicked: { spot_id: number; spot_name: string; region: string; reminder_tap: boolean };
  recent_spots_shown: { count: number; calm_count: number };
  recent_spot_clicked: { spot_id: number; region: string };
  alert_optin_shown: {
    platform: OptInPlatform;
    trigger: OptInTrigger;
    // Which channel the enrollment card LED with: push, email, or "both" for
    // the web dual-CTA card. The native card is single-channel push.
    channel: "push" | "email" | "both";
  };
  // Prompt dismissed (item 15): dismissal is a 14-day snooze, not a permanent
  // kill. `trigger` is which surfacing was dismissed.
  alert_optin_dismissed: {
    platform: OptInPlatform;
    trigger: OptInTrigger;
    channel: "push" | "email" | "both";
  };
  alert_optin_result: {
    platform: OptInPlatform;
    result: "granted" | "denied" | "unsupported";
  };
  // See the original web comments (git history) for the full rationale;
  // "unknown" platform exists because the first_save gate can run before
  // platform detection resolves, and the event must never be dropped for it.
  enrollment_prompt_suppressed: {
    platform: OptInPlatform | "unknown";
    trigger: OptInTrigger;
    reconciled_this_session: boolean;
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
  // Item 71: `method` is a compile-enforced union so a wrong value can't ship
  // silently (this prop was previously an untyped Record<string, unknown>).
  // "back" is item 64's on-screen app-bar arrow; "os_back" (hardware/browser
  // Back) and "edge_swipe" (left-edge gesture) are item 71's new mobile
  // in-app back paths, kept distinct from "back" so the three don't collapse
  // into one bucket. "close"/"backdrop" are the button and tap-outside paths;
  // "drag" is the legacy drag-to-dismiss path (item 57).
  spot_sheet_dismissed: {
    spot_id: number;
    spot_name: string;
    region: string;
    method: "edge_swipe" | "os_back" | "back" | "close" | "backdrop" | "drag";
  };
  // Item 43. spot_id + region on all three so they segment with spot_viewed.
  // `review_submitted` counts submissions into the moderation queue, NOT
  // publications; a published-review count comes from Supabase, not PostHog.
  review_form_opened: { spot_id: number; region: string };
  review_submitted: { spot_id: number; region: string; rating: number; has_text: boolean };
  reviews_viewed: { spot_id: number; region: string; count: number };
  email_capture_submitted: {
    platform: OptInPlatform;
    trigger: OptInTrigger | "push_denied";
    watched_count: number;
  };
  // Only source:"submit" means "no email_subscriptions row was created"; the
  // Gap C submitter-correction must subtract submit failures only.
  email_capture_failed: { status: number | null; source: "submit" | "resend" };
  email_capture_confirmed: { watched_count: number };
  // `variant` = email copy-rotation index (v param); `tip_index` = pro-tip
  // pool index (pt param); both absent on older links.
  email_alert_opened: { spot_id: number; variant?: number; tip_index?: number };
  email_confirm_resend_clicked: {
    platform: OptInPlatform;
    trigger: OptInTrigger | "push_denied";
    watched_count: number;
  };
  email_confirm_failed: { reason: "stale_token" | "no_token" };
}

export type PropsFor<E extends EventName> = E extends keyof EventPropMap
  ? EventPropMap[E]
  : Record<string, unknown>;
