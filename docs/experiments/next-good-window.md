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
- Event: `spot_action` with `action: "directions"`, **excluding
  `source: "alert_interstitial"`** (drawer taps only).
- Definition: rate of drawer `action: "directions"` among exposed users
  (`experiment_exposed`, `experiment: "next_good_window"`), treatment vs
  control. Comparable because both arms have the drawer's directions button;
  only the window block differs. Link the query:
  `analytics/queries/experiment_next_good_window.sql`.
- **Decontamination (2026-07-08, D2(a)):** `alert_interstitial` became a
  monitored 100% rollout, so its card fires `spot_action`/`directions`
  (`source: "alert_interstitial"`) on every alert-open regardless of this
  experiment's arm. Those taps are excluded from the primary above so the metric
  stays a clean drawer-vs-drawer comparison. Read this metric only from
  2026-07-08 forward under the new definition.

## Guardrails (must not regress)
- `conditions_loaded`: the window block reuses the same conditions fetch,
  it must not add latency or failures to the existing panel.
- `spot_sheet_dismissed` rate: the extra block should not make people bail
  on the drawer faster than they already do today.

## Diagnostics (not the primary metric)
- `next_window_viewed`: dwell-gated genuine view of the window block,
  treatment only. Tells us whether people actually looked at the block, not
  whether it converted: the primary metric is `spot_action`.

## Decision rule (recalibrated 2026-07-08, D2(a))
- **Realistic MDE, not "30 per arm".** Detecting a 5pp lift on a ~5-10%
  directions rate at 80% power / a=0.05 needs **~430-680 exposed users per
  variant**. The old rule ("30/arm, ship on +5pp") only had power to detect a
  20+pp swing, i.e. it would have called noise a win. Do not ship on the old bar.
- **Read window:** at ~14 users/day acquisition (ROADMAP.md:26) and exposure
  only on drawer opens that resolve a window, powering the primary is a
  months-long read. Minimum runtime stays 14 days as a novelty-effect floor, but
  a *decision* requires the exposed-count target above, not just elapsed days.
- **Ship rule:** ship treatment only if the drawer-directions rate (primary,
  interstitial-excluded) beats control by >= 5 pp AND both arms have reached the
  exposed-count target above AND no guardrail regresses beyond 2 pp. Otherwise
  keep control. Any read before the target is **directional only**, never a ship
  decision. No sequential-testing correction is in place, so do not "peek and
  ship" early.
- **What this test can and cannot do:** it can cleanly read in-session drawer
  directions intent once powered; it cannot cleanly measure the real objective
  (retention / return visits) short-term. If the exposed-count target proves
  unreachable in a reasonable window, the fallback (per D2(a)) is to convert this
  to a monitored 100% rollout too, watching the guardrails and `next_window_viewed`
  engagement rather than a lift test.

## Result (fill in at the end)
- Exposed users / variant, primary metric per variant, guardrail readings,
  decision, and a one-line note for `analytics/INSTRUMENTATION_CHANGELOG.md` if
  any event changed.
