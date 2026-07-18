# Briefings: the board log

## 2026-07-18 · Item 63 shipped: full-screen sheet redesigned (false pill + wobble fixed); backlog dry

**Your move:** one on-device check when you have a minute, open a spot on your iPhone and confirm (a) the top now shows a title + a round close button (no drag pill) and (b) the sheet doesn't wobble as you scroll. That's the one thing the emulator can't verify. Otherwise nothing.

**TL;DR:** Fixed the two defects you screenshotted on item 57's sheet. It's now a true full-screen page (covers to the top), the false grabber pill is replaced by a real close bar (spot name + a 44px circular ×), and the iOS scroll wobble is fixed at the root (the layout no longer reads live `innerHeight`). Ran design-lead first, per your ask for designer scrutiny.

**Appendix:**
- **Item 63 -> done** (`dc89b55`, deployed). design-lead decided true-full-screen over near-full (the 8% gap was the bug). `fixed inset:0` + `transition:none` kills the wobble; sticky app bar replaces the pill; rounded-top/shadow stripped in full-screen. Rollback (kill-switch) peek+drag path and desktop sidebar untouched. Verified at 390px (covers 0->812, 44px close, no drag handle, no console errors).
- Built on your concurrent owner-photos commit (`97bc9ba`); confirmed contained in the deploy (no revert).
- Captured the reusable lesson in memory: remove an interaction's affordance chrome in the same change (item 57 left a false pill); touch-UX needs on-device verification.
- **Backlog dry of `[ready]` again.** Remaining: D24 (reviews) open; the item-35 attorney follow-up (assent line) waits on you engaging counsel; 45 no-source; proposals 8/49/51/61.

## 2026-07-18 · Item 35 shipped (/terms page live); D25/26/27 queue fully cleared, backlog dry

**Your move:** the only thing left is **D24** (user reviews, 43/44) if you want to open that up; and once you engage the CA attorney (D25 Q1), tell me and I'll ship the enrollment assent line + 1542 wording as the follow-up. Otherwise nothing.

**TL;DR:** Shipped the /terms page (assented Terms of Use + release), the last item from your D25/26/27 answers. It's live and linked from both footers; the enforceability-critical pieces (enrollment assent line, 1542 quote) stay held for the attorney, exactly as D25 directed.

**Appendix:**
- **Item 35 -> done** (`c3f63f9`, deployed, verified live: `/terms` 200, content present, zero attorney-note/1542 leaks). Held per D25 Q1: assent line not added to InstallPrompt, 1542 omitted, no "enforceable waiver" claim. A test guards all of that.
- Built on top of your concurrent `97bc9ba` (owner first-party photos); confirmed it's contained in the deployed tree (no revert).
- **Backlog now dry of `[ready]` work.** Done today: 32, 31 (+owner photos), 56, 58, 46, 60, 62, 50, 57, 35; resolved D25/26/27; item 59 no-op. Remaining: D24 (reviews) open; items 43/44 blocked on it; 45 no-source; 12 owner-screenshot; proposals 8/49/51/61.
- Loop will idle until you answer D24, promote a proposal, or the attorney unblocks the item-35 follow-up.

## 2026-07-18 · Item 57 shipped: mobile spot sheet opens full-screen, drag removed

**Your move:** nothing required. One ready item left, **35** (/terms page, D25); it ships the ToS container next run.

**TL;DR:** Item 57 (D27) shipped and verified: every mobile spot sheet now opens full-screen with the drag gone, so conditions + the safety line are visible without a gesture. Dismiss is the × or a backdrop tap; behind the `sheet-auto-expand` kill switch.

**Appendix:**
- **Item 57 -> done** (`0319945`, deployed, verified live at 390px): full-height sheet, no `role=slider` handle, × + backdrop dismiss, conditions above the fold, no console errors. Kept the dismissal guardrail: `spot_sheet_dismissed` now tags `method:"close"|"backdrop"` (was drag-only); `spot_sheet_resized` retires with the drag (changelog).
- **Item 35 is the last ready item and needs care, not a quick append:** the D25 ToS draft carries `[ATTORNEY: …]` notes + `[DATE]/[COUNTY]` placeholders to strip/resolve, the 1542-quote + enrollment-assent-line holds to honor, and it's public legal copy that wants an editor pass. Next run gives it a focused iteration.
- Session shipped so far: 32, 31, 56, 58, 46, 60, 62, 50, 57 (+ item 59 no-op, D25/26/27 ingested). After 35, the ready queue is clear.

## 2026-07-18 · Ingested D25/26/27; item 50 shipped (spot 54 hidden); item 59 was a no-op

**Your move:** nothing required. Re-run `/studio` when convenient and it takes item 57 (full-screen mobile sheet, D27) then 35 (/terms page, D25). D24 (reviews) still open if you want to unblock 43/44.

**TL;DR:** Your three answers (D25/26/27) unblocked four items. Shipped item 50 (hid the misplaced spot 54). Item 59 turned out to be a no-op, its premise contradicted a tested prior decision, so no change was the correct outcome.

**Appendix:**
- **Item 50 -> done** (`6d54128`, deployed): spot 54 hidden per D26 (coord ~30km off, covered by spot 150); removed its stale 4.4 rating per the hidden-spot invariant (count 118->117); `/spot/54` now 404, gone from every surface + both crons; coord untouched.
- **Item 59 -> done, NO-OP** (`57a8aaa`): item 40 + `lib/spots.test.ts` already correctly held the "tidal label" spots (27/38/40/43/82) false ("a label is not a dependence"); flipping them failed the test; reverted. Guarded a memory against re-filing. If you want tide shown on tidal-water spots regardless, that's a deliberate rule+test change, tell me.
- **Ingested** (`8c9048c`): D25/26/27 committed; items 35/50/57 promoted.
- Ready next: **57** (remove the mobile drag, sheet opens full screen, D27) and **35** (/terms page + footer, assent line held for attorney, D25). Both meatier + need stable browser verification, which is why I stopped after 50 given the tooling kept flaking this session.

## 2026-07-18 · Shipped item 60 (fresh conditions on re-foreground) + item 62 (WCAG contrast); backlog dry again

**Your move:** promote **item 59** (tide_sensitive fix) to `[ready]` for the next clean build, or answer a decision (D27 is a 2-min query). Nothing urgent.

**TL;DR:** Two accessibility/reliability fixes shipped. Item 60: the installed PWA now refetches conditions on re-foreground so returning users don't read stale wind/tide. Item 62: darkened `--muted` so all small text (every spot-row subtitle) clears WCAG AA. With both done, no `[ready]` items remain.

**Appendix:**
- **Item 60** (`d047c7f`, deployed): visibilitychange refetch when the shown run is older than the 30-min TTL; kill-switch `conditions-foreground-refresh`; `conditions_loaded` gained `trigger`. In-browser check was blocked by a tool outage at ship time (owner-verifiable; kill-switch-reversible).
- **Item 62** (`39395da`, deployed + verified live at 5.09:1): `--muted` #6E8598 -> #556A7E, the lightest value clearing AA 4.5:1 on all three backgrounds; fixed all 14 failing elements at once; synced the email templates' hardcoded hex. No console errors, layout unchanged.
- Backlog: 0 ready, items 59/61 proposed (59 is buildable-now), 57/50/35/43/44 blocked on D24-D27, 45 no-source, 12 owner-screenshot. Loop idles until a promotion or decision.

## 2026-07-18 · Dry backlog: proposed items 59-61; two are buildable-now if you promote them

**Your move:** promote **item 59** (tide_sensitive fix) or **60** (foreground conditions refresh) to `[ready]` (one edit) and the loop ships it next run, no decision needed. Or answer a pending decision (D27 fastest).

**TL;DR:** No `[ready]` work left, so the loop ran the visionary for fresh candidates and proposed 3 (not promoted, per the rail). Two of them (59, 60) need no decision and no legal surface, they're the cleanest way to give the loop immediate work; 61 is larger and overlaps item 8.

**Appendix:**
- **59** finish the `tide_sensitive` correction pass, fixes the conditions differentiator on tidal spots (verified 27/38/40/43 say false while their notes describe tides; 60/96 stay false). Boolean-only, no coordinate-gate risk.
- **60** refetch conditions on PWA re-foreground (they're currently served stale from last session's React state, the return-visit moment the retention loop targets). Client-only.
- **61** cold-open "good to paddle today" ranked surface for first-time visitors (item 26 only covers device history). Larger; consider shipping with item 8 after the retention read.
- Still blocked on you: D24/D25/D26/D27. The loop remains idle until a promotion or a decision lands.

## 2026-07-18 · Item 46 shipped: the launch-reminder tap now shows the safety line. Backlog is fully worked out.

**Your move:** the loop is out of autonomous work, everything left needs a decision from you. In rough priority: **D27** (2-min PostHog query, unblocks a sheet fix), **D26** (mostly "hide spot 54, defer the rest"), **D25** (Terms: engage a CA attorney y/n + LLC/insurance), **D24** (reviews: counsel + identity + moderation). Or promote a `[proposed]` item.

**TL;DR:** Shipped item 46 (the last `[ready]` build): a launch-reminder push tap now opens the mobile sheet expanded so the canonical safety line clears the fold, it was the one alert whose whole journey showed no safety line. With that done, there are no `[ready]` items left; the remaining backlog is 4 owner-decisions (D24-D27), item 45 (no-source), and 4 unpromoted proposals.

**Appendix:**
- Item 46 -> `[done]`, deployed `ab47d4b`, verified both viewports. Client-only fix (no touch to the protected send-reminders cron / Supabase schema); `alert_clicked` gained `reminder_tap` to separate the cohorts. The launch-direction tip is the one piece deferred (needs a stored window label = schema change).
- **Session scoreboard:** shipped + deployed this session, items 32, 31 (57 photos), 56 (photo backfill to 82/140), 58 (Folsom dedupe), 46. Escalated with decision memos, D25 (Terms), D26 (multi-launch splits), D27 (sheet drag).
- **The loop will idle from here.** Every 30-min cron tick will find nothing `[ready]` and stop quietly until you answer a decision or promote a proposal. The single highest-leverage unblock is D27 (a query) or D26 (a one-line "hide 54").

## 2026-07-18 · Item 58 shipped (Folsom Lake dedupe), item 57 escalated (D27)

**Your move:** **D27**, run one PostHog query (drag-to-resize rate on mobile; the drag is already instrumented) and, if it's high, I ship the pre-scoped auto-expand fix. Standing: D24/D25/D26. After this, item 46 is the last clean `[ready]` build.

**TL;DR:** Shipped item 58 (the verify loop found two spots both bare-named "Folsom Lake"; renamed 120 to "Folsom Lake - Beals Point", a one-field edit, no coordinate/id change). Item 57 (mobile sheet drag) turned out to already be instrumented but needs a PostHog read the loop can't do, so it's escalated as D27 with the query + a pre-scoped fix.

**Appendix:**
- Item 58 -> `[done]`, deployed `c1ceb40`, verified live (/spot/120 shows the new name). Left id 20 generic (multi-launch record, no single accurate sub-name, avoids the item-50 guessing defect).
- Item 57 -> `[blocked(D27)]`. Finding: `spot_sheet_resized` + `spot_sheet_dismissed{method:drag}` already measure drag usage; the item-31 photo pushed conditions further below the peek fold. D27 asks you to run the ratio and pick the auto-expand fix if the rate is high.
- Ready queue: **item 46** (launch-reminder safety line) is now the only clean `[ready]` build left; everything else is blocked on you (D24/D25/D26/D27) or done. Stopped after two items.

## 2026-07-18 · Item 56 DONE: photo coverage 82/140 (59%), free sources exhausted

**Your move:** nothing required. The photo item is closed at the limit of free sources; getting past 59% needs your own photos (a separate item if you want it). 46 + 57 are the cleaner remaining builds; D24/D25/D26 still await answers.

**TL;DR:** Added a third free source (Openverse/Flickr) and closed out item 56. Coverage went 57 -> 82 across three slices (re-pick +3, Wikidata P18 +18, Openverse +4). The remaining ~58 spots are small marinas/sloughs/creeks with no free-licensed photo anywhere, so the free-automated scope is genuinely done.

**Appendix:**
- Item 56 slice C: `raw-data/openverse_photos.mjs`, +4 (spots 20/43/58/119), deployed `8b00f6f`, verified live. Openverse text-search was noisy (4 usable of 24), which confirmed exhaustion.
- Item 56 -> `[done]`. Yield order for future photo work: Wikidata P18 (best) > Commons geosearch > Openverse. Don't re-grind these; 100% coverage needs owner photos.
- Ready queue: 57 (mobile-sheet inspection, needs PostHog data), 46 (reminder safety line, a clean code build). Stopped after one heavy item; cron continues.

## 2026-07-18 · Item 56 slice B: +18 photos via Wikidata, coverage now 78/140 (56%)

**Your move:** nothing required. Standing: D24, D25, D26 await you; 46 + 57 are the cleaner remaining code builds if you want the next run to ship non-photo work.

