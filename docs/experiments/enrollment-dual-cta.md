# Experiment: enrollment_dual_cta

## Hypothesis
Showing push and email at equal visual weight (full-width push button, "or"
divider, inline email row) instead of email-primary-with-push-buried raises
the enrollment result rate, because push-capable users currently have to
notice a small secondary link instead of an equally prominent choice.

## Flag & variants
- PostHog flag key: `enrollment-dual-cta`
- Variants: `control` (today's single-lead card: push-led on
  standalone/Android, email-led on desktop/iOS Safari), `treatment` (equal-
  weight push + "or" + email dual-CTA card on the three mobile surfaces;
  desktop stays the control card in both arms). `control` is `variants[0]`,
  the live default so the mid-July retention read is not disturbed.

## Exposure
- Exposure event: `experiment_exposed` (`experiment: "enrollment_dual_cta"`).
- Logged for BOTH arms from a single `useEffect` in `InstallPrompt.tsx` gated
  on the shared `dualEligible` computation (visible, a mobile platform,
  flags ready, not already granted, not mid email-pending, not the
  push-denied rescue): a user is exposed once the card would actually render
  a channel choice, whichever arm they're bucketed into. This mirrors the
  `next_good_window` symmetric pattern (both arms exposed at one shared
  render point) rather than the retired `alert_interstitial` bug (exposure
  gated behind "is treatment", which left control with no counterfactual
  cohort).

## Primary metric (exactly one)
- Event: `alert_optin_result` (`result: "granted"`), rate among
  `experiment_exposed` (`experiment: "enrollment_dual_cta"`) users who saw a
  push-capable surface (standalone/android exposures; iOS counts the
  Add-to-Home-Screen step, not `alert_optin_result` directly, so iOS reads
  lean on the guardrails below rather than this primary).
- Definition: push grant rate, treatment vs control, among exposed users on
  standalone/android. Link the query:
  `analytics/queries/experiment_enrollment_dual_cta.sql` (to be added at
  read time).

## Guardrails (must not regress)
- `email_capture_submitted`: the equal-weight email row must not convert
  worse than the current email-led/email-primary layout on iOS/desktop-
  adjacent flows; a drop here would mean the dual layout cannibalizes email
  without a compensating push gain.
- `alert_optin_dismissed`: dismiss rate must not rise, i.e. the denser
  two-channel card should not read as more cluttered or pushier than the
  single-lead control.

## Decision rule
- Minimum runtime: 14 days (novelty-effect floor, per the project's other
  experiments).
- Minimum exposed users: enough per variant to detect a meaningful lift in
  the push grant rate at the site's traffic (~14 new users/day per
  ROADMAP.md); given the low-traffic precedent set by `next_good_window`,
  treat any read before ~150-200 exposed users per variant as directional
  only, not a ship decision.
- Ship treatment if the push grant rate (primary) beats control with no
  guardrail regression beyond 2pp. Otherwise keep control. Owner flips the
  flag after the mid-July retention read closes so this experiment does not
  contaminate that read.

## Result (fill in at the end)
- Exposed users / variant, primary metric per variant, guardrail readings,
  decision, and a one-line note for `analytics/INSTRUMENTATION_CHANGELOG.md`
  if any event changed.
