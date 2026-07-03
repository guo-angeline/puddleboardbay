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

(Legacy human-action events predating the split — e.g. `filter_changed`,
`favorite_toggled` — are intent by construction even where `event_category`
isn't yet stamped.)

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

## Comparability
Before comparing any metric across time, check
`analytics/INSTRUMENTATION_CHANGELOG.md`. A metric can move because the logging
changed, not because users did (see the 2026-06-29 conditions split).
