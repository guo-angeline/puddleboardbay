-- Metric: Active subscriber retention (durable, server-side, ITP-proof)
-- Store: SUPABASE (Postgres). Run in the Supabase SQL editor, NOT PostHog.
-- Definition: of push subscriptions created in cohort week W, the share that
--             opened the app from a push (alert_opens) during the week k weeks
--             later. This is genuine re-engagement, not just reachability, and
--             because it keys on the server-held subscription id it is immune to
--             the ITP purge / PWA partition split that censor PostHog person
--             retention. THIS is the honest long-horizon success measure for the
--             conditions-alert retention loop.
-- Source: alert_opens, written by /api/alerts/opened when the app opens from a
--         push deep link carrying the subscription's durable token (migration
--         0002). alert_opens exists only from 2026-07-09.
-- Caveats:
--   * Confounded by send frequency: a subscriber can only "return via push" in
--     weeks the cron actually sent them one (conditions were good for a watched
--     spot). A quiet week reads as non-retained even for a loyal user. Read
--     alongside reachable_audience_retention.sql, which does not need a send.
--   * A focused-but-not-navigated existing tab may not re-fire the open ping
--     (rare: app already open when the push is tapped). Minor undercount.
--   * Opens are de-duplicated to one per subscription per week here.
WITH sub AS (
  SELECT id, date_trunc('week', created_at)::date AS cohort_week
  FROM push_subscriptions
),
opens AS (
  SELECT DISTINCT subscription_id, date_trunc('week', opened_at)::date AS open_week
  FROM alert_opens
)
SELECT
  s.cohort_week,
  g.k AS weeks_since,
  count(DISTINCT s.id) AS cohort_size,
  CASE WHEN s.cohort_week + (g.k * 7) > current_date THEN NULL  -- censored
       ELSE count(DISTINCT o.subscription_id) END AS returned_via_push,
  CASE WHEN s.cohort_week + (g.k * 7) > current_date THEN NULL
       ELSE round(100.0 * count(DISTINCT o.subscription_id)
                        / nullif(count(DISTINCT s.id), 0), 1) END AS active_retention_pct
FROM sub s
CROSS JOIN generate_series(0, 12) AS g(k)
LEFT JOIN opens o
  ON o.subscription_id = s.id
 AND o.open_week = s.cohort_week + (g.k * 7)
GROUP BY s.cohort_week, g.k
ORDER BY s.cohort_week, g.k