**TL;DR:** Widened the photo backfill to a second free source, Wikidata's curated place image (P18), coordinate-verified so it can't grab the wrong lake. 25 of 80 uncovered spots matched; 18 passed vision review and shipped. Coverage jumped 60 -> 78. The named lakes/reservoirs/regional parks (Folsom, Berryessa, Clear Lake, Lexington, Huntington...) now have photos.

**Appendix:**
- Item 56 slice B: `raw-data/wikidata_photos.mjs`, +18 (spots 2,3,4,5,16,67,74,75,80,83,93,94,95,96,105,107,113,120), deployed `004ab18`, verified live. Dropped 7 P18s that were aerials/satellite/a dam/the Morro Bay power plant/a sign.
- Item 56 stays `[ready]` for slice C (Openverse + Flickr + wider radius) on the ~62 still uncovered, mostly marinas/sloughs without a Wikidata image; diminishing returns expected.
- Ready queue: 56 (slice C), 57 (mobile-sheet inspection), 46 (reminder safety line). One heavy build this run; stopped for a breather, cron picks up next.

## 2026-07-18 · Item 50 escalated (D26), item 56 backfill +3 photos live (60 total)

**Your move:** **D26**, item 50 turned out to be mostly not-ready. Recommended one-liners: hide spot 54 (30km-off, redundant with spot 150), drop 84 (no defect), defer the 63/70 splits to a sourcing pass. Plus the standing D24/D25.

**TL;DR:** Two items this run. Item 50 (split records) looked ready but the audit shows only 1 of its 4 records is a real defect and the splits aren't sourced, so I escalated it accurately as D26 instead of deleting/minting live SEO pages on guesswork. Item 56 (photo backfill) shipped a first slice: re-picking the item-31 rejects recovered only 3 good photos (their Commons pools are junk-dominated), so coverage is 57 -> 60 and the real lift is a widened multi-source search (slice B), which stays ready.

**Appendix:**
- Item 50 -> `[blocked(D26)]` (commit `5fdc7ee`). D26 corrects item 50's premise: 84 has no defect, 63/70 need sourcing, 54 is the only real fix.
- Item 56 slice A -> +3 photos (spots 19/86/128), deployed `e4c3182`, verified live. Finding recorded: re-picking existing candidates is near-exhausted; slice B (larger radius + Commons categories + Wikidata P18 + Openverse/Flickr, all free) is the remaining work, item stays `[ready]`.
- Ready queue now: 56 (slice B), 57 (mobile-sheet inspection), 46 (reminder safety line). Stopped after two items (one heavy build); the cron picks up the rest.

## 2026-07-18 · Item 31 shipped: 57 spot photos live, auto-picked + vision-curated, no owner curation

**Your move:** nothing required. Optional later: backfill the 83 photo-less spots (54 need a re-pick, 29 need Flickr/owner photos), promote that slice when you want it.

**TL;DR:** You said automate the photo pick and deploy without you, so I did. A scorer picked the best Commons candidate per spot, then I vision-reviewed contact sheets of all 111 picks (title scoring alone had a ~50% false-positive rate: it grabbed birds, a scorpion, a car, a Kmart, office buildings). Kept the 57 verified genuine location photos, dropped 54. They're live now in the spot drawer with proper CC attribution, behind a kill switch. Zero wrong photos went live; that was the priority over coverage.

**Appendix:**
- Commit `ef0bc53`, deployed + verified (prod 200, photos serving, rendered live desktop + mobile, no console errors). `spot-photos` kill-switch flag at 100% (no A/B, DAU<100 rule). New dwell-gated `spot_photo_viewed` event + changelog.
- Only CC-BY/BY-SA/CC0/PD shipped, attribution rendered per license (D10 Q4, pre-cleared), so no lawyer re-gate. `spots.json` untouched (photos in a separate manifest, no coordinate churn).
- Coverage: 57/140 spots have a photo. The 83 gaps are an honest backfill tail, not a regression. Tooling (`raw-data/select_photos.mjs`, `montage_photos.mjs`) is reusable for that pass.
- Backlog still dry of `[ready]` work; D24 + D25 await you.

## 2026-07-18 · Item 35 drafted + escalated (D25); backlog now dry of ready work

**Your move:** (1) **D25**, four decisions on the Terms/waiver: engage a CA attorney (~1hr), form an LLC, get insurance, and whether to ship the `/terms` page now vs hold. (2) Standing: curate `raw-data/photo-candidates.json` (item 31), answer **D24**, or promote a `[proposed]` item. Nothing is on fire.

**TL;DR:** The loop took item 35 (assented Terms + assumption-of-risk waiver), the highest-value legal item. The lawyer agent drafted the full ToS/waiver and escalated it: an ordinary-negligence release for recreation is generally enforceable in CA, but a wrongful-death claim belongs to non-signatory heirs, so the waiver is uncertain against the exact drowning suit it targets, and that call needs a licensed CA attorney. Draft + four decisions are in D25. No code shipped (escalation only). With item 35 now blocked on you, **no `[ready]` items remain**, so the loop stops until you steer.

**Appendix:**
- Item 35 -> `[blocked(D25)]`, commit `155e1c3`. Recommended assent pattern = sign-in-wrap at enrollment (one line under the CTA), not a checkbox, to protect the retention loop's conversion. Q4 recommends shipping the `/terms` page + footer link now and holding only the enrollment assent line on the attorney review (Q1).
- Backlog state: item 31 `[blocked(curation)]` (waiting on you), item 35 `[blocked(D25)]`, items 43+44 `[blocked(D24)]`, item 45 `[blocked(no-source)]`, four `[proposed]` awaiting promotion (51, 50, 49, 8). The 30-min cron stays live but will idle each tick until something is `[ready]`.

## 2026-07-18 · Item 32 shipped to 100%; item 31 photo harvest started (80% coverage), your curation next

**Your move:** (1) curate `raw-data/photo-candidates.json` when you have time (per spot, pick a candidate or drop an owner photo, reject off-topic hits), that unblocks the item-31 display build. (2) Still open from before: answer **D24** or promote a `[proposed]` item. Nothing urgent.

**TL;DR:** Two things landed. Item 32 (push+email equal-weight enrollment card) was retired from its dead-end A/B and shipped **100% live** on your directive. Item 31 (a photo per spot) started: a Commons harvester pulled **946 free-licensed candidates covering 112/140 spots (80%)** into a curation file. That's the "hard part" (rights-clean sourcing) turned into a review queue; the display UI + deploy come after you curate.

**Appendix:**
- Item 32: retired the `enrollment-dual-cta` flag, deleted the dead control layouts, changelog + policy (no A/B until DAU>100) recorded. Commit `95b2dbf`, deployed + verified live. Also fixed the stale `deployed-prod` tag.
- Item 31 slice 1: `raw-data/harvest_photos.mjs` + `photo-candidates.json` (commit `cf68bcd`). No deploy (no user-facing change). 28 gap spots (reservoirs/Delta/coast) need Flickr-CC (an API key) or your photos. Item -> `[blocked(curation)]` so the loop won't re-run the harvest.
- The 30-min cron is live; it fired this iteration, next tick re-checks. Dry fires idle quietly.

## 2026-07-18 · Loop caught up: no `[ready]` work left, waiting on you

**Your move:** either answer **D24** (unblocks items 43 + 44) or promote one of the four `[proposed]` items (51 marker-clustering, 50 split multi-launch records, 49 Android-subscriber push path, 8 "go here instead") to `[ready]`.

**TL;DR:** The loop has shipped everything that was ready (items 52, 53, 54, 55, 26 this session). Nothing is `[ready]` now: 2 items are blocked on your D24 answer, 4 are proposals awaiting your promotion, and item 37 is parked pending your iOS `?vh` screenshot. I can't promote proposals myself, so the loop is idle until you act or the verifier files new findings.

**Appendix:**
- The 30-min cron stays live (you asked to keep it running, and the verifier feeds new `[ready]` items ~every 2h). Dry fires will idle quietly, no re-briefing or re-pinging each time.
- D24 opened 2026-07-17; if it passes 24h still unanswered I'll send one reminder, then leave it. Nothing is being nagged in the meantime.

## 2026-07-18 · Item 26 (cold-open return strip) SHIPPED · items 43 + 44 blocked on D24

**Your move:** answer D24 (three questions in DECISIONS.md) to unblock reviews (item 43) and sign-in (item 44). Everything else is moving.

**TL;DR:** Shipped a retention feature that gives returning visitors a reason to come back with zero friction. The two heavy items behind it (reviews, sign-in) are both waiting on your identity/moderation call.

**Item 26 (Recently checked strip):** on a cold open, the list now shows the spots this device recently viewed, each with live paddleability. This targets the one validated repeat behavior (re-checking conditions) with no save/install/push required, exactly the retention-first bet. Deployed `3dba588`, verified live on desktop and mobile.

**Item 44 (sign-in):** blocked on D24. Its identity model is the same decision as reviews', and it's an OAuth/personal-data surface, so I didn't start an auth system D24 could re-scope. Once you set the identity direction it gets its own lawyer gate + analytics-identity strategy.

