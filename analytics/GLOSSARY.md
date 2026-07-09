# Analytics glossary

Every metric we report is defined here, exactly, and points at the query that
computes it (`analytics/queries/`). The rule that drove this file: **availability
is not engagement.** The Jun 2026 report blurred them ("96 saw live conditions,
1,157 views, ~12 each") because `conditions_viewed` fired on every fetch settle.
It no longer does. Terms below mark which events back each number.

## Event categories
Every event carries `event_category`:
- **system** — auto-fires when data settles (`*_loaded`). Measures the system:
  availability, latency, failure. **Never** read as user attention.
- **intent** — a deliberate human act or a dwell-gated genuine view (`*_viewed`,
  `*_clicked`, `*_toggled`, ...). Measures the user.

(Until 2026-07-09, legacy human-action events predating the split, e.g.
`filter_changed`, `favorite_toggled`, lacked the stamp; they were intent by
construction. From 2026-07-09 every event carries `event_category`, so a
filter on it is complete only from that date.)

## Conditions: the bright line
- **Conditions availability** — share of spot opens where conditions data loaded
  without failure: `countIf(conditions_loaded.failed = false) / count(conditions_loaded)`.
  A reliability metric. The honest home of the old "91%". → `queries/conditions_availability.sql`
- **Conditions engagement** — unique users with ≥1 `conditions_viewed` (intent,
  dwell-gated: panel on screen ≥1s) ÷ spot openers. The real "people look at
  conditions" number, and it is much smaller than the old 1,157 fetch settles.
  → `queries/conditions_engagement.sql`
- **`conditions_loaded`** (system) — fired once per spot open when the NOAA/NWS
  fetch settles. Props: `latency_ms`, `failed`, `paddleability`, `has_tides`,
  `has_wind`, `surface`.
- **`conditions_viewed`** (intent) — fired once per spot open when the conditions
  panel is genuinely viewed. Props: `paddleability`, `had_data`.

## Saved conditions
- **`saved_conditions_loaded`** (system) — the "Your saved spots" conditions
  batch resolved on load. Availability only. Props: `count`, `calm_count`, `latency_ms`.
- **Saved conditions engagement** — unique users who genuinely viewed the "Your
  saved spots" section (`saved_conditions_viewed`, intent) ÷ users with ≥1 saved
  spot. → `queries/saved_conditions_engagement.sql`

## Funnel & retention
- **Opener** — a user with ≥1 `spot_viewed` in the window.
- **Spot open rate** — openers ÷ pageview users. → `queries/spot_open_rate.sql`
- **Directions conversion** — unique users with `spot_action` (`action="directions"`)
  ÷ openers. The true "I'm going" signal. → `queries/directions_conversion.sql`
- **DAU** — distinct users with any event on a calendar day.
- **Next-day return** — share of a day's new users active again the next day.
- **W1 retention** — share of a signup-week cohort active in the following 7 days.
  → `queries/retention_w1.sql`
- **Exposure** — a user with `experiment_exposed` for a given experiment; the
  only cohort an experiment's metrics are computed over.

## Alert loop (the retention epic)
- **Opt-in rate** — users with `alert_optin_result` `result="granted"` ÷ users
  with `alert_optin_shown`. → `queries/alert_optin_funnel.sql`
- **Net enabled** — granted users minus users with any `alert_subscribe_failed`.
  Subscribe success is silent by design, so this is a floor, not an exact count.
  → `queries/alert_optin_funnel.sql`
- **Alert CTR** — subscriptions that opened the app from a push ÷ subscriptions
  sent a push. From 2026-07-09 both sides are in Supabase (`alert_opens` ÷
  `alert_sends`) joined on `subscription_id`: a clean single-store ratio.
  Pre-2026-07-09 only the cross-store fallback existed (PostHog `alert_clicked`
  ÷ Supabase `alert_sends`, aggregate-only, ad-blocker-suppressed).
  → `queries/alert_ctr.sql`
- **Alert-driven returns** — unique users per day with `alert_clicked`, plus
  share of DAU (PostHog view, for DAU context). The durable version is the two
  server-side retention metrics below; see Identity for why.
  → `queries/alert_driven_returns.sql`

### Long-horizon retention (the reliable, ITP-proof numbers)
Person-based retention (`retention_w1.sql`, DAU) is censored past ~7 days on iOS
(see Identity). For horizons beyond a week, use these two, both computed in
**Supabase** off the server-held subscription id, which ITP cannot touch:
- **Reachable-audience retention** — of subscriptions created in week W, the
  share still `enabled` (accepting pushes, `disabled_at` unset or later) k weeks
  on. A subscription still reachable IS a retained user; needs no client
  identity at all. Reachability ceiling, lags real churn (only flips on the next
  send's 410). → `queries/reachable_audience_retention.sql`
- **Active subscriber retention** — of subscriptions created in week W, the
  share that opened the app from a push (`alert_opens`) in week W+k. Genuine
  re-engagement, ITP-proof. Confounded by send frequency (no send that week =
  reads as non-retained), so read it beside reachable-audience retention.
  → `queries/active_subscriber_retention.sql`
- **`alert_opens`** (Supabase table) — one row per app-open from a push,
  recorded by `/api/alerts/opened` from the durable token in the deep link.
  Exists from 2026-07-09. This is the server-side twin of PostHog
  `alert_clicked`, and more complete (same-origin, not ad-blocked).

## Identity — what a "user" is (read before any retention claim)
There is no login. A "person" is a device+browser storage scope
(`localStorage+cookie`), which has three consequences:
- **iOS PWA partition.** An installed PWA gets storage separate from Safari, so
  the same human becomes a NEW person_id after installing. The alert loop's
  success case (save in Safari → install → return via push) therefore looks
  like two one-and-done users in person-based retention. Segment by the
  `display_mode` super property (`standalone` | `browser`, on every event from
  2026-07-09) and use the two server-side **Long-horizon retention** metrics
  above (reachable-audience / active subscriber) for the loop's true effect,
  since they key on the server-held subscription id, not client identity.
- **Safari ITP.** Safari purges script-writable storage after ~7 days without a
  visit, so a Safari user returning later looks new. W1 retention mostly fits
  inside the cap; W4+ and resurrection metrics systematically undercount on
  iOS Safari. Never claim long-horizon retention without this caveat.
- **Person profiles.** posthog-js runs `person_profiles: identified_only`.
  From 2026-07-09 every visitor gets a profile (first-touch `$set_once`:
  `first_referrer`, `first_utm_*`, `first_landing_path`, `first_display_mode`,
  `first_device_type`, `first_seen_at`). Before that date only users who hit a
  `setPersona` call site (savers, filterers, installers) have person
  properties, so person-property cohorts predating 2026-07-09 describe the
  engaged subset only.

Bot/automation traffic (webdriver, bot user agents, devices flagged via
`localStorage.ptw-internal = "1"`) is dropped client-side from 2026-07-09
(`before_send` in `components/PostHogProvider.tsx`). Bots are one-and-done by
nature, so counts before that date overstate traffic and understate retention.

## Comparability
Before comparing any metric across time, check
`analytics/INSTRUMENTATION_CHANGELOG.md`. A metric can move because the logging
changed, not because users did (see the 2026-06-29 conditions split).
