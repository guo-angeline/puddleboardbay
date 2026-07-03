-- Metric: Spot open rate (top-of-funnel)
-- Definition: unique users who opened >=1 spot / unique users who loaded a page.
-- Events: spot_viewed (intent), $pageview (autocapture).
-- Caveat: $pageview users is the closest "landed" proxy; bots/internal traffic
--         inflate it until a before_send filter is added (see ROADMAP / gaps).
SELECT
  uniqIf(person_id, event = '$pageview') AS landed,
  uniqIf(person_id, event = 'spot_viewed') AS openers,
  round(100.0 * uniqIf(person_id, event = 'spot_viewed')
              / uniqIf(person_id, event = '$pageview'), 1) AS open_rate_pct
FROM events
WHERE event IN ('$pageview', 'spot_viewed')
  AND timestamp >= {filters.dateRange.from}
  AND timestamp <  {filters.dateRange.to}
