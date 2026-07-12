<!-- analytics-report -->
# SUP Spots: analytics readout — INTERIM, last ~8 clean days (2026-07-02 → 2026-07-10)

**Source:** PostHog project 458289 (US), live pull · **Excludes:** owner ids `11a83b86…865be`, `0faaad14…9d4a1` per `analytics/EXCLUDED_PERSONS.md` · **Generated:** 2026-07-09

> **⚠️ PROVISIONAL / DIRECTIONAL ONLY. LOW CONFIDENCE. DO NOT SHIP DECISIONS ON THESE NUMBERS.**
> Tiny N (149 persons ex-owner over ~8 days). Bot filtering (`before_send`) only went live 2026-07-09, so **4,482 of 4,979 events (90%) predate it and are bot-contaminated**. Retention is device-based and Safari-ITP-censored. The Save-first CTA re-weight and the alert loop's clean instrumentation both landed 2026-07-09, so they have near-zero live time in this window. Every number below is a directional read, not a verdict-grade metric.

## Executive summary (answers the PMF question)

The app has one clear, broad-based behavior: **people open spots and check paddling conditions.** 89 of 100 openers genuinely viewed the (dwell-gated INTENT) conditions panel, and conditions loaded successfully 100% of the time. That is a real, repeated use case with product-market fit signal *as a conditions-checking utility*. **But the retention mechanism built on top of it has essentially zero adoption ex-owner: 1 save, 1 opt-in prompt shown, 0 alert clicks in the entire window.** So: **conditions-checking shows early PMF as a use case; the save→alert retention loop does not yet, and cannot be judged because almost no real user has entered it.** Verdict: one candidate use case is validated directionally (conditions lookup), the retention thesis is still unproven.

## Data quality gate

- [x] **Events fire:** all cited events returned live rows from the bundle.
- [x] **Internal/bot excluded:** owner ids filtered in every query. **Residual bot contamination remains** for 90% of the window (pre-07-09, no `before_send`). Several heavy persons cannot be verified as human (see concentration).
- [x] **Availability vs intent kept separate:** `conditions_loaded` (SYSTEM, 907 events) reported as reliability only; engagement uses `conditions_viewed` (INTENT, dwell-gated) exclusively.
- [x] **Concentration checked:** reported below; top 5 persons = ~32% of opens.
- [x] **Sparsity checked:** every low-N metric shows distinct persons next to counts; single-digit metrics flagged as unusable for trend.

## Instrumentation changes affecting this window (required)

