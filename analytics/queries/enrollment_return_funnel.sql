-- Metric: Unified cross-channel enrollment -> activation -> return funnel
-- (ROADMAP item 25). One readout of the whole conditions-alert retention loop
-- across BOTH delivery channels (push + email), from prompt exposure through
-- enrollment to a genuine return. This STITCHES the existing per-channel,
-- per-store queries into a single window snapshot; it does not replace them
-- (see the "Composes / supersedes" note at the bottom).
--
-- ==========================================================================
-- THE TWO-STORE SEAM (read this before trusting any number here)
-- ==========================================================================
-- This funnel physically spans two datastores with DIFFERENT identity keys,
-- and there is no clean per-person join across them:
--
--   Stage 1  shown            PostHog   alert_optin_shown, keyed by person_id
--   Stage 2  grant / confirm  PostHog   alert_optin_result(granted) /
--                                       email_capture_confirmed
--          ----------------- the seam -----------------
--            (person_id on one side, a subscription ROW on the other)
--   Stage 3  enrolled         SUPABASE  push_subscriptions / email_subscriptions
--   Stage 4  returned         SUPABASE  alert_opens / email_opens
--
-- Stages 1-2 (exposure and the grant/confirm act) exist ONLY client-side in
-- PostHog. They UNDERCOUNT: ad blockers and privacy browsers drop the events
-- outright, and iOS ITP plus the installed-PWA storage partition fracture one
-- human into multiple person_ids. Stages 3-4 (who actually holds a live
-- subscription, and who actually came back) live in Supabase, are server
-- written, and are the RATE OF RECORD.
--
-- Because the seam has no shared key, DO NOT chain one percentage from shown
-- all the way to returned. Instead, exactly as email_confirm_funnel.sql
-- established:
--   * the SUPABASE PRIMARY block below is authoritative for enrolled ->
--     returned. It is also the true count of who cleared grant/confirm, since
--     every enrolled row IS a completed grant/confirm (a push row exists only
--     after a granted permission + successful subscribe POST; an email row is
--     counted enrolled only once confirmed_at is set).
--   * the PostHog COMPANION block (commented, at the bottom) supplies the
--     shown -> grant/confirm top-of-funnel that Supabase cannot see, for
--     DIRECTIONAL exposure and leak reads only, never to override Supabase.
--
-- ==========================================================================
-- CROSS-CHANNEL DEDUP (a human can enroll in BOTH push and email)
-- ==========================================================================
-- Push and email are separate tables with separate primary keys, so WITHIN a
-- channel one row = one enrollment with no dedup problem. ACROSS channels the
-- same human can hold both a push subscription and an email subscription, which
-- would double-count them. The only bridge either table carries is anon_id
-- (best-effort, nullable, "best-effort join to the device" per migration
-- 0003). So:
--   * Per-channel rows report enrollments = distinct subscriptions (clean).
--   * The 'combined' row reports TWO numbers on purpose:
--       - enrolled            = push + email enrollments (SUBSCRIPTIONS, counts
--                               a both-channel human twice: an upper bound on
--                               people),
--       - distinct_person_est = enrolled minus the anon_id overlap (the only
--                               KNOWN cross-channel duplicates removed).
--     distinct_person_est is still imperfect: a human who enrolled in both
--     channels under a null anon_id, or under two different anon_ids (ITP
--     reset, second device), is NOT caught and still double-counts. Treat it
--     as a floor-ish person estimate, not exact.
--
-- ==========================================================================
-- OWNER EXCLUSION (required on BOTH sides, per analytics/EXCLUDED_PERSONS.md)
-- ==========================================================================
--   * EMAIL side: clean. lower(email) NOT IN (owner addresses), identical to
--     email_confirm_funnel.sql.
--   * PUSH side: NO documented owner key exists. EXCLUDED_PERSONS.md lists
--     PostHog person_ids (useless for a Supabase row) and owner EMAILS (email
--     table only). push_subscriptions has neither, so the owner's own iOS PWA
--     subscription (person 11a83b86, which "opted in and clicked own push
--     notifications") CANNOT be filtered yet. The filter below is therefore a
--     NO-OP placeholder. At single-digit N that one owner row can be the entire
--     push cohort: read every push number as OWNER-CONTAMINATED until the
--     owner's push anon_id / endpoint / token is added to EXCLUDED_PERSONS and
--     pasted into the list below. (Advisory escalation raised with item 25, D9.)
--   * PostHog COMPANION: excludes the three owner person_ids.
--
-- ==========================================================================
-- SMALL-N CAVEAT
-- ==========================================================================
-- As of 2026-07-10 the loop is essentially unentered ex-owner (~14 users/day,
-- 1 save, 1 opt-in shown, 0 alert clicks in the last clean window, per
-- reports/analytics-2026-07-09.md), and the email channel is near-zero. Below
-- ~5 enrolled per channel the guardrail_flag / biggest_leak string is the
-- actionable output, NOT the percentages. Do not draw a trend or a rate through
-- single-digit counts. First meaningful read is expected early-to-mid Aug 2026.
--
-- Placeholders :from / :to bound the ENROLLMENT window on created_at (and the
-- return window on opened_at, see the return-bias caveat). In the Supabase
-- saved-query UI substitute {{from}} / {{to}} if :from / :to are not bound.
-- ==========================================================================


-- ==========================================================================
-- PRIMARY (Supabase, rate of record). Run in the Supabase SQL editor.
-- ==========================================================================
WITH push_cohort AS (
  -- Enrolled push cohort: one row = one granted + subscribed device created in
  -- the window. Reuses the cohort key of reachable_audience_retention.sql /
  -- active_subscriber_retention.sql (created_at), just windowed instead of
  -- cohort-weeked.
  SELECT id, anon_id, created_at, disabled_at
  FROM push_subscriptions
  WHERE created_at >= :from AND created_at < :to
    -- OWNER EXCLUSION, PUSH SIDE: NO-OP until a real key is documented. Paste
    -- the owner's push anon_id(s) here once EXCLUDED_PERSONS.md carries them.
    AND coalesce(anon_id, '') NOT IN ('__no_owner_push_key_documented__')
),
email_cohort AS (
  -- Enrolled email cohort: submitted in the window AND confirmed (double
  -- opt-in complete). This reuses email_confirm_funnel.sql exactly: same
  -- denominator basis (rows by created_at, deduped case-insensitively in
  -- practice by the lower(email) unique index), and "enrolled" = its
  -- "confirmers" (confirmed_at IS NOT NULL). Push has no pending pre-row, so
  -- push enrollment is single-step and email is two-step; that asymmetry is
  -- intentional and each channel's "enrolled" means "reachable identity now
  -- exists".
  SELECT id, anon_id, created_at, confirmed_at, enabled, unsub_at
  FROM email_subscriptions
  WHERE created_at >= :from AND created_at < :to
    AND confirmed_at IS NOT NULL
    AND lower(email) NOT IN ('qig6789@gmail.com', 'qiguo1102@live.com')
),
push_returned AS (
  -- Active return, push. Reuses active_subscriber_retention.sql's definition
  -- (an alert_opens row = a genuine app-open from a push, ITP-proof, keyed on
  -- the server-held subscription id). De-duplicated to one per subscription.
  SELECT DISTINCT o.subscription_id AS id
  FROM alert_opens o
  JOIN push_cohort c ON c.id = o.subscription_id
  WHERE o.opened_at >= :from AND o.opened_at < :to
),
email_returned AS (
  -- Active return, email. The exact analog: an email_opens row, keyed on the
  -- durable email token in the deep link.
  SELECT DISTINCT o.email_subscription_id AS id
  FROM email_opens o
  JOIN email_cohort c ON c.id = o.email_subscription_id
  WHERE o.opened_at >= :from AND o.opened_at < :to
),
anon_overlap AS (
  -- Known cross-channel duplicates: distinct anon_ids present in BOTH cohorts.
  -- This is the ONLY dedup signal available across the two stores.
  SELECT count(*) AS overlap
  FROM (SELECT DISTINCT anon_id FROM push_cohort  WHERE anon_id IS NOT NULL) p
  JOIN (SELECT DISTINCT anon_id FROM email_cohort WHERE anon_id IS NOT NULL) e
    ON e.anon_id = p.anon_id
),
push_stats AS (
  SELECT
    count(*) AS enrolled,
    -- Reachable = still accepting pushes as of window end. Reuses
    -- reachable_audience_retention.sql: disabled_at unset or later than :to.
    count(*) FILTER (WHERE disabled_at IS NULL OR disabled_at >= :to) AS reachable,
    (SELECT count(*) FROM push_returned) AS returned
  FROM push_cohort
),
email_stats AS (
  SELECT
    count(*) AS enrolled,
    -- Reachable = confirmed, still enabled, not unsubscribed as of :to. Same
    -- shape as the push reachable rule, using the email churn stamp unsub_at.
    count(*) FILTER (WHERE enabled AND (unsub_at IS NULL OR unsub_at >= :to)) AS reachable,
    (SELECT count(*) FROM email_returned) AS returned
  FROM email_cohort
)
-- --------------------------------------------------------------------------
-- LEAK-ATTRIBUTION READOUT. One row per channel plus a combined row. The two
-- leaks the rate-of-record store can see are enrolled -> reachable (churned or
-- unsubscribed before returning) and reachable -> returned (still reachable but
-- did not come back this window). biggest_leak names whichever is larger.
-- return_pct denominator is enrollments (subscriptions), NOT distinct persons.
-- --------------------------------------------------------------------------
SELECT
  'push' AS channel,
  ps.enrolled,
  ps.enrolled AS distinct_person_est,        -- within one channel, 1 row = 1 person
  ps.reachable,
  ps.returned,
  round(100.0 * ps.reachable / nullif(ps.enrolled, 0), 1) AS reachable_pct,
  round(100.0 * ps.returned  / nullif(ps.enrolled, 0), 1) AS return_pct,
  CASE
    WHEN ps.enrolled < 5 THEN 'insufficient_data'
    WHEN (ps.enrolled - ps.reachable) > (ps.reachable - ps.returned)
      THEN 'leak: churn/unsub before return'
    ELSE 'leak: reachable but did not return'
  END AS biggest_leak
FROM push_stats ps
UNION ALL
SELECT
  'email',
  es.enrolled,
  es.enrolled,
  es.reachable,
  es.returned,
  round(100.0 * es.reachable / nullif(es.enrolled, 0), 1),
  round(100.0 * es.returned  / nullif(es.enrolled, 0), 1),
  CASE
    WHEN es.enrolled < 5 THEN 'insufficient_data'
    WHEN (es.enrolled - es.reachable) > (es.reachable - es.returned)
      THEN 'leak: churn/unsub before return'
    ELSE 'leak: reachable but did not return'
  END
FROM email_stats es
UNION ALL
SELECT
  'combined',
  ps.enrolled + es.enrolled,                         -- enrollments (subscriptions)
  ps.enrolled + es.enrolled - ao.overlap,            -- anon_id-deduped person estimate
  ps.reachable + es.reachable,
  ps.returned + es.returned,
  round(100.0 * (ps.reachable + es.reachable) / nullif(ps.enrolled + es.enrolled, 0), 1),
  round(100.0 * (ps.returned  + es.returned)  / nullif(ps.enrolled + es.enrolled, 0), 1),
  CASE
    WHEN (ps.enrolled + es.enrolled) < 5 THEN 'insufficient_data'
    WHEN ((ps.enrolled + es.enrolled) - (ps.reachable + es.reachable))
       > ((ps.reachable + es.reachable) - (ps.returned + es.returned))
      THEN 'leak: churn/unsub before return'
    ELSE 'leak: reachable but did not return'
  END
FROM push_stats ps CROSS JOIN email_stats es CROSS JOIN anon_overlap ao;

-- RETURN-WINDOW BIAS: returned counts opens INSIDE [:from,:to). A subscription
-- enrolled late in the window has little time to receive a good-conditions
-- alert and come back, so return_pct is downward-biased for recent enrollees
-- and confounded by send frequency (a quiet week produces no sends, so no
-- opens, exactly the caveat in active_subscriber_retention.sql). For a fair
-- long-horizon return curve use active_subscriber_retention.sql per cohort
-- week; this block is a single-window funnel snapshot, not a survival curve.


-- ==========================================================================
-- COMPANION (PostHog HogQL, top-of-funnel exposure Supabase CANNOT see).
-- Ad-block / cross-device UNDERCOUNT. Run in the PostHog editor (project
-- 458289, US). Directional only, NEVER overrides the Supabase PRIMARY above.
-- ==========================================================================
--
-- C1. Exposure by segment. alert_optin_shown carries channel / trigger /
--     platform (verified in lib/analytics.ts EventPropMap), so the shown step
--     segments cleanly. This is the cross-channel generalization of
--     alert_optin_funnel.sql's "shown".
-- SELECT
--   properties.channel  AS channel,
--   properties.trigger  AS trigger,
--   properties.platform AS platform,
--   uniq(person_id) AS shown
-- FROM events
-- WHERE event = 'alert_optin_shown'
--   AND timestamp >= {filters.dateRange.from}
--   AND timestamp <  {filters.dateRange.to}
--   AND person_id NOT IN (
--     '11a83b86-4d73-565f-8b70-2f2847d865be',
--     '0faaad14-aa87-5cda-a76c-a3f59e0fa4d1',
--     '21e77b69-f479-5130-9696-e386ad7f9aa0',
--     'f38f6a31-bb18-525d-9d49-8e7194442d2b'
--   )
-- GROUP BY channel, trigger, platform
-- ORDER BY shown DESC;
--
-- C2. Grant/confirm (the seam step, PostHog view). The two grant/confirm
--     events do NOT carry channel/trigger the way shown does:
--       - push:  alert_optin_result(result='granted') carries platform+result,
--                no trigger/channel on the event (use alert_optin_funnel.sql
--                for the full denied/unsupported/subscribe_failed split),
--       - email: email_capture_confirmed carries only watched_count; from
--                2026-07-10 it can be split by the person properties
--                email_submit_platform / email_submit_trigger (see the
--                INSTRUMENTATION_CHANGELOG entry that added them). There is no
--                event-level channel/trigger to GROUP BY here.
--     So report these as totals, not grouped, and compare to Supabase enrolled:
-- SELECT
--   uniq(person_id) FILTER (WHERE event = 'alert_optin_result'
--                            AND properties.result = 'granted') AS push_granted,
--   uniq(person_id) FILTER (WHERE event = 'email_capture_confirmed') AS email_confirmed
-- FROM events
-- WHERE event IN ('alert_optin_result', 'email_capture_confirmed')
--   AND timestamp >= {filters.dateRange.from}
--   AND timestamp <  {filters.dateRange.to}
--   AND person_id NOT IN (
--     '11a83b86-4d73-565f-8b70-2f2847d865be',
--     '0faaad14-aa87-5cda-a76c-a3f59e0fa4d1',
--     '21e77b69-f479-5130-9696-e386ad7f9aa0',
--     'f38f6a31-bb18-525d-9d49-8e7194442d2b'
--   );
--
-- Reading the seam: PostHog push_granted / email_confirmed SHOULD be the same
-- humans as Supabase push_enrolled / email_enrolled, keyed differently. Expect
-- PostHog <= Supabase (ad-block + identity split drop client events). If PostHog
-- reads HIGHER than Supabase enrolled, that is a real backend leak (a granted
-- opt-in whose subscribe POST failed, i.e. alert_subscribe_failed /
-- email_capture_failed source='submit'), not noise. Use shown -> grant/confirm
-- from PostHog for the exposure leak, and grant/confirm -> enrolled -> returned
-- from Supabase for everything downstream. Never multiply a rate across the seam.
