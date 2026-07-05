# Experiment: alert_interstitial

## Hypothesis
Showing the calm-window timing and put-in notes in a floating card over the
deep-linked spot will raise the alert-to-directions rate, because the bare
drawer today drops the exact context ("when" and "where to launch") that made
the push worth opening.

## Flag & variants
- PostHog flag key: `alert-interstitial`
- Variants: `control` (bare drawer, current behavior), `treatment` (floating
  card with window label + notes). `control` is `variants[0]`.

## Exposure
- Exposure event: `experiment_exposed` (`experiment: "alert_interstitial"`).
- Exposure is TRIGGER-based, logged for BOTH arms: the moment the app opened
  from an alert (`from=alert`) on the deep-linked spot with a `window` label to
  show, i.e. the point where the two arms diverge. `AlertInterstitial` mounts
  in both arms at that moment (the mount is gated on the alert context, not the
  variant) and calls `logExposure()` from a `useEffect` guarded only on `ready`,
  so control logs its counterfactual exposure even though it renders nothing.
  Analysis is restricted to the exposed cohort. (The first cut logged exposure
  only inside the treatment branch, which left control with zero exposed users
  and no way to measure lift; fixed 2026-07-04.)

## Primary metric (exactly one)
- Event: `spot_action` with `action: "directions"` (the shared "I'm going"
  signal both arms can fire: control from the drawer button, treatment from the
  card, which now also emits `spot_action` with `source: "alert_interstitial"`).
- Definition: unique exposed users who fire `spot_action`/`directions` in the
  session, divided by unique exposed users, per variant. Lift = treatment rate
  minus control rate. Link the query:
  `analytics/queries/experiment_alert_interstitial.sql`.
- Secondary (treatment-only diagnostic, NOT lift): `alert_interstitial_result`
  splits how the card was left (`dismissed` vs `directions`). It cannot be
  compared to control because control has no card.

## Guardrails (must not regress)
- `spot_sheet_dismissed` rate — the card should not make people bail on the
  drawer faster than they already did on a bare alert open.
- `conditions_loaded` — availability of the underlying spot conditions should
  be unaffected; a regression means the card broke the drawer's data path.

## Decision rule
- Minimum runtime: 14 days AND minimum exposed users: 30 per variant (alert
  opt-ins are still low volume; see ROADMAP item 5's funnel re-check).
- Ship treatment if the directions rate (primary) improves by >= 5 percentage
  points with no guardrail regression beyond 2 points. Otherwise keep control.

## Result (fill in at the end)
- Exposed users / variant, primary metric per variant, guardrail readings,
  decision, and a one-line note for `analytics/INSTRUMENTATION_CHANGELOG.md` if
  any event changed.
