-- Metric: alert_interstitial experiment readout (primary + guardrails)
-- Definition: per variant, exposed users, interstitial results by outcome, and
--             the directions rate (outcome="directions" over exposed users).
-- Events: experiment_exposed (intent, experiment="alert_interstitial"),
--         alert_interstitial_result (intent, outcome="dismissed"|"directions").
-- Caveats: exposure fires only when the treatment card actually renders, so the
--          control row counts bucketed alert-openers, not card views; compare
--          treatment against control's alert_clicked sessions per the experiment
--          doc (docs/experiments/alert-interstitial.md). Events exist only from
--          2026-07-04 (see INSTRUMENTATION_CHANGELOG.md). Decision rule needs
--          >= 14 days AND >= 30 exposed users per variant before any read.
SELECT
  properties.variant AS variant,
  uniqIf(person_id, event = 'experiment_exposed'
                    AND properties.experiment = 'alert_interstitial') AS exposed_users,
  countIf(event = 'alert_interstitial_result'
          AND properties.outcome = 'directions') AS directions_results,
  countIf(event = 'alert_interstitial_result'
          AND properties.outcome = 'dismissed') AS dismissed_results,
  round(100.0 * uniqIf(person_id, event = 'alert_interstitial_result'
                       AND properties.outcome = 'directions')
              / greatest(uniqIf(person_id, event = 'experiment_exposed'
                       AND properties.experiment = 'alert_interstitial'), 1), 1)
    AS directions_rate_pct
FROM events
WHERE event IN ('experiment_exposed', 'alert_interstitial_result')
  AND timestamp >= {filters.dateRange.from}
  AND timestamp <  {filters.dateRange.to}
GROUP BY variant
ORDER BY variant
