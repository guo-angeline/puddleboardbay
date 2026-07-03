# Experiment: <name>

Copy this file to `docs/experiments/<slug>.md` and fill it in **before** the
experiment ships. An experiment without a pre-declared primary metric and
decision rule is a fishing trip, not a test.

Mirror the `flag`, `variants`, `primaryMetric`, and `guardrails` here against the
registry entry in `lib/experiments.ts` — they must match.

## Hypothesis
One sentence: changing X will move <primary metric> because <reason>.

## Flag & variants
- PostHog flag key: `<flag>`
- Variants: `control` (current), `<treatment>` (...). `control` is `variants[0]`.

## Exposure
- Exposure event: `experiment_exposed` (`experiment: "<name>"`).
- A user is exposed only when the variant-dependent UI renders. The component
  calls `logExposure()` from a `useEffect` inside the rendered branch. Analysis
  is restricted to the exposed cohort.

## Primary metric (exactly one)
- Event: `<event>` (e.g. `spot_action` with `action: "directions"`).
- Definition: <rate / per-exposed-user / etc.>. Link the query:
  `analytics/queries/experiment_<slug>.sql`.

## Guardrails (must not regress)
- `<event>` — <why it must hold> (e.g. `conditions_loaded` availability, or
  `spot_sheet_dismissed` rate as a bounce proxy).

## Decision rule
- Minimum runtime: <N days> AND minimum exposed users: <N per variant>.
- Ship treatment if primary metric improves by ≥ <effect> with no guardrail
  regression beyond <tolerance>. Otherwise keep control.

## Result (fill in at the end)
- Exposed users / variant, primary metric per variant, guardrail readings,
  decision, and a one-line note for `analytics/INSTRUMENTATION_CHANGELOG.md` if
  any event changed.
