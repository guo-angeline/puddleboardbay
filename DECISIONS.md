# Decisions: the escalation inbox

The studio pauses escalation-worthy work and files it here. Answer by typing after `Answer:` on any entry; the next loop iteration ingests it and unblocks the gated items. Entries are append-only, newest last.

## D1 [RESOLVED] 2026-07-04 · Remaining item-5 cron/schema work: defer or approve?

Context: item 5's one safe sub-task (`npm audit fix`) shipped (PR #8, merged). The three remaining sub-tasks all touch protected surfaces, which `.claude/studio.md` says must escalate:
- **Bounded-concurrency NWS fetch** in `app/api/cron/check-conditions` (perf refactor of the alert-sending cron).
- **`alert_sends` UNIQUE index + ON CONFLICT** (schema migration on alert infrastructure).
- **Restrict the cron's fetch to enabled subscriptions + sort the headline by soonest window** (cron send behavior).

The bounded-concurrency refactor also has no benefit at current scale: there is 1 subscription, and the 60s-timeout risk it addresses only appears with many watched spots. It is pure risk to the path that wakes real users, for zero present gain.

Options:
- **(a) [recommended] Defer all three** until the watched set grows and the two experiments (alert-interstitial, next-good-window) have read out. The cron is load-bearing for the whole retention thesis; do not touch it for a speculative perf win while it works.
- **(b) Approve only the bounded-concurrency perf refactor now** (no change to what/when/who is sent), verified via the `?dry=1` endpoint before deploy.
- **(c) Approve the `alert_sends` UNIQUE-index migration now** (I write the migration + ON CONFLICT; applying it to the live DB stays a separate owner step).

Recommendation: (a). Get the two experiments live and reading, then revisit item 5 when scale actually justifies touching the cron.

Answer: a

## D2 [RESOLVED] 2026-07-07 · The two live A/B experiments are underpowered; recalibrate the method

Context: the instrumentation is sound (symmetric trigger-based exposure, a real counterfactual control, dwell-gated diagnostics), but no power analysis was done before launch, and one done now is sobering.
- **Power:** detecting a 5pp lift on a ~5-10% directions rate at 80% power / a=0.05 needs ~430-680 exposed users PER ARM. The doc's "30 per arm" only detects a ~20+pp swing. At ~5 spot-openers/day, `next-good-window` needs on the order of a year to be powered; `alert-interstitial` fires only on push-opens with 1 subscription, so it collects ~0 exposures/week and can never reach significance this year.
- **Cross-experiment contamination:** both experiments use `spot_action`/directions as the comparable metric, and a user can be bucketed into BOTH (the interstitial sits over the same drawer holding the next-good-window panel). No mutual exclusion or stratification, so the shared metric is confounded across the two tests.
- **Other gaps:** no sequential/alpha-spending correction for peeking, no family-wise correction across the two experiments, novelty effect only mitigated by the 14-day floor, device-level re-randomization (Safari ITP eviction is non-random wrt engagement), and the primary metric (directions click) is a proxy the owner already declined as a conversion goal, while the real objective is retention.

