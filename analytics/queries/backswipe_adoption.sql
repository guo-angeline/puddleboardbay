-- Metric: In-app back adoption (item 71 goal metric)
-- Definition: of all TOUCH-context spot_sheet_dismissed events (any method),
--             what share used one of the two new in-app back paths this item
--             shipped: `edge_swipe` (left-edge drag) or `os_back` (hardware/
--             browser Back via pushState+popstate), instead of the pre-71
--             paths (`close`, `backdrop`, `back` the app-bar arrow, or the
--             legacy `drag`). Segmented by the `display_mode` super property
--             (standalone PWA vs mobile browser) so the two contexts this
--             item targets (item 71's own rationale: standalone has NO
--             browser chrome and NO back gesture at all until this ships)
--             read separately rather than averaging together.
-- Events: spot_sheet_dismissed (INTENT, SpotDrawer), method is a
--         compile-enforced union since item 71 (lib/analytics-events.ts):
--         "edge_swipe" | "os_back" | "back" | "close" | "backdrop" | "drag".
--         spot_viewed (INTENT) is the stage-1 exposure denominator below,
--         for funnel context only, not the adoption denominator itself.
--
-- CRITICAL SCOPING (measurement-spec instrumentation gap, read before reuse):
-- `display_mode` only distinguishes "standalone" (installed PWA) from
-- "browser" (everything else opened in a tab), and "browser" mixes MOBILE
-- browser tabs with DESKTOP. Desktop is byte-unchanged by item 71 (no edge
-- zone, no gesture, replaceState path preserved per CLAUDE.md), so any
-- desktop spot_sheet_dismissed rows in the "browser" bucket would dilute the
-- denominator with dismissals that could never have used the new methods.
-- Every CTE below therefore ALSO filters on PostHog's autocaptured
-- `$device_type in ('Mobile', 'Tablet')`, on BOTH the numerator and the
-- denominator, so the whole query is touch-context only. Do not drop this
-- filter to "simplify": without it the standalone segment is fine (standalone
-- is mobile-only by construction, iOS/Android "Add to Home Screen"), but the
-- browser segment would silently include desktop Chrome/Safari dismissals.
--
-- Owner exclusion (analytics/EXCLUDED_PERSONS.md): applied to every CTE. The
-- owner's iOS PWA (`11a83b86-...`) is exactly a standalone touch device, so an
-- unfiltered read would count the owner's own dogfooding as adoption.
--
-- DIRECTIONAL ONLY. At current single-digit daily spot_sheet_dismissed volume
-- (see reports/analytics-*.md for the latest count), this is a point estimate
-- with an n, not a trend line: do not chart week-over-week movement or treat
-- a swing of a few events as a real change in behavior. Report the numbers
-- below (n and pct) as of the query window, and re-run at a later date for a
-- fresh point estimate rather than diffing two runs.
--
-- Guardrails to check alongside this read (not computed in this file):
--   - same-spot rage-reopen within 15s of a dismiss (spot_sheet_dismissed
--     followed by spot_viewed on the same spot_id + person_id inside 15s):
--     a rise would mean the gesture is mis-firing (closing when the user
--     meant to keep reading) rather than a clean back.
--   - dismissals-per-open (spot_sheet_dismissed / spot_viewed, same window):
--     should not jump; a jump means the new paths are adding accidental
--     dismissals, not replacing existing ones.
--   - conditions_viewed-per-open: should not drop; a drop would mean people
--     are bailing via the new gesture before they see conditions, the app's
--     differentiator.
--   - analytics/queries/token_leak_check.sql must still read 0 leaked_events;
--     this item touches history/URL state (pushState ?spot=<id>) and must
--     not reopen the item-47 token-leak class of bug.
--
-- Owner-exclusion list (analytics/EXCLUDED_PERSONS.md person_id table):
WITH excluded_persons AS (
  SELECT arrayJoin([
    '11a83b86-4d73-565f-8b70-2f2847d865be',
    '0faaad14-aa87-5cda-a76c-a3f59e0fa4d1',
    '21e77b69-f479-5130-9696-e386ad7f9aa0',
    'f38f6a31-bb18-525d-9d49-8e7194442d2b'
  ]) AS person_id
),
-- Stage 1: exposure denominator. Touch-context spot opens in the window,
-- i.e. everyone who could have gone on to dismiss via any method.
stage1_exposure AS (
  SELECT
    properties.display_mode AS display_mode,
    count() AS opens,
    uniq(person_id) AS openers
  FROM events
  WHERE event = 'spot_viewed'
    AND properties.$device_type IN ('Mobile', 'Tablet')
    AND person_id NOT IN (SELECT person_id FROM excluded_persons)
    AND timestamp >= {filters.dateRange.from}
    AND timestamp <  {filters.dateRange.to}
  GROUP BY display_mode
),
-- Stage 2: touch spot_sheet_dismissed, ANY method. This is the goal metric's
-- denominator (adoption is a share of dismissals, not a share of opens: not
-- every open ends in a dismiss inside the window, e.g. still-open sessions).
stage2_dismissed AS (
  SELECT
    properties.display_mode AS display_mode,
    count() AS dismissals,
    uniq(person_id) AS dismissers
  FROM events
  WHERE event = 'spot_sheet_dismissed'
    AND properties.$device_type IN ('Mobile', 'Tablet')
    AND person_id NOT IN (SELECT person_id FROM excluded_persons)
    AND timestamp >= {filters.dateRange.from}
    AND timestamp <  {filters.dateRange.to}
  GROUP BY display_mode
),
-- Stage 3: method mix within stage 2, as events, distinct users, and each
-- method's share of that display_mode's total touch dismissals.
stage3_method_mix AS (
  SELECT
    properties.display_mode AS display_mode,
    properties.method AS method,
    count() AS method_events,
    uniq(person_id) AS method_users,
    round(
      100.0 * count()
      / nullif(sum(count()) OVER (PARTITION BY properties.display_mode), 0),
      1
    ) AS method_share_pct
  FROM events
  WHERE event = 'spot_sheet_dismissed'
    AND properties.$device_type IN ('Mobile', 'Tablet')
    AND properties.method IN ('edge_swipe', 'os_back', 'back', 'close', 'backdrop')
    AND person_id NOT IN (SELECT person_id FROM excluded_persons)
    AND timestamp >= {filters.dateRange.from}
    AND timestamp <  {filters.dateRange.to}
  GROUP BY display_mode, method
),
-- Numerator: the two item-71 in-app back paths only, same scoping as
-- stage2_dismissed above (touch-context, owner-excluded).
backswipe_numerator AS (
  SELECT
    properties.display_mode AS display_mode,
    count() AS backswipe_dismissals
  FROM events
  WHERE event = 'spot_sheet_dismissed'
    AND properties.$device_type IN ('Mobile', 'Tablet')
    AND properties.method IN ('edge_swipe', 'os_back')
    AND person_id NOT IN (SELECT person_id FROM excluded_persons)
    AND timestamp >= {filters.dateRange.from}
    AND timestamp <  {filters.dateRange.to}
  GROUP BY display_mode
)
-- Goal metric: in-app back adoption, per display_mode ("standalone" vs
-- "browser", the latter mixed mobile-browser + would-be-desktop before the
-- $device_type filter above strips desktop out). Numerator is edge_swipe +
-- os_back dismissals; denominator is ALL touch spot_sheet_dismissed (any
-- method). Report as a point estimate (n alongside pct), see DIRECTIONAL
-- ONLY caveat at the top of this file.
SELECT
  d.display_mode,
  e.openers AS stage1_openers,
  d.dismissers AS stage2_dismissers,
  d.dismissals AS stage2_dismissals,
  coalesce(n.backswipe_dismissals, 0) AS backswipe_dismissals,
  round(
    100.0 * coalesce(n.backswipe_dismissals, 0) / nullif(d.dismissals, 0),
    1
  ) AS backswipe_adoption_pct
FROM stage2_dismissed AS d
LEFT JOIN stage1_exposure AS e ON e.display_mode = d.display_mode
LEFT JOIN backswipe_numerator AS n ON n.display_mode = d.display_mode
ORDER BY d.display_mode

-- Run the method-mix breakdown separately (same window) for the stage-3
-- funnel context referenced above:
-- SELECT * FROM stage3_method_mix ORDER BY display_mode, method_share_pct DESC
