-- Metric: Conditions engagement (TRUE attention, dwell-gated)
-- Definition: unique users who genuinely viewed the conditions panel
--             (on screen >= 1s) divided by unique spot openers.
-- Events: conditions_viewed (intent), spot_viewed (intent).
-- Caveat: conditions_viewed only exists from 2026-06-29 onward. Before that the
--         same name was a fetch-settle auto-fire (availability). Do NOT compare
--         this series across that date — see INSTRUMENTATION_CHANGELOG.md.
SELECT
  uniqIf(person_id, event = 'spot_viewed') AS openers,
  uniqIf(person_id, event = 'conditions_viewed') AS conditions_viewers,
  round(100.0 * uniqIf(person_id, event = 'conditions_viewed')
              / uniqIf(person_id, event = 'spot_viewed'), 1) AS engagement_pct
FROM events
WHERE event IN ('spot_viewed', 'conditions_viewed')
  AND timestamp >= {filters.dateRange.from}
  AND timestamp <  {filters.dateRange.to}
