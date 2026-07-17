-- Metric: Repeat email prompt rate (post-confirm). Target 0.
-- Definition: of the people who confirmed an email subscription in the
--             window and were seen again afterward, how many were shown
--             the enrollment prompt again on the email channel after that
--             confirm. The bug this guards: item 47 found the prompt kept
--             re-showing confirmed email subscribers because the client
--             never checked server-side confirmed state, so this rate was
--             100% by construction pre-fix. Segments alert_optin_shown by
--             `properties.trigger` (guardrail 1: which trigger is still
--             firing for a confirmed subscriber) and reports
--             enrollment_prompt_suppressed volume (guardrail 2: the new
--             event that should now fire instead) in the same result set,
--             so both guardrails read from one file.
-- Events: email_capture_confirmed (intent, marks confirmed_at per person),
--         alert_optin_shown (intent, `channel`, `trigger`),
--         enrollment_prompt_suppressed (system, fires when a prompt is
--         suppressed because of email-subscribed state; carries the
--         trigger that would have fired).
-- Caveat: the ex-owner denominator is 0 today (reports/analytics-2026-07-11.md:
--         0 email_capture_confirmed ex-owner in the 14 days to 2026-07-11), so
--         this is a correctness check at N=1 (the owner) on deploy day, not a
--         statistical read, until D17 / deliverability produces real confirmed
--         subscribers.
-- Caveat: alert_optin_shown before the item-47 deploy is NOT comparable, see
--         analytics/INSTRUMENTATION_CHANGELOG.md, 2026-07-16 item 47 entry.
--         Pre-fix the repeat_prompt_rate_pct below is 100% by construction
--         (that is the bug this item fixes); post-fix it must read 0.
-- Caveat: owner-inclusive, a drop in alert_optin_shown after the deploy is the
--         fix working, not a regression. Ex-owner, the PREDICTED drop is zero
--         (there were no ex-owner confirmed subscribers to over-suppress), so
--         any material ex-owner drop in alert_optin_shown around this deploy
--         is a signal of over-suppression, not the fix, and should be
--         investigated rather than celebrated.
-- Caveat: email_capture_submitted is NOT a usable guardrail at n=2 submits
--         over 14 days (reports/analytics-2026-07-11.md); do not put it on a
--         dashboard as a regression signal for this fix.
-- Caveat: the unit of analysis is person_id by necessity. posthog.identify()
--         is hard-banned in this app (no login), and the fix's own cache
--         (localStorage known/confirmed booleans) is device-scoped, so the
--         metric's unit matches the mechanism's unit: a person_id that
--         crosses devices looks like two people here, same as the mechanism
--         would treat them as two devices to re-prompt.
--
-- Owner exclusion (analytics/EXCLUDED_PERSONS.md): ON by default, applied to
-- BOTH the goal-metric CTE (confirms) and the guardrail SELECT (the events
-- scan feeding shown_* and suppressed_*), since the owner is the only
-- confirmed subscriber on deploy day and would otherwise dominate all three.
-- To see the owner's own rows, comment out each exclusion clause below
-- (search "TOGGLE: lift owner exclusion", two occurrences).
WITH confirms AS (
  SELECT
    person_id,
    min(timestamp) AS confirmed_at
  FROM events
  WHERE event = 'email_capture_confirmed'
    AND timestamp >= {filters.dateRange.from}
    AND timestamp <  {filters.dateRange.to}
    -- TOGGLE: lift owner exclusion by commenting out the next line.
    AND person_id NOT IN (
      '11a83b86-4d73-565f-8b70-2f2847d865be',
      '0faaad14-aa87-5cda-a76c-a3f59e0fa4d1',
      '21e77b69-f479-5130-9696-e386ad7f9aa0',
      'f38f6a31-bb18-525d-9d49-8e7194442d2b'
    )
  GROUP BY person_id
),
returned AS (
  -- Confirmed persons who were seen again at all after their confirm, i.e.
  -- had any later event (the denominator population: people who could have
  -- been re-prompted).
  SELECT DISTINCT c.person_id
  FROM confirms AS c
  INNER JOIN events AS e
    ON e.person_id = c.person_id
   AND e.timestamp > c.confirmed_at
),
reprompted AS (
  -- Confirmed persons shown the email (or dual push+email) prompt again
  -- after their own confirm. Should be empty post-fix.
  SELECT DISTINCT c.person_id
  FROM confirms AS c
  INNER JOIN events AS e
    ON e.person_id = c.person_id
   AND e.event = 'alert_optin_shown'
   AND e.properties.channel IN ('email', 'both')
   AND e.timestamp > c.confirmed_at
  WHERE e.timestamp >= {filters.dateRange.from}
    AND e.timestamp <  {filters.dateRange.to}
)
SELECT
  (SELECT count(*) FROM confirms) AS confirmed_persons,
  (SELECT count(*) FROM returned) AS returned_persons,
  (SELECT count(*) FROM reprompted) AS reprompted_persons,
  -- nullif, not greatest(...,1): a 0 denominator (the documented ex-owner
  -- state today) must read NULL, not 0.0. 0.0 is indistinguishable from
  -- "target met" on a dashboard tile, and this file's own header says the
  -- ex-owner denominator IS 0 on deploy day. Same pattern as
  -- enrollment_return_funnel.sql's reachable_pct / return_pct.
  round(
    100.0 * (SELECT count(*) FROM reprompted)
    / nullif((SELECT count(*) FROM returned), 0),
    1
  ) AS repeat_prompt_rate_pct,
  -- Guardrail 1: alert_optin_shown segmented by trigger, so a specific
  -- trigger left un-suppressed is visible rather than averaged away. Not
  -- restricted to confirmed persons, this is the whole prompt population in
  -- the window (that is the point: a healthy fix has trigger:"manual" fall
  -- to zero for the email-confirmed cohort per D18 Q2(c), while the other
  -- three triggers keep firing normally for everyone else).
  uniqIf(person_id, event = 'alert_optin_shown' AND properties.trigger = 'first_save') AS shown_first_save,
  uniqIf(person_id, event = 'alert_optin_shown' AND properties.trigger = 'standalone_relaunch') AS shown_standalone_relaunch,
  uniqIf(person_id, event = 'alert_optin_shown' AND properties.trigger = 'manual') AS shown_manual,
  uniqIf(person_id, event = 'alert_optin_shown' AND properties.trigger = 'return_session') AS shown_return_session,
  uniqIf(person_id, event = 'alert_optin_shown' AND properties.trigger = 'conditions_interest') AS shown_conditions_interest,
  -- Guardrail 2: enrollment_prompt_suppressed volume and reach, the ONLY
  -- signal that catches a bad suppression now that trigger:"manual" goes to
  -- zero for the email-confirmed cohort (D18 Q1(a) consequence).
  countIf(event = 'enrollment_prompt_suppressed') AS suppressed_count,
  uniqIf(person_id, event = 'enrollment_prompt_suppressed') AS suppressed_persons
FROM events
WHERE event IN ('alert_optin_shown', 'enrollment_prompt_suppressed')
  AND timestamp >= {filters.dateRange.from}
  AND timestamp <  {filters.dateRange.to}
  -- TOGGLE: lift owner exclusion by commenting out the next clause. Both
  -- guardrails scan `events` unfiltered otherwise, and the owner is the
  -- only confirmed subscriber on deploy day, so an unfiltered
  -- suppressed_count / suppressed_persons would be entirely owner rows
  -- with no way to read the ex-owner drop the header caveat requires.
  AND person_id NOT IN (
    '11a83b86-4d73-565f-8b70-2f2847d865be',
    '0faaad14-aa87-5cda-a76c-a3f59e0fa4d1',
    '21e77b69-f479-5130-9696-e386ad7f9aa0',
    'f38f6a31-bb18-525d-9d49-8e7194442d2b'
  )
