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
-- Decontamination (2026-07-08, D2(a)): alert_interstitial became a monitored
--          100% rollout, so its card fires spot_action/directions
--          (source='alert_interstitial') for EVERY alert-open regardless of the
--          next_good_window arm. Those taps are excluded below so the primary
--          stays a clean drawer-vs-drawer comparison; only drawer directions
--          (source empty/null) count. Windows spanning 2026-07-08 mix the old
--          (uncontaminated shared metric) and new definitions, so read only
--          from 2026-07-08 forward.
-- Decision rule: this test needs ~430-680 exposed users per variant to detect a
--          5pp lift at the ~5-10% base rate (80% power, a=0.05); the old
--          "30/arm" only detected a 20+pp swing. At ~14 users/day that is a
--          months-long read window; treat any earlier read as directional only.
SELECT
  properties.variant AS variant,
  uniqIf(person_id, event = 'experiment_exposed'
                    AND properties.experiment = 'next_good_window') AS exposed_users,
  countIf(event = 'spot_action'
          AND properties.action = 'directions'
          AND ifNull(properties.source, '') != 'alert_interstitial') AS directions_actions,
  round(100.0 * uniqIf(person_id, event = 'spot_action'
                       AND properties.action = 'directions'
                       AND ifNull(properties.source, '') != 'alert_interstitial')
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
