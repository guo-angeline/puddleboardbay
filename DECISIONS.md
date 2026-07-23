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

WIRED 2026-07-15: owner supplied push anon_id `2f625b9b-4627-483e-b29b-8ab5973e046b` (iOS PWA). Added to EXCLUDED_PERSONS.md and the owner-exclusion clause of all three push queries. Placeholder removed. Push numbers are now owner-clean.

## D10 [RESOLVED] 2026-07-14 · Item 31 (a photo per spot): pick the sourcing approach

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

Answer: (a) tiered hybrid, self-hosted + attributed (owner, 2026-07-17, in chat). Harvest CC-BY/CC-BY-SA/CC0 (Wikimedia Commons + Flickr CC geosearch), hand-curate, self-host sized derivatives, map-thumbnail fallback for uncovered spots, owner photos backfill high-value gaps. Sub-questions carry the recommendations: Q3 defer user-submitted photos (UGC moderation/rights/legal gate), Q4 the "Photo: {author} / {license}" caption surface is accepted. Ship the curated tranche flag-gated, monitored 100% with guardrails (not a powered A/B), with a dwell-gated `spot_photo_viewed` intent event + INSTRUMENTATION_CHANGELOG entry. Item 31 unblocked to ready.

## D11 [RESOLVED] 2026-07-15 · Item 36 (launch-direction tip): A/B flag exemption + copy wording

Context: item 36 adds a one-line "head out against the wind so the return is downwind" tip to two existing surfaces (the alert interstitial and the alert email body). The design+architecture gate escalated because the board directive (2026-07-02) says every major update ships behind an A/B flag, and this brushes that rule. The pipeline judged it exempt: additive informational copy, no new surface and no changed core flow, on an audience of single-digit subscribers where no A/B could ever reach significance. Precedent for the exemption: D2(a) 2026-07-08 (interstitial monitored 100%) and the CTA-reweight 100% rollout 2026-07-09. A secondary open choice was whether the wind direction reads as the raw compass abbreviation ("toward the WNW", matching ConditionsPanel) or expanded words ("toward the west-northwest").

Options: (a) ship experiment-exempt at 100% with a `has_launch_tip` guardrail prop; (b) declare a flag and run monitored 100%; (c) powered A/B arm.

Answer: (a) ship experiment-exempt at 100% (owner, 2026-07-15), with a boolean guardrail prop on the existing events as the segment. (Shipped as `launch_tip_shown` on `alert_interstitial_shown`, the clearer name; `has_launch_tip` in this memo was shorthand. See analytics/INSTRUMENTATION_CHANGELOG.md 2026-07-15.) Copy: use the expanded compass words ("toward the west-northwest"), not the abbreviation, for friendliness to non-sailors, which requires a 16-point abbreviation-to-words lookup. This entry records the deliberate flag exemption so a later audit does not read it as a bypassed directive.

## D12 [RESOLVED] 2026-07-15 · Item 37 (visual polish pass): chrome seam + dead-band discipline

Context: item 37 bundled three polish fixes. The vision gate flagged two as needing owner/device calls. (Part 2) `theme_color` is ALREADY azure #0E6FD1 in both `app/layout.tsx` and `app/manifest.ts`, so "make the chrome match azure" is a literal no-op; the perceived jar is the seam where the azure browser chrome meets the pale `#EEF5FB` app header (iOS also uses a black-translucent status bar). (Part 3) is roadmap item 12 verbatim, which explicitly bars a 4th blind CSS fix and requires a `?vh` device diagnostic + an installed-PWA screenshot before choosing a fix, which an unattended run cannot capture.

Answer (owner, 2026-07-15):
- Part 2: KEEP azure chrome, leave the header pale. No value change; the seam is accepted as-is. Do not tint the header azure.
- Part 3: ship the `?vh` device diagnostic ONLY this pass (prints `screen.height`, `window.innerHeight`, computed `env(safe-area-inset-bottom)`, standalone-vs-Safari, per item 12), and DEFER the actual dead-band fix until the owner sends one installed-PWA screenshot. Item 12 is merged into item 37 and closed as a standalone.
- Part 1 (search/Feedback alignment) proceeds normally: match height + radius + border token, keep natural widths (search is an input, Feedback a button, so no literal equal-width).

So this pass ships Part 1 + the Part 3 diagnostic; Part 2 is a confirmed no-change; the Part 3 fix is a fast follow-up gated on an owner screenshot.

## D13 [RESOLVED] 2026-07-16 · Item 42 (full-screen spot sheet): ship at 100%, no A/B

Context: item 42 makes the mobile bottom sheet open at full height (0.92vh) for every spot open instead of the 0.58vh peek. This is a core-flow change to the primary surface, which the board directive (2026-07-02) says must ship behind an A/B flag, never straight to 100%. It was built accordingly: flag `spot-sheet-full-height`, control live by default, dormant until flipped.

Options: (a) ship at 100% with no flag, exempt from the A/B directive; (b) keep the flag and run a monitored 100% with guardrails; (c) run the powered A/B as originally built.

Answer: **(a) merge and deploy at 100%, no A/B test** (owner, 2026-07-16, in chat). The flag, its registry entry, and `docs/experiments/spot-sheet-full-height.md` were removed before deploy; the exposure event was never emitted, so no `experiment_exposed` value exists for it.

Precedent, and why this is not a bypassed directive: D2(a) 2026-07-08 (interstitial converted to monitored 100% because it could never reach significance), the CTA-reweight 100% rollout 2026-07-09 (D3: ~14 users/day cannot power a test), D6, and D11 2026-07-15. The traffic reality that drove all of those is unchanged.

What we give up, recorded honestly: there is no control arm, so the effect of this change is not measurable as a lift. Several mobile series (`spot_action`, `favorite_toggled`, dwell-gated `conditions_viewed`, `spot_sheet_dismissed`) will step on 2026-07-16 as a LAYOUT effect. The only counterfactuals are the pre-2026-07-16 mobile baseline and the `source: "share"` cohort, which has opened full height since 2026-07-11 (item 9) and is therefore not part of the step. See analytics/INSTRUMENTATION_CHANGELOG.md 2026-07-16 (item 42).

Rollback is revert + redeploy, minutes.

## D14 [RESOLVED] 2026-07-17 · Spots 76, 79, and 92: delisted

Context: the 2026-07-16 coordinate audit (`reports/coord-audit-2026-07-16.md`) found two records with no confirmable public launch. Both were live. The owner directed "hide both now" in chat on 2026-07-16, and they are now hidden in production via the new `hidden` field (filtered at `lib/spots.ts`; records and notes retained). This memo tracks the disposition, which is still open.

- **79 Coyote Creek Tidal Launch.** No designated public put-in found on Coyote Creek off McCarthy Blvd in FWS, Santa Clara Valley Water, City of Milpitas, County Parks, or SF Bay Water Trail sources; no OSM slipway within 6km; the coordinate reverse-geocodes to the Nimitz Freeway. The matching address is a hiking/biking trailhead; the one documented paddle from it was a permit-only trip into a normally closed section of Don Edwards NWR, whose own trip report tells readers not to paddle there (unsafe, illegal, disruptive to wildlife). Notes cite the wrong closure months (March-August vs. the real February-September) and the wrong species (heron vs. the endangered Ridgway's rail). Likely an AI-summary artifact of that trip report.
- **76 Brisbane Marina Ramp.** Brisbane's own marina page lists no ramp; DBW types it Marina, not Launch; SFBAMA's launch guide never mentions Brisbane or Sierra Point; not a Water Trail trailhead; no OSM slipway at Sierra Point. Our coordinate is byte-identical to an unsourced fishing.org entry that itself asserts no physical ramp, and lands on a roadway.

Question for the owner:
1. **79:** delist permanently, or is there a real put-in there you know of? Recommend permanent delist. Also recommend a `lawyer` gate look given the closed-refuge and endangered-species exposure alongside items 34/35.
2. **76:** call the harbormaster (650-583-6975) to confirm whether a public launch exists, drop a pin from personal knowledge, or delist.

Answer: delist both 79 and 76.

### Addendum, 2026-07-16: spot 92 joins this memo, and one process fact about 79

**Spot 92 (San Rafael Canal) is now the loudest open record, and it is NOT hidden.** The item 39 legal gate escalated it: 92 is 101 Surf Sports' private business dock, and the 127-spot sweep (`reports/data-quality-sweep-2026-07-16.md` row 0) says a user who drives there may have no right to launch. It is live and listed today.

- The owner rated it 4.3. **That rating was dropped before flag-on** (`lib/spots.test.ts` guards it). The gate's reasoning: `/disclaimer` covers a spot *"appearing"* on the site, and a favorable rating is not appearing, it is vouching, which exceeds the clause we rely on. The aggravator is that our own sweep is dated the same day and discoverable.
- **Owner confirmed no relationship with 101 Surf Sports** (2026-07-16), so no FTC Endorsement Guides material-connection disclosure is needed.
- The notes now say plainly that this is a private business dock rather than a public launch. They deliberately do **not** assert a rental/storage-only access policy: the sweep rates the exact policy only "medium" (the shop's storage/contact pages 404'd) and the shop's own site says "come on down and go for a paddle", so a stated access rule would be inventing a fact.
- **Still open:** whether 92 should remain listed at all, or be replaced with a Water-Trail-confirmed public launch. The sweep declines to propose a replacement coordinate and will not guess Buck's Landing. Un-hiding/delisting is an owner decision by the same rule as 76 and 79.

Answer (spot 92): delist (owner, 2026-07-17, in chat). Hidden in `data/spots.json` with `hidden`/`hidden_reason`; retained for later repair. Un-hide only if replaced with a Water-Trail-confirmed public launch on the San Rafael Canal. D14 now fully resolved (76, 79, 92 all delisted). Ships to prod on the next `vercel --prod`; no lat/lng touched, so D19 predeploy gate is clear.

**Process fact recorded from the item 39 rating pass (relevant to 79):** the owner's blank rating sheet was generated over `ALL_SPOTS_INCLUDING_HIDDEN`, so it asked the owner to rate spot 79, a place established that morning not to exist. The owner rated it 3.9 and, when shown, called it a slip. The row structure supports that reading (79 sits in no fill-down run; its neighbours vary), and the rating was dropped. The narrower point worth keeping: **the sheet never gated on "have I been here"**, so "these are places I paddled" is an after-the-fact reconstruction rather than a per-row recorded fact. Any future rating sheet gets a "been here" column and is generated from `ALL_SPOTS`.

## D15 [RESOLVED] 2026-07-16 · Item 39 (Paddle score): scope + how the research gets done

Context: item 39 was blocked on two things. (1) The design agent's rubric weighted wind exposure 0.30 and water quality 0.15, so 45% of the score was about the water, while the lawyer gate called "rate the put-in, not the paddle" the highest-leverage decision in the whole reviews/accounts block (an average the site computes is arguably first-party speech with no Section 230 protection; *Lemmon v. Snap* and progeny let negligent-design claims past 230 when they target the platform's own design choice). (2) A full 142-spot pass was priced at 23-30 hours, and the lawyer was explicit that a published rubric decorating an unresearched score is deception.

Options on scope: (a) put-in only, cut wind + water quality; (b) keep wind at a low weight with hard-descriptive level words + the safety cap; (c) ship as written.
Options on research: agents research with owner spot-check; a 10-spot pilot first; derive only from existing fields; owner does it.

Answer (owner, 2026-07-16, in chat): **(a) put-in only** on scope, and **a 10-spot pilot** before any full pass.

Consequences recorded:
- Rubric v2 is four axes, all about the launch: launch ease (0.40), parking (0.30), launch-area traffic (0.15), facility condition (0.15). v1 is in git history.
- What we give up: wind exposure was the one axis the app cannot answer live (a calm forecast does not tell you a big-fetch bay whitecaps by 1pm). If that gap matters, its honest home is descriptive prose in `notes`, not a rating that implies a safety verdict.
- What we gain beyond the legal argument: a clean product seam. The score answers "how good is this launch" (static, editorial). The conditions engine answers "is it good right now" (live, already shipped, already the differentiator). Item 43 (reviews) inherits the same boundary.
- The v1 safety cap goes with its axes; a narrower launch-ease floor replaces it, which is an access statement, not a safety claim.
- The pilot carries a kill criterion set in advance (spec §4.1): if 10 spots spanning the expected range produce a spread under 1.5 points, the score does not discriminate and item 39 gets cut or rethought, not shipped.

