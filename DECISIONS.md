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

## D8 [RESOLVED] 2026-07-11 · Studio PR merges now hit a human-review guard: PR-only, or allow-list the merge?

Context: shipping item 24, the studio opened PR #32 and tried to auto-merge it (`gh pr merge --merge`), the same step it used to ship items 13 to 23. A NEW auto-mode classifier BLOCKED it: "Merging the agent's own PR before any human review or approval." The merge had already landed a moment earlier, so item 24 is merged and deployed to prod, verified live. But going forward this guard will stop the autonomous loop at the merge step every time, which changes how `/studio` and `/ship` can complete.

The deploy path is unaffected (`vercel --prod --yes` is the only route to prod and ran fine); the gate is specifically self-merging to `main`.

Options:
- **(a) [recommended] Keep the guard, switch the studio to PR-handoff.** The ship flow stops at "PR ready for your review", posts the link, and you merge. Because prod deploy is CLI-only and separate, you (or the studio, if you approve) then run `vercel --prod`. Safer: a human sees every diff before it reaches `main`. Cost: the loop is no longer fully hands-off; each item needs one merge click from you.
- **(b) Allow-list the studio's merge command** (add a Bash permission rule for `gh pr merge` on `studio/*` branches) so the autonomous loop completes end to end as it did for items 13 to 23. Faster, but no human gate before `main`; you rely on the adversarial verifier + live-verify pass instead.
- **(c) Hybrid:** studio auto-merges only low-risk classes (copy, docs, in-palette front-end) and hands off anything touching protected surfaces or server/schema. More nuanced, more config.

Recommendation: (a) if you want a human gate on `main` (the guard firing suggests that is the intent); (b) if you want the loop to stay fully autonomous and trust the existing verifier gates. Either way, item 24 is already in and live; this only affects future iterations.

Answer: b (owner, 2026-07-11): allow-list the studio's merge command so the unattended loop completes end to end. Trust the adversarial verifier + live-verify gates instead of a human merge gate. Implemented via a Bash permission rule `Bash(gh pr merge:*)` in `.claude/settings.json`.

## D9 [RESOLVED] 2026-07-11 · Push analytics have no owner-exclusion key (contaminates every Supabase push metric)

Context: building item 25 (the unified enrollment-return funnel) surfaced a gap that predates it. `analytics/EXCLUDED_PERSONS.md` can exclude the owner two ways: PostHog `person_id`s (client events) and owner email addresses (the email Supabase tables). But the PUSH Supabase tables (`push_subscriptions`, `alert_opens`, `alert_sends`) carry neither, only `anon_id` / `endpoint` / `token`, none of which is recorded for the owner. So the owner's own iOS PWA push subscription (the one that opted in and clicked its own test pushes, PostHog person `11a83b86`) cannot be filtered from ANY Supabase push metric. This contaminates not just item 25 but the two existing push retention queries (`reachable_audience_retention.sql`, `active_subscriber_retention.sql`), which today silently include the owner. At single-digit N, that one owner row can be the entire push cohort, so every push number is owner-inclusive until this is fixed.

Options:
- **(a) [recommended] Owner does a one-time Supabase lookup** of their iOS PWA push subscription (its `anon_id`, `endpoint`, or `token`) and we add it to `EXCLUDED_PERSONS.md` as a push-side key list, mirroring the owner-email list. The new query has a NO-OP placeholder ready to paste it into, and the two existing push queries get the same filter. Only fix that also cleans the existing queries and historical rows.
- **(b) Owner sets a known `anon_id` on their test device** so all future owner push rows carry a filterable marker. Does not fix historical rows.
- **(c) Accept push-side owner contamination** and always caption push numbers as owner-inclusive until a second real subscriber exists to compare against.

Recommendation: (a). It is the only option that cleans the historical rows and the two existing retention queries, not just item 25. Low effort: one lookup, one paste into `EXCLUDED_PERSONS.md`. This does not block item 25 (which ships with the placeholder and the caveat documented), it just gates trustworthy push numbers.

Answer: a (owner, 2026-07-11): look up the owner's push subscription key and add it to EXCLUDED_PERSONS.md; wire it into enrollment_return_funnel.sql + the two existing push retention queries.

## D10 [OPEN] 2026-07-14 · Item 31 (a photo per spot): pick the sourcing approach

