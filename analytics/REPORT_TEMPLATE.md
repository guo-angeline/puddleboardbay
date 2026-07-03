<!-- analytics-report -->
# SUP Spots: analytics readout

**Window:** <start> to <end> · **Source:** PostHog project 458289 (US) · **Generated:** <date>

> Fill every metric from a query in `analytics/queries/`. No number without a
> query path. Definitions live in `analytics/GLOSSARY.md`. The `<!-- analytics-report -->`
> marker above triggers archival to `reports/` (scripts/save-analytics-report.py).

## Instrumentation changes affecting this window
<!-- REQUIRED. Read analytics/INSTRUMENTATION_CHANGELOG.md and list every entry
     whose date falls in or near this window, with its comparability note. If
     none, write "None." A metric jump must be checked against this list BEFORE
     it is attributed to user behavior. -->
- ...

## Metrics
Every row: **Metric → query → value → caveat.**

| Metric | Query | Value | Caveat |
|--------|-------|-------|--------|
| Spot open rate | `queries/spot_open_rate.sql` | ... | bots inflate denominator |
| Conditions availability | `queries/conditions_availability.sql` | ...% | reliability, NOT engagement |
| Conditions engagement | `queries/conditions_engagement.sql` | ...% | dwell-gated; new series from 2026-06-29 |
| Directions conversion | `queries/directions_conversion.sql` | ...% | click, not confirmed outbound |
| Saved conditions engagement | `queries/saved_conditions_engagement.sql` | ...% | new series from 2026-06-29 |
| W1 retention | `queries/retention_w1.sql` | ...% | recent cohorts censored |

## Read
2-4 sentences. State what changed and what's uncertain. Do not call a metric
"loved" or "used heavily" unless it's an *intent* metric — availability is not
engagement.

## Running experiments
For each: experiment, exposed users/variant, primary metric per variant,
guardrail readings, decision. Metrics computed over the `experiment_exposed`
cohort only (`queries/experiment_<slug>.sql`).
