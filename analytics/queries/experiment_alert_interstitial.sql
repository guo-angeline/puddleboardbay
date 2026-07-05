-- Metric: alert_interstitial experiment readout (primary lift + diagnostics)
-- Primary: share of EXPOSED users (per arm) who fire spot_action/directions in
--          the session. Lift = treatment rate - control rate. This is the only
--          arm-comparable metric: control has no card, so it can only convert
--          via the drawer's Get Directions, and the treatment card now also
--          emits spot_action (source="alert_interstitial") so both land here.
-- Exposure: experiment_exposed (experiment="alert_interstitial") is logged for
--           BOTH arms at the alert-open trigger (see the component and the
--           experiment doc). Restrict every metric to the exposed cohort.
-- Diagnostics: alert_interstitial_result (treatment-only) shows how the card
--              was left; it is NOT a control-vs-treatment comparison.
-- Caveats: events exist only from 2026-07-04; the 2026-07-04 fix made control
--          exposure and the shared metric valid, so do not read any window that
--          starts before it (see INSTRUMENTATION_CHANGELOG.md). Decision rule
--          needs >= 14 days AND >= 30 exposed users per variant.
WITH exposed AS (
  SELECT
    person_id,
    argMax(properties.variant, timestamp) AS variant
  FROM events
  WHERE event = 'experiment_exposed'
    AND properties.experiment = 'alert_interstitial'
    AND timestamp >= {filters.dateRange.from}
    AND timestamp <  {filters.dateRange.to}
  GROUP BY person_id
),
directed AS (
  SELECT DISTINCT person_id
  FROM events
  WHERE event = 'spot_action'
    AND properties.action = 'directions'
    AND timestamp >= {filters.dateRange.from}
    AND timestamp <  {filters.dateRange.to}
)
SELECT
  e.variant AS variant,
  count() AS exposed_users,
  countIf(d.person_id != '') AS directions_users,
  round(100.0 * countIf(d.person_id != '') / count(), 1) AS directions_rate_pct
FROM exposed e
LEFT JOIN directed d ON e.person_id = d.person_id
GROUP BY e.variant
ORDER BY e.variant