Still open, tracked in the spec §3: never emit schema.org `aggregateRating` for the editorial score (recommendation: no structured data in v1; an implementer will reach for it because it is what makes the star show in search).

## D16 [RESOLVED] 2026-07-16 · Item 39 pilot met its kill criterion: confirm the cut

Context: D15 resolved item 39's scope to put-in only and directed a 10-spot pilot before any full pass. The spec (§4.1) set a kill criterion BEFORE the run, specifically so it could not be rationalized afterward: spread under 1.5 points, or 7+ of 10 spots inside a single 1.0-wide band, means a put-in-only score does not discriminate and item 39 gets cut rather than shipped.

Result (2026-07-16, two agents scoring the same 10 spots blind; `reports/paddle-score-pilot-A.md`, `-B.md`):
- Researcher A: spread **1.1** (3.6 to 4.7), 8 of 9 in one band.
- Researcher B: spread **0.8** (3.5 to 4.3), 9 of 9 in one band.
- **Both prongs met, by both researchers.** The 10 spots were chosen to span the range across 6 regions, 3 fee states, and both tide states, so this is a finding, not a selection artifact.

The rubric itself worked: inter-researcher agreement was within one level on **every** axis (mean disagreement 0.26 points), and both independently returned `null` on the same unsourceable axes rather than guessing. The failure is structural, not procedural: **a discriminating score and a legally defensible score are in direct tension.** Wind exposure and water quality are the axes that separate these places, and they are exactly the two the legal gate cut. A third rubric does not escape that squeeze.

Recommendation: **confirm the cut.** The kill criterion was pre-committed and is met with room to spare; overriding it now would make the criterion theatre. Salvage the binary facts into filters and `notes` (the same home §0.1 chose for the wind axis), and redirect the effort into item 40's data-quality screens, which is where this pilot's value actually landed (a 30-40% material defect rate on spots item 40 never flagged).

This is filed as OPEN rather than RESOLVED because item 39 was the owner's idea and the owner should get the last word on killing it, not the criterion alone.

Question for the owner: confirm item 39 is cut, or override the kill criterion and say what would make the score worth shipping at a 1.1-point spread?

Answer: **Overridden, and the premise moved.** (2026-07-16, owner.) The owner supplied their OWN hand-entered 1-5 rating for 119 of 142 spots, which reframed the decision: the question was never "ship the weighted score at a 1.1 spread", it was "is there a different source for this number".

**The computed rubric stays cut. D16's recommendation is upheld on its own terms and is not what was overridden.** What ships is a different feature that reuses the item 39 slot: an editorial owner rating, not a score. The two are not interchangeable and must never be blended. The rubric (D15) scored the PUT-IN; the owner rating rates THE PADDLE. They correlate at 0.04 against researcher A and -0.10 against B, while A and B correlate 0.52 with each other, so they answer different questions rather than estimating one quantity. China Camp is 3.6 on the rubric and 5.0 from the owner, and both are correct.

Analysis: `reports/paddle-score-owner-ratings-2026-07-16.md`. The owner ratings clear the same pre-committed 1.5 threshold pooled (**spread 2.0**), but that is an artifact of averaging regions with different means. Within-region, only North Bay passes (n=45, spread 1.9); all 29 East Bay ratings sit inside a 0.4-wide band. **The owner was shown this and directed the full-scope ship anyway** (recorded so the predicted-flat East Bay is never later reported as a discovery). Shipped behind the `owner-rating` flag in `7dfd227`.

Two things this decision does NOT resolve, tracked below: spot 92 (see D14 addendum) and the fact that the ratings were never gated on "have I been here" (see the note in D14).

## D17 [RESOLVED] 2026-07-16 · paddletowater.com receives no mail, and no DMARC record is published

**RESOLVED 2026-07-17, on the real proof: a test email to hello@ landed in the owner's inbox.** hello@paddletowater.com now receives (forwarded to qiguo1102@live.com), and DMARC p=none is published. Both dig-verified; the receiving end confirmed by an actual delivered message, not by DNS status.

Status whipsawed once and the sequence is worth keeping, because it is the lesson: (1) marked RESOLVED on green DNS, which was premature; (2) reopened when two test sends did not land; (3) closed for real when a send arrived. The gap between 1 and 3 was **DNS propagation timing**, not a config fault: the sends were made while the sending servers still cached the pre-MX "no mail here" answer. Never close on DNS green alone, only on a delivered message.

Consequences (unchanged from the DNS work):
1. The **live privacy policy is now honest** with zero code change: it points at hello@, which works. FTC/CCPA/COPPA "designated contact bounces" exposure closed.
2. The **alert-email reply-to works** for the first time.
3. **D17 no longer gates item 44 or item 49** (each keeps its own separate gate).

Two follow-on observables, NOT blockers:
- **Microsoft forward flakiness.** The forward target is a live.com inbox, and Microsoft is known to occasionally silently-drop forwarded mail. This test landed; if inbound to hello@ ever proves flaky, retarget the Email Routing rule to a non-Microsoft inbox (gmail). Not required while live.com works.
- **Sending deliverability** (the retention-critical one): whether alert/confirmation emails FROM conditions@alerts land in subscribers' inboxes rather than spam. Different path from receiving. DMARC helps; young-domain reputation is the residual risk. Measured by the confirm rate in the early-August read, 0 of 2 before this.

---


Context: the privacy policy (item 44 step 1) promises access, correction, and deletion via `hello@paddletowater.com`, which is already the `EMAIL_REPLY_TO` fallback on every alert email. The lawyer gate flagged that a reply-to on a sending domain does not prove inbound mail is configured. It is not. Verified against three resolvers (local, 8.8.8.8, 1.1.1.1) with working controls:

```
MX  paddletowater.com                       -> NONE      => hello@ bounces
TXT _dmarc.paddletowater.com                -> NONE      => no DMARC published
TXT _dmarc.alerts.paddletowater.com         -> NONE
TXT resend._domainkey.alerts.paddletowater  -> DKIM ok   => SENDING works
TXT send.alerts.paddletowater.com           -> "v=spf1 include:amazonses.com ~all"
NS  paddletowater.com                       -> Cloudflare (dion/rihana.ns)
```

So outbound alerts are properly authenticated; inbound mail does not exist. Two consequences:

1. **The privacy policy cannot ship pointing at `hello@`.** Every remedy on the page routes through a dead address, which is the FTC Act §5 shape the page was written to avoid. The page is committed but NOT deployed pending this.
2. **No DMARC record is published at all**, which contradicts the standing note that the email channel launched at `p=none` on 2026-07-11 with a follow-up to tighten to quarantine ~2026-07-24. There is nothing to tighten. No DMARC is weaker than `p=none`, and the "first send hit Outlook spam" symptom is consistent with its absence. The 07-24 follow-up is based on a false premise.

Options for the contact address:
- **(a) Enable Cloudflare Email Routing for `hello@paddletowater.com`** and forward it to a real inbox. The domain is already on Cloudflare nameservers, so this is a few minutes in the dashboard and no code change. **Recommended.** It also makes the alert emails' existing reply-to work, which it currently does not.
- (b) Point the privacy contact at the in-app Feedback form (Formspree `xdajvagj`), which demonstrably works today. Deploys immediately, but a form buried behind a header button is a worse contact channel for a privacy remedy than an address, and it does not fix the dead reply-to on alert emails.
- (c) Use a personal address directly. Works, but publishes it on a public page.

Questions for the owner:
1. Which contact option? (Recommend (a).) The privacy policy stays undeployed until this is settled, and it is the CalOPPA gap that is live today, so this is worth minutes rather than days.
2. Was DMARC ever actually published? If it was, something removed it. If it was not, the 2026-07-24 "tighten to quarantine" follow-up should become "publish p=none, then tighten".

Answer: **(a) Cloudflare Email Routing enabled + DMARC published at p=none.** (2026-07-17, owner, verified.)

