-- Metric: Alert click-through rate (push sent -> app opened)
-- PREFERRED (from 2026-07-09): both sides live in Supabase and share
-- subscription_id, so CTR is a clean single-store join, no cross-store guess.
-- Store: SUPABASE (Postgres). Run in the Supabase SQL editor.
-- Definition: subscriptions that opened the app from a push (alert_opens) ÷
--             subscriptions sent at least one push (alert_sends), per day.
--   alert_opens is written by /api/alerts/opened (same-origin, so less likely
--   ad-blocked than the PostHog alert_clicked event) and keyed on the durable
--   subscription token (migration 0002). Exists only from 2026-07-09.
WITH sent AS (
  SELECT date_trunc('day', sent_at)::date AS day,
         count(DISTINCT subscription_id) AS subs_sent
  FROM alert_sends
  WHERE sent_at >= '{from}' AND sent_at < '{to}'
  GROUP BY 1
),
opened AS (
  SELECT date_trunc('day', opened_at)::date AS day,
         count(DISTINCT subscription_id) AS subs_opened
  FROM alert_opens
  WHERE opened_at >= '{from}' AND opened_at < '{to}'
  GROUP BY 1
)
SELECT s.day,
       s.subs_sent,
       coalesce(o.subs_opened, 0) AS subs_opened,
       round(100.0 * coalesce(o.subs_opened, 0) / nullif(s.subs_sent, 0), 1) AS ctr_pct
FROM sent s
LEFT JOIN opened o ON o.day = s.day
ORDER BY s.day;

-- LEGACY cross-store fallback (pre-2026-07-09, before alert_opens existed):
-- numerator PostHog `alert_clicked`, denominator Supabase `alert_sends`, no
-- shared key so aggregate-only, never per-user. Kept for continuity across the
-- 2026-07-09 boundary; expect the PostHog-based number to run LOWER than the
-- alert_opens-based one because ad blockers drop `alert_clicked` but not the
-- same-origin open ping.
--
--   PostHog (HogQL): opens from a push, by day
--     SELECT toDate(timestamp) AS day, uniq(person_id) AS alert_openers
--     FROM events WHERE event = 'alert_clicked'
--       AND timestamp >= {filters.dateRange.from} AND timestamp < {filters.dateRange.to}
--     GROUP BY day ORDER BY day
--
--   Supabase pushes_sent = count(DISTINCT subscription_id) FROM alert_sends
--   over the same range (the cron sends at most one batched push per sub/day).
--   Note: iOS PWA opens carry a DIFFERENT PostHog person_id than the opt-in
--   (separate storage partition), so alert_clicked person_ids will not match
--   opt-in persons. The Supabase join above avoids this entirely.
