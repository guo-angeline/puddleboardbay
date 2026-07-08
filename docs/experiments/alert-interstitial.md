# Rollout: alert_interstitial (retired as an A/B test 2026-07-08)

> **Status: monitored 100% rollout, not an experiment.** Retired as an A/B test
> per D2(a) on 2026-07-08. It fired only on push-opens, and with a single
> watched subscription it collected ~0 exposures/week, so an arm comparison
> could never reach significance this year. The treatment card now ships to
> everyone and we watch guardrails for regressions instead of comparing arms.
> The original experiment design is preserved below the line for history.

## What ships
The floating card (calm-window label + put-in notes) renders on every
alert-originated open of the deep-linked spot. There is no `control` arm and no
`alert-interstitial` PostHog flag read anymore; the mount is gated only on the
alert context (`from=alert`, matching spot, a window label to show) in
`HomeClient`.

## What we monitor (guardrails, watch for regression)
- `spot_sheet_dismissed` rate on alert-opens: the card must not make people bail
  on the drawer faster than a bare alert open did.
- `conditions_loaded`: the underlying spot conditions availability/latency must
  be unaffected; a regression means the card broke the drawer's data path.
- Diagnostics: `alert_interstitial_shown` (card rendered) and
  `alert_interstitial_result` (`dismissed` vs `directions`) show how the card is
  received. These are absolute rollout metrics, not a lift vs any control.

## Note on the shared metric
The card still fires `spot_action` with `action: "directions"` and
`source: "alert_interstitial"` on tap-through. Because the card is now always
on, those taps are present for every alert-open and would otherwise pollute the
`next_good_window` experiment's primary metric, so that query now excludes
`source = "alert_interstitial"` (see `analytics/queries/experiment_next_good_window.sql`).

## If the watched set grows
Revisit whether a real A/B test is powerable once push opt-ins are no longer a
handful (the power math that killed it: ~430-680 exposed/arm for a 5pp lift).
Until then, guardrail-monitored rollout is the honest instrument at this scale.

---

## History: original A/B design (2026-07-04 to 2026-07-08)

### Hypothesis
Showing the calm-window timing and put-in notes in a floating card over the
deep-linked spot will raise the alert-to-directions rate, because the bare
drawer today drops the exact context ("when" and "where to launch") that made
the push worth opening.

### Flag & variants
- PostHog flag key: `alert-interstitial`
- Variants: `control` (bare drawer, current behavior), `treatment` (floating
  card with window label + notes). `control` is `variants[0]`.

### Exposure
- Exposure event: `experiment_exposed` (`experiment: "alert_interstitial"`).
- Exposure is TRIGGER-based, logged for BOTH arms: the moment the app opened
  from an alert (`from=alert`) on the deep-linked spot with a `window` label to
  show, i.e. the point where the two arms diverge. `AlertInterstitial` mounted
  in both arms at that moment and called `logExposure()` from a `useEffect`
  guarded only on `ready`, so control logged its counterfactual exposure even
  though it rendered nothing. Analysis was restricted to the exposed cohort.
  (The first cut logged exposure only inside the treatment branch, which left
  control with zero exposed users and no way to measure lift; fixed 2026-07-04.)

### Primary metric (exactly one)
- Event: `spot_action` with `action: "directions"` (the shared "I'm going"
  signal both arms could fire: control from the drawer button, treatment from
  the card, which also emits `spot_action` with `source: "alert_interstitial"`).
- Definition: unique exposed users who fired `spot_action`/`directions` in the
  session, divided by unique exposed users, per variant.

### Guardrails (must not regress)
- `spot_sheet_dismissed` rate; `conditions_loaded`.

### Decision rule (retired)
- Minimum runtime: 14 days AND minimum exposed users: 30 per variant. Ship
  treatment if the directions rate improved by >= 5 pp with no guardrail
  regression beyond 2 pp. **Never reachable at this traffic** (the power
  analysis showed ~430-680 exposed/arm needed for a 5pp lift, and the surface
  collects ~0 exposures/week at 1 subscription), which is why it was converted
  to a monitored 100% rollout on 2026-07-08 (D2(a)).
