# Experiment: next_good_window

## Hypothesis
Showing the next calm window in the drawer raises in-session directions
intent, because a forward-looking "come back Sat" gives a reason to plan a
paddle, versus today's drawer which only answers "is it good right now".

## Flag & variants
- PostHog flag key: `next-good-window`
- Variants: `control` (current drawer, no forward-looking window), `treatment`
  (drawer shows the next calm window, e.g. "Next calm window: Sat 7 to
  10am", or a quiet no-window line). `control` is `variants[0]`.

## Exposure
- Exposure event: `experiment_exposed` (`experiment: "next_good_window"`).
- **Corrected symmetric pattern (do not replicate the `alert_interstitial`
  exposure bug, fixed in open PR #6):** `experiment_exposed` is logged for
  BOTH arms, once the next-window evaluation resolves (`ok: true`) and the
  feature flags are ready, at that single trigger point. It is NOT gated
  behind "is treatment". The anti-pattern this avoids: if exposure only fires
  when the treatment UI renders, control never gets an `experiment_exposed`
  row, so there is no counterfactual exposed cohort to compare against, only
  bucketed-but-unmeasured users. Both arms already render the drawer's
  directions button, so both arms can be exposed at the same evaluation point
  even though only treatment shows the window block.

## Primary metric (exactly one)
- Event: `spot_action` with `action: "directions"`.
- Definition: rate of `action: "directions"` among exposed users
  (`experiment_exposed`, `experiment: "next_good_window"`), treatment vs
  control. Comparable because both arms have the drawer's directions button;
  only the window block differs. Link the query:
  `analytics/queries/experiment_next_good_window.sql`.

## Guardrails (must not regress)
- `conditions_loaded`: the window block reuses the same conditions fetch,
  it must not add latency or failures to the existing panel.
- `spot_sheet_dismissed` rate: the extra block should not make people bail
  on the drawer faster than they already do today.

## Diagnostics (not the primary metric)
- `next_window_viewed`: dwell-gated genuine view of the window block,
  treatment only. Tells us whether people actually looked at the block, not
  whether it converted: the primary metric is `spot_action`.

## Decision rule
- Minimum runtime: 14 days AND minimum exposed users: 30 per variant.
- Ship treatment if the directions rate improves by >= 5 percentage points
  with no guardrail regression beyond 2 points. Otherwise keep control.
- **Caveat:** acquisition is ~14 users/day (ROADMAP.md:26), so 30 exposed
  users per variant needs a long read window at this traffic. This test can
  cleanly read in-session directions intent but cannot cleanly measure
  retention lift (return visits) short-term; treat any early retention read
  as directional only.

## Result (fill in at the end)
- Exposed users / variant, primary metric per variant, guardrail readings,
  decision, and a one-line note for `analytics/INSTRUMENTATION_CHANGELOG.md` if
  any event changed.
