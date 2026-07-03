-- Metric: Saved conditions engagement (the "I came back to check my spots" signal)
-- Definition: unique users who genuinely viewed the "Your saved spots" section
--             / unique users for whom the saved-conditions batch loaded.
-- Events: saved_conditions_viewed (intent, dwell-gated), saved_conditions_loaded (system).
-- Caveat: saved_conditions_viewed exists from 2026-06-29. Before that the same
--         name was the on-load auto-fire (now saved_conditions_loaded). Do NOT
--         compare across that date — see INSTRUMENTATION_CHANGELOG.md.
SELECT
  uniqIf(person_id, event = 'saved_conditions_loaded') AS savers_with_data,
  uniqIf(person_id, event = 'saved_conditions_viewed') AS savers_who_looked,
  round(100.0 * uniqIf(person_id, event = 'saved_conditions_viewed')
              / uniqIf(person_id, event = 'saved_conditions_loaded'), 1) AS saved_engagement_pct
FROM events
WHERE event IN ('saved_conditions_loaded', 'saved_conditions_viewed')
  AND timestamp >= {filters.dateRange.from}
  AND timestamp <  {filters.dateRange.to}