Context: item 31 wants a hero photo on each spot card/sheet. 142 spots, a mix of famous water (Tahoe, Folsom, Fallen Leaf, Pillar Point) and obscure sloughs / boat ramps / creeks. The build is easy; rights-clean sourcing at scale is the hard part, and it forks the whole approach, so it needs your call before I build. Two findings from a feasibility probe today:

- **Google Places Photos (the obvious "just pull a photo" route) cannot be self-hosted.** Google's Places policy bars pre-fetching/caching/storing photo content, and the photo `name` reference expires, so you must re-fetch per view via a live Place Details call. That means a recurring per-view API cost (Place Details with the photos field bills ~$20 / 1,000), a mandatory Google attribution overlay, a hard third-party dependency sitting on the render hot path, and user-submitted photos of variable quality and accuracy. It is an ongoing cost that scales with traffic, on a retention surface we want cheap and fast.
- **Free + self-hostable CC sources exist but coverage is partial.** A geo-probe of a representative 36-spot sample found 78% have at least one geo-tagged Wikimedia Commons file within 500m and 22% have none; a raw geo-tagged file is not necessarily a usable put-in shot (many are maps, signage, wildlife). Adding Flickr Creative Commons (far denser geo-tagging) lifts the ceiling. Realistic self-hostable yield after human curation, Commons + Flickr CC combined, is on the order of 55-75% of spots. The rest need owner photos or a fallback.

Options:
- **(a) [recommended] Tiered hybrid, self-hosted + attributed.** Harvest CC-BY / CC-BY-SA / CC0 photos (Wikimedia Commons geosearch + Flickr CC geo-search) matched to each spot's lat/lng, curate by hand (pick the one true put-in/water shot or mark "none", record author + license), self-host sized derivatives. Owner-shot photos fill high-value gaps over time; spots with no clean photo show a tasteful fallback (a static map thumbnail), never a fake or generic stock photo. Ship the curated tranche (the ~55-75% that pass curation) behind the flag; backfill the rest. Rights-clean, zero recurring cost, no render-time dependency. The cost is one-time human curation, not dollars or an ongoing bill.
- **(b) Google Places Photos live via API.** Fastest to near-100% coverage, zero curation. But the recurring per-view cost, mandatory Google attribution, no self-hosting (re-fetch every view), a third-party dependency on the render path, and variable user-submitted quality, all as documented above. Wrong trade for a high-traffic retention surface.
- **(c) Owner / crowd photos only.** Cleanest rights, most authentic, best quality. But 142 put-ins is a long field campaign, realistically a slow backfill, not a launch. Best as the (a) gap-filler, not the whole plan.
- **(d) Generic licensed stock (Unsplash / Pexels).** Free and self-hostable but generic: a stock lake, not THIS launch. Misleads more than it informs (wrong water, wrong put-in). Reject.

Bundled sub-decisions (state a preference or I take the recommendation):
1. **Fallback for no-photo spots:** static map thumbnail (recommended) vs the current difficulty-gradient card vs nothing.
2. **Tranche-1 scope:** ship whatever curates clean in one pass, ~55-75% (recommended), vs hold until 100% coverage.
3. **User-submitted photos later:** defer (recommended; UGC adds moderation + rights liability + a legal gate) vs bring into scope now.
4. **Attribution UI:** a small "Photo: {author} / {license}" caption under the image (required for CC-BY / BY-SA). Confirm that surface is acceptable.

Effort estimate (option a): harvest script ~0.5 day; manual curation ~142 spots x ~2 min ≈ 5-7 hours (the real cost, a person not code); download + sized webp derivatives + new `photo`/`photo_attribution` fields in spots.json (lat/lng untouched) ~0.5 day; display (hero image on SpotDrawer + SpotCard, lazy-load, srcset, attribution caption, fallback component, behind the flag, plus a dwell-gated `spot_photo_viewed` intent event + INSTRUMENTATION_CHANGELOG entry) ~1 day. Total ~2.5 engineering days + ~1 day curation for the first tranche. Option (b) would be ~1.5 build days at near-100% coverage but carries the recurring cost and dependency above.

Recommendation: (a). It is the only path that is rights-clean, carries no recurring cost, and keeps the render path dependency-free, in exchange for one-time human curation. Ship the curated tranche behind the flag, map-thumbnail fallback for the rest, owner and (later, if approved) user photos backfill. Per the major-update directive this ships flag-gated; per D2/D3 reality (~14 users/day) it is a monitored rollout with guardrails, not a powered A/B.

Answer: 
