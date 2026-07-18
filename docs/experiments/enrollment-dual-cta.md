# Experiment: enrollment_dual_cta

## Hypothesis
Presenting push and email at equal visual weight in the enrollment card will
raise the push opt-in grant rate, because today's card leads with email and
buries push as small print, so push-capable users default into the weaker
channel instead of choosing deliberately.

## Flag & variants
- PostHog flag key: `enrollment-dual-cta`
- Variants: `control` (current single-lead enrollment card: email-led on
  desktop/iOS Safari, install-led with a "Prefer email?" link on Android,
  push-only on standalone), `treatment` (equal-weight full-width push button,
  an "or" divider, and the inline email form, both at equal visual weight, on
  the three mobile surfaces where push is possible: standalone not
  push-denied, Android, and iOS Safari). `control` is `variants[0]`.
- Desktop renders the unchanged email-led card in both variants; the dual-CTA
  layout is mobile-only.

## Exposure
- Exposure event: `experiment_exposed` (`experiment: "enrollment_dual_cta"`).
- **Symmetric pattern (the corrected pattern, see
  `docs/experiments/next-good-window.md` and the `alert_interstitial` fix):
  `experiment_exposed` is logged for BOTH arms**, at the single trigger point
  where the enrollment card renders on a dual-eligible mobile surface with
  feature flags ready. It is NOT gated behind "is treatment". The anti-pattern
  this avoids: if exposure only fires when the treatment UI renders, control
  never gets an `experiment_exposed` row, so there is no counterfactual
  exposed cohort and the primary metric is uncomputable, that was the
  `alert_interstitial` exposure bug. Both arms already render the enrollment
  card on the same eligible surfaces, so both arms can be exposed at the same
  point even though only treatment shows the dual-CTA layout. The component
  calls `logExposure()` from a `useEffect` inside the rendered branch.

## Primary metric (exactly one)
- Event: `alert_optin_result` with `result: "granted"`.
- Definition: rate of `alert_optin_result` (`result: "granted"`) per exposed
  user in the same session (`experiment_exposed`,
  `experiment: "enrollment_dual_cta"`), treatment vs control. Direction:
  increase. Link the query:
  `analytics/queries/experiment_enrollment_dual_cta.sql`.
- **iOS caveat, directional only:** on iOS Safari, tapping "push" in
  treatment does not grant push in-session, it leads through Add to Home
  Screen; the actual permission grant happens later, out of page, and surfaces
  as a `standalone_relaunch`-triggered `alert_optin_result` after the user
  reopens the installed PWA. That later event cannot be joined back to the iOS
  exposure because the iOS Safari browser context and the installed-PWA
  context are different PostHog person ids (the same iOS PWA/browser
  identity split noted in `analytics/INSTRUMENTATION_CHANGELOG.md`). iOS
  exposures are therefore excluded from the in-session primary metric and
  read as directional-only signal, not part of the powered comparison.

## Guardrails (must not regress)
- `email_capture_submitted` per exposed user, treatment vs control: the
  dual-CTA layout must not cannibalize email signups by making push look
  like the only real option.
- `alert_optin_dismissed` per exposed user, treatment vs control: two
  equal-weight asks side by side risk choice paralysis, watch for a higher
  dismiss rate than the single-lead control.
- Monitored (not gating): combined-enrollment-per-exposed
  (`alert_optin_result:granted` OR `email_capture_submitted`, either channel)
  should not drop versus control, i.e. the redesign should not shrink total
  enrollment while shifting its mix.
- Monitored (not gating): submit-path reliability,
  `email_capture_failed{source:"submit"}` and `alert_subscribe_failed`,
  must not regress, the equal-weight layout should not introduce a new
  failure mode on either submit path.

## Decision rule
- **This is a guarded rollout with a kill switch, not a powered
  significance test.** At measured volume (~1 enrollment card shown per 8
  days, ex-owner), detecting a doubling of the current ~1% grant rate needs
  roughly 2,313 exposed users per arm, which at this traffic is on the order
  of 9 to 18 years. No minimum-runtime / minimum-exposed-count target is set
  because none is reachable in a useful window.
- The flag defaults to `control` (the current card ships to 100% of traffic)
  until the owner explicitly flips it post-read. Treatment is watched via the
  guardrails above for a regression, not evaluated for a lift.
- Ship rule: none, this experiment does not resolve to a ship/no-ship call
  on the primary metric. Keep `control` live; use the flag only to gate a
  monitored, reversible rollout of `treatment` if the owner decides to widen
  exposure, watching guardrails for regression at each step.
- iOS is directional-only and effectively excluded from the in-session
  primary (see Exposure/Primary above), so any read leans on Android and
  standalone exposures for the primary metric.

## Result: retired to 100%, no read (2026-07-17)
- **Not evaluated. Retired as an A/B and shipped at 100%** on owner directive:
  no A/B tests until DAU passes 100. This experiment was never powerable at
  measured volume (see Decision rule: ~2,313 exposed/arm needed, ~9-18 years at
  this traffic), so there was no lift to read and no counterfactual to preserve.
- The equal-weight dual-CTA card now renders unconditionally on the three mobile
  surfaces; the `useExperiment`/`logExposure` plumbing and the old control layouts
  (email-led iOS/desktop, install-led Android) were removed from
  `components/InstallPrompt.tsx`, and the entry was deleted from
  `lib/experiments.ts`. The `enrollment-dual-cta` PostHog flag is now dead and can
  be archived.
- Instrumentation note: `experiment_exposed{experiment:"enrollment_dual_cta"}`
  stops 2026-07-17; `alert_optin_shown`/`_dismissed` `channel:"both"` now fires for
  all mobile enrollment surfaces (was treatment-only). Full comparability note in
  `analytics/INSTRUMENTATION_CHANGELOG.md` (2026-07-17 entry).
- Guardrails to keep watching post-rollout (no arm to compare, so monitor the
  trend, not a delta): `email_capture_submitted`, `alert_optin_dismissed`,
  combined-enrollment-per-shown, and submit reliability
  (`email_capture_failed{source:"submit"}`, `alert_subscribe_failed`).
