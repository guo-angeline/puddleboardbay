-- Metric: Week-1 DEVICE retention by signup-day cohort (Safari-censored)
-- Definition: of users first seen on day D, the share active again on days D+1..D+7.
-- Events: all (any event counts as "active"); first-seen = min(timestamp) per person.
-- Caveat: the most recent cohorts are censored (less than 7 days of follow-up) —
--         exclude or label them. This is the baseline the retention epic
--         (conditions alerts) must beat: Jun 2026 W1 was 13-17%.
-- IDENTITY CAVEAT: person_id is device+browser-scoped (no login). Safari ITP
--         purges that storage after ~7 days and the iOS PWA lives in a separate
--         partition, so this UNDERCOUNTS returns and CANNOT be extended reliably
--         past W1 (do not build W2+ on it). For durable long-horizon retention
--         use the Supabase metrics: reachable_audience_retention.sql /
--         active_subscriber_retention.sql. See GLOSSARY "Identity".
WITH first_seen AS (
  SELECT person_id, toDate(min(timestamp)) AS cohort_day
  FROM events
  GROUP BY person_id
),
activity AS (
  SELECT DISTINCT person_id, toDate(timestamp) AS active_day
  FROM events
)
SELECT
  fs.cohort_day AS cohort_day,
  count(DISTINCT fs.person_id) AS cohort_size,
  count(DISTINCT if(a.active_day > fs.cohort_day
                    AND a.active_day <= fs.cohort_day + 7, a.person_id, NULL)) AS retained_w1,
  round(100.0 * count(DISTINCT if(a.active_day > fs.cohort_day
                    AND a.active_day <= fs.cohort_day + 7, a.person_id, NULL))
              / count(DISTINCT fs.person_id), 1) AS w1_retention_pct
FROM first_seen fs
LEFT JOIN activity a ON a.person_id = fs.person_id
WHERE fs.cohort_day >= {filters.dateRange.from}
  AND fs.cohort_day <  {filters.dateRange.to}
GROUP BY fs.cohort_day
ORDER BY fs.cohort_day