- **Bot drop (`before_send`) live only from 2026-07-09.** Pre/post split ex-owner: **pre-07-09 = 4,482 events / 137 persons; post-07-09 = 497 events / 18 persons.** The clean slice is ~1 day / 18 persons. Everything before is bot-inflated at the denominator and retention-depressed. `HogQL: SELECT if(timestamp<toDateTime('2026-07-09'),'pre','post') seg, count(), count(DISTINCT person_id) FROM events WHERE timestamp>=toDateTime('2026-07-02') AND person_id NOT IN(owners) GROUP BY seg`
- **Grounded conditions split reached prod 2026-07-02** (this window's start). `conditions_viewed` is dwell-gated INTENT from here; do not compare to older fetch-settle counts. Chosen as the window start for exactly this reason.
- **First-touch acquisition props (`first_referrer`, `first_utm_*`) live only from ~2026-07-09.** Only 7 of 149 persons carry them; 148 null. Growth read leans on `$referring_domain` instead.
- **Spot-sheet CTA re-weighted to Save-first, 100%, no control arm, 2026-07-09.** Saves had almost no live time under the new prominence; the 1-save number is not a fair read of save demand.
- **Alert loop clean instrumentation + launch-reminder push both live 2026-07-09.** Server-side retention cohorts have no history. `alert_clicked` / `alert_opens` effectively zero elapsed time.
- **`event_category` stamp incomplete in-window** (completed 2026-07-09): 3,219 events carry `null` category. I filtered by **event name**, not category, per the changelog's guidance for windows spanning the date.

## Metrics

Every row is ex-owner, window 2026-07-02→now. Distinct persons shown beside counts.

| Metric | Value (persons / events) | HogQL basis | Caveat |
|--------|--------------------------|-------------|--------|
| Total activity | 149 persons / 4,979 events | `count(), count(DISTINCT person_id)` | 90% pre-bot-filter |
| Pageview users | 141 / 246 | `event='$pageview'` | denominator bot-inflated |
| Spot open rate (openers ÷ pageview users) | 100 / 141 = **71%** | `event='spot_viewed'` distinct ÷ pageview distinct | INTENT |
| Conditions availability (SYSTEM) | **100%** (907 ok / 0 failed / 907) | `event='conditions_loaded', countIf(properties.failed=false)` | reliability, NOT engagement |
| **Conditions engagement (INTENT, dwell-gated)** | **89 / 720** = 89% of openers | `event='conditions_viewed'` distinct ÷ openers | volume top-heavy; persons broad |
| Filter use | 27 / 91 | `event='filter_changed'` | INTENT |
| Directions conversion | **6 / 18** = 6% of openers | `event='spot_action', properties.action='directions'` | click, not confirmed outbound |
| Photos taps | 7 / 10 | `action='photos'` | low-N |
| Share taps | 2 / 4 | `action='share'` | low-N, noise |
| Saves | **1 / 1** | `event='favorite_toggled'` | Save-first CTA <1 day old; still ~zero |
| Alert opt-in shown | **1 / 1** | `event='alert_optin_shown'` | loop essentially unentered |
| Alert clicks / opt-in granted | **0 / 0** | absent from event list | no ex-owner signal |
| PWA installs | 4 / 4 | `event='pwa_installed'` | low-N |
| Return visitors (≥2 active days) | **24 / 149 = 16%** | active-days histogram | ITP-censored + bot-depressed |

## 1. User journeys + frequencies

Ranked INTENT events by distinct persons: `spot_viewed` **100p/977**, `conditions_viewed` **89p/720**, `filter_changed` 27p/91, `spot_sheet_dismissed` 18p/57, `spot_action` 12p/32, `next_window_viewed` 9p/43 (experiment), `view_switched` 7p, `near_me_toggled` 6p, `spot_search` 2p, `favorite_toggled` 1p.

**Dominant path (est. ~70% of engaged sessions):** land (mostly `$direct`) → browse map/list → open one or more spots → genuinely view conditions → leave. Openers average ~10 spot opens and ~8 conditions views each. **Secondary branches:** filter by water type (27p), tap directions (6p) or photos (7p). **Drop-off cliff: the save/alert branch.** Of 100 openers, 1 saved, 1 saw an opt-in, 0 opted in or clicked an alert. The journey terminates at "checked conditions, left" for nearly everyone.

## 2. Main use case

**Checking paddling conditions for a spot.** `conditions_viewed` (89 distinct persons, dwell-gated) trails `spot_viewed` (100) almost 1:1 and dwarfs every downstream action (directions 6p, photos 7p, save 1p) by an order of magnitude. This is not availability inflation: it is the INTENT event, on-screen ≥1s. The app is used as a conditions-lookup utility for SUP spots, not (yet) as a trip-planner (directions weak) or a saved-places/alerts tool (near-zero).

## 3. Retention & reason to return

**Directional only, N tiny.** Active-days histogram ex-owner: **125 persons one-and-done (84%), 24 (16%) returned on ≥2 days** (19 two-day, 1 three-day, 1 four-day, 3 five-day). This 84% one-and-done is *better than* the old bot-inclusive "78%" claim once you realize the old baseline counted bots as one-and-done users, and it is still **an overestimate of churn** because Safari ITP purges storage after ~7 days (returners look new) and the PWA partition splits installers. True one-and-done is below 84%, unquantifiable here. **Reason-to-return is not yet observable:** the intended driver (alert push when a spot goes calm) has 0 ex-owner clicks and the loop is 1 day live. The ~24 returners came back to *check conditions again* (that is the only repeated intent in the data), not via the alert loop. Server-side reachable-audience / active-subscriber retention: no history, first real read early-to-mid August per plan.

## 4. Growth / discovery channel

`$referring_domain` on pageviews ex-owner: **`$direct` 113 persons / 210 views (80% of pageview persons)**, then organic search: Google 9p, DuckDuckGo 8p, Bing 7p, plus 2p Android Google app, 2p `l.facebook.com`, Yahoo 2p. **No share-driven acquisition signal** (share taps = 2 persons; no measurable inbound from them). `first_referrer` exists for only 7/149 persons (props ~1 day old): 4 "direct", 1 Google, 1 Yahoo, 1 Android search. Read: discovery is **direct (word-of-mouth / bookmark / QR / typed-in) plus a thin organic-search tail.** The viral/share loop is not contributing.

## PMF verdict (calibrated)

**One use case shows directional PMF: on-demand conditions checking for SUP spots.** 89% of openers genuinely engage the conditions panel, at 100% load reliability, across 89 distinct persons, and a power cohort returns to do it again. That is the differentiator the roadmap bet on, and the intent data supports it as far as ~8 noisy days can.

**The retention thesis is unproven, not disproven.** The save→install→alert loop that is supposed to convert conditions-interest into retention has essentially no real-user adoption yet (1 save, 1 opt-in, 0 clicks), largely because its clean instrumentation and the Save-first CTA are 1 day old. You cannot conclude it fails; you can conclude **there is not yet a single ex-owner alert-loop success in the data.** Retention today rides entirely on organic reason-to-return (re-checking conditions), and 16% two-day return is a floor, not a verdict.

**Net:** ship-worthy signal that conditions-lookup is the product; the alert-driven retention loop needs the early-August server-side read before any PMF claim. Do not tell the board "retention loop works." Do tell them "conditions is the validated use case and engagement is strong; the retention mechanism is live but unmeasured."

## Additional sub-questions

- **Power-user cohort?** Yes, and it is concentrated: top person = 83/977 opens (8.5%), **top 5 = 315/977 = 32%** of all opens; conditions_viewed top 5 = 238/720 = 33%. These are Mobile Safari, spread over 1-2 days (mostly human-paced), but **pre-07-09 and un-bot-filtered**, and one did 52 opens in 28 minutes (borderline). The broad 89-distinct-person conditions signal survives even if 1-2 heavy sessions are bots, but treat the *volume* as cohort-driven, not typical.
- **Activation rate:** 71% of pageview users open a spot; 89% of those check conditions. Activation into the core action is high. Activation into the retention loop (save) is ~1%.
- **Does conditions/alerts drive return?** Conditions plausibly does (only repeated intent). Alerts: no evidence yet, N=0.

## Confidence & limitations

- **Confidence: LOW.** 149 persons, ~8 days, 90% pre-bot-filter. Directional at best.
- **Under-instrumented / censored:** long-horizon retention (ITP + PWA split; server-side cohorts have no history); acquisition (`first_*` props ~1 day old); the entire alert loop (near-zero N); saves (CTA re-weight 1 day old).
- **Contamination I could not fully remove:** bots for 07-02→07-08; possibly 1-2 heavy sessions inflating conditions *volume* (not the 89-person breadth).
- **Corrections to prior claims:** the "78% one-and-done" baseline was bot-inclusive; ex-owner it reads ~84% here but is itself inflated by ITP/PWA censoring, so neither number is a clean churn rate. The old "conditions used heavily / 1,157 views" was availability; the honest engagement figure is **89 persons / 720 dwell-gated views** this window.
- **Next real read:** early-to-mid August 2026, when 30 bot-clean days and server-side retention cohorts exist. Re-run then before any PMF decision on the retention loop.

Files: `analytics/INSTRUMENTATION_CHANGELOG.md`, `analytics/GLOSSARY.md`, `analytics/EXCLUDED_PERSONS.md`, `analytics/queries/`.
