-- Metric: Reachable-audience retention (durable, server-side, ITP-proof)
-- Store: SUPABASE (Postgres). Run in the Supabase SQL editor, NOT PostHog.
-- Definition: of push subscriptions created in cohort week W, the share still
--             reachable (accepting pushes, i.e. not yet disabled) k weeks later.
--             A subscription still accepting pushes IS a retained user, and the
--             key is the server-held subscription id, so this survives the
--             Safari ITP storage purge and the iOS PWA partition split that
--             censor PostHog person-based retention. See analytics/GLOSSARY.md
--             "Identity" and "Alert loop".
-- Churn source: push_subscriptions.disabled_at, stamped by the cron on a 410
--               Gone (migration 0002). A resurrected endpoint has disabled_at
--               cleared by the subscribe route, so it counts as continuous.
-- Caveats:
--   * disabled_at only exists from migration 0002 (2026-07-09). Rows disabled
--     BEFORE it were backfilled from last_seen (approximate); treat pre-0002
--     churn timing as fuzzy.
--   * disabled_at is lagged: it flips only when the cron next sends and gets a
--     410, so a dead device reads "reachable" until the next send. This is a
--     reachability ceiling, not opened-the-app engagement (see
--     active_subscriber_retention.sql for that).
WITH sub AS (
  SELECT id,
         date_trunc('week', created_at)::date AS cohort_week,
         disabled_at
  FROM push_subscriptions
),
grid AS (
  SELECT c.cohort_week, k.k,
         c.cohort_week + (k.k * 7) AS as_of
  FROM (SELECT DISTINCT cohort_week FROM sub) c
  CROSS JOIN generate_series(0, 12) AS k(k)
)
SELECT
  grid.cohort_week,
  grid.k AS weeks_since,
  (SELECT count(*) FROM sub WHERE sub.cohort_week = grid.cohort_week) AS cohort_size,
  CASE WHEN grid.as_of > current_date THEN NULL  -- not enough follow-up yet
       ELSE (SELECT count(*) FROM sub
             WHERE sub.cohort_week = grid.cohort_week
               AND (sub.disabled_at IS NULL OR sub.disabled_at >= grid.as_of))
  END AS reachable,
  CASE WHEN grid.as_of > current_date THEN NULL
       ELSE round(100.0 * (SELECT count(*) FROM sub
                           WHERE sub.cohort_week = grid.cohort_week
                             AND (sub.disabled_at IS NULL OR sub.disabled_at >= grid.as_of))
                        / nullif((SELECT count(*) FROM sub WHERE sub.cohort_week = grid.cohort_week), 0), 1)
  END AS reachable_pct
FROM grid
ORDER BY grid.cohort_week, grid.k
