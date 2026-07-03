-- Metric: Directions conversion (the true "I'm going" signal)
-- Definition: unique users who clicked Get Directions / unique spot openers.
-- Events: spot_action (intent, action="directions"), spot_viewed (intent).
-- Caveat: this is the click, not proof the link left the app (outbound
--         confirmation is a known gap). Cross-tab against conditions paddleability
--         to test whether wind suppresses intent.
SELECT
  uniqIf(person_id, event = 'spot_viewed') AS openers,
  uniqIf(person_id, event = 'spot_action' AND properties.action = 'directions') AS directions_users,
  round(100.0 * uniqIf(person_id, event = 'spot_action' AND properties.action = 'directions')
              / uniqIf(person_id, event = 'spot_viewed'), 1) AS directions_conversion_pct
FROM events
WHERE event IN ('spot_viewed', 'spot_action')
  AND timestamp >= {filters.dateRange.from}
  AND timestamp <  {filters.dateRange.to}
