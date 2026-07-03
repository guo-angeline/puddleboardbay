-- Metric: Conditions availability (RELIABILITY, not engagement)
-- Definition: share of spot opens where live conditions loaded without failure.
-- Events: conditions_loaded (system). failed=true means both NOAA + NWS failed.
-- This is the honest home of the old report's "91% of openers saw conditions".
-- Caveat: denominator is conditions_loaded fires (one per spot open), NOT users.
--         Do NOT read this as "people checked conditions" — see conditions_engagement.
SELECT
  count() AS opens_with_fetch,
  countIf(properties.failed = false) AS loaded_ok,
  round(100.0 * countIf(properties.failed = false) / count(), 1) AS availability_pct,
  round(avg(toFloat(properties.latency_ms))) AS avg_latency_ms,
  round(quantile(0.9)(toFloat(properties.latency_ms))) AS p90_latency_ms
FROM events
WHERE event = 'conditions_loaded'
  AND timestamp >= {filters.dateRange.from}
  AND timestamp <  {filters.dateRange.to}