Options:
- **(a) [recommended] Convert `alert-interstitial` to a monitored 100% rollout** (ship treatment, watch guardrails `spot_sheet_dismissed` / `conditions_loaded` for regressions) since it can never be a powered test at this traffic; **and** mutually exclude the two flags (or move `next-good-window`'s primary off the shared `spot_action` onto a panel-specific metric) to remove contamination; **and** recalibrate `next-good-window`'s decision rule to a realistic MDE (accept only detecting large effects, or extend the window to months, or also convert to monitored rollout).
- **(b) Keep both as A/B tests as-is**, accepting they will very likely be inconclusive, and read them as directional-only.
- **(c) Pause both flags** (back to control) until traffic is high enough to power a real test, and revisit after the ~2026-07-15 retention re-check.

Recommendation: (a). At this scale, flag-gated rollout with guardrail monitoring is the rigorous instrument, not an underpowered test. This does sit against the board directive "every major update ships behind an A/B flag", which is right for a high-traffic product but collides with reality at ~14 users/day; (a) keeps the flag-gating and the guardrails while dropping the pretense of a powered test.

Answer: a

## D3 [RESOLVED] 2026-07-09 · Ship item 11 (spot-sheet CTA re-weight) straight to 100%, no A/B

Context: item 11 re-weights the spot sheet's CTAs (Save primary, Share secondary, Get Directions + Photos demoted). It changes a core-flow's visual hierarchy, which the board directive says must ship behind an A/B experiment flag. Owner directed otherwise in chat.

Owner direction (2026-07-09, verbatim intent): optimize Save first (drives retention) and Share second (drives growth via virality); no A/B test needed. This is an explicit owner exception to the "every core-flow change behind an A/B flag" directive, consistent with the D2(a) reasoning that ~14 users/day cannot power a real test this year. Guardrail instead of arms: watch that `spot_action`/directions does not collapse and that `favorite_toggled` (saves) rises, via the pre/post baseline noted in analytics/INSTRUMENTATION_CHANGELOG.md (2026-07-09).

Answer: ship to 100%, no experiment flag (owner directive).

## D4 [RESOLVED] 2026-07-09 · Server-sent launch-time PUSH reminder, or keep the calendar reminder?

Context: the alert interstitial now offers "Remind me at launch time" as a client-side CALENDAR reminder (`.ics`), which works today with zero backend. The owner's literal ask was to schedule a NOTIFICATION at launch time. That cannot be done client-side on this iOS-heavy base (iOS Safari / installed PWAs do not support the Notification Triggers / TimestampTrigger API). A launch-time PUSH therefore has to be server-side: a new Supabase `reminders` table + a scheduled send, likely a more-frequent cron than the single 02:00 UTC run. That touches the PROTECTED push/cron send path and Supabase rows, and a morning launch-time push is exactly the pattern that caused the 6am-wake incident and forced the 02:00 UTC reschedule. It would also collide with the daily send cap.

Options:
- **(a) [recommended] Calendar-only (defer server push).** Ship the calendar reminder (done); build server push only if reminder-adds show demand after the ~2026-07-15 retention read AND you accept the protected-infra escalation. At 1 subscription this is the same "pure risk to the wake path for zero present gain" logic as D1(a). The calendar reminder is opt-in per tap, lives in the user's own calendar, and can never become app-driven spam.
- **(b) Build the server push reminder now.** New reminders table + scheduled send + more-frequent cron; re-introduces a morning wake and needs cap/dedup handling. Escalation-class, non-trivial.

Recommendation: (a). The calendar reminder already delivers "remind me when it's time to launch" with none of the protected-infra risk.

Answer: b (owner: build the server-side push reminder, 2026-07-09)

## D5 [RESOLVED] 2026-07-10 · Email alerts: CAN-SPAM postal address for the footer

Context: the email alert channel (PRD `docs/superpowers/specs/2026-07-10-email-alert-channel-and-enrollment.md`, ROADMAP item 22) requires a valid physical postal address in every email footer (CAN-SPAM, a legal requirement). We have none on file. The build can proceed, but no email can send lawfully until this is supplied.

Options:
- **(a) [recommended] A PO box** — cheapest, keeps the home address private.
- **(b) The founder's home or business address.**
- **(c) A registered-agent or virtual-mailbox address.**

Recommendation: (a). A PO box satisfies CAN-SPAM without exposing a home address.

Answer: b: 500 folsom st, San Francisco, CA 94105 (this is a secure apartment building and I didn't enter the aprtment number)

## D6 [RESOLVED] 2026-07-10 · Email alerts: rollout mechanism for the new channel

Context: email is a new user-facing surface, so the board directive says ship behind an A/B flag, but ~14 users/day cannot power a test (the D2/D3 reality). This gates ROADMAP item 22.

Options:
- **(a) [recommended] Monitored 100% rollout behind a kill-switch flag** (defaults on; flips off instantly if deliverability or spam-complaint guardrails breach), not a control/treatment split. Consistent with D2(a) and D3.
- **(b) A true control/treatment split**, accepted as directional-only for months.
- **(c) Hold the channel** until traffic grows enough to power a test.

Recommendation: (a). Flag-gated rollout with guardrail monitoring is the rigorous instrument at this scale, matching how D2/D3 were resolved.

Answer: a

## D7 [RESOLVED] 2026-07-10 · Item 18 (iOS storage partition): run the on-device repro first

Item 18 claims that on iOS, installing the PWA from Safari gives it a separate storage partition, so the installed app launches with an empty `ptw-favorites`, which would void items 13/14 (the funnel fixes) on iOS, ~72% of historical saves. But the item's own acceptance says the repro is the GATE before any fix: some iOS versions capture the add-time URL, which could partly mitigate, so building a fix for a bug that may not reproduce would be wasted effort. The repro needs a real iOS device, which the studio does not have.

Please run the repro: on an iPhone, save a spot in Safari, Add to Home Screen, launch the installed PWA, and check whether `ptw-favorites` is empty and no enable-alerts prompt fires.

Options:
- **(a) Repro confirmed** (favorites empty, no prompt): build the fix. Recommended approach: persist favorites server-side keyed to the anon id (or a pre-subscription token) so the installed PWA rehydrates, the partition means the PWA cannot read Safari's localStorage, so a client-only fix cannot work. Touches Supabase; the specific schema/sync will escalate per the protected-path policy.
- **(b) No repro** (favorites survived): close item 18 as not-reproducible; items 13/14 are fine on iOS as-is.
- **(c) Partial** (favorites lost but some mitigation): ship the empty-state recovery floor ("re-save your spots") so the item-14 re-offer becomes reachable, without full server persistence.

Recommendation: run the repro; if confirmed, (a). This is the highest-leverage retention item IF it reproduces, and pure waste if it doesn't, hence the gate.

Answer: a - also mark this device as my device (test device, excluded from analytics)