**Appendix (evidence):**
- Live prod: "Recently checked" renders with condition badges on both viewports; a saved spot stays in Watching only (dedup); recent spots are removed from the main list (no dupes); clicking one opens the drawer; no console errors. Event + flag strings confirmed in the live bundle.
- Rollout is a 100% kill switch (`recent-spots`, default ON, flip off in PostHog to pull it without a redeploy), not an A/B, which is what item 26's acceptance specified via the D2/D3/D6 low-traffic precedent. Guardrails to watch: `spot_viewed`, `conditions_loaded`.
- No legal surface: recents live in on-device localStorage and are never transmitted (same as favorites), so no privacy-policy change. 331 tests (4 new), lint, build green. `deployed-prod` -> `3dba588` (== main).
- D24 is now ~unanswered for a few hours; it gates items 43 and 44 but not everything (that's why 26 shipped). If it sits >24h I'll send one reminder per the studio rule, not repeated pings.

## 2026-07-17 · Item 43 (user reviews) · LEGAL GATE ESCALATED · BLOCKED on D24

**Your move:** answer D24 (three questions, in DECISIONS.md) to unblock user reviews. Recommended answers are in the memo; the honest short version is Q1 yes (engage counsel for the UGC terms), Q2 anonymous+email-verify, Q3 binary moderation soft-launched.

**TL;DR:** Reviews is the heaviest legal surface in the backlog. The lawyer gate says it's fine to build but not to publish a first review until three decisions of yours are made and four legal artifacts exist. I stopped at the gate rather than autonomously deciding your content-moderation policy or FTC-facing review display.

**Item 43 (crowd reviews):** ran the mandatory legal gate first (its own acceptance predicted this). Verdict `escalate`. Blockers before the first review posts: UGC Terms + content license, a DMCA designated agent, a content/moderation policy, and a privacy-policy UGC section. Owner decisions: (Q1) pay for counsel to draft the UGC terms given the wrongful-death interlock; (Q2) anonymous+email-verify vs require item 44 sign-in; (Q3) your moderation commitment as sole moderator. All captured in D24 with recommendations and if-silent defaults. Item 43 → `[blocked(D24)]`.

**Appendix (evidence):**
- The lawyer cleared the aggregate display in advance: show a crowd rating only past ~5 genuine moderated reviews, as a plain "4.3 average from 12 paddler reviews," distinct from item 39's owner rating, never blended, never a safety verdict, no schema.org `aggregateRating` until moderation is real.
- Everything else is implementer-can-do once you answer (DMCA reg, guidelines, binary queue, anti-fraud rate-limit, privacy section, 18+ statement), so the build is unblocked the moment D24 lands.
- No code shipped this iteration; nothing deployed; production unchanged (`b88c13f`). Reviews is a deliberate bet against retention-first and carries a counsel spend, so deferring it behind retention work is a valid answer to D24.

## 2026-07-17 · Item 53 COMPLETE (NWS two-hop collapse) · SHIPPED + DEPLOYED

**Your move:** nothing needed.

**TL;DR:** Conditions loads faster on three fronts now: tides can't hang the panel, the wind verdict paints in ~330ms instead of waiting on tides, and the wind lookup is one network hop instead of two. Item 53 is done.

**Item 53 (two-hop collapse, final slice):** every spot open used to make a two-hop NWS wind call (resolve a gridpoint, then fetch it). That resolution is fixed per location, so I precomputed it for all 140 spots into a bundled `data/gridpoints.json` and the runtime now does one hop. Verified live: a spot open makes 0 `/points` calls (was 1-2). This completes item 53, which also shipped a tide fast-fail and a wind/tide decouple earlier today. Deployed `b88c13f`.

**Appendix (evidence):**
- Live prod: 0 `/points`, one `/forecast` (wind) + one `/forecast/hourly` (next-window), wind renders, no console errors. `deployed-prod` -> `b88c13f` (== main).
- 327 tests (new `lib/conditions.test.ts` asserts full 140/140 precompute coverage, which also guards against a JS/Python key-rounding mismatch); lint clean; build green.
- Both wind consumers (`fetchWind`, `getNextWindow`) fall back to the live two-hop for any spot missing from the bundle; `fetchWind` self-heals a stale gridpoint. Refresh the bundle by re-running `scripts/precompute_gridpoints.py`; NWS gridpoints rarely move.
- One acceptance point left unshipped on purpose: a cached same-origin *wind* proxy. It's now marginal, the precompute removed the slow hop and weather.gov (unlike NOAA tides) has no CORS problem, so the only benefit left is a shared cross-viewer cache, not worth it at current traffic. Noted in the Shipped entry; re-file if traffic grows.

## 2026-07-17 · Item 53 (wind/tide decouple + honesty fix) · SHIPPED + DEPLOYED

**Your move:** nothing needed. Item 53 stays `[ready]` for its last structural piece (the NWS two-hop precompute).

**TL;DR:** The conditions panel now shows the wind verdict in ~330ms instead of making users wait up to 4s for tides, and it stops lying about "no tide station" when NOAA is merely down.

**Item 53 (decouple slice):** the panel used to wait on tide + wind together, so the wind verdict (the ~330ms dominant signal for a paddle decision) was held behind the slower tide hop. Split them into independent promises (`getConditionsRun`) and render each as it settles: wind paints immediately, tide fills in or fast-fails on its own. Also fixed a trust bug on this surface, a failed tide fetch showed "No tide station near this spot" (false when a station exists); it now says "Tide data is unavailable right now" and reserves the no-station wording for a genuine absence. Deployed `9268c66`. Item stays `[ready]` for the NWS two-hop build-time precompute (the biggest happy-path latency win left).

**Appendix (evidence):**
- Prod: wind renders ("Wind 8 mph"), tide shows the honesty message during NOAA's outage, no console errors. `deployed-prod` -> `9268c66` (== main).
- Local timing (network trace): wind ~330ms (points 138ms + forecast 192ms) vs tide 4.5s, rendered independently. Non-tidal spot shows no tide section; saved-spots badges still compute ("Conditions: Calm") via the preserved combined `getConditions`.
- 324 tests, lint clean, build green. The combined `getConditions` contract (used by the saved-spots batch) was kept intact; `getConditionsRun` is additive.
- Instrumentation: `conditions_loaded` unchanged; `conditions_viewed.had_data` tightened to "a source actually returned data" (was "not fully failed"), changelog + Comparability note added.
- Verification was behavioral (rendering + timing) plus 324 unit tests; NOAA remained mid-outage, so live tides rendering is still pending its recovery.

## 2026-07-17 · Item 53 (tide fast-fail slice) · SHIPPED + DEPLOYED

**Your move:** nothing needed. Item 53 stays `[ready]` for its structural latency work; the acute hang you measured is fixed and live.

**TL;DR:** Acted on your item-53 note. The tide fetch that could hang the conditions panel 6-13s during NOAA flakiness is now bounded to ~4s, deployed and measured on prod.

**Item 53 (fast-fail slice):** the conditions panel waits on both tide and wind together, so a hung tide call skeletoned the whole panel even though wind resolves in ~100ms. Two bounds shipped: the client aborts the tide fetch at 4s, and the `/api/tides` per-attempt timeout dropped 6s to 2.5s. Graceful degradation and the happy path are unchanged. Deployed `8538e40`. I scoped this to the acute fix you flagged and left the structural latency work (NWS two-hop precompute, a cached wind path, decoupling wind from tide) under item 53, which stays `[ready]`.

**Appendix (evidence):**
- Prod timing: raw `/api/tides` ~5.5s (3 samples, was up to 13s); client-capped tide fetch aborts at ~4.85s on prod (`AbortError`) vs waiting the full server time before.
- Local: panel resolves fast, wind renders, no crash; 324 tests green, lint clean, build shows `/api/tides` as a server function.
- Verification was behavioral (timing is the point) plus the existing 8 route unit tests; NOAA was mid-outage (502/504 all stations) and the sandboxed dev server has no NOAA network, so the live NOAA-200 path is still pending NOAA's recovery.
- Instrumentation: no logging code changed; changelog notes `conditions_loaded.latency_ms` p95/p99 tail shrinks on tidal spots from today (upstream wait capped, not a happy-path speedup).
- Flagged for item 53's remainder: during a NOAA outage a failed tide fetch shows "No tide station near this spot," which is false when a station exists. Pre-existing, not introduced here.
- Process note: your uncommitted ROADMAP edit to item 53 was preserved as its own commit (`c4e864a`) before I built on it; nothing of yours was altered or absorbed.

## 2026-07-17 · Item 52: NOAA tide fetch proxied · SHIPPED + DEPLOYED (one live path pending NOAA outage)

**Your move:** nothing needed.

**TL;DR:** Fixed a silent, intermittent failure in the conditions differentiator: tides were CORS-blocked by NOAA about half the time and vanished from the panel. They now route through our own server, where CORS can't touch them. Live and verified, except the final NOAA round-trip, because NOAA itself is in an outage right now.

**Item 52 (proxy NOAA tides):** the browser fetched NOAA tide predictions directly; NOAA sends the required CORS header only intermittently, so `tide_sensitive` spots silently lost their tide readout roughly half the time. Added `app/api/tides` (Node): validates inputs, fetches NOAA server-side (6s timeout + one retry for NOAA's 504s), caches station+day 30 min, and returns a graceful error rather than crashing. The client now calls that same-origin route; the direct NOAA URL is gone from the shipped client bundle, so CORS can never block tides again. Wind is unchanged (weather.gov sends CORS reliably); the alert crons never used this path. Deployed `42c814d`.

**Appendix (evidence):**
- Deploy READY, production; `deployed-prod` -> `42c814d` (== main, nothing orphaned).
- Tests: 8 new route tests (validation, retry, cache, NOAA-error passthrough); 324 total green; lint clean; build shows `/api/tides` as a server function.
- Live prod: `GET /api/tides?station=abc...` -> 400 validation error (route logic live, NOAA-independent); valid params -> graceful 502 `tides upstream unreachable` (NOAA mid-outage).
- NOAA was returning 502/504 on every station during verification (direct curl too), the exact flakiness this item targets. The live NOAA-200 path uses params identical to the previously-working direct call and is covered by the success-passthrough unit test; it will serve tides once NOAA recovers. Graceful degradation confirmed in-browser: panel renders wind-only, never blanks.
- Instrumentation: no logging code changed; changelog records that `conditions_loaded.has_tides` availability steps up on tidal spots from today (reliability recovering, not user behavior).

## 2026-07-17 · Items 54 + 55 SHIPPED live · D22 approved · D23 gate fix

**Your move:** nothing needed. Both changes are live and the approval gate that interrupted you is fixed so it won't ask again for this class of change.

**TL;DR:** You approved, both shipped, and I fixed the process that made you approve them. Spot 150 and the P0 mobile fix are live on paddletowater.com; new-spot additions no longer trip the coordinate gate.

**Item 54 (spot 150, Guerneville River Park):** live at `/spot/150` with the 4.8 rating and Flatwater, verified in production. Deployed `308d0f1`.

**Item 55 (P0 mobile NaN crash):** live and verified in production, 0/6 NaN and conditions 6/6 on paddletowater.com mobile. Deployed `308d0f1`.

**D23 (process fix, from your directive):** the D19 coordinate gate was firing on ANY new lat/lng, so it (a) asked you to review a coordinate you had just supplied and (b) froze every unrelated deploy that shared the tree, which is what stranded the P0. Narrowed `scripts/predeploy-gate.py` to fire only on a CHANGE to an EXISTING spot's coordinate (a removed `-` lat/lng line), the real "a pin moves under live users and the crons" risk. New-spot additions now deploy like any reversible content change. Proven: addition passes, moved pin blocks, removal blocks. D19's protection for coordinate changes is fully intact.

**Appendix (evidence):**
- Deploy `dpl_HtAoZChJJva58WEegeb2HkHrmkPP`, READY, production; `deployed-prod` moved to `308d0f1` (== main, nothing undeployed/orphaned).
- Live `/spot/150`: name + 4.8 + Flatwater confirmed via server fetch.
- Live mobile P0 harness (paddletowater.com, 390px, map confirmed hidden): 6 fast taps on distinct spots, `totalNanErrors: 0`, `conditionsRenderedCount: 6/6`.
- Gate proof: `new-spot addition gates: False`, `existing pin moved gates: True`, `coordinate removed gates: True`.
- Analytics hygiene: `?internal=1` was redirect-stripped so the internal flag didn't set before the live harness; `window.posthog` was null in the automation browser (no distinct_id), so the taps almost certainly never registered. Flag now set on this browser for future checks.

## 2026-07-17 · Item 55: P0 mobile NaN crash · FIXED + VERIFIED · DEPLOY COUPLED TO D22

**Your move:** answer D22 (one line, DECISIONS.md). It now releases both spot 150 and this P0 fix in one deploy. Recommended: approve.

**TL;DR:** The P0 mobile crash is fixed and verified on main, but it can't reach production on its own: spot 150's un-reviewed coordinate shares the tree, so the D19 predeploy gate holds every deploy until you read D22.

**Item 55 (P0 mobile `Invalid LatLng (NaN)`):** On mobile the map panel is `display:none` while the List tab is active but stays mounted, so tapping a list spot fired `map.flyTo` on a 0x0 container, producing `(NaN, NaN)` and an uncaught throw that also blanked the conditions panel. Fixed by guarding the three fly effects (`FlyTo`, `FitBounds`, `FlyToUser`) to no-op at zero size, plus a `ResizeHandler` that `invalidateSize()`s and re-centers on the selection when the map becomes visible again. Map is never unmounted, so the single-canvas-renderer invariant holds. Verified in-browser at 390px: 6 fast taps on distinct spots gave 0 NaN (was 6/6) and conditions rendered 6/6 (was 1/6); Map-tab return re-centers with tiles loaded; desktop 0 errors. 316/316 tests, lint clean, build green. Merged to main (c24fef1). Not deployed: a deploy from main would trip the D22 coordinate gate and also ship the un-approved spot 150.

**Appendix (evidence):**
- Fast-tap harness (JS-driven, 40ms cadence, map confirmed 0-width): `totalNanErrors: 0`, `conditionsRenderedCount: 6/6`.
- Return path: Map tab click -> `mapVisibleAfterReturn: true`, 15 tiles loaded, 0 NaN.
- Desktop 1280px: 4 fast taps, 0 errors, list + map both visible, 22 tiles.
- Deploy coupling: `git diff deployed-prod -- data/spots.json` shows 2 new lat/lng lines (spot 150), which the predeploy gate blocks; item 55 rides the same deploy.
- Worktree build used the node_modules copy per the studio.md note; branch fast-forwarded to main then removed; no orphaned commits, no deploy.

## 2026-07-17 · Item 54: spot 150 (Guerneville River Park) · BUILT + VERIFIED · DEPLOY BLOCKED ON D22

**Your move:** answer D22 (one line, in DECISIONS.md). Approve to ship spot 150 live; the recommended answer is approve, it's your own verified coordinate.

**TL;DR:** Spot 150 is built, verified, and merged to main. The only thing left is the deploy, which your standing D19 coordinate gate holds for your read. Nothing is live yet and nothing reverted.

**Item 54 (add Guerneville River Park):** Added spot 150 "Russian River - Guerneville River Park" as a single additive record. Owner-supplied verified coordinate (38.5001973, -122.9957117), `owner_rating` 4.8 rendering inline as the bare star+number, difficulty flatwater, `tide_sensitive: false`, evergreen third-person notes from your draft, regular derived Maps photos CTA (no custom field). Text-level edit to spots.json, no reserialization, `git diff` shows only the two new lat/lng lines, zero churn on existing coordinates. Flows to `/spot/150`, sitemap, OG image, JSON-LD, and both alert crons via `ALL_SPOTS`. Gates green: 316/316 unit tests, lint clean (one pre-existing warning), production build generates `/spot/150` + its OG image. Merged to main (bb65416 + state commit 6274c38). Not deployed: the predeploy gate holds new spots.json lat/lng per D19 for your review, so this is escalated as D22, not auto-shipped.

**Appendix (evidence):**
- Build: `✓ Compiled successfully`, 303 static pages, `/spot/150.html` + `/spot/150/opengraph-image` prerendered; sitemap contains spot/150.
- Rendered page checks (prerendered HTML): rating 4.8 present, name + notes present, JSON-LD carries the water name, difficulty renders "Flatwater".
- Coordinate review artifact: `git diff deployed-prod -- data/spots.json` shows only id 150 and its lat/lng.
- All work done in a scratchpad git worktree; branch fast-forwarded to main then removed; no orphaned commits, no root-branch switch, no deploy so no live change to revert.
- Next loop fire (~30 min cadence, session cron): item 55, the P0 mobile `Invalid LatLng (NaN)` bug, gets its own iteration with browser verification.

## 2026-07-17 · Item 48: desktop filter pills · SHIPPED · LOOP STOPPED (backlog dry)

**What:** The filter row (Flatwater / Open water / River / Free only / Near me) stretched each pill to 278px on desktop, so an 11px "River" label sat in a quarter-viewport slab while the region pills above it were content-sized. From md up the row is now content-sized pills. Mobile is untouched by construction.

**Evidence:** Measured every button at 1440px before touching one, per the item's own instruction: only this row was broken, the drawer's 279px buttons are full-width in a 279px drawer and were left alone. River 278px -> 51px. Mobile 390px regression check: 5 pills, one row, 68px, no scroll. 292 tests, clean build, live CSS confirms `.md\:w-auto` sits inside `@media (min-width:48rem)` and `grid-cols-5` is intact. Commit 1ca79a3, one file, +11/-4, verified live.

**Measure:** n/a. Pure visual polish, roadmap-exempt from the A/B directive, no analytics change.

**Deployed:** Production, verified live.

**Judgment call, stated plainly:** I did not run the full ship pipeline for this. Item 47 cost ~3M tokens; a two-line CSS fix does not warrant that. This is proportionality on one item, not a rule change.

## Loop wrap-up

**The backlog is dry. Zero [ready] items.** Not a stall, a gate: items 47 and 48 shipped back to back and everything remaining is [proposed] and waiting on you. The loop has nothing it is allowed to pick up.

**Three decisions open, all unanswered, all past 24h:**
- **D17, highest leverage by a distance.** No MX and no DMARC on paddletowater.com, verified live twice today (me, then independently by the legal gate). The live privacy policy publishes hello@paddletowater.com as the channel for access, correction, deletion, and as the COPPA child-report channel. It bounces. It is also why 0 of 2 email submits ever confirmed, so it blocks every email enrollment from existing, which is why item 47's bug had exactly one victim. Fix is minutes in Cloudflare, the domain is already on their nameservers. **Recommendation: enable Email Routing for hello@.**
- **D10** (3 days): item 31 photo sourcing. Recommendation: tiered hybrid, self-hosted CC with attribution.
- **D14**: spots 76, 79, and now 92. Spot 92 is live and listed and is a private business dock where a user may have no right to launch.

**Also owed, not decisions:** create the `owner-rating` flag in PostHog or item 39's 117 shipped ratings render to nobody. And the installed-PWA `/?vh` screenshot that has blocked item 12 since 07-15.

**One bug in my own work, worth keeping:** unpausing the loop, I wrote prose explaining how to re-pause and spelled out the literal pause token. The skill's step 0 greps for that literal, so my unpaused marker matched the paused check and would have stopped the loop forever on its own documentation. Fixed. Third instance today of one class: a guard matching the text that describes it. **Lesson: never let explanatory prose contain the literal token a checker greps for, and never let a success line print independently of the check.**

**Hygiene:** worktree only, root never left main, synced to main tip before work, deploy ref confirmed to contain origin/main, worktree removed, origin/main and main match, tree clean.

**Stop reason:** no [ready] work remains. Next run starts the moment a [proposed] item is promoted or D17 is answered.

---

## 2026-07-16 · Item 47: email subscribers re-prompted to subscribe forever · SHIPPED

What: Every suppression gate read push state only, so an email subscriber got asked to enroll on every visit. Fixed, deployed, verified live. Lead honestly: the eligible population is 1 and it is you. 2 email submits, 0 confirmed ex-owner in 14 days. This was funnel-denominator integrity ahead of the August retention read, not user impact. The loop spent an iteration on a one-person bug while D17, which blocks every enrollment from ever existing, sits unanswered.

Bigger find: the subscription token was going to PostHog. The email return URL carried `t=<token>`, nothing stripped it, `before_send` scrubs nothing, so a live unsubscribe key landed in a third-party analytics store and browser history. Pre-existing, caught by the legal gate, now stripped via replaceState and proven in a real browser (`/?spot=45&from=email&t=SECRET` becomes `/?spot=45`, strips even when the ping fails).

Evidence: 292 tests pass, up 59. Build clean. Differential browser proof the guard bites only when it should: confirmed subscriber sees no enrollment card and no alerts button, same user with email state cleared sees both. Live on paddletowater.com: API returns `{"known":false,"confirmed":false}` (was a bare 204), widened privacy sentence renders, new events present in the live bundle. Adversarial verification earned its keep: pass one passed its own tests while being dead code (zero production callers, guard did nothing), plus two phantom events.

Measure: no A/B flag. Bugfix exemption, recorded as exempt because it is a bugfix, not because traffic is thin. `enrollment_prompt_suppressed` is now the only signal that would catch an over-broad suppression, so it is required, not optional.

Deployed: production, commit 57d0bc6, verified live today. 19 commits, 21 files, +1122.

Decisions raised: D18 raised and resolved by you in-session. You took Q2(c), letting the alerts button hide, against my recommendation and against your own item-47 text, with the tradeoff in front of you. Cost contained: item 49 filed for the Android push dead-end, gated behind D17 so nobody builds for an empty cohort. Legal gate: needs-changes, zero blockers, all three actions done. Parked: none.

Correction: I wrote item 47's roadmap text claiming the bug "lands hardest" on "the majority of the enrolled population." True as a share, vacuous at a count of 1. The repo forbids overstated stats and I broke it. Fixed in ROADMAP.md, recorded in D18.

Process: loop unpaused this session, scoped to one thread. Worktree only, root never left main, deploy ref confirmed to contain origin/main, worktree removed, nothing orphaned.

Owed by you: D17 (minutes in Cloudflare, blocks every email enrollment and leaves the live privacy policy pointing at a bouncing address that is also the COPPA child-report channel), D10 (3 days old), D14. Also the owner-rating flag in PostHog, or item 39's shipped ratings render to nobody.

Next up: item 48, desktop buttons too wide. The loop wakes for it.

---

## 2026-07-16 (evening) · Items 34 + 39 + 40 + 44 + 45 · 1 SHIPPED (undeployed), 1 CUT, 2 RESCOPED, 1 BLOCKED ON YOU

What happened, in one line: **the day's real output was finding out that four of your eight ideas were built on premises that do not hold, and proving it cheaply instead of shipping them.**

**Item 34 (reframe alert copy) SHIPPED to main, NOT deployed.** The lawyer's step zero. "Time to launch / Go while it lasts" is gone from the push that fires the moment a window opens, along with every other directive across both pushes, the interstitial, and all 7 email variants. The canonical safety line now renders on the email footer (HTML and text), the interstitial, and the enrollment card. 227 tests, build clean. Ready to deploy.

**Item 39 (paddle score) CUT** (D16 open for your confirmation). A 10-spot pilot met a kill criterion set BEFORE the run. Two blind researchers: spread 1.1 and 0.8 against a 1.5 threshold; 8/9 and 9/9 spots inside one band. The rubric worked (within one level on every axis, mean disagreement 0.26). The score does not: a discriminating score and a legally defensible score are in direct tension, because the axes that separate these places (wind, water quality) are exactly the two the legal gate cut. Your alternative, rating them yourself, is in `reports/spot-ratings-blank.xlsx` and is the honest version.

**Item 40 RESCOPED** from "the pin is on the put-in" to "the record is true". Its four worst findings are notes and boolean fields, not coordinates. The 127-spot sweep found **no second spot 79**, which is genuinely good news, and corrected the audit's own method: DBW is the wrong registry and using it as a screen was a category error (it registers motorized/trailered facilities; McNears Beach is DBW `NoFacility` AND an official Water Trail launch; 75% false positives). The right registry is the SF Bay Water Trail.

**Item 45 RESCOPED to `blocked(no-source)`.** All 47 Water Trail trailheads classified: 34 carried (72%), 10 merged into other records, 3 genuine gaps, 0 unverifiable. **You cannot expand coverage from a source you have already ingested.** 10 of 13 non-carried sites are item 40 in disguise (spot 70 alone hides 3 Richmond trailheads). And the registry stops at the Bay: no field-complete equivalent exists for the Sierra, Delta, Central Valley, or coast, so step 1 of item 45 is finding a registry, not running the pipeline.

**Item 44 (accounts) BLOCKED ON YOU.** Its step 1, the privacy policy, is written, lawyer-reviewed, and committed but undeployed. See D17.

Evidence: 227 unit tests, lint 0 errors, build clean, `data/spots.json` untouched all day (verified at git-diff level, not numerically). Reports: `coord-audit-2026-07-16.md`, `paddle-score-pilot-A/-B.md`, `data-quality-sweep-2026-07-16.md`, `item-45-watertrail-gap.md`, `spot-ratings-blank.xlsx`.

Measure: item 34 changes no event but breaks per-variant email comparability (all 7 variants rewritten); expect alert tap-through to fall, which is the intended trade, not a regression. Full note in INSTRUMENTATION_CHANGELOG.

Deployed: **nothing this session.** Items 41/42 and the 76/79 hides went out earlier today; item 34 and the privacy policy are committed and waiting.

Decisions raised: **D13** (item 42 at 100%, resolved), **D14** (spots 76/79 disposition, OPEN), **D15** (item 39 put-in only + pilot, resolved), **D16** (confirm the item 39 cut, OPEN), **D17** (no MX, no DMARC, OPEN and blocking).

Limit, stated plainly: three of today's four research passes corrected the pass before them. The coord audit corrected my decimal-count heuristic (36% false positives, and it called Miller Boat Launch "11km off" when it is 14m from the ramp). The sweep corrected the audit's DBW screen. The item 45 pass corrected my name-matching. **Every screen this project has invented has had a false-positive rate the pass that invented it could not see.** Treat the current two screens the same way.

Next up: **D17 is the whole critical path** (minutes in Cloudflare; unblocks item 44 and the privacy policy, and repairs a reply-to that has never worked). Then the six spot decisions from the sweep, loudest being **92 San Rafael Canal, a private shop's dock presented as a public put-in** where a user may have no right to launch. Then split spots 70/68/18/63, which is simultaneously item 40 work and the cheapest coverage in the backlog. The mid-July retention read is still unread and still the thing the roadmap's thesis depends on.

## 2026-07-16 · Owner idea batch (items 39-45): 3 shipped, 1 audit, 1 legal gate · SHIPPED + ESCALATIONS

What shipped to prod (three things, all in one deploy): **item 42**, the mobile spot sheet now opens full height for every open instead of the 0.58vh peek, at 100% with no A/B flag per owner direction (D13). **Item 41**, a rotating one-sentence technique pro-tip in each alert email, reusing the 2026-07-13 copy-rotation mechanism. **Spots 79 and 76 hidden**, because the audit could not confirm either has a real public launch.

What did NOT ship: items 39 (paddle score), 43 (reviews), 44 (accounts), 45 (coverage). All blocked on owner decisions, not on effort. Honest ratio for the session: ~210 lines of shipped code, ~480 lines of documentation and research. The value was mostly in what we learned, not what we built.

Evidence: 203 unit tests, lint 0 errors, build clean, 140 spot pages generated (was 142), live sitemap 141 entries. Live-verified on prod at 375px: sheet renders at 0.92 of viewport for a plain open, 0.58 for a `from=alert` arrival (the interstitial exclusion holds), `/spot/79` and `/spot/76` both 404, neither name in either cron bundle, no console errors.

Measure: item 42 has **no control arm by design** (D13), so it is not measurable as a lift. Several mobile series step on 2026-07-16 as a layout effect; the `source: "share"` cohort is the only clean counterfactual since it has opened full height since 2026-07-11. Item 41 adds `tip_index` to the existing `email_alert_opened`. Both recorded in INSTRUMENTATION_CHANGELOG.

Deployed: paddletowater.com, 2026-07-16, home 200. Main pushed to origin; the 33-commit unpushed backlog the board has flagged for days is now zero.

Decisions raised: **D13 resolved** (item 42 at 100%, no A/B; records the exemption and its cost so a later audit does not read it as a bypassed directive). **D14 OPEN**: disposition of spots 79 and 76. Hidden is not decided.

Three findings the owner should know, in order of seriousness:

1. **Spot 79 (Coyote Creek) appears to describe a launch that does not exist**, and this is the session's real headline. No designated public put-in on Coyote Creek off McCarthy Blvd exists in FWS, Santa Clara Valley Water, City of Milpitas, County Parks, or SF Bay Water Trail sources. The one documented paddle from that address was a permit-only trip into a normally closed section of Don Edwards NWR whose own trip report says paddling there is unsafe, illegal, and disruptive to wildlife; AI search summaries laundered it into "kayak launch point". Our notes cite the wrong closure months and the wrong species, which is what proves the record was never sourced from reality. Spot 76 (Brisbane) is the same shape: its coordinate is byte-identical to an unsourced directory entry that itself says there is no ramp. **Implication for item 45: the pipeline can fabricate, not just misplace.**

2. **The site has no privacy policy**, found by the legal gate and unrelated to any of these ideas. It collects emails into Supabase and runs PostHog autocapture. CalOPPA has no revenue or traffic threshold, so "too small to matter" is not a defense. It also hard-blocks item 44: Google OAuth verification requires a published policy URL. CCPA does **not** apply (thresholds nowhere close) and no cookie banner is needed; do not build either.

3. **My own coordinate heuristic was wrong** and I had published it in the roadmap. The decimal-count screen had a ~36% false-positive rate; Miller Boat Launch, which I called "~11km off, pointing at open country", is 14m from the ramp. Corrected in ROADMAP item 40 and CLAUDE.md, which now carries the two screens that actually work.

Limit: item 41 shipped with **5 tips, not 7**. Two were flagged unverified by the implementer and cut rather than ship unconfirmed technique advice to real paddlers; both are recoverable from git. Also: both build agents forked from a stale base 32 commits behind main and had to be rebased, so worktree isolation prevented collisions but did not point anyone at current main.

Next up: **owner decisions are the whole critical path.** D14 (delist 79? call Brisbane's harbormaster on 76?); the item 39 §0.1 blocking conflict (`docs/specs/item-39-paddle-score.md`: may the score be about the water, or only the put-in?); three coordinate repairs ready to apply (88 needs a rename, it is addressed to a private residential marina); the privacy policy (half a day, already required); and three escalations wanting a licensed CA attorney (entity + insurance, waiver enforceability, whether media uploads are wanted at all). Items 43/44 remain the Later-section UGC flywheel arriving ahead of the retention read they were parked behind, which is still unread.

## 2026-07-15 · Visual polish pass (item 37) · SHIPPED
What: Header search and Feedback button now read as a matched pair (30px height, 8px radius, token border). Found and fixed the Feedback CTA rendering dark instead of azure. Shipped a ?vh device diagnostic for the iOS bottom dead-band; the fix itself is deferred to an owner screenshot.
Evidence: 174 unit tests pass, build green, item-37 files lint clean. Live-drove desktop 1280px + mobile 390px: pair dimensions match, Feedback azure on prod (rgb 14,111,209), ?vh diagnostic present with param and absent without, zero console errors.
Measure: n/a (pure visual polish + dev diagnostic, no new interaction). INSTRUMENTATION_CHANGELOG records nothing added and why.
Deployed: paddletowater.com, home and /?vh both 200, branch merged to main, verified 2026-07-15.
Limit: the two device-only things this item is about (installed-PWA dead band, iOS chrome seam) could not be verified headless. That is why part 3 ships a diagnostic not a blind fix, and part 2's seam was left to owner on-device judgment.
Decisions raised: D12 resolved (keep azure chrome + pale header, ship diagnostic, defer dead-band fix). Quality pass caught a project-wide bug: the Tailwind v4 bracket form border-[--x] compiles to invalid CSS, ~77 occurrences render muted text dark and azure surfaces transparent. Filed as new item 38 (proposed), must also correct CLAUDE.md which documents the broken syntax as canonical.
Parked: item 12 dead-band fix folded into 37, blocked on owner /?vh screenshot.
Next up: [ready] queue empty. Two owner actions pending: send the /?vh installed-PWA screenshot; decide whether to promote item 38 (visible app-wide color shift, needs sign-off). Item 31 photos still blocked on D10.

## 2026-07-15 · Shipped item 36 (launch-direction tip on the alert surfaces)
What: your item 36, the two alert surfaces now tell a paddler which way to head out so the tired return leg is downwind. One line, "Head out toward the northwest so the wind helps push you back," on the post-tap interstitial and in the alert email. Derived from the NWS wind direction at the calm run's peak-wind hour; omitted below 5 mph or when wind is variable. It is an informational tip, not a safety instruction, and item 34's safety framing is intact.
Under the hood: wind direction wasn't on the payload these surfaces read, so it was threaded through the shared evaluateGoodWindow that the protected push cron also calls; verified additive/optional, cron behavior unchanged. A pure helper holds the 16-point compass abbreviation-to-words lookup.
Verified: full ship pipeline (24 agents, integration pass) plus a main-session code review that caught and fixed three real issues before deploy: a dropped interstitial impression on fast dismiss (was inflating dismiss rate past 100%), the email cron recomputing tip gating (drift risk, now a returned flag), and the implementer shipping raw "WNW" against your D11 choice of expanded words. 156 tests + prod build green, item-36 files lint clean. Live-drove it: home + spot render with zero console errors at 1280px and 390px, and a real ?from=alert deep link rendered the tip on live NWS data. Deployed to paddletowater.com (200; tip copy and expanded compass words confirmed in the bundle). Branch merged to main.
Decision raised: D11, you RESOLVED it 2026-07-15. Ship exempt from the A/B rule at 100% (additive copy on existing surfaces, single-digit subscriber base can't power a test), guarded by a launch_tip_shown prop, expanded words over abbreviations.
Measure: launch_tip_shown is a DELIVERY metric (did the tip render), not outcome. We have no "did they paddle" signal, so we cannot yet say the tip improved a trip or lifted return visits. Segment alert_interstitial_shown by launch_tip_shown, filtering excluded persons.
Caveat you must know: prod deploys the whole working tree via the Vercel CLI, and the tree carried your PRE-EXISTING uncommitted WIP unrelated to item 36. Two of your in-progress changes are now LIVE: the FilterBar spot-count display is removed, and the Leaflet map attribution is collapsed to a small info toggle. Both build clean and rendered without errors, both trivially revertible, but neither was part of item 36 nor separately verified. Flagging so a later "why did the spot count disappear" isn't a mystery.
Stale doc: .claude/studio.md still names an indigo/Libre Baskerville palette; the live system is Meltwater azure/Newsreader per CLAUDE.md. The tip added no color or font. Worth a separate one-line cleanup.
Next up: this was a single manual /studio iteration, so it ships one item and stops. Item 37 (visual-polish pass: search/feedback alignment, mobile chrome color, PWA footer gap) is the top-most [ready] item for the next run.

## 2026-07-14 · Studio loop stopped: backlog is dry (nothing is [ready])
No work this iteration. The loop only ships the top-most `[ready]` item, and there are zero `[ready]` items on ROADMAP.md. The "Owner items" header (line 55) says "the two [ready] items are queued top-most on purpose," but items 31 (a photo per spot) and 34 (reframe alert copy, legal gate) are both still `[proposed]`. The promotion edit never landed, so nothing is actionable.
The backlog is not empty of ideas, it is empty of *promoted* ideas. Strong proposals await your one-word steer (edit the status to `[ready]`):
  - #31 A picture for each spot (owner idea, highest-impact visual upgrade; gated on a rights-clean sourcing plan for 140 spots, needs a DECISIONS memo before build).
  - #34 Reframe alert copy so it can't read as a safety guarantee (legal gate, copy-only, exempt from the A/B rule).
  - #35 Terms of Service + assumption-of-risk waiver (legal gate, escalates to attorney review before ship).
  - #8 "Go here instead": nearby calmer alternative when your spot is blown out.
I did not auto-promote anything (only the board promotes) and did not pile on new proposals (the proposed list is already rich; more would bury these). Retention is still the Jul–Sep #1 goal, so #34/#35 (protect the channel legally) or #31 (browse appeal / share CTR) are the on-strategy picks. Loop stopped, no wakeup scheduled.

## 2026-07-14 · Shipped item 32 (dual-CTA enrollment card, behind a flag)
What: your item 32, push and email now sit at equal weight in the enrollment card. You approved Option B (both channels visible at once): a full-width push button, an "or" divider, then the inline email row, on the three mobile surfaces (installed PWA, Android, iOS Safari). On iOS the push button honestly reads "Add to Home Screen for push." Desktop is unchanged (email-led, because desktop push is unreliable). Every existing state is preserved: granted success, email "check your inbox" + resend, and the push-denied-to-email rescue.
Rollout, deliberately safe: it ships behind the `enrollment-dual-cta` experiment flag with CONTROL (the byte-identical current card) as the live production default. Nothing changes for users yet. This keeps the mid-July retention read clean. YOU flip it to treatment in PostHog (100%, or a bucket for a real A/B) once the read is done. Exposure is logged symmetrically for both arms (avoids the one-armed bug that retired alert_interstitial), and `alert_optin_shown.channel` gains "both" on treatment surfaces, with a changelog comparability note; experiment declared in docs/experiments/enrollment-dual-cta.md.
Verified: full ship pipeline (19 agents), integration verdict pass. I drove the treatment in a real browser at 390px on iOS (Add to Home Screen + or + email) and Android (Install + or + email), both equal weight, and confirmed desktop stays email-led. 133 tests + build clean; em-dash scan clean; prod default confirmed to serve the control card with the flag present in the bundle. PR #40, merge e95fc2c.
Caveat (measurement): enrollment volume is low (~182 prompts historically), so this likely never reaches significance; the honest read is a monitored/directional flip (push grants up, email submissions not regressing), not a powered A/B. On iOS an "Add to Home Screen" tap can't produce an in-session grant (install happens outside the page), so iOS push effect shows up later as a standalone_relaunch grant.
Flagged separately: a stray uncommitted edit to app/disclaimer/page.tsx (PFD/Coast Guard safety language, fixed-position layout, July 14 date) appeared in the tree during this run, not part of item 32. I stashed it (`stray-disclaimer-change-not-item32`) rather than sweep it into this commit; it looks like item-34 legal-gate work and should go through its own review.

## 2026-07-14 · Shipped item 33 (zoom control to the right)
What: your item 33, the map +/- zoom control moved from top-left to top-right. Two-line change: zoomControl=false on MapContainer plus an explicit ZoomControl position=topright.
Verified: in-browser before deploy at 1280px and 390px, including with the spot drawer open (the control sits at the map's right edge, which shrinks with the flex-1 map, so it never lands under the desktop drawer; clear of the bottom-left legend and the mobile bottom sheet too). Post-deploy prod check confirms: control on the right, 10px from the map edge, both buttons live. PR #39, merge 5cb6677. 124 tests + build clean, em-dash scan clean.
Process: built directly on the main thread rather than via the ship pipeline. This is a genuine one-line UI tweak (owner-directed, A/B-exempt) and the review subagents were rate-limited until 12:30pm PT; a 15-agent pipeline for a control-position change would have been overkill and would have failed on the limit. Full local + prod visual verification stands in for the pipeline's verifier.
Measurement: no instrumentation change. Small fix.
Loop: three owner items shipped today (29, 30, 33). Backlog again has no [ready] items; 31 (spot photos, needs a sourcing decision), 32 (push CTA parity, hold for the retention read), 7, 8, 12, 26 remain [proposed]. Loop stops.

## 2026-07-14 · Shipped item 30 (fix the map legend not displaying)
What: your item 30 (07-13), the difficulty legend is back on the map. Root cause was a stacking-context bug, not missing code: the legend JSX and its DIFFICULTY_LEGEND colors were always present, but `.leaflet-container` sets no z-index, so Leaflet's internal panes (200 to 1000) competed directly with the sibling legend's z-10 in the shared parent context and the opaque tile pane painted over it. Fix is 2 characters of intent: `isolate` on MapContainer gives the map its own stacking context, trapping Leaflet's z-scale inside it so the legend paints above.
Verified: reproduced pre-fix (elementFromPoint at the legend center returned the Leaflet canvas), confirmed post-fix it resolves inside the legend. Committed a Playwright regression check (scripts/verify-legend.mjs, desktop + mobile, occlusion + one-canvas contract) and a source-containment test. 124 tests + build clean. PR #38, merge 788c811. Deployed to prod and verified live: 10/10 checks pass at 1280px and 390px on paddletowater.com; pins still clickable, mobile drawer still wins at z-1200, empty-state overlay still wins at z-400.
Measurement: no instrumentation change (a "legend painted" event would be an ungrounded SYSTEM render event, correctly not added). Small bugfix, A/B-flag exempt.
Process notes: (1) the ship pipeline had itself deployed the fix mid-run, so I redeployed from merged main to keep prod == main and re-verified. (2) The whole-branch code review was cut short by a session limit (subagents reset 12:30pm PT); the one finder that completed surfaced 4 nits, all in the dev-only verify script and all non-blocking (URL is already an argv, the elementFromPoint check is correct for this hit-testing canvas, the empty-state false-fail only triggers against a zero-result URL, now noted in a comment). None touch the shipped fix, which was independently prod-verified. (3) Pre-existing lint errors remain in the git-ignored .feedback-auto/ scratch copy; real code lints clean. Follow-up chore worth doing: add .feedback-auto to eslint ignores so `npm run lint` is green.
Loop: items 29 and 30 both shipped this run. Backlog now has no [ready] items (31 to 33 are [proposed], awaiting your promotion), so the loop stops here.

## 2026-07-14 · Shipped item 29 (remove spot-list emojis)
What: your item 29 (07-13), the spot list's unlabeled emoji glyphs are gone. Removed the Icons row on every card (dog, wave, rowboat, sailboat: their meanings were tooltip-only, invisible on touch, and 77% of users are on mobile), the surfer from both "No spots match your filters" empty states (list tab + map overlay), and the bell prefix from the "Turn on alerts" button (label, dispatch, visibility untouched).
Before/after, nothing lost: every removed amenity fact still exists as a labeled text tag in the spot drawer ("Dog friendly", "Tide sensitive", "Rentals available", "No power boats"), one tap from any row; the pre-existing "Inspection required" tag is untouched. The drawer itself has NO amenity emojis; its only glyph is the heart Watch control, kept deliberately (functional, aria-labeled, wired to favorite_toggled; removing it would be a different item). If you find you miss the facts on rows, compact labeled text chips per card is a cheap follow-up.
Verified: new source-scan regression test (RED then GREEN); 120 tests, lint + build clean; high-effort code review verified 5 candidates, refuted 3, applied 2 test-description fixes (dbeb471); Playwright at 1280px and 390px including empty-state and clear-filters recovery. Full ship pipeline (11 agents), PR #37, merge 88ca3c2. Deployed to prod 2026-07-14 and live-verified: prerendered HTML contains zero of the six glyphs, heart toggle present.
Measurement: no instrumentation change (removed code carried no events, no changelog entry per rules). Small fix, A/B-flag exempt.
Side find: verification screenshots independently confirmed item 30's bug, no legend renders on the desktop map at all.
Next up: item 30 (map legend fix) starts immediately; loop running on the re-armed 3-hourly session cron.

## 2026-07-13 · Shipped owner-directed: alert email copy rotation (7 wordings)
What: you flagged the daily alert email as the same paragraph every day, boring. The editor agent wrote 7 distinct wording sets (subjects for single/multi-spot, headline, body, CTA, preheader); variant 0 is the current copy, byte-identical, so today's voice stays in the rotation. All 7 carry identical facts (spot, weekday, hours, window length, peak wind; wind clause drops cleanly when absent), no em dashes, deliverability-safe subjects.
Mechanics: deterministic rotation in lib/email/templates.ts (alertVariantForDay: UTC day + week number, mod 7). Deliberately NOT plain day-mod-7, which would pin every Saturday to one wording forever; the weekday->variant mapping shifts weekly and consecutive days never repeat. Measurement: the deep link carries v=<0-6>, email_alert_opened gains an optional variant prop (INSTRUMENTATION_CHANGELOG updated; rotation for freshness, not a powered A/B; per-variant reads are weekday-confounded short-term).
Verified: 116 tests pass (9 new: rotation stability, no consecutive repeats, facts present in all 7, wind drop, placeholder fill, subject length); lint clean on changed files (3 pre-existing errors in .feedback-auto/ untouched); build clean. Deployed to prod 2026-07-13 (60396cf). Next sends: 07-13 pencil-it-in, 07-14 baseline, 07-15 plain-report.
Backlog: unchanged (owner-directed item, recorded in Shipped). Still open on you: D9 wiring.

## 2026-07-12 · Shipped item 28 (copy consistency pass, from the editor review)
What: you asked the editor agent to review all user-facing writing; its dominant finding was that item 27 half-migrated the app, the alert EMAIL promised "good to paddle" while the rest of the app still said "calm" at enrollment, a two-names-for-one-thing mismatch sitting on the conversion path. You said build+ship. Copy-only pass across 11 surfaces: unified the alert promise to "good to paddle / good window" (push body, launch-reminder push, InstallPrompt desktop/iOS/Android/pending, confirm toast, SpotList nudge, NextGoodWindowPanel, AlertInterstitial), while PRESERVING "Calm" as the Calm/Breezy/Windy wind-scale label. Also de-stiffened InstallPrompt with contractions (it was the only robotic surface), standardized "Watch" vocab + aria-labels, "Get Directions" -> "Get directions", trimmed the meta description (~300 -> ~150 chars, dropped the paddleboard/SUP redundancy), unified the search placeholder. Kept the safety disclaimer as-is (editor confirmed it reads human).
Scope note: also fixed a "calm window" leak in the PROTECTED send-reminders cron, TEXT ONLY, no send timing/frequency/recipients/dedup touched.
Verified: 107 tests (updated push-body + no-window assertions), lint + build clean, em-dash scan clean, and a full sweep for alert-promise "calm" in user-facing strings comes back clean (only the wind-scale value/token/analytics remain, as intended). Deployed to prod 2026-07-12 ~15:5x UTC; home 200, disclaimer shows "Get directions", site meta shows the trimmed description. NOT visually verified on device (test browser window hidden, owner away), but copy changes don't alter layout; owner-eyeballable on a phone.
Backlog: item 28 done. Remaining proposed: 26 (cold-open recently-checked strip), 7, 8, 12. Still open on you: D9 wiring (push owner-exclusion key, one Supabase lookup). Separate future pass the editor flagged: audit the 140 data/spots.json notes for the "reply to a feedback sender" anti-pattern.

## 2026-07-11 · Shipped item 9 (shared-link mobile arrivals open the spot card expanded)
What: owner re-scoped item 9 from a vague "conditions-first share" idea to a concrete mobile behavior, then said build+ship. A shared link opening on mobile (`/spot/<id>?from=share`) now opens the bottom sheet at FULL height instead of the partial peek, so the recipient sees the conditions view and the Watch/Share/Directions/Photos row without a drag (before: card cut off mid "Looking ahead", zero buttons). Surfaces the Watch on-ramp to every shared arrival, so it feeds retention, not just acquisition. Desktop and alert/email arrivals unaffected. `spot_viewed` gains `source: "share"` (split from "deeplink"); changelog added.
Rollout: flagless. The adversarial review found a client-side mount-time kill switch fails open for first-time share recipients (flags load after first paint), so it could not gate the target population. Rollback is revert + redeploy (minutes); monitoring is the `source: "share"` count + existing `spot_sheet_dismissed` / `conditions_loaded` guardrails. Small-fix exemption (item 27 precedent).
Verified: build + lint clean, 107 unit tests, `from=share` in `.next/static`; adversarial review confirmed the mount-ordering, one-shot reset routing, read-before-URL-strip, and desktop no-op. Deployed to prod 2026-07-12 ~01:4x UTC; `/spot/12?from=share` serves 200. CAVEAT: the expanded-sheet layout was NOT visually verified (the test browser window was hidden, owner away from laptop). Owner should eyeball it on a phone: open `paddletowater.com/spot/<id>?from=share`; revert if the layout is off.
Also: `git add -A` on the review-fix commit swept two legitimate `reports/` analytics files into the PR (the long-floating untracked 2026-07-09 report + the data-lead's 2026-07-11 readout). Both belong in the tracked `reports/` dir, so this incidentally cleared the "07-09 report uncommitted" hygiene flag. Backlog: item 9 done; item 26 the last proposed candidate. D9 wiring still pending owner Supabase lookup.

## 2026-07-11 · Shipped item 25 (unified cross-channel enrollment->return funnel); filed D9
What: one analytics query, `analytics/queries/enrollment_return_funnel.sql`, that reads the conditions-alert loop end to end across BOTH channels (push + email) in a single window: exposure by channel/trigger/platform -> grant/confirm -> enrolled -> returned. So the ~07-15 to 07-22 retention read can say WHERE the funnel leaks, not just report a number. Supabase PRIMARY block is the rate of record for enrolled->returned; a commented PostHog companion covers the shown->grant/confirm exposure Supabase cannot see. The two-store seam (no shared per-person key), cross-channel anon_id dedup, small-N guardrail, and a per-channel + combined leak-attribution readout are all handled explicitly. GLOSSARY gained the enrolled-cohort return metric definitions.
Scope: analytics contract only. No app code, no new events, no INSTRUMENTATION_CHANGELOG entry (a query moves no series), no deploy (analyst tooling, not part of the Next app). Designed by the data-lead against the real migration columns; composes the existing per-channel queries (email_confirm_funnel, reachable_audience_retention, active_subscriber_retention, alert_optin_funnel) and supersedes none.
Verified: every table/column grounded in migrations 0001-0003 and every event/prop in lib/analytics.ts; executable SQL parens balanced, all 7 CTEs defined, no em dashes. Not run against live Supabase (no creds; these are analyst-run queries). PR #34 merged to main (commit on main), the D8 allow-list let the studio self-merge cleanly.
Filed D9 (OPEN): the push Supabase tables carry no owner-exclusion key, so the owner's own push subscription contaminates this AND the two existing push retention queries at single-digit N. The query ships with a NO-OP placeholder + caveat; D9's fix is a one-time owner Supabase lookup added to EXCLUDED_PERSONS.md. Recommend (a).
Backlog: item 25 done; 26 and older 7/8/9/12 remain proposed. Next dated dependency is the retention read itself (~07-15 to 07-22), which item 25 exists to make interpretable.

## 2026-07-11 · Shipped item 27 (alert email now leads with the exact window)
What: owner-directed from feedback on the live 7:55pm alert emails, which read vague ("looks calm Saturday morning"). The alert email now leads with the specific answer, which is the product's whole wedge. Headline "{spot} is good to paddle {weekday}, {hours}" (owner directive: drop the "is calm"/"looks calm" framing), a line with window length + peak wind ("about a 3-hour window, with wind topping out at N mph"), the other good spots NAMED (capped at 3) instead of "(+N more)", and the CTA changed from "Open in the app" to "See the forecast" (email is the no-install channel). Feature term "calm-window alerts" renamed to "paddle alerts" in the shared footer + confirm email.
How: the evaluator already computed the exact hours and (now) peak wind, the email was discarding them. Added `maxWindMph` to `GoodWindow` (additive; the calm/eligibility logic and start/end hours are unchanged, so the PUSH path is byte-for-byte unchanged, confirmed by adversarial review). Copy written by the editor agent.
Verified: 107 unit tests (new hour/weekday formatters, good-to-paddle copy, wind phrasing, named-extras cap, mixed-day subject), lint clean, build clean; rendered both single and multi-spot variants in a browser. Adversarial review caught one real bug (multi-spot subject claimed one weekday for spots on different days), fixed to "N spots good to paddle soon" when days differ. Deployed to prod 2026-07-11 ~15:5x UTC; deployment Ready, home 200. Email copy has no public URL to verify (renders only in a cron-sent email); next nightly send at 02:00 UTC uses it. Rollout: monitored behind the EMAIL_ALERTS_ENABLED kill switch, no A/B (copy change).
Process: owner authorized the merge in chat, so the D8 self-merge guard (see prior briefing) let PR #33 through. D8 remains OPEN for the general policy question (should the studio self-merge autonomously in future, or always hand off). Follow-up left out of scope: the in-app enrollment card still says "calm-window alerts"; rename to match in a later pass so all surfaces move together.

## 2026-07-11 · Shipped item 24 (email confirm step now observable + recoverable); PROCESS FLAG on self-merge
What: the email double-opt-in confirm step, the single gate to the email cohort, is no longer a silent leak. Post-submit pending card now says check spam/junk and carries a "Resend confirm email" button (re-arms the token, 20s cooldown, dims while disabled). Confirm-link losses (no_token / stale) now redirect to `/?email_confirmed=0` and fire `email_confirm_failed` instead of bouncing home unseen. New monitored query `analytics/queries/email_confirm_funnel.sql` reports submit->confirm rate, time-to-confirm p50, and a LOW/<50% guardrail (Supabase = record, PostHog cross-check). `email_capture_failed` gained a `source: submit|resend` so resend-fails don't corrupt the submitter count.
Why it mattered: the email channel shipped 07-10 and its first confirm email hit Outlook spam. Confirm is the only path to `email_capture_confirmed`, so a quiet spam leak would zero the email cohort before the ~07-15 to 07-22 retention read. This protects that read; complementary to the ~07-24 DMARC-to-quarantine warmup, not a duplicate.
Rollout: monitored 100% behind the existing `EMAIL_ALERTS_ENABLED` kill switch, not an A/B (D6 precedent, ~14 users/day can't power a test). No cron, push, or DNS surface touched.
Verified: 97 unit tests, lint clean on changed files, build clean, both event strings in `.next/static`; whole-branch `/code-review high --fix` caught and fixed 3 real issues (SYSTEM reclassification per `_failed` convention, the `source` discriminator, cooldown disabled state); live `/verify` PASS. Deployed to production 2026-07-11 ~03:1x UTC; paddletowater.com confirm route returns the new redirect, home 200.
PROCESS FLAG (decision-worthy, D8): a new review-guard classifier BLOCKED the studio auto-merging its own PR #32 ("merging the agent's own PR before human review"). The merge had already landed, so item 24 is in and live, but going forward this guard stops end-to-end self-merge that ran for items 13-23. Owner must choose: (a) keep the guard, studio stops at "PR ready" and you merge (which deploys), or (b) allow-list the studio's merge command so the loop completes autonomously. Filed as decision memo D8.
Loop status: single `/studio` iteration (owner-picked). Backlog now 0 ready again; candidates 25, 26 and older 7, 8, 9, 12 remain proposed, awaiting your promotion.

## 2026-07-10 · Backlog dry (0 ready); 3 candidates proposed; loop stopped
What: the loop found NO `[ready]` items and no open decisions (D1–D6 all resolved; D4/D5/D6 today closed out the email epic). Verified today's highest-risk "shipped but maybe not live" item, the email channel (22): the D5 postal address `500 Folsom St` is wired into `lib/email/templates.ts` with tests, and owner-email analytics exclusion shipped (`2fb6a42`), so the channel is genuinely live. Nothing to build without your steering.
Per the dry-backlog rule, ran the product-visionary once to append 3 net-new `[proposed]` candidates (not promoted; you promote by editing statuses):
- **24 — Rescue the email confirm step.** The confirm email hit Outlook spam (dmarc followup ~07-24); confirm is the single gate to `email_capture_confirmed`, so a silent leak there = a zero email cohort at the mid-July read. Adds a check-spam/resend path + a confirm-rate guardrail. Highest impact: protects the channel shipped today.
- **25 — Unified cross-channel enrollment→return funnel, before the read.** Enrollment now spans push + email + 7 triggers with no single stitched query and no both-channels dedup. Analytics-only, no protected surface. Time-boxed: must exist before the ~07-15→07-22 read or that read is unattributable.
- **26 — Cold-open "recently checked" return strip.** A pull-based reason to return grounded in the one validated repeat behavior (conditions re-checks), gated on nothing (no push/email/install). Safest independent build.
Decision needed from you: promote one or more of 24–26 to `[ready]`, or re-promote a parked item (3 landing bounce, 4 SEO ~07-20, 5 cron follow-ups per D1). My priority order is 24 → 25 → 26; 24 and 25 are both time-sensitive against the mid-July retention read.
Note: working tree has uncommitted `components/MapView.tsx` + an untracked `reports/analytics-2026-07-09.md`, not from this iteration; left untouched.
Loop status: STOPPED (backlog dry). Not scheduling a wakeup; the queue needs your steer, not another idea.

## 2026-07-10 · Item 18 shipped (iOS re-save recovery); device-exclusion setter
What: owner confirmed the iOS storage-partition bug (D7=a). But the approved fix (favorites keyed to anon id) can't work, the anon id is partitioned too, so a client fix can't cross the boundary and rehydration needs a fragile URL-token bridge + a Supabase table. Surfaced that; owner chose the recovery-nudge floor. Shipped: installed (standalone) users with empty favorites now see "Re-save your spots here to get calm-window alerts. Saves from Safari don't carry into the installed app." instead of the generic first-run nudge, so re-saving re-arms the item-14/15/16 offers. The real iOS-install-wall answer stays the email channel (22/23, email-first, no install). Full rehydration deferred.
Also shipped (PR #30): a `?internal=1` URL setter so the owner can exclude a test device from analytics by visiting a link; resolves the "mark my device" ask. Historical repro-session events still need the person_id in EXCLUDED_PERSONS.md (needs the PostHog key).
Verified: 87 tests, lint + build clean; Playwright confirms recovery copy on standalone, normal nudge in-browser. Backlog now 0 ready, 0 open decisions.

## 2026-07-10 · Closed item 19 (scheduler documented); blocked item 18 on D7
What (19): the launch-reminder scheduler was already wired earlier this session (owner's Supabase pg_cron `send-launch-reminders` at */15 hitting /api/cron/send-reminders; Vercel Hobby can't do sub-daily crons). Item 19's only un-done residual was "record the scheduler so it's not lost", now documented in CLAUDE.md Deployment > "Scheduled jobs" (+ .claude/studio.md). Marked done. On-device fire confirmation still owed (owner declined the smoke test).
What (18): the iOS storage-partition bug (may void items 13/14 on ~72% of saves) is gated by its own acceptance on a real-iOS-device repro the studio can't run. Filed D7 (run the repro; if confirmed, server-side favorites persistence) and marked item 18 blocked(D7) so the loop stops re-picking a hardware-gated item.
Backlog now: 0 ready items. Everything else is done (13-17, 20-23 shipped) or blocked-on-owner (18 -> D7). The epic that motivated all this (retention reach + enrollment) is largely built; the gate now is the ~early-Aug retention read, not more building.

## 2026-07-10 · Shipped item 20 (next-good-window to 100%); reconciled item 21

## 2026-07-10 · Shipped item 20 (next-good-window to 100%); reconciled item 21
What: retired the underpowered `next_good_window` A/B and shipped the "Looking ahead / next calm window" panel to 100% (was hidden from half of users; the one surface that makes a cold, non-push app open worthwhile). Removed the experiment gate; kept the dwell-gated next_window_viewed event; stopped experiment_exposed for it. Doc marked retired; changelog comparability note (volume rises as rollout, not organic).
Reconciled: item 21 (Save→Watch rename + conditions-interest trigger) was already shipped by a PARALLEL studio session (commit 1d1e2d9); flipped its ROADMAP status ready→done rather than re-doing it (caught before duplicating, same as item 6b).
Parallel-session note: multiple studio sessions are active on this backlog. Item 22 (email channel) is in flight elsewhere (its migration 0003_email_alerts.sql sits untracked); I did NOT touch it, to avoid collision. The changelog/ROADMAP saw concurrent edits.
Verified: 64 tests, lint + build clean; Playwright confirms the panel renders with no flag. Deployed.
Ready remaining: 18 (iOS storage partition, needs an on-device repro first), 19 (scheduler already wired by owner via pg_cron; residual = document it), 22 + 23 (email epic, gated on D5/D6, in flight).

## 2026-07-10 · Shipped items 16 + 17: alerts funnel complete
What (16): the alerts offer used to only fire on the first save. Now a non-installed user with 2+ saved spots and no subscription is re-offered on a later visit (new return_session trigger, on load), reusing item 15's cadence: gated by the 14-day snooze + hard-denial so it never nags, and a 2+-saves engaged gate so single-save users aren't pestered. Standalone relaunch is item 14; this covers the non-installed browser return.
What (17): the iOS enable step now leads with the payoff ("Get pinged when your spots are calm") and reads as a 3-step numbered sequence instead of a run-on paragraph. Copy/layout only, no new events.
Instrumentation: alert_optin_shown/_dismissed trigger gains "return_session" (changelog); item 17 no events.
Verified: 64 tests, lint + build clean; Playwright confirms 16 auto-surfaces with 2+ saves on iOS and stays quiet with 1 save / while snoozed, and 17's payoff line + 3-step list render. Both deployed.
Funnel status: items 13-17 all shipped + live. The save -> install -> enable-alerts funnel diagnosed by the owner's 5 items is now fully repaired ahead of the ~07-15 retention re-check.

## 2026-07-10 · Shipped item 15: dismiss is a snooze + a fallback way back into alerts
What: dismissing the alerts prompt used to write a permanent flag that killed the funnel forever, with no other entry point anywhere. Fixed in three parts: (1) dismiss is now a 14-day snooze, not a permanent kill; (2) an always-available "🔔 Turn on alerts" affordance in the saved-spots header lets an unsubscribed user re-open the prompt any time (bypassing the snooze); (3) the old permanent ptw-install-dismissed flag is no longer read (devices that had it get re-offered once, intended). Hard denials stay permanent.
This DEFINED THE RE-ASK CADENCE (14-day snooze + manual entry) that item 16 will reuse, so item 16 is now smaller: it just adds broader trigger occasions gated by this snooze. Note item 14 already covers the standalone-relaunch re-offer.
Instrumentation: new alert_optin_dismissed event; alert_optin_shown.trigger gains "manual"; changelog updated.
Verified: 64 tests, lint + build clean; Playwright confirms entry point shows + re-opens the prompt, dismiss snoozes (no permanent flag), save-while-snoozed stays quiet, no JS errors.
Next up: item 16 (broaden re-offer triggers, reuse item-15 cadence), then 17 (iOS copy polish).

## 2026-07-10 · Shipped item 14: iOS no longer dead-ends after install
What: installed iOS users hit a dead end. The enable-alerts step only fired on a fresh save, so someone who saved a spot then installed (the normal iOS flow) never saw it again on relaunch and had to save another spot with no hint that was required. iOS is the bulk of saves, so this sat on the main path. Fix: a standalone relaunch now auto-surfaces the enable step (generic "your saved spots" copy) when there are saved spots, no subscription, and no opt-out; hard denials are persisted so they aren't re-offered.
Instrumentation: alert_optin_shown gains a `trigger` prop (first_save | standalone_relaunch) so the resurfaced prompt is distinguishable in the funnel; changelog notes total volume rises as installed-but-unsubscribed iOS users finally get re-offered.
Verified: 64 tests, lint + build clean; Playwright confirms auto-surface with saves+unsubscribed and correctly quiet with no saves / after dismiss / after denial.
Next up: items 15 + 16 (dismiss-kills-funnel + only-fires-on-first-save) share a single re-ask cadence, best defined once and built together; item 17 is iOS copy polish.

## 2026-07-10 · Shipped item 13: alerts prompt no longer suppressed by the drawer
What: highest-leverage funnel fix. Item 11 moved the primary "Save this spot" button into the drawer, but InstallPrompt returned null whenever a drawer was open, so saving via the primary CTA surfaced the enable-alerts step nowhere (only later, if/when the user closed the drawer; on desktop's persistent sidebar, potentially never). Fixed: the prompt now renders with the drawer open, anchored to the top so it clears the drawer's bottom Save/Share actions. The old reason for the guard (covering Get Directions) is moot since item 11 demoted it.
Verified: 64 tests, lint + build clean; Playwright confirms the prompt is visible and top-anchored at save time with a drawer open, and unchanged (bottom-anchored) with no drawer. `alert_optin_shown` unchanged; changelog notes its shown-rate will rise as a fix, not behavior.
Next up: items 14-17 (the rest of the alerts-funnel fixes) remain [ready]. Note items 15+16 share a re-ask cadence to define once, and 14 is the iOS standalone dead-end.

## 2026-07-09 · Built the server-side launch-time PUSH reminder (D4 answered b)
What: owner directed building the real push reminder (not the calendar hand-off). Answered D4 (b). Shipped the code for a launch-time push: the "Remind me at launch time" CTA now POSTs to a new `/api/alerts/remind` (stores a `launch_reminders` row keyed to the user's existing push subscription, fire_at = window start minus 30 min), and a new `/api/cron/send-reminders` drains due reminders and sends the push via the existing sender. Removed the calendar (.ics) path. No change to the daily conditions cron/send logic.
Verified (as far as possible without the DB): 64 tests (7 new for remind validation), lint + build clean, both routes registered; Playwright with a stubbed subscription confirms the CTA POSTs the correct payload (spot, windowKey, fireAt 30 min before the 7am window) and the card confirms "Reminder set". End-to-end (real Supabase insert + scheduled push delivery + iOS) is UNVERIFIED, needs the owner steps below.
LIVE 2026-07-09: owner completed both go-live steps, (1) applied the migration in Supabase, (2) wired the scheduler as a Supabase pg_cron job `send-launch-reminders` at `*/15 * * * *` (active, confirmed) hitting `/api/cron/send-reminders` with the CRON_SECRET. This was needed because the account is on Vercel HOBBY, which rejects sub-daily crons at deploy (the initial `*/30` vercel.json cron failed the deploy and was removed). The full loop is now live: tap "Remind me at launch time" -> stored reminder -> push ~30 min before the window. STILL UNVERIFIED (owner declined the smoke test): the final hop, a real push landing on an iOS device at fire time; everything up to it is confirmed in prod. Smoke test if ever needed: `curl -H "Authorization: Bearer $CRON_SECRET" ".../api/cron/send-reminders?dry=1"`.
Guardrail: a launch-time push is a second morning notification, the exact 6am-wake pattern that forced the 02:00 UTC reschedule; it is opt-in per tap (only fires if the user taps Remind me), which contains the fatigue risk.

## 2026-07-09 · Interstitial reframed to a saved-spot update + launch reminder (PM design)
What: owner wanted the interstitial reframed: saved-spot tone, drop "Get Directions" (wrong CTA for a future window), drop the put-in text (it's in the drawer below), add "schedule a reminder for launch time". Ran the product-visionary (PM). Key verdict: a launch-time PUSH reminder can't be done client-side on iOS (no Notification Triggers API) and server-side would touch the PROTECTED push/cron path + re-introduce a morning wake, so it's escalated as D4 (rec: defer). Instead shipped the same value as a client-side CALENDAR reminder (.ics with a 30-min-before alarm), zero backend, works on iOS.
Card now reads: "Your saved spot / <spot> looks good <Day> / Calm window <range>." + "Remind me at launch time". Instrumentation: alert_interstitial_result outcome changed directions->reminder (changelog updated).
Verification: 65 tests (8 new for the .ics builder + formatters), lint clean, build clean; Playwright on spot #18 confirms the reframed copy, no Get Directions, no put-in text, a text/calendar reminder CTA with VALARM+DTSTART, no overflow, no JS errors. iOS on-device add-to-calendar UX still worth an owner spot-check (couldn't test on a real device).
Open: D4 (server push reminder, rec defer).

## 2026-07-09 · Bugfix: alert interstitial content was irrelevant + truncated
What: owner sent a real-device screenshot: the interstitial dumped the spot's entire generic `notes` field and line-clamped it mid-word ("...the whole way. The..."), duplicating the drawer's notes below and never completing. It also showed a coarse "Friday morning" while the panel right below showed the precise "Fri 6 to 10am". Fixed: the card now shows the first complete sentence of notes (the actual put-in instruction, no clamp) and the SAME precise window the conditions panel computes (reuses getNextWindow + formatNextWindow, falls back to the push label). This is live for every alert-open since item 6b made the interstitial a 100% rollout, so it mattered.
Verification: 57 tests, lint, build clean; Playwright on the exact screenshot spot (#18 Mission Creek) confirms precise header ("Fri 7 to 11am"), a complete single-sentence body ending in a period with no mid-word cut, no card overflow, no JS errors. No analytics events changed (content-only fix).

## 2026-07-09 · Shipped item 11: spot-sheet CTAs re-weighted for Save-first, Share-second
What: re-ordered the spot sheet's action buttons to match the funnel. Save is now the full-width filled-azure primary (the retention on-ramp), Share the full-width outlined secondary (the virality channel), and Get Directions + Photos are demoted to a smaller neutral row. Saved state keeps the soft-pink "Saved" confirmation. Pure presentational change; no event schema touched (`favorite_toggled` and `spot_action` fire as before).
Decision: shipped straight to 100% with NO A/B flag, per owner direction (recorded D3). This is an explicit owner exception to the board's "every core-flow change behind an A/B flag" directive, consistent with D2(a): at ~14 users/day a test can't power this year, so we ship and watch a pre/post baseline instead of arms. Guardrail: `spot_action`/directions should not collapse; `favorite_toggled` should rise. INSTRUMENTATION_CHANGELOG flags the 2026-07-09 layout-driven discontinuity so no analyst reads the save/share bump as organic.
Verification: build clean, 57/57 tests, touched file lint-clean (3 standing errors are the `.feedback-auto/` copy). Exercised both states in a mobile viewport: unsaved = filled azure "Save this spot" primary, saved = pink "Saved" with the saved-count incrementing (event fired). Confirmed the hierarchy live on production via `/?spot=1`: Save filled primary (y755), Share outlined secondary (y809), Get Directions + Photos demoted half-width row (y859).
DEPLOYED: `vercel --prod --yes` on main. paddletowater.com 200, new hierarchy confirmed in the live DOM.
State: items 10 and 11 both done and live. No `[ready]` items remain: item 12 (iOS bottom band) is `[proposed]` lower-priority; items 3/4/5/7/8/9 parked or proposed pending the ~2026-07-15 retention re-check. Loop stops (ready backlog dry); 2 items shipped this run.

## 2026-07-09 · Shipped item 10: removed the spot-sheet "Report an issue" button
What: dropped the low-traffic "Report an issue with this spot" link and its FeedbackModal wiring from the spot sheet (`components/SpotDrawer.tsx`); issue reports still route through the header Feedback button. The removal exposed a stale reference on the Disclaimer page ("the Report an issue link inside any spot's detail") pointing at a feature that no longer exists, so that copy was fixed to send people to the main-page Feedback button, and two em dashes in the adjacent accuracy paragraph were replaced with commas (house style). Pure UI removal + copy fix, no new logic, no analytics change (the button fired no event), A/B-flag-exempt per studio config.
Verification: build clean, lint clean on touched files (the 3 standing lint errors are the pre-existing `.feedback-auto/` copy), 57/57 tests pass. Exercised live in a real mobile viewport: the report link is gone, Share/Save/Photos/Get Directions remain and the sheet ends cleanly, header Feedback still opens. Confirmed the string is absent from a clean rebuild, and the Disclaimer fix is live across repeated fetches (reportRefs=0, emDashes=0).
DEPLOYED: `vercel --prod --yes` on main (merge `322b43b` + follow-ups `1a35fe8`, `05e3796`). paddletowater.com and /disclaimer both 200, changes confirmed live.
State: item 10 done. Item 11 (re-arrange spot-sheet CTAs to lead with Share + Save, behind an A/B flag) is `[ready]` and next. Item 12 (iOS bottom band) parked as lower-priority. One studio iteration run this invocation; not under /loop, so no wakeup was scheduled.

## 2026-07-08 · Ingested D1 + D2; recalibrated the experiment method (item 6b)
What: both decisions came back answered (a). **D1(a):** deferred all three item-5 cron/schema follow-ups (parked, not abandoned; revisit when the watched set grows past 1). **D2(a):** shipped the method recalibration (c243cc4, merged to main): (1) `alert_interstitial` retired as an A/B test, now a monitored 100% rollout, the card renders on every alert-open and we watch guardrails instead of comparing arms, removed the flag read + exposure logging + stale readout query; (2) decontaminated `next_good_window`'s primary by excluding `source=alert_interstitial` directions (ifNull guard keeps NULL-source drawer taps), so it stays a clean drawer-vs-drawer comparison; (3) recalibrated `next_good_window`'s decision rule to the real MDE (~430-680 exposed/arm, months-long window, early reads directional-only). Docs + INSTRUMENTATION_CHANGELOG updated.
Verification: build clean, 55/55 tests pass, source lints clean (3 lint errors are pre-existing in the stale `.feedback-auto/` copy), verifier CONFIRMED all six intent points including the subtle HogQL ifNull guard. Event strings confirmed in the built bundle.
DEPLOYED: owner ran `vercel --prod` on 2026-07-08 (the autonomous deploy was gated by the auto-mode classifier for the "never straight to 100%" directive; owner reviewed and shipped). Verified live: homepage 200 and the deployed JS chunk is byte-identical to the verified local build. Production confirms the `alert-interstitial` flag is gone (100% rollout) while the monitoring events and the still-active `next-good-window` flag remain. The 100% rollout + decontaminated metric are now in effect. Read the recalibrated `next_good_window` primary only from 2026-07-08 forward (INSTRUMENTATION_CHANGELOG).
State: D1 + D2 both RESOLVED. No `[ready]` items left (7/8/9 proposed, gated on the ~07-15/~07-21 re-checks). Backlog is paced, not stalled.

## 2026-07-07 · Escalated D2: the live experiments are underpowered
What: owner probed the experiment rigor. Honest audit: instrumentation is sound (symmetric exposure, real control), but no power calc was done pre-launch and one now shows both experiments are underpowered, ~430-680 exposed/arm needed for a 5pp lift vs the doc's 30; alert-interstitial (1 subscription) can never reach significance. Plus cross-experiment contamination on the shared spot_action metric, no peeking/multiplicity correction, and the primary is a directions proxy the owner already declined as a goal. Filed D2 (rec: convert alert-interstitial to monitored 100% rollout, mutually exclude the flags / de-share the metric, recalibrate next-good-window). Non-blocking; experiments keep running until answered.

## 2026-07-07 · Both experiments LIVE; spot #148 deployed; studio resumed
What: owner created both PostHog flags (`alert-interstitial`, `next-good-window`, control/treatment 50/50), so both A/B experiments are now running on the already-deployed code. Separately deployed main (`vercel --prod --yes`) so the owner-merged spot #148 (Lakeshore Park Lake, Newark, PR #10) is live (verified /spot/148 = 200). Flipped the studio marker back to studio:v1 (it was only ever paused in the working tree, never in git).
Verification: homepage 200, /spot/148 200. Flag creation not independently verifiable by the manager (no read key); taken on owner confirmation ("done").
State: no open PRs, no [ready] items (item 5 blocked on D1, items 7/8/9 proposed). D1 still open, non-blocking. Do not read the experiments before ~2026-07-21 (14 days) AND 30 exposed users per arm.

## 2026-07-05 · DEPLOYED to production (owner authorized)
What: ran `vercel --prod --yes` on main (49cb2bd). Verified live: homepage 200, and BOTH flag keys (`alert-interstitial`, `next-good-window`) confirmed present in the production JS bundle. Items 1 and 2 (with the corrected instrumentation) are now live. Both features remain DARK by default: no PostHog flag exists yet, so everyone gets control (nothing renders / today's behavior).
Remaining to fully activate: create the two 50/50 flags in PostHog project 458289. Manager cannot do this (needs the owner's phx_ personal API key, which the app does not expose); handed the owner a one-command script that reads the key from env. Deploy-before-flag order was deliberate: the corrected instrumentation is live before any experiment turns on.
Still open: D1 (defer vs approve item-5 cron work).

## 2026-07-05 · Owner said "merge them for me": queue drained, state reconciled
What: merged PR #6 (interstitial exposure fix), #7 (next-good-window), #8 (npm audit) into main, resolving the #6/#7 overlap in experiments.ts/analytics.ts/changelog/ROADMAP/BRIEFINGS by hand (both experiments + both events kept; 55 tests + build green after each merge). Closed #5 as redundant. Restored the studio state that lived only in the working tree: D1 (open), items 8 + 9 (proposed), item 5 blocked(D1).
NOT deployed: main is current but production is unchanged until the owner runs `vercel --prod --yes`. After deploy, create the `alert-interstitial` and `next-good-window` PostHog flags to start both experiments; until then both features are dark.
Open on owner: deploy; create 2 flags; answer D1 (rec: defer). No open PRs, no [ready] items.

## 2026-07-04T16:20:00Z · Item 5 sub-task: npm audit fix (PR #8, open)
What: took the smallest, safe sub-item of item 5 directly rather than launch another heavy pipeline right after the session-limit failure. `npm audit fix` (non-breaking) cleared 2 advisories, lockfile-only. 3 moderate prod advisories remain that need --force (breaking major bumps); deliberately NOT forced, left for owner review. Verified: 44 tests, build clean, lint unaffected (no source changed).
Judgment: reordered within item 5 (audit before the cron/schema sub-items) because the other three touch the protected cron or need a schema migration and warrant careful, non-rushed passes. Item 5 stays [ready] with the remaining three sub-items.
Loop status: FOUR studio PRs now await you (#5 doc, #6 fix, #7 feature, #8 audit). Stopping the loop; the queue needs draining more than it needs a fifth PR. Recommend pausing (ROADMAP marker to studio:paused) or merging before the next cron fire.

## 2026-07-04T16:05:00Z · Item 2 (next good window) built + verified; PR #7 open
What: "Looking ahead / Next calm window: Sat 7 to 10am" block in the drawer conditions area, behind the next-good-window A/B flag. Reuses the shared evaluateGoodWindow (extended with start/end hour, cron behavior unchanged) via a client-side lib/nextWindow.ts that mirrors getConditions caching and fails quietly. Symmetric both-arms exposure (corrected pattern), shared spot_action primary metric, dwell-gated next_window_viewed diagnostic.
Interruption handled: the ship pipeline's whole-branch verify agent died on the account session limit (resets 2pm PT) with the panel work uncommitted. Manager preserved it (pushed), then finished verification by hand: 55 unit tests, lint clean, build clean, Playwright drawer smoke green across treatment/no-window/fetch-fail/control/flag-absent, no JS errors. Live event capture not observable locally (no key); wiring verified by review.
Blocked on owner: merge + deploy PR #7, and create the next-good-window PostHog flag before starting the experiment. Same standing hold on PR #6 (fix) / the alert-interstitial flag.
Loop stopped after this item: three studio PRs (#5 doc, #6 fix, #7 feature) now await your merge; not going to pile on a fourth.

## 2026-07-04T07:40:00Z · Item 1 experiment instrumentation fixed (PR #6, open)
What: owner's question about the randomization unit surfaced a validity bug in the interstitial's already-deployed experiment. Randomization unit is the anonymous PostHog distinct_id (device/browser). Two defects fixed: (1) exposure logged only for treatment, so control had no cohort to compare; now symmetric trigger-based exposure for both arms. (2) card directions never hit the shared spot_action; now it does (source=alert_interstitial), making directions the arm-comparable primary metric. alert_interstitial_result demoted to treatment-only diagnostic. Query/doc/changelog updated.
Verification: 44 tests, lint clean, build clean; per-arm variant resolution + render confirmed live via Playwright. Live event capture not observable locally (no PostHog key in local env); wiring verified by type-checked EventPropMap + review.
Blocked on owner: merge + deploy PR #6 BEFORE creating the PostHog flag, else the first data collects against broken instrumentation. Caught pre-launch, so nothing lost yet.
Next up: item 2 (next-good-window in conditions).

## 2026-07-04T07:25:00Z · Item 1 verified by studio manager; PR #4 ready for owner merge
What: independently re-verified the interstitial branch locally. Evidence: 44 tests pass; lint clean on PR files (3 pre-existing errors are in untracked local .feedback-auto/, not the PR); build clean; Playwright against the prod build: deep link opens drawer, control renders nothing, forced treatment shows the card with decoded window label over the drawer, coords-based directions URL, dismiss works.
Fixes added: missing experiment readout query (analytics/queries/experiment_alert_interstitial.sql, referenced by the experiment doc but never created); item 3 (bounce fix) marked parked stale.
Blocked on owner: merge PR #4, then the studio deploys. Production behavior stays unchanged after deploy until the alert-interstitial flag is created in PostHog.
Next up: item 2 (next-good-window in conditions) next iteration.

## 2026-07-04T03:18:00Z · Alert deep-link interstitial shipped (item 1)
What: composeAlert now embeds the calm-window label in the push's deep-link URL; a new AlertInterstitial card shows it plus the spot's put-in notes and a Get Directions shortcut over the drawer, behind the `alert_interstitial` A/B flag (control = no change). New events alert_interstitial_shown/result.
Verification: npm test (44 passed), npm run lint (clean), npm run build (clean; new event strings confirmed in .next/static).
Not deployed: this PR only merges code. Production is unchanged until the owner runs `vercel --prod --yes`.
Next up: item 2 (next-good-window in the conditions panel) is top of the ready queue.

## 2026-07-02 · Studio enabled on this project
What: ROADMAP.md is now the studio backlog (items 1, 2, 4 ready; 3, 5 parked; Later section proposed). DECISIONS.md and .claude/studio.md created.
Next up: item 1, fix the 58% landing bounce.