Done and independently verified via dig against two resolvers (1.1.1.1 and 8.8.8.8):
- **Receiving:** MX records `route1/2/3.mx.cloudflare.net` are live, so `hello@paddletowater.com` receives mail (forwarded to the owner's inbox via an Email Routing rule; the Email Routing DNS records are locked to prevent accidental deletion).
- **DMARC:** `_dmarc.paddletowater.com` now publishes `v=DMARC1; p=none; rua=mailto:hello@paddletowater.com`. This is the "publish, do not tighten" action the standing note called for; there was never a p=none record to tighten.
- **Sending path untouched:** `conditions@alerts.paddletowater.com` still authenticates (SES/Resend SPF + DKIM intact); the alerts subdomain DKIM aligns under the new root DMARC, so p=none does not, and a later p=quarantine would not, break sends.

Resolves both halves. Consequences:
1. The **live privacy policy is now honest** with zero code change: it points at hello@, which now works. The FTC/CCPA/COPPA exposure (a designated contact and child-report channel that bounced) is closed.
2. The **alert-email reply-to works** for the first time.
3. **D17 no longer gates item 44 or item 49** (each still carries its own separate gate: 44 the retention read, 49 a non-empty confirmed cohort, so neither auto-promotes).

Two follow-on observables, NOT D17 blockers:
- **Deliverability:** whether confirmations now land in the inbox rather than spam. DMARC plus a monitored reply-to help, but a young sending domain can still be filtered on reputation. Watch the confirm rate; that is the real retention-loop signal.
- **Tighten to quarantine:** only after the rua reports (now arriving at hello@) show clean alignment for a couple of weeks. Not before.

## D18 [RESOLVED] 2026-07-16 · Item 47 (email subscribers re-prompted forever): ship a fix nobody but you can feel?

Context: 14 escalations from four role agents at the design+architecture gate on item 47. They collapse to two questions for you; the rest the agents already agree on and are folded in as defaults below. The headline is not in the roadmap item: the bug's eligible population is **zero excluding you**. 2 email submits, 0 confirmed in 14 days (reports/analytics-2026-07-11.md), and the only confirmed email subscriber in the ledger is you. D17's finding compounds it: the confirm path that would create more of this cohort is itself broken (owner test landed in Outlook spam, no DMARC published). So the fix is correct, cheap, and unmeasurable on live data until email confirm works and the cohort grows.

Correction owed either way: item 47 says this "lands hardest" on "the majority of the enrolled population" on desktop/iOS. True as a share, vacuous at n≈1, and the repo has a hard rule against overstated stats. The roadmap text gets rewritten to say "affects 1 known subscriber (the owner); matters because it corrupts the funnel denominator before the cohort grows."

**Q1. Ship now, or park until email confirm works?**
- (a) [recommended] **Ship now at 100%, no A/B.** It is a real defect, the fix is hours not days, and every day it lives it inflates `alert_optin_shown` and poisons the email funnel denominator we will read in August. Fixing it later means fixing it *and* discarding the contaminated window.
- (b) Park behind D17. Honest about the population, but banks a known-wrong denominator into the one metric the retention thesis rests on.

**Q2. When alerts are on via email, does the "Turn on alerts" button stay?** The agents split, and your own item-47 text ("re-offering push may be legitimate; re-offering email is the bug, do not collapse the two") points at (a).
- (a) [recommended] **Keep the button for push-capable email subscribers, relabel "Add push"** (E1). Preserves the only manual enrollment path, keeps the two offers distinct, and keeps `trigger:"manual"` alive, which E13 notes is the sole guardrail that would catch a bad suppression. Cost: one new string.
- (b) Keep button, keep label, re-route the tap to a non-email body (E4). Zero copy, but the label lies while alerts are on.
- (c) Let it hide (E8). Cleanest header, but it collapses exactly the distinction you said not to collapse, dead-ends Android email subscribers out of push, and zeroes the guardrail.

Defaults if you say nothing (agents agree, sound rationale, folded not asked):
- **No A/B flag, ship 100%** with guardrails (`alert_optin_shown` by trigger, `enrollment_prompt_suppressed` volume). A control arm here is a decision to keep nagging confirmed subscribers, which is the defect. Precedent D3, D6, D11, D13. Recorded distinction: exempt because it is a **bugfix**, not because traffic is thin. The arithmetic needs only ~5 per arm.
- **Server ledger is source of truth.** `/api/email/opened` already resolves the token and throws the answer away; return `{known, confirmed}` and cache booleans in localStorage. Never the address. No new `/api/email/status` (anon_id is localStorage too, dies in the same ITP purge, partitioned on iOS per D7). Table is `email_subscriptions`, not `email_subscribers` as item 47 says.
- **Desktop confirmed subscriber sees a static "You're set."** No push offer, preserving the desktop-never-offers-push invariant (E5).
- **"Alerts on" shows for push OR email confirmed** (closes a pre-existing gap); pending-unconfirmed re-shows the plain email form rather than persisting a typed address (E6, less PII at rest).
- **Two residuals accepted and documented, not solved:** a device that never touched an email link and never enrolled locally cannot be recognised (needs identity this app lacks, `posthog.identify()` is hard banned). And a cross-device unsubscribe cannot clear this device's cached flag, so an unsubscribed user may see "alerts on" until the next email open reconciles `known:false`. A TTL would resurrect the exact bug this item kills (E10).

Blocked on: `lawyer` verdict, dispatched separately (E7, E14). No deploy until it returns.

If silent: ship (a)+(a) after the legal gate clears, correct the roadmap stat, continue other items.

Blocks: item 47 (email subscribers re-prompted forever)

Answer: **Q1 (a) ship now at 100%, no flag. Q2 (c) let the button hide.** (2026-07-16, owner.)

**Q2 went against the recommendation and against the owner's own item-47 line, deliberately.** Recorded so it is not re-litigated: the owner was shown that hiding the button dead-ends push-capable email subscribers (an Android email subscriber cannot reach push at all) and zeroes `trigger:"manual"`, which E13 named as the sole guardrail that would catch a bad suppression. They chose it anyway. The choice is defensible on its own terms: hiding does NOT re-offer email to an email subscriber, so the reported bug is fixed, and it is the smallest, most coherent header. What it gives up is the push-upgrade path, which is deferred, not denied.

Two consequences accepted with it:
- **The push-upgrade dead end is filed as item 49**, so it is deferred rather than forgotten.
- **`trigger:"manual"` will go to zero for this cohort, so guardrail 2 moves** to `enrollment_prompt_suppressed` volume: if suppression fires beyond the known confirmed cohort, the suppression is wrong. That is now the only signal, so it is required, not optional.

**Legal gate returned `needs-changes`, zero blockers** (verdict 2026-07-16). `{known, confirmed}` approved: the token is a 122-bit CSPRNG value that only ever appears in that address's own email, and a bearer can already DESTROY the subscription via `/api/email/unsubscribe`, so learning "it is confirmed" is strictly less power. Forwarding does not change it (a forward recipient is looking at the email). Referer is already closed by browser defaults (`strict-origin-when-cross-origin`). No enumeration concern. Three required actions folded into item 47:
1. Ship the `{known, confirmed}` shape. Approved. Note `/api/email/unsubscribe` deliberately never reveals whether a token exists, so `known` breaks that house posture; tokens are unguessable so this is consistency, not risk.
2. **Strip `t` from the URL after the open ping fires** (`history.replaceState`). The lawyer found the subscription token is currently shipped to PostHog on every email arrival: `emailOpenUrl` (`lib/email/templates.ts:47`) puts it in the URL, `HomeClient` never strips it, and `before_send` scrubs nothing, so `$current_url` carries a live unsubscribe key into a third-party store plus browser history. Pre-existing and NOT caused by item 47, but item 47 is already in this code path. One line.
3. Widen the privacy policy purpose sentence (`app/privacy/page.tsx:166-168`): reading subscription state to decide whether to render a prompt is arguably a third use beyond "to send you the alert and let you stop it".

D17 was re-confirmed live by the lawyer (`dig MX` and `dig TXT _dmarc` both empty) and re-flagged as a CCPA/CPRA + FTC exposure, since `hello@` is the published channel for access, correction, deletion, AND the COPPA child-report channel. It does not gate item 47. It remains the owner's call and is still unanswered.

## D19 [RESOLVED] 2026-07-17 · Item 40: may this pass write to spots.json, and what about records with several launches?

Context: the item 40 vision pass stopped before design with two blocking questions. Both are genuinely yours; the other three escalations were advisory and are folded in as defaults below.

**Q1. May this pass actually edit `data/spots.json`, or does it produce a patch for you to approve?**

There is a live conflict. **Both prior audits state a house rule:** `data/spots.json` was NOT modified, and no spot is overwritten without owner manual review (`reports/coord-audit-2026-07-16.md`, `reports/data-quality-sweep-2026-07-16.md`). **Your 2026-07-17 direction** says the deliverable includes the defensible coordinate corrections applied. These cannot both hold. The stakes: spot data reaches BOTH alert crons via `lib/spots.ts`, so a wrong coordinate does not just misdraw a pin, it points a push notification at the wrong place.

- (a) [recommended] **Apply only two-source-defensible edits, and gate on DEPLOY, not on commit.** The merge lands, the report is the review artifact, you read the coordinate diff, and `vercel --prod --yes` waits for your word. You asked for edits and you have paddled 117 of these spots; this honours that without letting an unreviewed coordinate reach a push send.
- (b) Change nothing; ship the report plus a ready-to-apply patch, as both prior passes did. Safest, slowest, and arguably ignores your direction.
- (c) Apply the `tide_sensitive` fixes only (self-evidencing from the notes, no external source needed) and hold every coordinate for approval.

**Q2. Four records have no single correct coordinate. What should this pass do with them?**

70 Richmond (a centroid merging 4 launches ~1km apart), 54 Russian River (pinned 24-33km from both put-ins its own notes name, duplicating 33 and 35), 84 MLK (two launches ~2.5km apart merged), 63 Berkeley Marina (the Water Trail publishes TWO trailheads: a ramp at 37.868485,-122.317743 and a small-boat hand launch at 37.86281,-122.313559). Moving the pin cannot fix these; there is no right answer to move it to.

- (a) [recommended] **Pin to the launch the record's own notes already describe, escalate where the notes are silent, split nothing.** Spot 65's notes literally say the dock is half a mile east, which is a second line of evidence. A record split creates a new spot id that enters the sitemap, the OG builder, `generateStaticParams` and both crons, and that deserves its own item.
- (b) Escalate all four, change nothing. Four fewer edits, four clean decisions for you.
- (c) Authorise splits in this pass: 70 becomes 4 records, 54 is deleted as a duplicate, 84 becomes 2. Largest blast radius, touches every surface listed above.

Defaults if you say nothing (advisory escalations, folded not asked):
- **Tide pass runs FIRST**, before any coordinate work. It needs no external source, so sequencing makes guardrail 3 impossible to lose.
- **The tide screen's own false positives are already corrected** in the item 40 brief: spots 96 and 60 are correctly `false` and must not be flipped. Real candidate set ~12, not the 14 I reported.
- **No source is called blocked until it has failed via WebFetch AND a POST with a User-Agent.** `sfbaywatertrail.org` 403s a bare curl but loads via WebFetch.

If silent: (a) + (a), and the deploy waits for you regardless.

Blocks: item 40 (record-accuracy audit)

Answer: **Q1 (a) apply two-source-defensible edits, gate on deploy. Q2 (a) pin to what the notes name, split nothing.** (2026-07-17, owner.)

Q1: the pass commits and merges only edits defensible by two independent sources; the merged coordinate diff is the review artifact; `vercel --prod --yes` does NOT run until the owner has read that diff and said go. This resolves the conflict with the prior audits' house rule: the rule was really "no unreviewed spot reaches production", and gating the deploy rather than the commit satisfies it while honouring the owner's instruction to apply corrections.

Q2: 70, 54, 84 and 63 are NOT split in this pass. Where a record's own notes already name the launch (65 names the dock half a mile east at Estuary Park), that counts as the second source and the pin moves to it. Where the notes are silent, the pass reports the candidate launches and changes nothing. Record splits (a new spot id enters the sitemap, OG builder, generateStaticParams and both crons) get their own item if the owner wants them.

Defaults confirmed by silence elsewhere: tide pass runs first; the tide screen's own false positives (96, 60) are already corrected in the brief and must not be flipped; no source is called blocked until it has failed via WebFetch AND a POST with a User-Agent.

**DEPLOYED 2026-07-17** after owner review of the coordinate diff. Verified live on paddletowater.com: spot 65 JSON-LD reads the new 37.7901745,-122.2659597; 64 and 134's new coordinates are in the live bundle; old coordinates gone. The 7 tide flips ship with them and now feed the conditions engine and the calm-window push cron. D19 fully closed.

**Narrowed 2026-07-17 (D23):** the standing gate this decision created was firing on ANY spots.json lat/lng line, including brand-new spots. Per owner directive it now fires only on a CHANGE to an existing coordinate (a removed `-` lat/lng line), which is what this decision was actually about. New-spot additions no longer gate. See D23.

## D20 [RESOLVED] 2026-07-17 · Item 39 owner ratings: ship at 100%, no A/B flag

Owner directive 2026-07-17, verbatim intent: do not A/B test the owner ratings; render them to everyone. This is an explicit exception to the board's "every major update behind an A/B flag" directive, consistent with the D3/D11/D13 precedents for owner overrides at this traffic level.

The owner then asked why the feature needed a PostHog flag at all if it ships at 100%. It did not. The flag existed only to satisfy the A/B directive now waived, and gating an editorial content surface on PostHog resolving a feature flag would have silently hidden the ratings from anyone who blocks analytics (the render gate required `ratingReady`, false until PostHog answers). Resolution: removed the `owner-rating` flag and its `owner_rating` entry in `lib/experiments.ts`; `SpotDrawer` now renders the rating unconditionally whenever a spot carries one. Verified in a browser with PostHog NOT loaded: China Camp shows the rating, unrated Alviso shows nothing and never coerces to 0.

Consequences: no control arm, so item 39's lift is not measurable (owner accepted). `spot_action` still carries `owner_rating` + `owner_rating_shown`, so engagement with rated vs unrated spots stays analysable, segmented by region (North Bay discriminates, East Bay does not). No PostHog flag needs creating; the owner's original open action item is void. Changelog: analytics/INSTRUMENTATION_CHANGELOG.md 2026-07-17. `experiment_exposed` for owner_rating never fired in production (the flag was never created), so no series is lost.

Answer: ship at 100%, flag removed in code (owner directive).

## D21 [RESOLVED] 2026-07-17 · Item 39 rating display: compact bare star, in list + drawer, over the lawyer's needs-changes

Owner feedback 2026-07-17: the rating was rendering as a separate line in the drawer only, both against item 39's original acceptance ("inline in the existing subtitle row, no extra row, in both list and spot sheet"). Owner directed: render just "star + number" inline in the subtitle row, in BOTH list and drawer, and remove the "One paddler's take on the paddle" qualifier. Verbatim fallback: "If lawyer is against star, remove star."

Legal gate run before implementing (marketing-claims surface). Verdict: **needs-changes**, not blocked. The lawyer is fine with moving inline and adding the list view, and fine with the star ITSELF, but flagged the fully bare "star + number" as an FTC Act Section 5 net-impression risk: a star+number is the idiom for aggregated crowd reviews, and a dense list of them reads like Yelp/Google, implying a consensus we do not have. Recommended cure: a 2-word first-party signal ("star 4.5 our take"), which was item 39's original format. Ranked fallback: drop the star to a plain number; last, the bare star as-is (the finding).

**Owner chose the bare star anyway** (option "star 4.5, against advice"), shown the finding and the alternatives, and accepts the Section 5 net-impression risk. This is an owner override of a needs-changes (not blocked) finding, on the record so it is not later read as an oversight. Precedent for owner overriding a studio recommendation: D3/D11/D13.

Shipped: "star + number" inline in the subtitle row in SpotDrawer and SpotCard (list view added, which it was missing), no visible qualifier. Kept an sr-only "out of 5" (scale only, so a screen reader does not announce a bare "4.5"; not the removed framing). The lib/spots.test.ts aggregate-framing guard (no "average"/"reviews"/"N ratings") still passes and now also covers SpotCard. Verified in a browser: list shows the inline stars on rated spots and nothing on unrated ones; drawer matches.

Answer: bare star + number, both views, no qualifier (owner override of the lawyer's needs-changes).

## D22 [RESOLVED] 2026-07-17 · Items 54 + 55: one deploy gated on your read of spot 150's coordinate (now also holds a P0 mobile fix)

**Update (2026-07-17, second loop iteration):** this gate now also holds item 55, a verified P0 mobile fix (commit c24fef1), off production. Spot 150's un-reviewed coordinate sits in the same tree, and the predeploy gate blocks any `vercel --prod` while a new spots.json lat/lng is unread. So both changes ship together the moment you approve below. The P0: on mobile, tapping a list spot threw `Invalid LatLng (NaN)` (6/6 fast trials) and blanked the conditions panel (5/6); the fix guards the map's fly effects against a hidden zero-size container. Nothing is live yet; nothing reverts.


Item 54 is built and verified on `main` (commit bb65416), not yet live. Spot 150 "Russian River - Guerneville River Park" renders at `/spot/150` with the 4.8 owner rating inline, difficulty flatwater, `tide_sensitive: false`, the evergreen notes you drafted, and the regular derived Maps photos CTA. It flows into the sitemap, OG image, `generateStaticParams`, JSON-LD, and both alert crons via `ALL_SPOTS`. Build, lint, and all 316 unit tests pass; no existing coordinate churned (`git diff data/spots.json` shows only the two new lat/lng lines).

The only thing between it and production is your standing D19 gate: a new spot adds `lat`/`lng` lines to `spots.json`, so the predeploy hook holds the `vercel --prod` until you have read the coordinate. This is your own verified coordinate (you supplied `38.5001973, -122.9957117` in item 54), so this is the D19 review-then-go step, not a data-trust question.

Review artifact (`git diff deployed-prod -- data/spots.json`):
- `"id": 150`, `"water": "Russian River - Guerneville River Park"`
- `"lat": 38.5001973`, `"lng": -122.9957117`

Recommended: approve. It is your verified coordinate and everything downstream is green.

If silent: the spot stays on `main` but off production; the next loop iteration deploys once you say go. Nothing is live and nothing reverts in the meantime.

Blocks: item 54 (deploy only).

Answer: **Approve, ship both** (owner, 2026-07-17). Plus a process directive: "I don't think they require any approval gate by me, fix the process." Neither of these needed my sign-off. Acted on both: deployed spot 150 + the P0 fix, and narrowed the standing coordinate gate so it stops asking for this. See D23.

## D23 [RESOLVED] 2026-07-17 · Narrow the D19 predeploy coordinate gate: stop gating new-spot additions and unrelated deploys

**Owner directive, 2026-07-17** (in the D22 thread): adding a new spot with an owner-supplied, verified coordinate, and a bug fix that touches no coordinates at all, should not require an owner approval gate. "Fix the process."

What went wrong: the standing D19 gate (`scripts/predeploy-gate.py`) fired on ANY added or changed `spots.json` lat/lng line. That over-triggered two ways. (1) It gated brand-new spots, i.e. it asked the owner to review a coordinate the owner had just supplied, which is circular. (2) Because it diffs the whole tree against `deployed-prod`, an un-reviewed coordinate sitting on `main` froze EVERY later deploy, so a P0 fix touching zero coordinates was blocked purely by sharing the tree with spot 150.

Fix (shipped this iteration): the gate now fires ONLY when an EXISTING spot's coordinate is changed or removed (a `-` lat/lng line in the diff), which is the real risk D19 was built for: a pin silently moving under live users and the alert crons (the item-40 machine-audit scenario). A purely ADDED lat/lng (a new spot) no longer gates: a new spot is already reviewed by the act of adding it, and letting it through also removes the coupling that stranded the P0. Non-coordinate deploys are never gated. D19's protection for coordinate CHANGES stays fully intact.

Answer: gate only modified/removed existing coordinates, not new-spot additions (owner directive). Implemented in `scripts/predeploy-gate.py`; D19 and `.claude/studio.md` notes updated to match.

## D24 [RESOLVED] 2026-07-17 · Item 43 (user reviews): three decisions gate the build before any review can post

The lawyer gate returned **escalate** on item 43 (crowd reviews). It is buildable, but publishing the first user review turns the static site into a UGC platform that hosts stranger-written text about named private businesses, on a site that already carries drowning-risk/wrongful-death exposure. Before the first review renders, four legal artifacts must exist and three questions are yours to decide. Nothing is illegal to build; it is illegal-shaped to publish before the gating pieces exist. Item 43 is blocked on your answers below.

**What an implementer will just do correctly once you answer (no decision needed):** DMCA designated-agent registration + a takedown route; standard community guidelines; a binary publish/reject moderation queue with a reason log (never rewriting user text, which forfeits §230 protection); the safe aggregate display + threshold; withholding schema.org `aggregateRating` until moderation is real; a privacy-policy UGC section shipped in the same commit; an 18+ age statement; and anti-fraud rate-limiting (one review per spot per identity). The recommended aggregate display (already legally cleared): show a crowd rating only past ~5 genuine moderated reviews, as a plain arithmetic fact ("4.3 average from 12 paddler reviews"), visually distinct from item 39's owner "our take," never blended, never labeled as a safety verdict, kept near the existing guidance-only disclaimer.

**Q1 (spend / counsel).** The UGC Terms of Service + content license + liability limitation is one document that combines an IP license, a liability cap, and a disclaimer that must interlock with the safety disclaimer, on this site's heaviest legal surface. The lawyer flags this specific document as the "expensive if wrong, hard to reverse" zone and recommends a licensed attorney draft or review it (a bounded, one-time spend). Engage an attorney for the UGC terms before the first review posts, yes or no?
- Recommended: **yes.** If no, the studio can ship an implementer-authored template, but that carries real residual risk against the wrongful-death backdrop.

**Q2 (identity).** Require sign-in (item 44's Google auth) before a review, or allow anonymous submission with email-verify? Legal-risk lens: anonymous+email-verify minimizes PII/COPPA/breach surface and ships independently of item 44, while still giving enough anti-fraud to keep "real counts only" true under the FTC fake-review rule; required sign-in strengthens fake-review defensibility and traceability but pulls in item 44, more personal data, and sharper COPPA. §230 shields you either way.
- Recommended: **anonymous + email-verify**, so item 43 can ship without waiting on item 44, unless you'd rather sequence 44 first.

**Q3 (moderation commitment).** Moderation is the legal control the whole FTC/§230 posture depends on, and you are the sole moderator. If the queue backs up, the pressure to auto-publish defeats the gate. What is the commitment (who moderates, and a rough SLA), and do you expect volume to stay within it? A soft launch (reviews enabled on a handful of spots first) is a safe way to bound the queue.
- Recommended: **binary queue + email-on-submit + no auto-publish ever**, soft-launched to a few spots until volume is known.

If silent: item 43 stays blocked and nothing builds, because the identity answer determines the data model and the counsel/moderation answers gate the first publish. Also worth noting: you promoted this as a deliberate bet against the retention-first thesis, and it carries a counsel spend, so deferring it behind retention work is a legitimate answer too.

Blocks: item 43, and item 44 (its identity model is the same decision, per item 44's spec "sequence the identity decision across both"). Q2's answer sets the direction for both; once it lands, item 44 gets its own auth lawyer-gate + analytics-identity strategy (how account identity composes with `anon_id` without reshuffling experiment buckets or the retention/exclusion queries).

Answer: (owner, 2026-07-20, in chat).
- **Q1 YES:** engage a licensed CA attorney to review the UGC Terms of Service (content license + liability limitation + user representations, interlocked with the item-34/35 safety/assumption-of-risk disclaimer). The studio `lawyer` agent produced a first-draft ToS + a prioritized attorney redline-question list (saved under `docs/legal/`) so the engagement is a markup job, not a from-blank draft. No review publishes until the attorney-reviewed ToS is live.
- **Q2 REQUIRED SIGN-IN:** posting a review requires an authenticated account (Google sign-in, item 44), 18+. This SEQUENCES item 44 (auth) BEFORE item 43 can post. Item 44 -> `[ready]`; it carries its own auth lawyer-gate (privacy-policy update, PII/COPPA/CCPA surface) + analytics-identity strategy (account identity vs `anon_id`, no bucket reshuffle, preserve the owner-exclusion/retention queries).
- **Q3:** binary publish/reject moderation queue, email-on-submit to the owner, NO auto-publish ever, launched to ALL spots. (Owner chose all spots over the recommended soft-launch; the no-auto-publish-ever rule keeps the §230/FTC gate intact even if the queue backs up, reviews simply wait rather than pressure an auto-publish.)
- **Sequencing result:** item 44 is `[ready]` now. Item 43 stays blocked on TWO real-world artifacts, not a decision: (a) the attorney-reviewed UGC ToS exists and is live, and (b) item 44's required sign-in has shipped. Re-blocked as `[blocked(44 + attorney-ToS)]`.

**AMENDMENT 2026-07-21: Q1 REVERSED. No attorney will review the UGC terms.** The owner directed five structural changes (no arbitration; flat $100 cap; checkbox assent; published business report path; privacy scope narrowed to genuinely mandatory obligations), then confirmed "no attorney reply is coming." The document was therefore finalized WITHOUT licensed counsel: all 27 open `[ATTORNEY: ...]` questions were closed by the studio `lawyer` agent's own judgment, drafting to the most protective reasonable common denominator where a call turned on state-specific law. Final document: `docs/legal/ugc-contributor-terms.md` (v1.0), whose internal provenance block records, permanently and by name, every judgment call made without counsel and the residual risks the owner is knowingly carrying. Item 43's gate therefore changes from "attorney-reviewed ToS" to the **9 real-world prerequisites** listed in that provenance block, of which the hard ones are: register a DMCA designated agent with the U.S. Copyright Office (DONE 2026-07-21, `DMCA-1076005`; renewal due July 2029 or the safe harbor lapses); extend the account-deletion runbook to published reviews + the moderation log (9.2/9.3 currently promise more than the runbook can perform, an FTC Section 5 problem); build the unchecked-checkbox assent UI with version stamping; and verify the do-not-sell/share sentence against the live PostHog and pixel stack. Two risks the owner was shown and accepted: the standalone class-action waiver has no FAA carrier behind it, and no drafting closes the wrongful-death gap (that is D25 Q2/Q3, entity + insurance, still open).

## D25 [RESOLVED] 2026-07-18 · Item 35 (assented Terms + assumption-of-risk waiver): four decisions before the waiver is a real defense

The lawyer gate returned **escalate** on item 35. The draft ToS + assumption-of-risk waiver is written and ready to build against (footer link + sign-in-wrap assent at enrollment, no checkbox, near-zero conversion cost, full draft at the bottom of this memo). What is NOT the studio's call: whether the waiver actually holds against a California drowning/wrongful-death claim, and whether to shield personal assets. The honest read on the core bet: a well-drafted release of **ordinary negligence** for a recreational activity is generally enforceable in CA (Tunkl), **but** a wrongful-death claim belongs to the decedent's heirs as their own independent claim, and a release the paddler signed may not bind non-signatory heirs. So this waiver strengthens the defense against a surviving paddler's own claims and is **uncertain against the exact wrongful-death suit it is meant to stop.** Gross negligence can never be waived (City of Santa Barbara). This is why it escalates rather than ships. Risk assessment, not legal advice, not a substitute for a licensed CA attorney.

**Q1 (counsel spend).** Engage a licensed California attorney to review the draft waiver, ~1 hr bounded spend, before the assent UI ships as a liability shield? The highest-value question is the heirs'/wrongful-death point, which determines whether this item delivers what its premise claims.
- Recommended: **yes.** This is the "expensive if wrong, hard to reverse" zone; a founder-authored release on a drowning-risk surface is what a plaintiff's lawyer attacks first. A bounded one-hour review is cheap insurance on the studio's highest-value legal item.

**Q2 (entity).** Form a California LLC (~$800/yr minimum franchise tax + formation cost) to put a shield between the product and the owner's personal assets, or stay an individual?
- Recommended: **lean yes, but squarely the owner's call, pairs with Q1/Q3.** A release is one layer; if read down, personal-asset exposure on a wrongful-death claim is the real tail risk. Counterweight is $800/yr on a pre-revenue free product. Reasonable to defer until revenue (PaddlePass) or until the Q1 attorney recommends it, but do not treat the waiver as a substitute for the entity; they protect against different failures.

**Q3 (insurance).** Obtain liability insurance (general liability / media or tech E&O)?
- Recommended: **get a quote before deciding.** Insurance, not the waiver, is what actually pays a defense and a judgment if a suit survives a motion to dismiss. For a solo operator on a drowning-risk surface this may be the highest-leverage of the three, and often cheaper than expected. Price it during the Q1 attorney hour.

**Q4 (ship-now vs hold).** Build/deploy the assent UI now with the draft text, or hold until the attorney blesses it?
- Recommended: **build the `/terms` page + footer link now; HOLD the enrollment sign-in-wrap assent line until Q1 is answered.** Publishing a `/terms` page and footer link improves posture immediately and is low-risk. But the enrollment assent's whole value is enforceability, and shipping an assent flow around unreviewed release text banks a version of the waiver into users' assent records before an attorney has seen it, and creates false comfort. Ship the container, gate the assent moment on Q1.

If silent: item 35 stays blocked. Nothing user-facing ships, because Q4 gates the container and Q1 gates the enforceable assent line. If this passes 24h unanswered the studio sends ONE reminder, then leaves it.

Blocks: item 35. (Independent of D24; can be answered separately.)

**Draft interlock notes for the implementer (after answers):** `/terms` page mirrors `app/disclaimer/page.tsx` styling; footer "Terms" link goes in BOTH `components/SpotList.tsx` and `components/HomeClient.tsx`; ToS sections 3 + 8 must keep the live "guidance only, not a safety guarantee" framing; version+timestamp the assented Terms text on the subscription record (a release binds only the version the user saw), and if that stamp is stored, add one line to `app/privacy/page.tsx` "What we collect" in the SAME commit; the enrollment assent line ships behind a **kill-switch flag at 100%, no A/B** (2026-07-17 DAU<100 rule). Must NOT ship until Q1=yes+done: the enrollment assent line, the Civil Code 1542 quote (verify against current statute, do not paraphrase), and any claim the site "has an enforceable waiver" / "defeats a wrongful-death suit."

<details>
<summary>DRAFT Terms of Use and Release (PENDING licensed CA attorney review, do not rely on as-is)</summary>

**Terms of Use and Release** · Last updated: [DATE]

**Please read these Terms carefully. They include an assumption of risk, a release and waiver of liability, and a limitation of liability that affect your legal rights. By using Paddle to Water, you agree to them.**

**1. Who we are, and what this is.** Paddle to Water ("the Site," "we," "us") is a free informational website operated by an individual in California. It lists paddleboard and kayak launch spots in the San Francisco Bay Area and shows weather and conditions data compiled from public sources. It is a planning tool and nothing more. We are not a guide service, an outfitter, an instructor, or a safety authority, and we do not inspect, control, or manage any launch spot, waterway, or body of water.

**2. You accept these Terms by using the Site.** By using the Site, saving a spot, or turning on alerts, you agree to these Terms, to our Disclaimer, and to our Privacy Policy. If you do not agree, do not use the Site. If you are under 18, do not use the Site without a parent or guardian who agrees to these Terms on your behalf. [ATTORNEY: minor use / parental release enforceability uncertain in CA.]

**3. Assumption of inherent risk.** Paddleboarding, kayaking, canoeing, and all water activities are dangerous. They carry inherent risks that no website can remove, including cold water, currents, tides, wind, waves, boat traffic, submerged hazards, weather that changes fast, equipment failure, capsizing, hypothermia, serious injury, and drowning and death. You understand and accept these risks. You are solely responsible for deciding whether any spot, on any given day, is safe for your skill, your equipment, and the conditions in front of you. You are responsible for wearing appropriate safety gear, checking current conditions yourself, and telling someone your plans before you launch. Conditions and data on the Site are guidance only, never a safety guarantee, and never a substitute for your own judgment on the water.

**4. The Site is provided "AS IS," with no warranties.** All information on the Site, including spot locations, coordinates, fees, access, hours, parking, and all weather and conditions data, is compiled from public and third-party sources and may be wrong, incomplete, or out of date. Conditions data is not a forecast you should rely on for safety. The Site and everything on it are provided "AS IS" and "AS AVAILABLE," with all faults, and without warranties of any kind, express or implied, including implied warranties of merchantability, fitness for a particular purpose, accuracy, or non-infringement. We do not warrant that any spot is open, legal to access, safe, or accurately described, or that any data is accurate or current.

**5. Release and waiver of liability (ordinary negligence).** To the fullest extent allowed by California law, you release, waive, and agree not to sue Paddle to Water and its owner (the "Released Parties") from any and all claims for injury, death, property damage, or other loss arising out of or relating to your use of the Site or of any information on it, including claims based on the ordinary negligence of the Released Parties. This does not release, and nothing here attempts to release, gross negligence, recklessness, willful or intentional misconduct, fraud, or any liability California law does not permit to be waived. [ATTORNEY: gross negligence unwaivable, City of Santa Barbara (2007); Civil Code 1668 voids releases of fraud/willful injury/violation of law, carve-out is load-bearing.] You also waive California Civil Code section 1542. [ATTORNEY: verify 1542 waiver is appropriate and quote current statutory wording; do not paraphrase.]

**6. Limitation of liability.** To the fullest extent allowed by law, the Released Parties will not be liable for any indirect, incidental, consequential, special, or punitive damages. In any event, the total liability of the Released Parties to you for all claims relating to the Site will not exceed one hundred U.S. dollars ($100). Because the Site is free, this cap reflects the basis of the bargain. Some limitations may not apply where the law does not allow them.

**7. Indemnification.** You agree to indemnify and hold harmless the Released Parties from any claim, loss, liability, or expense (including reasonable attorneys' fees) arising out of your use of the Site, your violation of these Terms, or your violation of any law or third-party right.

**8. No professional or safety advice.** Nothing on the Site is safety, medical, legal, or professional advice. We do not tell you a spot is safe to paddle. Any "conditions," "calm," or similar indicator is a convenience based on third-party data, not a determination that it is safe for you to go out.

**9. Access and permissions.** A spot appearing on the Site does not mean public access is legal, permitted, or currently available. Some spots may be private, permitted, or seasonally closed. Confirming your legal right to access any spot is your responsibility.

**10. Changes to these Terms.** We may update these Terms. Material changes will be posted here with a new date. Continued use after a change means you accept the updated Terms. [ATTORNEY: a later unilateral change may not bind a user who assented to an earlier version; version and timestamp the assented text.]

**11. Governing law and venue.** These Terms are governed by California law, without regard to conflict-of-laws rules. Any dispute will be brought exclusively in the state or federal courts in [COUNTY], California. [ATTORNEY: pick owner's home county; consider arbitration/class-waiver separately.]

**12. Severability.** If any part is unenforceable, the rest stays in effect, and the unenforceable part is limited or removed only to the extent required.

**13. Contact.** hello@paddletowater.com

</details>

Answer: (owner, 2026-07-18) **Q1: YES**, engage a licensed CA attorney to review the draft waiver, lead with the heirs'/wrongful-death enforceability point. **Q2: DEFER** the CA LLC until revenue. **Q3: DEFER** liability insurance. **Q4: SHIP NOW.** Per the memo's interlock, "ship now" = build/deploy the `/terms` page + footer link now with the draft text; the enrollment sign-in-wrap ASSENT line, the Civil Code 1542 quote, and any "enforceable waiver / defeats a wrongful-death suit" claim still HOLD until Q1 is answered by the attorney (the lawyer-gate constraint in this memo, which Q4 does not override). Net: the container ships this loop, the assent moment stays gated on the attorney.

## D26 [RESOLVED] 2026-07-18 · Item 50 (split the multi-launch records): the audit says only 1 of the 4 is a real defect, and the splits need sourcing you have to scope

Item 50 was promoted to `[ready]`, but reading `reports/item-40-record-accuracy-2026-07-17.md` (the audit it depends on) shows the "split 4 records" framing overstates what is ready. Correcting the record per spot, then the calls that are yours:

- **84 MLK Jr. Shoreline, NO defect.** The audit found the stored coord already matches the launch its notes describe (Doolittle Beach Staging Area); "no discrepancy found." Item 50's "two launches merged" premise is wrong here. Recommend: **drop 84 from this item, do nothing.**
- **54 Russian River, the one real defect.** Stored coord reverse-geocodes to Kelly Road, Cloverdale, ~30 km NORTH of the Guerneville put-ins its notes name (Johnson's Beach, Veterans Memorial Beach). It is also likely redundant now that you added spot 150 "Russian River - Guerneville River Park" (Johnson's Beach area). Recommend: **hide spot 54** (`hidden` + `hidden_reason`: coord ~30km off, untrustworthy, Guerneville covered by spot 150), reversible, keeps the record, removes it from every surface + both crons. Alternative: re-point 54 to Veterans Memorial Beach with a sourced coord if you want both Guerneville put-ins live.
- **63 Berkeley Marina, split not sourced.** The audit's 63 entry does NOT publish the "ramp + hand-launch" coordinates item 50's summary claimed; it says only that the coord sits at the marina parking and notes name no specific beach. A split needs a fresh two-source pass (Water Trail + OSM) to get the two put-in coordinates first.
- **70 Richmond Marina, split not sourced.** Notes name three OTHER launches (Shimada, Vincent Park, Marina Bay Yacht Harbor) as alternatives; the audit calls them "candidates for separate future records" with no coordinates fetched. A 3-way split needs sourcing each, two sources each, before any record is trustworthy.

**Why this is yours, not the loop's:** a split/delete mints or removes spot ids, which enter/leave the sitemap, `generateStaticParams` (the static `/spot/<id>` page), OG images, JSON-LD, and BOTH alert crons, a product + SEO change, not a data fix (D19 Q2a reserved the split-vs-keep scope for you). And the 63/70 splits can't even start without a sourcing pass that doesn't exist yet.

**Q1 (spot 54).** Hide it (recommended, reversible, 150 covers Guerneville), re-point it to one Guerneville put-in, or leave it? 
- Recommended: **hide**, with `hidden_reason` noting the 30km error + spot 150 overlap.

**Q2 (63 + 70 splits).** Authorize a sourcing pass (Water Trail + OSM/Nominatim, two sources each) to get the split coordinates, THEN a split? Or defer these as a separate coverage item? Note each new record is a new SEO surface and an owner-scope call on how many launches to break out.
- Recommended: **defer 63 + 70 to a separate sourcing item**; they are not "ready," and shipping guessed put-in coords would repeat the exact defect item 40 exists to prevent.

**Q3 (item 50 scope).** Given the above, narrow item 50 to "fix spot 54" (doable this loop once Q1 lands) and re-file the 63/70 splits? 
- Recommended: **yes.**

If silent: item 50 stays blocked. Nothing is deleted or split without your Q1/Q2 answers, because removing or minting a live `/spot/<id>` page is irreversible SEO and D19 Q2a made the scope yours.

Blocks: item 50.

Answer: (owner, 2026-07-18) **Q1: HIDE spot 54** (`hidden` + `hidden_reason`: coordinate ~30km off in Cloverdale, untrustworthy; Guerneville is covered by spot 150). Reversible, keeps the record, drops it from every surface + both crons. Q2/Q3 not separately specified, so default to the recommendation: **DEFER the 63 + 70 splits** to a separate sourcing item (do NOT ship guessed put-in coords, that repeats the defect item 40 exists to prevent), and **NARROW item 50 to "fix spot 54"** this loop, re-filing 63/70. Drop 84 (no defect). Do not alter any `lat`/`lng`.

## D27 [RESOLVED] 2026-07-18 · Item 57 (mobile sheet drag): it's already measurable, but the loop can't read PostHog, so the answer + any fix is yours

Item 57 asks whether the mobile bottom-sheet drag (slide up/down) is useful or friction, "with the numbers behind it." Two findings, then the ask.

**Finding 1 (good news): the drag is already instrumented, no new event needed.** `spot_sheet_resized {to: "peek"|"full"}` fires when a drag changes the snap state, and `spot_sheet_dismissed {method: "drag"}` fires on a drag-to-dismiss (`components/SpotDrawer.tsx` onHandleEnd). So the usage data likely already exists in PostHog. The query: on mobile sessions, `spot_sheet_resized` count / `spot_viewed` count = the drag-to-resize rate; if it's high, users are routinely dragging to see more, which means the sheet opens too short and the drag is load-bearing (friction on the core content), not optional polish.

**Finding 2 (the concern): the item-31 photo pushed core content down.** The photo now sits above the notes and the ConditionsPanel, so on a peek-height sheet the conditions readout (the retention differentiator) and the safety line sit further below the fold than before. If Finding 1's drag-rate is high, that is why.

**The blocker:** the studio loop has no PostHog personal API key (the app ships only the write-only ingestion key), so it cannot run the query itself. This is the one thing gating a data-backed answer.

**Q1.** Run the drag-rate query yourself (you have the key + project 458289), or drop a read-only `phx_…` key where the loop can use it, so it can finish the empirical read?
- Recommended: **you run it once**, it's a two-series ratio and takes minutes; a standing read key is more surface than this one question needs.

**Q2 (the fix, pre-scoped).** If the drag-to-resize rate is high (say >30% of mobile spot opens), ship the item-57-authorized fix: auto-open mobile spot sheets taller so ConditionsPanel clears the fold (reuse the item-9/42 `startExpanded` machinery), behind a `sheet-auto-expand` kill switch (no A/B, DAU<100). If the rate is low, the drag earns its keep, mark item 57 "leave it" and stop. Which way, once you have the number?
- Recommended: **auto-expand if the rate is high**; it removes a weak-affordance drag gating the app's core content.

If silent: item 57 stays blocked on the read. No layout change ships without the number, since raising the default sheet height covers more of the map and is a real UX trade-off.

Blocks: item 57.

Answer: (owner, 2026-07-18) **REMOVE the drag function; every mobile spot sheet opens FULL SCREEN.** This is a stronger call than the pre-scoped conditional auto-expand and does NOT need the PostHog drag-rate read, so Q1/Q2 are moot: don't run the query, don't build the rate-gated variant. Implementation: mobile spot sheets always open at full height (reuse the item-9/42 `startExpanded` at 100%; drop the peek snap and the drag-to-resize handle). Implementer note: drag-to-dismiss goes away with the handle, so keep a non-drag dismiss path (the existing close control / backdrop tap / back gesture) so the sheet is still closable. Ship behind the `sheet-auto-expand` kill switch (no A/B, DAU<100).

## D29 [RESOLVED] 2026-07-21 · Star-only ratings publish immediately (narrows D24's "no auto-publish ever")

**Context.** D24 settled item 43's shape as "binary queue + email-on-submit + **no auto-publish ever**, all spots". That was written before any review existed. In practice it means a paddler who taps five stars and nothing else waits for a human to approve a number.

**Decision (owner, 2026-07-21, in chat):** a rating submitted with **no text** is logged and published directly. Anything containing text still goes to a human, always.

**Why it is safe.** Pre-publication review exists to catch defamatory, unlawful, or abusive *words*. A bare numeric rating carries none of that risk: there is nothing to libel with, nothing to moderate, and holding it added delay without adding safety. The controls that make a rating genuine are unchanged: sign-in required, one rating per spot per account (enforced by a partial unique index), and the crowd average still withheld below 5 published reviews.

**What this required beyond the code.** The published Contributor Terms said "Every review is reviewed by a human first. Nothing you submit is published automatically", and every submission stores a hash of the exact text its author assented to. Shipping the behaviour without amending that text would have made a live promise false. So s6.1 was rewritten to distinguish text from a bare rating, the terms went to **v1.1**, `TERMS_VERSION` and `TERMS_HASH` were bumped so the assent record points at what people actually saw, and the Privacy Policy line plus the post-submit confirmation were corrected to match.

**Guardrail.** A test now fails the build if text is ever auto-published, and it is pinned to the version constants: loosening this again requires amending the terms and bumping the version again, deliberately.

## D28 [RESOLVED] 2026-07-20 · Item 44 (Google sign-in) is an auth surface the loop cannot autonomously build or deploy

D24 unblocked item 44 (required sign-in), and it is now the top `[ready]` item. But it is an **auth/personal-data surface**, which the ship escalation policy lists as pause-and-escalate, and item 44's own spec calls it "escalation-class." The studio loop cannot build or deploy it without owner decisions and owner-only infrastructure. This is not a "the loop is stuck" note; it is the auth gate working as intended. Four things are yours; the rest an implementer does once you answer.

**Q1 (blocking, owner-only infra).** Google sign-in requires a **Google Cloud OAuth client** (client ID + secret), an OAuth consent screen (app name, scopes = email/profile, the live privacy-policy URL), and authorized redirect URIs. The loop cannot create this (account creation + a secret it must never handle). Will you create the Google Cloud OAuth app and drop the client ID + secret into the deploy env vars? Nothing can be built or tested until this exists.
- Recommended: **yes**, and use **Supabase Auth** (GoTrue) as the auth stack, the backend is already Supabase (push + email subscriptions), so its built-in Google provider + row-level security is the least-new-surface path versus adding NextAuth. Confirm the Supabase Auth choice or name an alternative.

**Q2 (provider set, native-app implication).** The native iOS app (item 72) already exists, and Apple App Store Guideline 4.8 requires offering **Sign in with Apple** if an iOS app offers any third-party social login (Google). Options:
- (a) [recommended] **Google only, web first.** Ship accounts on the website now; hold native-app sign-in until item 43/reviews actually need it on native, which defers the Apple-sign-in build. The native app stays anonymous for now.
- (b) **Google + Apple from the start**, so native can offer sign-in immediately (more build now).

**Q3 (analytics identity, confirm the approach).** Item 44's acceptance requires the identity strategy documented before build. Recommended, and it needs your ok because it is load-bearing for every existing metric: keep **`anon_id` as the analytics primary key**, NEVER call `posthog.identify()`/`reset()` (CLAUDE.md rule, it reshuffles experiment buckets and would corrupt the owner-exclusion + retention queries), and attach the account only as a person property via `setPersona` (e.g. `signed_in=true`). Confirm.

**Q4 (migration model, touches Supabase schema = PROTECTED).** An anonymous user who signs in must **keep** their saved spots (localStorage today) and push subscription (Supabase, keyed on `anon_id`), not start empty. That means a schema change: a `users`/accounts table, a `user_id` FK linking existing `push_subscriptions`, and a `user_saved_spots` table synced from localStorage on first sign-in. Confirm you want this migration-not-reset behavior (recommended, it is in the item's acceptance), and note the schema change will itself be owner-reviewed at deploy per the PROTECTED gate.

Scope reminder (no decision needed): build item 44 as **optional** account sync, anonymous use stays fully functional and is never forced; it is the account foundation reviews (item 43) will later require. A privacy-policy update + an auth lawyer-gate (`clear` before deploy) are already in the acceptance and will run in the ship pipeline once you answer.

If silent: item 44 stays blocked and the `[ready]` queue is dry (item 43 waits on 44 + the attorney ToS; everything else is `[proposed]` awaiting promotion). Deferring accounts behind the retention work is also legitimate, this is the same retention-first-vs-reviews tension you already weighed when you promoted 43/44.

Blocks: item 44 (and transitively item 43).

Answer: (owner, 2026-07-20, in chat).
- **Q1 YES** as recommended: owner creates the Google Cloud OAuth app and provides the client ID + secret to the deploy env; auth stack = **Supabase Auth** (GoTrue Google provider + RLS), least-new-surface since the backend is already Supabase.
- **Q2 = (b) Google + Apple from the start.** Sign in with Apple is included so the native iOS app can offer sign-in immediately. NOTE (build prerequisite, flagged to owner): Sign in with Apple requires an Apple Developer Program App ID + Services ID + key, which depends on the **still-pending Apple Developer Program enrollment** (native runbook, item 72). The Google/web half can be built and shipped independently; the Apple half is gated on that enrollment. Sequence Google/web first, layer Apple when enrollment lands.
- **Q3 (analytics identity):** proceed on the mandated approach, `anon_id` stays the analytics primary key, NEVER `posthog.identify()`/`reset()` (standing CLAUDE.md rule; no owner deviation possible without breaking bucketing + the owner-exclusion/retention queries), account attached only via `setPersona`. (The owner's "Q3" text actually acked Q4's migration behavior; recorded there.)
- **Q4 = migration-not-reset, acked.** On first sign-in an anonymous user keeps their saved spots (localStorage -> `user_saved_spots`) and push subscription (link existing `push_subscriptions` rows via a `user_id` FK); add a `users`/accounts table. Owner acknowledges the Supabase schema change is owner-reviewed at deploy per the PROTECTED gate.

Build prerequisites before item 44 can DEPLOY a working sign-in: (1) Google OAuth client id + secret in env (owner, Q1); (2) auth lawyer-gate `clear` (privacy-policy update for the new PII, run in the ship pipeline); (3) for the Apple half only, Apple Developer Program enrollment complete. The loop may start building the Google/web + Supabase-Auth + migration code now (tests with mocked auth) and escalate the deploy for the real credentials + lawyer gate.

## D30 [RESOLVED] 2026-07-21 · D24 amended: the displayed score now blends your rating with paddler reviews, and the legal gate wants two answers

**Shipped in the same change (owner-directed, in chat 2026-07-21).** The number shown for a spot is now `(5 x your rating + sum of paddler ratings) / (5 + review count)`. Your pre-generated rating carries the weight of five reviews; each published review carries one. You chose per-review weighting (so the crowd overtakes you as reviews accumulate) and display from the first review, over the alternatives.

**This reverses part of D24**, which cleared a display where the crowd average appeared only past 5 reviews and the two numbers were "never blended". The volatility half of D24's safety rationale is satisfied arithmetically: one 1-star review moves a 4.0 spot to 3.5, not to 1.0. Spots with no rating of yours (~26) keep D24's 5-review threshold unchanged, since there is no prior there to damp anything.

**The legal gate returned `needs-changes`, and all seven ship-blocking actions were implemented before deploy:** the blended number is labelled "Paddle score" and never carries a bare "(N)" or the words "paddler reviews"; the sheet shows both inputs and the weighting; Contributor Terms s6.4 was rewritten (the live text said any average was "an automated calculation from contributor-supplied ratings", which this change made false) and TERMS_VERSION/TERMS_HASH bumped to v1.2; no `aggregateRating` in structured data; the old cleared controls were replaced with new executable guards rather than deleted.

**Two questions the gate escalated, both genuinely yours:**

**Q1 (posture).** Blending your own opinion into the number weakens the "we are only a host" position that Section 230 protection rests on. Your own repo already decided this once the other way: item 39's computed rubric was cut because a computed average is arguably first-party speech, and `docs/legal/ugc-contributor-terms.md` lists "you add editorial voice on top of user content" as the move most likely to turn you from a protected host into a co-author. Realistic downside is a demand letter from a named marina or private launch whose score you influenced, not a judgment. It lands on you personally because D25 Q2 (LLC) and Q3 (insurance) are both still deferred.
- Options: **(a)** keep the blend as shipped and accept the exposure; **(b)** revert to two clearly separated numbers (paddler average with its count, "our take" beside it) and instead lower the crowd threshold if the goal was showing user input sooner; **(c)** keep the blend and engage a licensed attorney on the host-vs-co-author question.
- Recommended: **(a) for now**, revisit at the same time as D25 Q2/Q3. The exposure is real but small at current volume, and (b) gives up the thing you asked for.

**Q2 (safety weighting).** Is `OWNER_WEIGHT = 5` the number you want? The gate's sharpest point: the first negative review of a spot is the highest-value safety signal this product will ever get, and the blend guarantees it is outweighed 5 to 1 by a rating generated before anyone reviewed anything. Concrete case: a spot you rated 5.0 gets one 1-star review describing a dangerous shore break, and the card shows 4.3. The sheet now discloses both numbers, but the card does not.
- Options: **(a)** keep 5; **(b)** lower the weight (3 reaches a 50/50 split at 3 reviews instead of 5); **(c)** keep 5 but surface the paddler average on the CARD too whenever it is more than a point below the blended score (the gate's suggested mitigation, ~20 lines).
- Recommended: **(c)**, cheap and targeted at the only case that actually worries me.

Answer: (owner, 2026-07-21, in chat) **Q1 = (a)**, **Q2 = (a)**. Both keep what is already live, so neither needed a code change.

- **Q1 = (a):** keep the blend as shipped and accept the host-versus-co-author exposure, revisiting alongside D25 Q2 (LLC) and Q3 (insurance).
- **Q2 = (a):** `OWNER_WEIGHT` stays **5**, and the card-level safeguard is declined (the owner also declined it earlier when choosing "deploy as built"). The recommendation was (c); the owner chose (a) with the failure mode in front of them.

Consequence to keep in view, recorded so it is not rediscovered as a surprise: with weight 5, a spot the owner rated 5.0 that receives one 1-star review describing a hazard still displays **4.3 on the card**. The spot sheet discloses both inputs ("Our take 5.0 · paddlers 1.0 from 1 review"); the card does not. The standing guardrail is the safety metric in the item-83 changelog entry, `spot_action{action:"directions"}` per spot open, watched for a step change and never optimised.

### Appended 2026-07-21 (item 83 legal gate): the same question, with more volume behind it

**MOVED to D31 on 2026-07-22.** Q1 and Q2 above are answered, so this entry now reads as resolved; leaving the unanswered LLC question inside it would have hidden it. The text is kept here for continuity and the live version is D31.

The collectables gate returned `needs-changes` (all findings fixed before deploy) but escalated one thing, and asked for it to land here rather than as a new decision, because it is D30 Q1 with a second input.

You are now deliberately increasing the volume of contributor prose about named private businesses (marinas, private launches, paddle shops), via a mark called "In your own words" that exists specifically to reward writing sentences. At the same time you publish a score you author part of (D30 itself). Neither change alone moves the legal posture. Together they raise the frequency of the risk the Contributor Terms already name as the largest un-researched item in the document: defamation and anti-SLAPP exposure from hosting reviews of named businesses. D25 Q2 (LLC) and Q3 (insurance) are both still deferred, so it lands on you personally.

Why this is a counsel question and not one I should answer: anti-SLAPP coverage is state by state, there is a federal-circuit split on whether a state anti-SLAPP motion is even available in federal court, and none of that was verified. The realistic downside stays a demand letter rather than a judgment, but the cost of winning a meritless speech suit in a weak anti-SLAPP state does not scale down with your traffic.

- **(a)** Proceed as planned, revisit when D25 Q2/Q3 are answered.
- **(b) [recommended]** Proceed, and bound the exposure now by taking the one cheap structural step: form the LLC before contributor prose volume grows. It is the only action that helps against every version of this risk and costs nothing to reverse.
- **(c)** Engage a licensed attorney on the combined host-versus-co-author and anti-SLAPP question, answering D30 Q1 and this at once.

Also recorded, so it is not re-litigated later: **marks staying private is a legal constraint, not a v1 scoping choice.** The day a mark is visible to a reader it becomes site-conferred credibility attached to third-party speech, which re-opens Q1 directly and adds FTC exposure. Any future public display needs its own gate.

Answer:

## D31 [RESOLVED] 2026-07-22 · Form the LLC before contributor prose volume grows (moved out of D30)

Split from D30 by the studio loop: D30's own Q1/Q2 were answered on 2026-07-21, so that entry is now `[RESOLVED]`, and this question would have been invisible inside it. Nothing has changed about the question itself.

The item-83 legal gate escalated it. You are deliberately increasing the volume of contributor prose about named private businesses (marinas, private launches, paddle shops), via a mark called "In your own words" that exists to reward writing sentences. At the same time you publish a score you author part of. Neither alone moves the legal posture; together they raise the frequency of the risk your own Contributor Terms name as the largest un-researched item in the document: defamation and anti-SLAPP exposure from hosting reviews of named businesses. D25 Q2 (LLC) and Q3 (insurance) are both still deferred, so it lands on you personally.

Why it is a counsel question: anti-SLAPP coverage is state by state, there is a federal-circuit split on whether a state anti-SLAPP motion is available in federal court, and none of that was verified. The realistic downside stays a demand letter rather than a judgment, but the cost of winning a meritless speech suit in a weak anti-SLAPP state does not scale down with your traffic.

- **(a)** Proceed as planned, revisit when D25 Q2/Q3 are answered.
- **(b) [recommended]** Proceed, and bound the exposure now by forming the LLC before contributor prose volume grows. The only step that is cheap, helps against every version of this risk, and costs nothing to reverse.
- **(c)** Engage a licensed attorney on the combined host-versus-co-author and anti-SLAPP question, answering D30 Q1 and this at once.

**Added 2026-07-22 (item 84 re-gate), because it changes what you already agreed to.** You accepted the D30 Q1 risk while the blended number carried a visible label and the sheet showed both inputs. Two owner-directed removals then took both away, and the re-gate's sharpest finding was not the FTC one: **the visible label was doubling as your opinion defence.** A rating attributed to the site is opinion, which is the strongest answer if a named marina or private launch objects; an unattributed aggregate sitting under a "Paddler reviews N" heading reads as a factual report of what paddlers think, which is the actionable kind of statement. Removing it downgraded your legal position for a copy preference, without that trade being visible at the time.

Item 84 shipped the floor as **"our take"**, which satisfies the owner's actual request (the rejected wording was "Paddle score", not the concept) and restores the labelled state your D30 Q1 acceptance was given on. **So this does not need re-deciding**: option (a) is now the status quo again. It is recorded here only so the trade is on the record if the label is ever removed a third time.

Answer: (owner, 2026-07-22, in chat) **(a)**. No LLC now. The cost is not justified at 150 WAU with zero revenue, and the owner declined both follow-ups offered alongside it (a review-form copy nudge, and a tripwire restating this decision as conditions). Revisit with D25 Q2/Q3.

**Two factual corrections to this entry's own premise, recorded because they are why (a) was chosen and because the memo above overstates the risk.** Checked against `web/data/spots.json` (143 records) during the chat:

1. **"Private launches" is an empty category on the live site.** The only genuinely private launch is spot 92 (San Rafael Canal, 101 Surf Sports' own dock) and it is already `hidden`. Every visible launch site is public. This matters because a government body cannot bring a defamation claim in the US, so on the large majority of spots there is no possible plaintiff, which the escalation did not account for.
2. **The real surface is ~28 of 143 records, and it is not about launch access.** Those are public sites with a private business operating on them: spot 23 (launch from the public side of the Half Moon Bay Yacht Club), 26 (free public launch inside a private marina's lot), 135 (Emeryville Marina), 5 (Vasona, no outside watercraft so you must rent from the concessionaire), plus 31 records with `rentals_available: true`. The exposure is a reviewer writing about the *operator* (staff, rental quality, pricing) rather than the water. That is a moderation-and-copy problem, not a corporate-structure one, which is the second reason the entity was judged the wrong first spend.

Also noted and not acted on: forming in Delaware or Wyoming saves nothing, because California taxes on doing business in California, so a non-CA entity run from SF owes the same $800 FTB minimum *plus* foreign-registration and second-state costs. If this is ever revisited, form in CA, and file in the last two weeks of December so the 15-day rule skips a tax year. Insurance (D25 Q3) was flagged as the better first dollar than the entity for this specific risk, since an LLC caps personal assets but does not pay defence costs, and defence cost is the realistic downside here. Not decided, still deferred.

## D32 [RESOLVED] 2026-07-22 · Item 89: should an earned mark appear beside a public review byline?

Item 89 asked for the mark to show "by your name" in two places. The **header identity** is self-visible only, keeps Contributor Terms s2.5 true as written, and **shipped today** with no terms change and no legal question. This decision is only about the **second** place: beside the byline on every published review, where readers see it. That half is NOT built.

Three things follow from it, and the third is the actual decision.

1. **It falsifies your own published terms.** Contributor Terms s2.5 says marks are "shown only to the contributor and to nobody else." That becomes a false statement the moment this deploys. Fixable: amend s2.5, bump to v1.4 in the four places carrying the version, ship in one commit.
2. **It decorates reviews written under the old promise.** Marks derive from live counts, so existing bylines would gain a mark with no new assent. Fixable exactly and cheaply: display only beside reviews stamped `terms_version` v1.4 or later. The column already exists.
3. **It re-opens D30 Q1, and that is your call.** A token the site places beside a contributor's name on a review of a named business is the site conferring credibility on third-party speech. Your own Contributor Terms name "you add editorial voice on top of user content" as the move most likely to turn you from a protected host into a co-author. You accepted that exposure in D30 Q1 **while marks were private**. This changes that condition. Realistic downside is unchanged in kind: a demand letter from one of the ~28 records where a private business operates on a public site, not a judgment. D31's corrections still apply, most visible launches are public land with no possible plaintiff.

**There is also a shape contradiction to settle, because items 83 and 89 give incompatible instructions.** Item 83 v2 specifies a factual count ("Angeline · 6 reports"). Item 89 says "nothing that lets two bylines be compared." **Two counts in one review list are a comparison.** Both cannot hold.

- **(a) [recommended] Header only, defer the byline.** Already shipped, no terms change, no retroactivity problem, no posture change. Item 83 staged the public half at 25 reviewing accounts; at 2 to 3 contributors today a byline mark would decorate a handful of reviews and buy no reputation. Revisit when there is a crowd for it to mean anything.
- **(b) Byline as a non-numeric qualifier**, the same word on every qualifying byline, no count and no tier, so nothing is comparable. Requires v1.4 and the `terms_version` gate, and accepts a smaller version of the D30 Q1 exposure.
- **(c) Byline as a count**, item 83's literal v2. Requires everything in (b), and you are choosing item 83's shape over item 89's no-comparison rule, knowingly.
- **(d) Engage a licensed attorney** on the combined host-versus-co-author and anti-SLAPP question, answering D30 Q1, D31 and this at once.

Gates: web/components/ReviewsSection.tsx (byline render), web/app/contributor-terms/page.tsx, docs/legal/ugc-contributor-terms.md, web/lib/reviews/validation.ts, web/components/ReviewForm.tsx

Answer: (owner, 2026-07-22, on the Answer line) **(a)** header only, defer the byline. The self-visible header mark (item 89) stays; the public-byline mark is NOT built. This keeps Contributor Terms s2.5 true, avoids the retroactive-consent and host-vs-co-author exposure, and matches item 83's staging (public standing waits for a real contributor crowd). Revisit at 25+ reviewing accounts with a fresh gate, per item 89's v2 note.

## D33 [RESOLVED] 2026-07-22 · Item 93: the trip-planner demand test needs your pre-registered rule and two forks

Item 93 (fake-door button that measures interest in the AI trip planner) is ready to build, but its own acceptance requires two things that are yours by design, not mine to invent, so it is blocked until you answer. I built nothing yet; each choice below has a RECOMMENDED default so you can reply "D33: defaults" and I ship to them.

**1. The pre-registered decision rule (required before it can go live).** The item is explicit: the rule must be written down BEFORE the test runs, or the number just gets rationalised afterward, and the whole value is that YOU commit to it. In absolute counts (not rates: at ~31 DAU a percentage swings on single-digit noise), over the test window:
- **RECOMMENDED:** BUILD/scope it if at least **5 distinct people** tap the button AND at least **3 of them tap on 2+ different days** (the item's "repeat taps by the same person on different days" signal, the only one that means real want). RUN LONGER if there is click interest but no repeat-day tappers. KILL if fewer than ~5 distinct tappers total. Adjust any number.

**2. Expiry (required, so the fake door is a test and not permanent dishonesty).**
- **RECOMMENDED:** whichever comes first, **400 impressions or 21 days**. Then it auto-hides pending your read.

**3. Email capture, or a pure count?** The item leaves this to you. Email-leave rate is the strongest signal, but collecting emails is a new data-collection purpose (privacy-policy update, a store for them, a wider lawyer gate).
- **RECOMMENDED: pure count for v1.** It ships now with no new PII collection and a narrow copy-only lawyer gate. If v1 clears your bar, email capture becomes a fast v1.5. (Choose email now only if you want the stronger signal from the first run and accept the privacy/collection work.)

**4. Placement.** Recommend one fixed spot, held for the whole window (moving it mid-test destroys comparability).
- **RECOMMENDED:** in the spot sheet, near the conditions panel, so nearly every spot-opener sees it and the denominator is real. Web only (native is gated on Apple enrollment, item 72, and has no users to measure).

Not up for grabs (item + house rules): no price shown in v1; honest "not built yet" label before the tap; no fake progress and no implied safety judgement; dwell-gated impression + click + outcome events; kill switch, no A/B; a `lawyer` gate on the copy (and on email capture if you pick it).

Answer: (owner, 2026-07-22, in chat) **Accept the defaults EXCEPT the decision rule.** Pure count (no email capture), spot-sheet placement near conditions, web only, and the expiry (400 impressions or 21 days) all stand. **No pre-registered build/kill/run-longer rule**, the owner will judge the numbers manually. The expiry is retained, so the fake door still self-terminates rather than becoming permanent; the owner reads the result and decides by eye.

## D34 [RESOLVED] 2026-07-23 · Retention is bet on a push loop that cannot work at this scale; re-baseline onto the pull channel?

**This came from the strategy pass, and it is the one finding both the ceo and product-visionary agents reached independently, from different angles, same conclusion. Filing it as your decision, not acting on the big moves without you.**

**The claim.** The roadmap's #1 retention bet is the enrollment loop (save, install, then email/push a calm-window alert), per the vision at ROADMAP line 8 ("own a low-friction reliable channel to re-reach users, email first, PWA push second"). Two things are now clear from the data:

1. **A notification loop is the wrong mechanism for the failure it targets.** The failure is that people do not return even once (~83% one-and-done, W1 ~16%). You cannot notify someone into a *first* return, an opt-in only pays off for users who already come back. And in a flat, capped market (owner-confirmed, `reports/market-research-tam-2026-07-09.md`) acquisition will never scale the denominator a ~2%-conversion channel needs to matter.

2. **The milestone the whole backlog is sequenced behind cannot arrive.** Everything downstream (more retention vs UGC vs monetization) is gated on the "early-August durable retention read." That read is keyed to an enrolled ex-owner cohort that does not exist and is barely growing: `reports/analytics-2026-07-18.md` shows 44 saves, 82 prompts, **1 push grant, 3 email submits, 0 confirms**, at ~1 enrollment / 8 days. With no A/B under DAU 100 (DAU ~31) the funnel cannot be tuned to significance, so a readable non-owner cohort is a year-plus out, not August. The date was set assuming enrollment would grow. It did not.

3. **The retention behavior that IS working and IS measurable is being under-weighted.** The one validated repeated action is the PULL cold-open conditions re-check: no save, no install, no permission grant, ~86% conditions engagement per open (genuine, survives the item-42 re-cut), reaching returning users directly. Item 26 shipped the device-history strip; item 61 (cold-open "good to paddle today" ranked surface) extends it to first-timers.

**What I already did under this pass (reversible):** promoted **item 61 to [ready]**. It is the pull-first retention surface both agents named, is build-ready with no owner decision, and gives the dry build queue a genuinely aligned item to work on regardless of how you rule below.

**What I did NOT do without you (the bigger, harder-to-reverse moves):** reword the vision at ROADMAP line 8, park item 117 (weekend digest, a second enrollment-gated channel), or un-gate the UGC/monetization decisions (e.g. item 133) from the August push read. Those are yours.

**Your call. Options (answer on the line, or edit freely):**
- **(a) Full re-baseline.** Re-key the retention decision onto the pull metric (distinct days a device fires `conditions_viewed` / `recent_spot_clicked`, already instrumented), promote pull surfaces (61 done, sequence 111/114 next), demote further alert-enrollment iteration, reword line 8 to cast push as an enhancer for the already-habitual few, park item 117, and gate UGC/monetization on pull-return signal instead of the August read.
- **(b) Partial.** Adopt the pull metric as the retention read and keep 61 promoted, but leave push/email in place as-is and do not park 117 yet. Lowest-regret.
- **(c) Hold.** Keep the current push-first sequencing and the August read as the gate; revert 61 to [proposed] if you disagree with the promotion.
- **(d) Something else / discuss.**

My recommendation: **(a)**, or **(b)** if you want to move the measurement without touching the push build yet. The evidence for "the push read can't come" is airtight; the only inference is that enrollment won't self-accelerate, which 8 weeks of flat ~2% supports.

Answer: (owner, 2026-07-23, in chat) **(a), REVISED to build both tracks in parallel, pull prioritized.** Prioritize building the pull features that optimize 2nd-time visits, AND keep building the push engine. So this is NOT the "demote push / park 117 / recast push as enhancer" version of (a): push stays a live build track, item 117 is NOT parked. What holds from (a): pull-first priority for retention, and the near-term retention signal we watch is the PULL metric (distinct days a device fires `conditions_viewed` / `recent_spot_clicked`), which is measurable now, while the push read stays the push track's own metric.

Actioned this pass:
- **Pull track (priority):** item 61 (cold-open ranked surface) already [in-progress]; promoted item 8 ("go here instead" nearby calmer alternative) to [ready]. These are the two pull, 2nd-visit features (item 61's own text pairs 61 + 8 as one epic). Their "sequence after the retention read" deferrals are lifted by this decision.
- **Push track (parallel, keep building):** item 117 (weekend digest) stays [proposed] as a push-channel item, not parked; existing alert-loop work continues.
- Not touched (separate decision): UGC/monetization gating, and native (D35).

## D35 [RESOLVED] 2026-07-23 · Native iOS is accruing parity debt for zero users; commit to enrollment, or freeze it?

**Second strategy pass, and again both the ceo and product-visionary agents reached this same finding independently. It is orthogonal to D34 (D34 is which web retention channel; this is whether native should consume build slots at all right now).**

**The claim.** The native iOS app (item 72, built 2026-07-19) is not a shipping product, it is a growing liability. It reaches zero users and has no release date, because launch is gated on five owner-only steps unmoved since 2026-07-19: the push migration `20260719_native_push.sql` unapplied, the M5 backend committed but undeployed, `eas init` not run, `EXPO_PUBLIC_POSTHOG_KEY` unset, and Apple Developer enrollment (paid, the long pole at ~1-2 weeks) not started. Meanwhile the studio keeps spending on native parity: item 122 already consumed a full build slot (commit 889d772), and 135/133/132/80 are queued, each stamped "ships with next EAS build" and "must be resolved before the first TestFlight." Every web change now spawns a native shadow item by construction (135 exists only because item 100's web ship did not propagate), so the parity queue never closes.

**Why it matters in a flat market.** Every existing user is on web. In a capped market the only levers are depth and monetization per existing user, and a native-parity slot is a slot not spent on the live web pull surface (item 61, in-progress) or the demand probe (item 93). Keeping a zero-user app in lockstep with a moving web app is unbounded work for no realizable value until an owner action that has sat undone for four days.

**Your call. Options (answer on the line):**
- **(a) Commit to native.** You take the five steps (Apple enrollment first, it gates real push and any external tester). Then the parity ledger (80/132/133/135) gets cleared in one focused sweep before TestFlight. Native becomes a real surface worth keeping in sync.
- **(b) Freeze native.** Consolidate 80/132/133/135 and any future native twin under a single `[blocked(apple-enrollment)]` gate, stop grading native-parity items `[ready]`, and accept deliberate bounded drift: re-sync parity in one batch pass AFTER enrollment, not continuously before it. Frees the queue for web depth/monetization now.
- **(c) Shelve native indefinitely.** Same as freeze, but you're signalling native is not happening this quarter at all, so even the batch re-sync is off until further notice.

Until you answer, this loop will not promote any native item to `[ready]` (already its guardrail), and I'd recommend the build loop not pick native parity up either. My recommendation: **(b)**, freeze. The parity debt is only owed if native ships, and buying it now pre-pays for optionality you have not committed to. One line, "I'll enroll by X" or "freeze native", collapses the ambiguity and stops the leak.

Answer: (owner, 2026-07-23, in chat) **(a) COMMIT to native.** Native ships; parity is real work to finish. Per this option, the parity ledger is cleared in ONE focused sweep BEFORE TestFlight, not piecemeal now (piecemeal re-drifts, since web keeps moving). So:

**The critical path is now five owner/gated enablement steps, not code.** These are the actual blockers, and all are yours or owner-gated (I can prep/stage, but cannot create accounts, enter payment, hold secrets, or touch the Supabase dashboard):
1. Apply the Supabase push migration `20260719_native_push.sql` in the SQL editor. Must land BEFORE the M5 deploy, or the crons 500 on the new columns.
2. Approve + run the M5 backend deploy (`vercel --prod --yes --cwd web`); it is predeploy-gate-blocked as a push surface. I can run it once you approve AND step 1 is done.
3. `eas init` (needs a free Expo account) for a projectId.
4. Set `EXPO_PUBLIC_POSTHOG_KEY` in `native/.env`.
5. Apple Developer Program enrollment (paid, ~1-2 week latency). The long pole; gates real APNs + universal links + any TestFlight tester. Start this first.

**Roadmap encoding:** items 80/132/133/135 moved [proposed] -> [blocked(apple-enrollment)] as the single pre-TestFlight native parity sweep. They un-gate together once enrollment is done and the app is TestFlight-bound; then they are built as one batch (re-syncing to whatever web looks like at that moment), not one-per-pass. Until then the studio keeps prioritizing the web pull track (items 61 in-progress, 8 + 104 ready). This loop continues to hold native items out of [ready] until enrollment lands, now for a scheduling reason (batch before TestFlight) rather than an undecided-strategy one.

Tell me when you have done step 5 (or want me to run step 2 after you do step 1), and I will sweep the parity batch.

## D36 [OPEN] 2026-07-23 · Monetization is the one lever never tested, and we are testing the wrong bet first

**Third strategy pass, third independent convergence: the ceo and product-visionary agents both, separately, landed on monetization as the unwatched lever. It is orthogonal to D34 (retention) and D35 (native), both now resolved.**

**The claim.** The load-bearing business assumption, that someone pays, is exactly as unvalidated today as on day one, and the two ways it might get tested are both aimed wrong:

1. **The probes can't return a pay signal.** PaddlePass ($35/yr, ROADMAP line 33) has never shown a price to a single user. Item 93 (the live trip-planner fake door) by its own spec measures "curiosity, not demand, and nowhere near willingness to pay," mandates "no price shown," and its build/kill rule was removed (D33), so it won't even force a curiosity verdict. Zero revenue, ~31 DAU, 83.3% one-and-done (`reports/analytics-2026-07-18.md`).

2. **We are testing the retention-DEPENDENT bet and deferring the retention-INDEPENDENT one.** Item 93 (AI trip planner) is native-gated, unbuilt, safety-laden, and its value accrues to engaged, retained paddlers, the cohort we mostly don't have. Item 116 (rentals/lessons lead-gen) is the opposite: it monetizes a SINGLE visit, from the exact 83% one-and-done cohort a subscription or planner can never reach, and the vision itself says local commerce "may out-earn the subscription" (line 21). Yet item 116 is [proposed], and its own grade couples it to "retention is proven", a gate it does not actually depend on. That coupling is backwards.

3. **The deferral gate is undefined and maybe unreachable.** "Revisit once retention is proven" has no threshold, and the durable retention read is blocked at this DAU (per D34). So the monetization question can be deferred forever by construction. Meanwhile the money-shape is already known to be thin: TAM report puts a Bay-only subscription ceiling at ~$25-50K/yr and says plainly "expansion unlocks TAM, not price." The owner will want that ceiling number before funding another quarter of retention polish, because it decides whether geographic expansion should resequence ahead of deeper retention.

**Not "monetize now."** Selling into an 83%-leak base is premature and the retention-first sequence is right. This is about testing cheaply and bounding the deferral.

**Your call (answer on the line):**
- **(a) Run the rentals/lessons fake door now, AND bound the deferral.** Stand up a "rentals & lessons nearby" fake door on the spot sheet (decoupled from the retention gate), reusing item 93's proven pattern exactly: dwell-gated impression + click, one fixed placement, kill switch, honest "not built yet" label, no price, no new PII, lawyer gate on the copy. It answers what item 93 cannot: does a one-and-done visitor act on a nearby-commerce prompt, i.e. is there a revenue floor that survives the leaky bucket. Separately, write the single trigger (a concrete return-rate + DAU floor, or a date) that ends the subscription deferral and pre-commit the cheapest willingness-to-pay probe for when it trips. Only measurement moves up; no feature build, so no competition with items 61/8/136.
- **(b) Run the rentals fake door now; leave the subscription deferral as-is.** The cheap retention-independent signal, without committing to a subscription trigger yet.
- **(c) Just bound the deferral trigger; do not run the rentals door yet.** Governance only.
- **(d) Hold. Monetization stays fully deferred, no change.** Defensible if you are content to not know the revenue ceiling for another quarter.

My recommendation: **(a)**, or **(b)** if you want the signal without the governance ceremony. The rentals fake door is the highest-value cheap move on the board right now: it is retention-independent, aimed at the majority cohort, near-free (a fake door, not a build), and it is the one revenue thesis with literally zero signal. If you pick (a) or (b), I will file the fake-door as a build-ready item (with the lawyer-gate + no-PII constraints baked in) and decouple item 116's demand test from the retention gate.

Answer:
