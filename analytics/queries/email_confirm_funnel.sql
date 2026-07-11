-- Metric: Email submit-to-confirm funnel (double opt-in completion)
-- Store: SUPABASE (Postgres) is the RATE OF RECORD. Run the PRIMARY block in
--        the Supabase SQL editor. The PostHog HogQL block at the bottom is a
--        commented-out cross-check only, see Gap C note below.
-- Definition: of the distinct email addresses that submitted the signup form
--             in the window (rows in email_subscriptions, deduped case-
--             insensitively via lower(email)), how many went on to set
--             confirmed_at (clicked the double opt-in confirm link), the
--             resulting submit-to-confirm rate, and the median (p50) minutes
--             from submit to confirm among the confirmed rows.
-- Guardrail: guardrail_flag is 'insufficient_data' when submitters < 5 (too
--            thin to read as a rate at all), 'LOW: below 50% guardrail' when
--            submit_to_confirm_pct < 50 AND submitters >= 5, else 'ok'. A LOW
--            flag means more than half of people who typed their email never
--            confirmed, i.e. the double opt-in step (or the confirm email
--            itself, e.g. spam placement) is losing people who already showed
--            intent, worth an inbox-placement or copy check before assuming
--            it is a demand problem.
-- Small-N caveat: the email channel is brand new and near-zero volume as of
--            2026-07-10 (see reports/analytics-2026-07-09.md: "the loop is
--            essentially unentered, 1 save, 1 opt-in shown, 0 alert clicks in
--            the entire window"). Read submit_to_confirm_pct as DIRECTIONAL
--            ONLY until submitters passes tens, not ones. Until then the
--            guardrail_flag (especially insufficient_data / LOW) is the
--            actionable output of this query, not the percentage itself.
-- Owner exclusion: excludes owner addresses per analytics/EXCLUDED_PERSONS.md
--            ("Excluded email addresses (email alert channel, from 2026-07-10)")
--            on the Supabase side (lower(email) NOT IN (...) below); the
--            commented PostHog companion excludes the three owner person_ids
--            from the same doc instead, since PostHog has no email identity.
-- Gap C note: on the PostHog side, email_capture_submitted fires client-side
--            before the POST to /api/email/subscribe resolves, so a submit
--            that later fails server-side (invalid address, Supabase error,
--            rate limit) still counts as a submitter in PostHog, inflating
--            that denominator. The companion query below subtracts distinct
--            email_capture_failed submitters from the submitter count to
--            correct for this. Supabase has no such gap: a row only exists in
--            email_subscriptions after a successful insert, so the PRIMARY
--            query below does not need this correction.
--
-- Placeholders :from / :to (or {filters.dateRange.from}/{filters.dateRange.to}
-- in the Supabase SQL editor's saved-query UI) bound created_at to the
-- reporting window; edit them per run.

-- ============================================================
-- PRIMARY (Supabase, rate of record)
-- ============================================================
WITH window_subs AS (
  SELECT
    lower(email) AS email,
    min(created_at)   AS created_at,
    min(confirmed_at) AS confirmed_at  -- one row per address in practice; min() is defensive against dupes
  FROM email_subscriptions
  WHERE created_at >= :from
    AND created_at <  :to
    AND lower(email) NOT IN ('qig6789@gmail.com', 'qiguo1102@live.com')
  GROUP BY lower(email)
),
confirm_minutes AS (
  SELECT EXTRACT(EPOCH FROM (confirmed_at - created_at)) / 60.0 AS minutes
  FROM window_subs
  WHERE confirmed_at IS NOT NULL
)
SELECT
  (SELECT count(*) FROM window_subs) AS submitters,
  (SELECT count(*) FROM window_subs WHERE confirmed_at IS NOT NULL) AS confirmers,
  round(
    100.0 * (SELECT count(*) FROM window_subs WHERE confirmed_at IS NOT NULL)
    / greatest((SELECT count(*) FROM window_subs), 1),
    1
  ) AS submit_to_confirm_pct,
  (SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY minutes) FROM confirm_minutes)
    AS time_to_confirm_p50_min,
  CASE
    WHEN (SELECT count(*) FROM window_subs) < 5 THEN 'insufficient_data'
    WHEN round(
      100.0 * (SELECT count(*) FROM window_subs WHERE confirmed_at IS NOT NULL)
      / greatest((SELECT count(*) FROM window_subs), 1),
      1
    ) < 50 THEN 'LOW: below 50% guardrail'
    ELSE 'ok'
  END AS guardrail_flag;

-- ============================================================
-- COMPANION (PostHog HogQL, ad-block/cross-device UNDERCOUNT cross-check,
-- NOT the rate of record, run in the PostHog editor, project 458289 US)
-- ============================================================
-- SELECT
--   uniq(person_id) FILTER (WHERE event = 'email_capture_submitted') AS raw_submitters,
--   uniq(person_id) FILTER (WHERE event = 'email_capture_failed') AS failed_submitters,
--   uniq(person_id) FILTER (WHERE event = 'email_capture_submitted')
--     - uniq(person_id) FILTER (WHERE event = 'email_capture_failed') AS submitters_corrected,
--   uniq(person_id) FILTER (WHERE event = 'email_capture_confirmed') AS confirmers,
--   round(
--     100.0 * uniq(person_id) FILTER (WHERE event = 'email_capture_confirmed')
--     / greatest(
--         uniq(person_id) FILTER (WHERE event = 'email_capture_submitted')
--         - uniq(person_id) FILTER (WHERE event = 'email_capture_failed'),
--         1
--       ),
--     1
--   ) AS submit_to_confirm_pct_posthog
-- FROM events
-- WHERE event IN ('email_capture_submitted', 'email_capture_confirmed', 'email_capture_failed')
--   AND timestamp >= {filters.dateRange.from}
--   AND timestamp <  {filters.dateRange.to}
--   AND person_id NOT IN (
--     '11a83b86-4d73-565f-8b70-2f2847d865be',
--     '0faaad14-aa87-5cda-a76c-a3f59e0fa4d1',
--     '21e77b69-f479-5130-9696-e386ad7f9aa0'
--   )
-- -- PostHog undercounts vs the Supabase PRIMARY block above: ad blockers and
-- -- privacy browsers drop client-side events entirely, and a submit/confirm
-- -- pair that crosses devices or a cleared/ITP-purged storage partition
-- -- fractures into two different person_ids here, silently losing the pair.
-- -- Use this block to sanity-check direction and order of magnitude only,
-- -- never to override the Supabase submit_to_confirm_pct above.
