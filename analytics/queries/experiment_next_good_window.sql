-- Metric: next_good_window experiment readout (primary + diagnostic)
-- Definition: per variant, exposed users, directions among exposed, the
--             directions rate (action="directions" over exposed users), and
--             a treatment-only diagnostic count of next_window_viewed.
-- Events: experiment_exposed (intent, experiment="next_good_window", both
--         arms), spot_action (intent, action="directions"),
--         next_window_viewed (intent, treatment-only diagnostic).
-- Caveats: exposure fires for BOTH arms at the eval-resolved trigger (see
--          docs/experiments/next-good-window.md), so control is a real
--          counterfactual cohort here, unlike alert_interstitial. Events
--          exist only from 2026-07-04 (see INSTRUMENTATION_CHANGELOG.md).
--          Decision rule needs >= 14 days AND >= 30 exposed users per variant
--          before any read.
SELECT
  properties.variant AS variant,
  uniqIf(person_id, event = 'experiment_exposed'
                    AND properties.experiment = 'next_good_window') AS exposed_users,
  countIf(event = 'spot_action'
          AND properties.action = 'directions') AS directions_actions,
  round(100.0 * uniqIf(person_id, event = 'spot_action'
                       AND properties.action = 'directions')
              / greatest(uniqIf(person_id, event = 'experiment_exposed'
                       AND properties.experiment = 'next_good_window'), 1), 1)
    AS directions_rate_pct,
  countIf(event = 'next_window_viewed') AS next_window_viewed_count
FROM events
WHERE event IN ('experiment_exposed', 'spot_action', 'next_window_viewed')
  AND timestamp >= {filters.dateRange.from}
  AND timestamp <  {filters.dateRange.to}
GROUP BY variant
ORDER BY variant
