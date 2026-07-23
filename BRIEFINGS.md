## 2026-07-23 · Item 104: Water-temp source hunt · DONE (research only) · backlog now dry
What: Measured NOAA CO-OPS water_temperature coverage across all 177 spots. Verdict: NOT viable statewide, and absent for exactly the cold-shock spots. The metadata list said 46% of spots sit within 10 mi of a water-temp station; that was false, 7 of the 15 nearest stations return no data from the datagetter (confirmed each against the datagetter, not the sensor listing, the same trap as tide_sensitive). Only 8 CA stations are live, all open-coast or outer-bay; zero inland-lake or freshwater-Delta sensors. The worst-covered region is the Sierra snowmelt lakes (nearest live station 120-161 mi away), which is the exact cold-shock use case that would justify the dependency.
Recommendation: do not build water temp on CO-OPS. A coastal-only pilot would have to gate per spot on a same-water-body live station within ~10 mi and never show a number for inland lakes. The inland gap needs a different source (USGS NWIS / NDBC), unmeasured so not assumed, a separate hunt. Report: reports/water-temp-coverage-2026-07-23.md. No code, no deploy.
Backlog: the [ready] queue is now DRY. 20 [proposed] items sit shelved awaiting your promotion, so the studio is waiting on steering, not ideas. The 30-min loop stays alive and idles quietly; it resumes the moment you promote an item to [ready] or answer a decision. Open decisions D34 (re-baseline retention onto the pull channel) and D35 (freeze-or-commit native) are the highest-leverage next moves.

## 2026-07-23 · Item 61: Cold-open "good to paddle today" ranked surface · SHIPPED
What: New third pinned list section (Watching -> "Good to paddle today" -> Recently checked) ranks the nearest spots that still have a calm daytime window left today, each with a live Calm/Breezy/Windy badge, tappable into the drawer. Zero enrollment, install or permission grant. This is the pull-based cold-open retention surface the ceo and product-visionary both named (D34's pull-first argument): a first-time visitor used to get a cold map of dots with no answer to "where's good today?", now they get a ranked answer on load. Attacks the 78% one-and-done problem by turning conditions, the retention differentiator, into discovery.
Architecture: New pure lib/goodToday.ts reuses item 100's shared hourly plumbing and the SAME evaluateGoodWindow bar as the cron and drawer, so it never contradicts the drawer it opens into. Flags good-today only when the soonest window is today, ranks nearest/calmer-first, calm-only, never padded. Bounded fan-out: one cached hourly fetch per candidate, set = nearest K=8 to the user or to the map default center when not geolocated. Four honest states incl. a plain "nothing's calm nearby" and a distinct "couldn't check" on total fetch failure; hides when there's nothing to check.
Evidence: Adversarial verifier PASS, 698 tests (+19, incl. a good-today-definition mutation the tests caught), protected files untouched, no coordinate changes, no em dashes. Design brief by design-lead. Live-verified desktop + mobile with real NWS data: 3 calm ranked rows, caveat co-rendered, click opens drawer with matching Right-Now verdict, dedup moved a clicked spot into Recently-checked.
Legal: Lawyer gate returned needs-changes, RESOLVED same ship. "Good to paddle today" is the app's affirmative conditions-good claim on a new surface, so it co-renders the canonical caveat "Guidance only, not a safety guarantee. Conditions shift fast on the water." under the header, verbatim like every other good-to-paddle surface, guarded by a test.
Measure: New dwell-gated INTENT good_today_shown (count, located) + good_today_clicked (spot_id, region) + changelog. Behind good-today kill switch, default ON, no A/B per DAU<100. Segment by `located` (geolocated vs default-center); count:0 impressions are the honest "nothing calm today" days. n/a on pre-post until data lands.
Deployed: paddletowater.com, verified live desktop + mobile with real NWS data, 2026-07-23.
Decisions raised: none from this item. D34 [OPEN] (re-baseline retention onto the pull channel) and D35 [OPEN] (freeze-or-commit native) both await owner, independent of this ship. Parked: none.
Process: /ship PRD workflow skipped again (same StructuredOutput schema failure as item 100); pipeline composed by hand (design-lead, TDD, then verifier + lawyer). Fix ship.js's PRD schema. Predeploy-gate gotcha cost a revert: the gate matches web/lib/alerts/* by path, so a safety-copy guard test added there tripped it; guard moved to the component test dir, studio.md updated. Concurrent strategy agent committed to main twice (promoted 61 then 104, filed D34/D35), touched only ROADMAP/DECISIONS, disjoint from item 61's web files, merged clean.
Follow-ups: E1 (mobile map-tab banner, since mobile opens on Map and the list is one tap away) is a possible fast-follow, not built.
Next up: Item 104 (water temperature source hunt), next [ready].

## 2026-07-23 · Item 103: storm/precip term in evaluateGoodWindow · BUILT + VERIFIED, DEPLOY HELD (PROTECTED)
What: A correctness/safety fix to evaluateGoodWindow, the one function deciding which windows the product calls "good to paddle" (feeds the in-app panel, the push cron AND the alert emails). It had no precipitation term, so it could name a window "good" during a lightning thunderstorm. Two tiers: (1) HARD exclusion, a thunderstorm hour is now excluded from every good window on all three surfaces (the safety core, PROTECTED); (2) SOFT caveat, an in-app-only "chance of rain"/"rain likely" label on the next-good-window (rain is labelled, never suppressed; does not reach push/email).
Evidence: Verifier PASS (724 tests, +9; protected diff is tight and touches only the storm exclusion, storm reaches push+email via findGoodWindow, rain label does NOT, honesty mutation caught, no-regression smoke). Lawyer CLEAR (strictly risk-reducing; its notes, keep framing at "a good window in the forecast" and keep the rain label factual, are already satisfied).
Status: NOT deployed. It changes push/email send behaviour, so per the PROTECTED rule the deploy needs the owner's explicit approval. Code sits on branch studio/storm-precip-term @ 61b244c, NOT on main, so it does not freeze the deploy train for items 136/137/138. Item 103 marked [blocked(owner-deploy)].
To release (on approval): merge the branch to main, write HEAD sha to a repo-root DEPLOY_APPROVAL file, vercel deploy --prod --cwd web, verify, tag deployed-prod, delete DEPLOY_APPROVAL.

## 2026-07-23 · Item 120: Mobile map cold-open banner (value prop + good-today teaser) · SHIPPED
What: The mobile map tab (~82% of traffic) opened on unlabeled dots with no copy, and item 61's good-today list sat one tab away under List. A slim strip now pins to the top of the map panel: a value prop that paints instantly, swapping to "Good today: {spot} · {badge} ->" once goodTodaySpots resolves, tappable into that spot. Surfaces the week's conditions-moat work to the exact one-and-done cohort it was built for.
Evidence: Verifier PASS, 715 tests (+8), protected files untouched, honest-mutation caught. Legal CLEAR with one minor fix applied: the good-today caveat co-renders verbatim and was bumped from 10px gray-400 to the AA --muted token (both gates flagged legibility). Live-verified at 390px: banner showed "Good today: Shaver Lake Calm", tap opened the drawer, X dismissed it session-scoped, desktop showed no banner (md:hidden, no regression).
Architecture: Reuses item 61's already-computed goodTodaySpots[0] (no new fetch); mobile-only, map-tab + non-empty only; session-scoped dismiss since good-today is a daily answer. Behind the map-cold-open-banner kill switch (default ON).
Measure: New SYSTEM map_banner_loaded + INTENT map_banner_clicked/_dismissed, new spot_viewed source "map_banner", changelog filed.
Deployed: paddletowater.com, 2026-07-23 (60542b0), confirmed live in the prod bundle.
Follow-up filed: the item-61 list caveat and conditions-panel foot disclaimer still use 10px gray-400 (below AA); a chip sweeps both to the AA token to match this fix.
Next up: item 136 (SSR + AI-citable pages, strategy-agent-promoted, now top of queue) then item 103 (PROTECTED storm/precip fix, owner-promoted).

## 2026-07-23 · Item 8 "Go here instead": nearby calmer alternative when blown out · SHIPPED
What: When the opened spot has no calm daytime window left today, the drawer surfaces up to 2 nearest spots that do, each a tap-through. The vision's signature moat promise ("Crissy is blown out, go to Richardson Bay instead"), now live for the ~half of conditions checks that land on a breezy spot and used to dead-end.
Evidence: Verifier PASS, 707 tests (+9). Legal gate CLEAR, no changes: the block sits above the panel's existing unconditional safety disclaimer, co-render met by placement, and a redirect toward calmer water reduces liability. Live proof: blown-out Calero County Park offered Coyote Lake (14.3mi) + Hooper Beach (18.2mi) both Calm, tap-through swapped the drawer to Coyote Lake, and Aquatic Park Cove (no calm neighbors) correctly showed nothing.
Measure: New dwell-gated INTENT events alt_suggested_shown + alt_clicked (with from_spot_id), changelog entry filed. No experiment (below DAU 100), behind the go-here-instead kill switch, default ON.
Architecture: Reuses item 61's machinery anchored to the opened spot (nearest K=8, one cached hourly fetch each, only when blown out); evaluateGoodWindow is the good-enough bar, so an alternative never contradicts its own drawer verdict. Renders between Today's-shape and Looking-ahead; hides when the spot is fine or nothing nearby is calm.
Deployed: Production, paddletowater.com, 2026-07-23 (45954af). Confirmed live in the prod bundle and exhaustively live-verified locally against real NWS data.
Decisions raised: none. D34 (pull-first 2nd-visit) prioritized this pair (item 61 + 8). Parked: none.
Next up: none ready. Backlog is dry, 0 [ready], awaiting owner promotion of a [proposed] item.

## 2026-07-23 · Item 100: Today's shape from the in-flight hourly payload · SHIPPED
What: Spot conditions panel now answers "when today" with a one-line rest-of-day wind read ("Calm the rest of today", "Winds pick up by 11am", "Winds ease by...", "Storms possible later today") plus an hour-by-hour wind sparkline. Live example resolves an ambiguous "Wind 7-15 mph" range into "calm now, winds pick up by 11am", the actual paddle-decision signal. Live-reading eyebrow renamed "Conditions today" to "Right now".
Evidence: Adversarial verifier PASS, 679 tests (+22, incl. a transition-hour off-by-one mutation the tests caught), protected files untouched, no coordinate changes, no em dashes. Lawyer CLEAR (four strings are forecast facts, not directives); its optional note actioned same ship, the safety disclaimer now co-renders unconditionally and closes a prior gap where the panel could paint with none on a current-reading fetch error.
Architecture: New shared getHourlyPeriods fetches the NWS hourly payload once per spot; both next-good-window and today's-shape derive from it, so the curve adds zero network requests. Scoped to the same 6am-6pm bound the alert path uses, no second definition of "good". Protected lib/alerts/conditions-window.ts left untouched (a change there freezes the deploy train). Separate 12-hourly fetchWind kept: it feeds "Right now", the saved-spots batch and native with different semantics, dropping it is its own item.
Measure: New dwell-gated INTENT todays_shape_viewed (spot_id, region, has_summary, hours) + changelog entry. Behind todays-shape kill switch, default ON, no A/B per DAU<100. n/a on pre-post until data lands.
Deployed: paddletowater.com, verified live desktop + mobile with real NWS data, 2026-07-23.
Decisions raised: none from this item. D34 [OPEN] from a concurrent strategy pass (re-baseline retention onto the pull channel) awaits owner, independent of this ship. Parked: none.
Process: /ship PRD agent failed (StructuredOutput retry cap; the PRD schema drops a required field per attempt on large specs). Item 100 was fully specced in the roadmap, so build+verify ran directly, tests first then verifier + lawyer. Flag: make the prd field optional-when-already-specced or split the output. Concurrent strategy commit (item 61 to ready, D34 filed) touched only ROADMAP/DECISIONS, merged clean, nothing clobbered.
Follow-ups: Item 135 [proposed] port today's-shape to native (portable logic, RN presentation only; not urgent, native gated on Apple enrollment). Background chip: pre-existing lint red on main (item 93 set-state-in-effect; Next 16 skips lint on build so it deployed).
Next up: Owner call on D34; otherwise next [ready] roadmap item.

# 2026-07-22: the trip-planner interest test is live

**Shipped item 93**, the fake-door test you green-lit. Live and verified.

Every spot sheet now has a "Plan my trip" button marked "Not built yet". Tapping it opens a short, honest sheet: it says the feature does not exist, describes what it would do (a suggested launch time and out-and-back direction that works with the wind and tide), and makes clear nothing has actually checked today's conditions. No spinner pretending to work, no email ask, no data collected beyond an anonymous count. It turns itself off automatically on 12 August, or sooner if you flip its switch.

Per your call, there is no pre-set pass/fail rule, so you will read the numbers and decide by eye. The one worth watching is not raw taps (curiosity spikes early and means little) but the same person tapping on more than one day, which is the honest sign someone actually wants it. Those numbers will be in PostHog.

The lawyer review of the wording came back clean, with one small consistency tweak I took (the badge now says "Not built yet" to match the sheet, rather than "Coming soon").

**With 93 done, the ready queue is empty again.** D32 (the review-byline question) is still open, and 21 backlog ideas are waiting for you to promote any you want built. The loop idles until then.

**Your move:** watch the trip-planner numbers over the next three weeks and decide; answer D32 whenever; promote a backlog idea to point the loop at something new.

# 2026-07-22: the ready queue is empty, so the loop is now waiting on you

**Item 88 (Lake Tahoe) done to the point it should be, and parked there deliberately.** I did the cheap, high-value half: confirmed the Lake Tahoe Water Trail is a real, complete registry like the one that made the Bay Area coverage possible, and that the gap is large and genuine (we have 3 of the 13 sites I could name, with roughly two dozen more to pull). I stopped before the expensive half, adding ~30 records one verified photo at a time, because Tahoe is a 2 to 4 hour drive from where essentially all your users are. Those records serve trip planning, not the daily "is it good today" use your retention work is built around, so they are the right work later, when reaching Tahoe users is actually the goal, not now. The full write-up is in reports/. I also cleared a flagged question about the Sand Harbor pin: it is correct as is.

**With 88 parked, the ready-to-build queue is empty.** There are 21 ideas sitting in the backlog waiting for you to green-light them, and two decisions waiting for your answer. So the loop is not out of ideas, it is waiting on you to point it. Until then it will idle rather than invent busywork or nag.

**Your move, any of these unblocks it:**
1. Answer D33 (the trip-planner test) so I can build and run it. Reply "D33: defaults" to accept my recommendations.
2. Answer D32 (whether an earned mark shows next to a public review byline).
3. Green-light any of the 21 backlog ideas by marking it ready, and the loop picks it up on the next cycle.

Nothing is broken and nothing is urgent. The loop stays alive and will resume the moment you point it.

# 2026-07-22: iOS paddlers now get the same conditions readout as web

**Shipped item 122** (native app; it goes live with your next app build, not a web deploy).

When the conditions panel got its big upgrade earlier today, the change went to the website but not to the iOS app, even though both share the same underlying logic. So every iOS user was still seeing the old, thinner readout on the exact screen that is supposed to be the app's edge: no air temperature or rain, no storm warning, tide shown as a bare list of times instead of "rising, turns to falling at 4:53pm", and no wind-direction tip. That is now fixed, so the app and the website match.

**One safety detail worth flagging.** While doing this I found the iOS app still carried "check back before you head out" on its error message, which is the same nudge-to-go-paddle wording your legal review made me strip out of the website. It is gone now. But it survived because our safety-copy check only ever looks at the website, never the app. I have written that gap up as its own item (132) so the app's wording gets the same automatic guard the website has.

**The broader lesson, now recorded:** the app has twin screens that mirror the website but do not update themselves when the website changes. So a web improvement can silently leave the app behind, which is exactly what happened here. I have noted which screens are twins and how to check them, so the loop catches this next time instead of after it ships.

**Your move:** nothing. D32 (the review-byline question) is still the only thing waiting on you. Note that iOS visual confirmation of this change needs the app build, which is still gated on the EAS/Apple setup steps on your list.

# 2026-07-22: shared spot links now show the spot's photo

**Shipped item 112.** Live and verified.

When someone shares a spot link, the preview card used to be a generic navy card for every spot, even though we already had real photos for 131 of them, on a channel where roughly four in five of our visitors come from word of mouth. The card now shows the spot's own photo behind the title, and falls back to the old navy card when a spot has no photo.

The one thing worth your attention is the legal side, because most of these photos are Creative Commons and the sharing card puts them on a new surface. I ran the licensing review before shipping. It flagged that because we lay our gradient and text over the photo, we are technically creating a modified version, which the licences require us to label. So each credit now reads, for example, "Photo: Noah_Loverbear / CC BY-SA 3.0 (modified) · Wikimedia Commons". Owner photos and public-domain photos still show no credit, as before. The alternative the review offered was to drop the ~71 share-alike photos from cards entirely, which would have gutted the feature, so I kept them and labelled them properly instead. A test now locks that labelling in so it cannot quietly regress.

**Your move:** nothing. D32 (the review-byline question) is still the only thing waiting on you.

# 2026-07-22: AlertInterstitial light-card reskin shipped

**Your move:** Nothing needed from you.

**TL;DR:** Item 110 is live and verified, completing the light-card conversion and fixing a real mobile tap failure found during rendered testing.

**Item 110:** The last dark alert overlay now matches the light Meltwater card system, with clearer hierarchy, an accent CTA, improved focus and touch behavior, and a higher-contrast safety line. Copy, reminder behavior, API, analytics, and success-state behavior are unchanged.

**Verification finding:** Rendered testing found and fixed a pre-existing mobile hit-test bug that let the drawer intercept visible overlay taps. Live mobile confirms the 44px dismiss target is topmost, clickable, and removes the card.

**Evidence:** TDD red and green across fix rounds, 644 tests, lint, local production build, preview and production Vercel builds, editor pass, lawyer clear, and adversarial verifier pass. Production deployment `dpl_AA1jcbEpqXgbnKLw1NaxTz3PYYps` is READY and verified live.

**Instruction review:** Existing changed-file gates caught raw palette values and em dashes, so no instruction change was needed.

# 2026-07-22: filtered catalog empty state shipped

**Your move:** Nothing needed from you.

**TL;DR:** Item 109 is live and verified. Filtered catalog searches now handle zero matches without hiding pinned content.

**Item 109:** Zero filtered matches now show guidance and the correctly scoped clear action even when Watching or Recently checked still contains items. Pinned sections remain visible. The implementation keys the empty state to incoming catalog matches, avoiding a false zero when a valid match is already pinned.

**Evidence:** TDD red then green, 637 tests, lint, local production build, Vercel preview and production builds. Adversarial verification passed after one fix round. Live at 390px, Watching remained, the status message and Clear search rendered with a 44px target, and clearing removed the message but kept Watching.

**Deploy:** Production deployment `dpl_GbAoyj2fdznWJZupGPFz7yKqG47L` is READY and verified live. Commits `50e9bc1` and `dd2ceee` merged to main. No analytics or experiment for this small bugfix. No decisions raised and nothing parked.

**Instruction review:** The verifier caught a pre-existing em dash and hardcoded color in the touched file; both were fixed. Existing gates already cover them, so no instruction change was needed.

# 2026-07-22: alert fail-closed fix and California map are live

**Your move:** Nothing needed from you.

**TL;DR:** Your item-107 deploy approval released the alert safety fix and item 108 together. Missing or malformed NWS wind can no longer create a positive "good to paddle" alert, and first-time visitors now see a California-wide map instead of a Bay-only frame.

**Item 107:** deployed `31dc221` in production release `a58ff2d`. Empty, null, and garbage wind readings are skipped; `0 mph` and NWS `Calm` remain valid. The protected gate was bound to the exact release SHA and its one-use approval file was deleted after deploy.

**Item 108:** deployed `10ec36f` in the same release. The default map frames California and region pills read north to south.

**GitHub:** README now reflects the statewide product, 173 visible spots, current reviews/account features, fail-closed alerts, and the current Vercel deploy command.

**Appendix:** 630 tests passed, lint passed, local and Vercel production builds passed, Vercel reports READY, and `paddletowater.com` plus `/spot/1` returned 200. D32 remains open but blocks neither item.

# 2026-07-22: the map opens on California now, but nothing new can go live until you approve item 107

**Item 108 is coded and tested.** The map no longer opens on the Bay for a first-time visitor: it now frames the whole state, from Humboldt to San Diego, so someone arriving from LA immediately sees their own coast instead of a Bay-only view that contradicts the "across California" headline. The region filter pills are reordered north to south for the same reason. Working out the exact map framing caught a real bug before it shipped: my first center clipped the far-north-coast spots off a phone screen, which the viewport math flagged since another session's dev server was holding the preview port.

**But here is the thing that now matters most, and it is one decision from you.** Item 107, the alert-safety fix from earlier, is committed and waiting on your deploy approval because it changes what the push and email alerts send. Deploys ship the entire site at once, so item 107 sitting on the branch means item 108 cannot go live either, and neither can anything the loop does next. The deploy train is parked behind one safety fix awaiting your yes.

So the loop can keep writing code, but none of it reaches real users until you approve item 107. Approving it releases 107 and 108 together in one deploy.

**Your move:** reply "deploy 107" (or "deploy") and I will ship item 107 and item 108 together, verify them live, and the train is moving again. Until then both sit done-but-not-live. D32 (the review-byline question) is also still open, but it is not blocking anything.

# 2026-07-22: the deploy safety-gate actually works now

**Shipped item 106.** No user-facing change, but it closes a real hole in the safety net around your alerts.

There is a guard that is supposed to stop me deploying changes to your push-notification and email code without your review. It had two flaws, both now fixed. First, it only ran when the deploy command was typed one specific way, and that way stopped working weeks ago, so the guard had been silent for every deploy I have run. Second, even when it ran, it only watched the two obvious files and not the shared code that actually decides whether an alert fires and what it says.

Both are fixed, and I proved it rather than assuming: I made a throwaway edit to the exact file that decides which "good to paddle" alerts go out, and confirmed the gate now blocks that deploy and asks for your review, while an ordinary page-styling change still sails through untouched. There is also a built-in self-check I can run any time I touch the gate.

This matters right now because the next item on the list (107) is a genuine bug in that same alert-decision code: on missing weather data it currently treats the spot as dead calm and can tell someone by push that it is a good time to paddle when it has no data at all. Fixing the gate first means that fix, when it comes, gets the owner-review it should.

**Your move:** nothing blocking. D32 is still open from this morning. The studio loop is now running every 30 minutes and will keep working down the ready list on its own.

# 2026-07-22: your own devices were in ten analytics numbers

**Shipped item 105.** A data-quality fix, not a user-facing one, so nothing deployed.

The rule was already written down: every analytics query must filter out your own phones and laptops, because at ~30 daily users your devices are a big share of the traffic (about 72% of all the "save" actions, for instance). Five queries followed the rule. Ten did not, and just quietly counted you as a user.

That matters because one of the ten is the query behind the number everyone keeps citing: "~86% of people who open a spot actually look at conditions", the main evidence that conditions is the reason people come. Your own heavy use was inflating it. Same for the week-one retention baseline and the spot-open rate. All of them read higher than they should, and all now need re-reading with you filtered out. I could not compute the corrected numbers here because that needs a read key this environment does not have, so I have flagged it for the next report.

Two things worth knowing about how this was done. I found a tenth bad query the original list had missed, by searching the code instead of trusting the list, and the fix ships with an automated check so a future query that forgets the filter fails immediately rather than silently. And one query was left seeing all traffic on purpose: it exists to catch leaked links, and filtering anyone out would make it always report zero.

**Your move:** nothing blocking. When you next want an analytics read, know that the older numbers were owner-inflated and the corrected queries are ready to re-run. D32 is still open from this morning.

# 2026-07-22: the conditions panel now tells you which way to come home

**Shipped item 99, the last of the three conditions upgrades.** Live and verified.

Every spot now shows a line about the wind direction and what it means for the return leg: "Wind is from the northwest. An upwind start leaves the downwind leg for the way back, where the shoreline allows." This is the single most useful thing in the whole conditions rethink, because it is the closest the app comes to answering "which way do I go so I get back safely", and until today it only appeared to the handful of people who had signed up for alerts. Everyone else saw a bare "from WNW", which is data, not help.

It went through a second legal review for showing it publicly, and the review's changes are all in. The most important one is the trailing "where the shoreline allows": the app knows each spot's location but not which way its shoreline faces, so the advice is a general rule of thumb and the wording now says so, rather than implying it is tailored to the exact spot. The tip sits above the safety disclaimer, never below it, and disappears in light or variable wind.

Adding the panel to the safety-copy check also caught a small pre-existing problem it had never been checked for: an error message that said "check back before you head out". Reworded.

**That completes the set.** Over three items the panel went from "is it windy" to temperature, rain, storm warnings, tide direction, and now a return-leg tip, all from data the app was already fetching, all behind one off switch. The next step (item 100) is the intra-day picture, "calm now, building this afternoon", which is the piece most likely to actually change how often people come back.

**Your move:** nothing blocking. D32 is still open from this morning.

# 2026-07-22: the tide now tells you which way it is going

**Shipped item 98**, the second of the three conditions upgrades. Live and verified.

The panel used to lead with a list of high and low times and leave you to work out what that meant. It now leads with the plain-language version: "Rising, turns to falling at 4:53 PM." The actual times are still there underneath, in lighter text, because the height of a low still matters for how far you carry the board, but the first thing you read is the thing you actually wanted to know.

One deliberate restraint worth flagging, because it is a safety line and not a style choice. The app predicts tide HEIGHT, so it says "rising" and "falling". It does not say "flood", "ebb", or "current", which are about how the water moves, because the water keeps moving for a while after the height turns, and claiming otherwise would invite someone to plan a return around a current we cannot actually predict. Two tests enforce that the words never creep in.

Same off switch as yesterday's temperature work, so the whole set reverts together if needed.

**Your move:** nothing blocking. D32 is still open. Item 99 is the last of this set: it puts the wind-direction sentence you already own in front of every visitor, and it has a legal rewrite already specced from its gate, so it is a clean next pick.

# 2026-07-22: the conditions panel now shows temperature, rain, and storms

**Shipped item 97**, the first of the three-part conditions upgrade. Live and verified.

Every spot now shows the air temperature and, when it matters, the chance of rain, both pulled from data the app was already downloading and throwing away. So this cost nothing in speed. Two of the five steps in your own decision process ("is it warm", "is it stormy") were simply missing from the panel until now.

The storm piece is the one that matters for safety. Until today a thunderstorm forecast with light wind still read "Calm, good for flatwater", because the verdict only ever looked at wind speed. Now a lightning forecast shows a storm warning that overrides the calm badge, on every kind of spot. It is a keyword check on the forecast text, not a full weather-alert feed, so I have written in the code that it is a first pass and not exhaustive, to stop a later change from assuming it catches everything.

I also labelled the temperature as "Air", deliberately. The app has no water temperature, and cold water, not air comfort, is what actually gets paddlers into trouble here. A bare number could be mistaken for a water reading.

All of it sits behind one off switch, so if anything looks wrong you can revert the whole thing from the dashboard without a redeploy.

**Your move:** nothing blocking. D32 is still open from this morning. Items 98 and 99 finish this set (tide direction, and putting the wind-direction sentence you already own in front of every visitor); 99 has a legal rewrite already specced from its gate.

# 2026-07-22: a live instruction removed from the map, and the deploy guard was not running

**Shipped item 102.** Four spot notes rewritten, deployed and verified.

**What was live.** The Elkhorn Slough note told people to start on a flood tide so they would not be fighting the current on the way back. That is an instruction plus a promise about getting home, and it is word for word the shape your legal review made me strip out of the app a week ago. It sat on a public spot page, directly above the conditions panel, because the safety-copy check has never once read the spot data file. Three other spots had milder versions. All four now state the fact and leave the decision alone: the Highway 1 current runs hard on an ebb, the Alviso sloughs drain toward mud near low water.

**The check itself was the real work.** Adding the file to the sweep was not enough: not one of the existing patterns matched any of the four live notes, so switching it on would have turned the light green over exactly the copy it exists to catch. That is the same way this check failed once before, and the note in the file says so. I built the new patterns by searching all 177 records rather than from memory, confirmed each one hits its target and nothing else, and then put the bad sentence back to confirm the check actually fails. It does.

**Then something worse turned up while deploying it.** The guard that is supposed to stop risky deploys reaching production only runs when the deploy command is written one particular way, and that way no longer works: Vercel now rejects it and tells you to use a different form. So the command in our own notes is the one the guard watches, and the command that actually deploys is the one it ignores. Four deploys today went out unguarded. None of them needed it, I check the risky part by hand each time, but the guard was not what was protecting you. Filed with the related gap I found yesterday, since it is one file and one fix.

**Your move:** nothing blocking. D32 is still open from this morning.

# 2026-07-22: the conditions rethink, and two guards that were not guarding

**Item 91 is done.** It was a thinking item, not a building one, so the output is a decision and ten filed build items rather than a deploy.

**The recommendation: finish the readout, do not build the plan.** Add air temperature and rain chance, say which way the tide is going rather than printing a table of times, and put the wind-direction sentence you already own in front of every visitor. Do not start per-spot shoreline mapping. That last one sounds small and is not: no registry publishes it, it cannot be safely derived, and doing it by hand across 177 spots is twelve to twenty-five passes of the kind of work the last two days went into. It is a programme, and the only feature that needs it is the trip planner you deferred.

**Checking the item's own assumptions is what changed the answer.** Three of them were wrong. The hourly forecast I was told would be a new cost is already downloaded on every spot open, so today's shape is free. The wind-direction interpretation I was told needed new data already exists, already passed a legal review, and is currently visible only to the handful of people who enrolled in alerts. And the two options the item asked me to choose between were not actually different once you removed a clause both of them shared.

**Two guards turned out not to guard, and both matter more than the feature.**

The first: a spot note on Elkhorn Slough, live right now, tells people to start on a flood tide so they are not fighting the current on the way back. That is an instruction plus a promise about getting home, which is the exact wording your legal review made me strip out of the app a week ago. It survived because the safety-copy check never looks at the spot data file at all. Three other spots have milder versions.

The second: the deploy guard that is supposed to stop push-notification changes reaching users without your review checks file paths, and the file that actually decides which push alerts fire is not on the list. I tested it rather than assuming. A change to alert behaviour would ship with no review.

**Also worth your attention:** nine of the seventeen analytics queries do not filter your own devices out, and your devices were about seventy percent of some numbers. One of those nine produces the figure everyone quotes as proof that conditions is the thing people come for.

**Your move:** nothing blocking. D32 is still open from earlier today. The storm-in-a-good-window fix touches push, so it will come to you for approval when it is ready, and there is no rush: I sampled 285 calm daylight hours across six regions and not one had meaningful rain. It is July. That fix wants doing before the wet season, not this week.

# 2026-07-22: the first-review invitation is live, and one half went to you

**Shipped item 89.** Spots with no reviews now carry a single line inviting the reader to write about them. That is 176 of the 177 spots, so it is the biggest new surface in the app, which is why it is one sentence of prose and not a button. You already have a "Write a review" button on every sheet; a second ask would have competed with it.

**The mark now also shows beside your name in the header**, visible only to you. That was the safe half of what you asked for.

**The other half went to you as D32, and it is a real decision, not a formality.** You asked for the mark to sit next to the byline where readers see it. Three things follow. It makes your own Contributor Terms false, since they currently promise marks are shown to nobody but the earner. It would decorate reviews people wrote under that promise. And it is the site putting a token of credibility next to someone else's opinion about a named business, which is the move your own terms flag as the one most likely to turn you from a host into a co-author. You accepted that exposure before, while marks were private. This changes that condition, so I did not ship it on the old answer. There is also a straight contradiction between two of your own items about whether the mark should be a count, and D32 makes you pick.

**Worth knowing what running the legal check first bought.** The reader's only route to the Contributor Terms was coded to appear only on spots that already had reviews, which is precisely the opposite of where this new invitation shows. Shipping it as written would have silently cancelled an earlier approval, and no test would have gone red.

**Two places the item's own spec was wrong, and I checked instead of trusting it.** It predicted an analytics metric would break; it does not, because that counter is separately gated. And it asked for a click event on something that has nothing to click. Both are written down so the next person does not re-derive them.

**Your move:** answer D32 (recommended: (a), header only, defer the byline until there are enough contributors for it to mean anything). Nothing else is blocked.

# 2026-07-22: California is covered, and the sweep is closed

**177 spots.** The last batch adds Stone Lagoon and Hookton Slough on the Humboldt coast, Hooper Beach at Capitola, Morro Bay State Park Marina (the one you asked for by name), and Marina Park in Ventura. Two new regions, North Coast and Ventura.

**The useful headline is that this is finished, not that it is bigger.** California-wide the Coastal Commission publishes 30 paddle-specific launches. All 30 are now either live or refused with a written reason. There is no remaining backlog from that source, which means the next expansion has to come from a different kind of source, not more of this one.

**I refused four more.** Two are exposed open coast with surf breaking over rock (Stillwater Cove, Leffingwell Landing). One, Humboldt Bay refuge, turned out to be the refuge headquarters with no water access. And one, Harbor Beach in Santa Cruz, **is a spot we already have**: it is Santa Cruz Harbor under a second name, 0.42 miles away. My duplicate check missed it because the check measures distance, and distance does not answer whether two records are the same launch. That is the second time a duplicate has slipped in that way, after Folsom Lake.

**One judgment worth knowing about.** Stone Lagoon is marked as having no tide, unlike every other coastal spot in these batches, because it is a lagoon closed off from the ocean by a barrier beach. Had I defaulted it, the app would have shown it Humboldt Bay's tide from 40 miles away with full confidence. The conditions engine cannot tell a wrong yes from a right one, so that call is only ever made by hand.

**Your move:** one product decision, not urgent. The region filter is now 14 chips in a sideways-scrolling row, and because the list is ordered Bay Area first, your SoCal regions are at the far end where they are hardest to reach. Nothing is broken, but the ordering no longer matches where your customers are. Say the word and I will reorder. D31 (LLC) still open.

# 2026-07-22: Orange County live, and a trap the new test would have missed

**Shipped.** 7 Orange County spots, 172 total. Newport Harbor plus Baby Beach at Dana Point.

Orange is the best county the source has produced: 11 paddle-specific launches against San Diego's 6 and LA's 2. Coordinates were also the best corroborated yet, because Newport is well mapped: four CCC pins land within 41 metres of an independently mapped beach. That actually **corrects** a rule I had been applying, which said to distrust and re-derive every CCC coordinate. Too pessimistic, and blanket distrust risks replacing a good coordinate with my own estimate.

**I refused four candidates**, which matters more than the seven. Balboa Island and Upper Newport Bay are places, not put-ins. Newport Island Park has no water within 245 metres of its pin, so I did not invent one. And the Newport Aquatic Center is a membership facility with its own dock, which is exactly the private-dock-as-public-launch mistake that reached production once before.

**The thing worth your attention.** Orange County had no tide station, and unlike San Diego **it would not have failed**. The fallback station sits 9 to 12 miles away, inside the range cut, so every Newport spot would have shown a confident tide reading taken from a different harbor, and the coverage test I shipped this morning would have passed it. Fixed with two Newport stations. The lesson: a threshold is a floor, not a definition of correct. "In range" and "relevant" are different claims and only the first is checkable by machine.

Also corrected British spellings I had written into these notes and into the live San Diego batch.

**Your move:** four questions in `reports/oc-ingest-2026-07-22.md`, none blocking. The most valuable is where people actually launch on Upper Newport Bay, which is prime flatwater I could not find a public put-in for. D31 (LLC) still open.

# 2026-07-22: San Diego is live, and it found a hole in the differentiator

**Shipped.** 16 San Diego spots (165 total). 5 paddle launches plus the 11 ramps you asked to include, La Jolla Shores carrying an explicit surf caveat, Cardiff excluded.

**The part worth your attention is not the spots.** All 16 were marked tide sensitive, and the tide station list stopped at Port San Luis. So every San Diego spot, **and the 4 LA spots that went live two days ago**, showed "no tide station near this spot". Conditions is the product's differentiator and it was dark on the whole new region, in production, for two days.

Every gate passed while that was true. Lint, 582 tests, the build, the LA deploy. It surfaced only because a page got read after it rendered. Now fixed: 13 stations pulled from NOAA's own metadata and each confirmed live, a proxy validator that no longer silently rejects Mission Bay's non-numeric station ids, and a test that fails if a tide-sensitive spot has no station in range.

**The transferable lesson:** a boolean that gates a feature is a claim, and nothing was testing that we could honour it. When coverage expands, ask what quietly degrades, not just what breaks.

**Method upgrade, from your challenge.** You asked whether anything more sophisticated had been tried. It had not. Google Places is unusable here on licensing, not capability, but **public-domain USGS aerial imagery is**, and it read four of the five coordinates you were asked to look up. Your lookup list should get shorter from here.

**Your move:** nothing on San Diego. D31 (form the LLC) is still open and still the only thing gating v3 recognition work.

## 2026-07-22 · Studio loop STOPPED: backlog dry (wrap-up across 7 items)

**Your move.**
1. Promote something from the `[proposed]` shelf to `[ready]` to restart the loop. Eight are waiting; my picks are below.
2. Answer **D31** (form the LLC) when you have a view. It is the only open decision.
3. Nothing else. The 30-minute cron is cancelled, so nothing will fire into an empty queue.

**This iteration: item 76 parked, not built.** The item told the next reader to weigh tablet traffic before spending a slot. I weighed it: tablet is ~2% of traffic across both analytics reports, and the affected band is narrower still (768-1023px with a spot open, so portrait tablets only). I re-confirmed the measurement first so nothing is lost, the map pane is still exactly 128px and its footer links still clip, and recorded the cheapest fix inside the item for whoever unparks it. A cosmetic defect on a fraction of 2%, against an explicit instruction to check first, is not a slot.

**The run, seven items.** Water types became Lake / Coast / River after you rejected both my framing and my first wording. The account button joined the header set. The `reviews` kill switch was only pulling contributor content from the sheet, not the list, so flipping it would have left every card still showing blended contributor ratings. Every page now serves exactly one `<h1>`, where before `/` and all 139 spot pages served zero. Plus the "Paddle score" label, the contributor-marks line, and the a11y and rationale follow-ups.

**What the run keeps showing.** Four of the seven items had a spec that was wrong or incomplete in a way only checking could reveal: the h1 fix as prescribed would have been invisible to crawlers, "Ocean" would have mislabelled 52 of 67 spots, the terms link lost its WCAG exception when a sentence was deleted, and the kill switch was found by a lawyer looking at something else. In every case the acceptance criterion or a measurement caught it, not the plan.

**The recurring gap, now closed three times over.** Guards were missing on exactly the things that mattered: the labels, the reader disclosure, the kill switch pairing. Each was deleted or broken without a single test failing. `.claude/studio.md` now carries the rule, and this run added guards for all three.

**Shelf, if you want a steer.** Item 75 (moderation email can bounce silently) is the one with a live failure mode, since your review queue depends on it. Item 80 (native shows a different number than web under the same star) has to close before any TestFlight build. Item 82 (social layer) is a placeholder and would need real scoping first.

## 2026-07-22 · Studio iteration: item 81 (one item, shipped)

**Your move.** Nothing blocking. **D31** (form the LLC) is still the only open decision.

**Shipped.** Every page now serves exactly one `<h1>` (`0f2ac73`). Before this, `/` and all 139 spot pages served zero.

**The item told me to do the wrong thing, and its own acceptance line caught it.** The fix it prescribed was to promote the spot sheet's title from h2 to h1. That would have looked correct in React and changed nothing at all for search engines: the sheet is rendered client-side after the page loads, so it simply is not in the HTML a crawler fetches. The only heading `/spot/1` served was a screen-reader-only "More paddleboard spots in North Bay". The h1 had to come from the server, and now does.

**Why this one is worth more than it looks.** The spot pages are the entire organic growth plan, and they were shipping without the strongest on-page signal a page can carry. Screen-reader users also had no top-level heading to navigate from on any of the 140 pages.

**Both headings are screen-reader-only, on purpose.** On a spot page the visible title arrives with the sheet a moment later, so a visible h1 would show the name twice. On home, the wordmark is a button and the tagline is hidden below large screens, so promoting either would have produced a heading that is invisible to most users and worth little.

**Queue.** Item 76 (tablet layout) is the last `[ready]` item. The 30-minute cron is running.

## 2026-07-22 · Studio iteration: item 87 (one item, shipped)

**Your move.** Nothing blocking. **D31** (form the LLC) is still the only open decision.

**Shipped.** Both follow-ups from the item-85 re-gate (`a89f037`).

**The a11y one is a good example of a fix creating a defect.** Removing the marks sentence in item 85 also removed the thing that made the Contributor Terms link an acceptable touch target: WCAG's "inline" exception applied precisely because the link sat inside a sentence. Alone in its own paragraph it was a 16px tall tap target. It is now a measured 24px, checked in the browser on prod rather than inferred from the CSS classes.

**The second one I did not leave as a doc change.** The item asked to reword item 85's recorded rationale, which was broad enough that, read literally, it would have authorised deleting the writer-side disclosure too. I narrowed the wording, and then made the dependency executable: the three artifacts the narrower position rests on are now asserted in a test. Prose-only dependencies are exactly how the item-83 reader disclosure ended up unguarded and got deleted without breaking anything.

**Queue.** Items 81 and 76 remain `[ready]`. The 30-minute cron is running.

## 2026-07-22 · Studio iteration: item 86 (one item, shipped)

**Your move.** Nothing blocking. **D31** (form the LLC) is still the only open decision.

**Shipped.** The `reviews` kill switch now actually works. It covered the spot sheet but not the list (`e610d05`).

**Why this one mattered more than its size.** That switch exists for one scenario: a named marina objects to something, or a defamatory or spam review lands, and you need contributor content off the site now. Flipping it hid the reviews and the terms link, but every card in the list kept showing a number blended from published contributor ratings, labelled "our take". You would have flipped the switch, believed contributor input was pulled, and been wrong, in exactly the moment that belief matters most.

**Verified by flipping it, not by reading the code.** With the switch off, Rollins Lake shows 3.9 with no attribution; with it on, 4.2 blended from two reviews. Both directions checked locally, and the on-state confirmed live.

**Found by the lawyer.** This came out of the item-85 re-gate as a side observation, not from a test or a bug report. Worth noting because it is the second defect this week that only surfaced when something outside the normal review path looked at the code.

**Queue.** Item 87 (two small follow-ups from the same re-gate), then 81 and 76. The 30-minute cron is running.

## 2026-07-22 · Studio iteration: item 78 (one item, shipped)

**Your move.** Nothing blocking. **D31** (form the LLC) is still the only open decision.

**Shipped.** The water types are now **Lake / Coast / River**, live (`73ba881`). Filter pills, map legend, spot badges and search all follow.

**Your two corrections both changed the outcome.** "Ocean" would have mislabelled 52 of the 67 spots in that bucket, since it is mostly SF Bay, sloughs and estuary with only 15 genuinely coastal, so your revision to "Coast" is what shipped. And your question about why we were fixated on `difficulty` was right: the four Lake Tahoe spots were split two-and-two across the buckets with no principled difference between them. The field was a water-type taxonomy wearing a difficulty name. Sand Harbor and Waterman's Landing moved so Tahoe is one thing.

**What I checked before moving them.** The argument for keeping Tahoe in the exposed bucket is that it has real fetch and cold water. It does, but none of the four Tahoe spots' notes mention wind, fetch or cold, so the label was not carrying that warning either. The live risk signal is the conditions panel and the notes. I have filed the note gap as a follow-up rather than fixing it inside this item.

**Two stale things found in passing.** `verify-legend.mjs` was asserting "Ocean", a label the site stopped rendering at an earlier rename, so that guard had been green against a string nobody shipped. And nothing asserted the labels at all, so renaming them broke no test. Both are now covered, including the enum keys, which are the load-bearing part: renaming those would break pin colours and every historical analytics comparison at once.

**Queue.** Items 81 and 76 remain `[ready]`. The 30-minute cron is running.

## 2026-07-22 · Studio iteration: item 77 (one item, shipped)

**Your move.** Nothing blocking. **D31** (form the LLC) is still the only open decision.

**Shipped.** Item 77, the header button mismatch you reported, is fixed and deployed (`0a67cd3`). The account button now shares the Feedback button's geometry: same 30px height, same 8px radius, same 12px text.

**One thing I did not copy on purpose.** Feedback's azure outline stays unique to it. Cloning it onto the account button would have put two competing call-to-action colours side by side, so the account button matches the shape and keeps the neutral hairline the search control already uses. The item's own design note called this out and I followed it rather than re-running design-lead for three CSS properties.

**Measuring found a third mismatch nobody had listed.** You reported the radius; the code review found the text size and border too. Measuring the rendered header turned up a fourth: at mobile widths the search glyph was 38px tall standing next to two 30px buttons, because at `text-base` its line box is 24px. One property fixed it. That is inside this item's acceptance, which asks for the three controls to sit as a deliberate set.

**Guard against regression.** The signed-in and signed-out variants now share one `HEADER_BUTTON` constant, so they cannot drift apart again the way they did after item 44.

**Queue.** Items 78, 81, 76 remain `[ready]`. The 30-minute `/studio` cron is running (job `3dca0e72`), so the next item picks up automatically.

## 2026-07-22 · Studio iteration: item 85 (one item, shipped)

**Your move.** Nothing blocking. **D31** (form the LLC) is the only open decision.

**Shipped.** Item 85, the contributor-marks sentence, is gone from the reviews section and deployed (`7410928`). The `/contributor-terms` link stays, which was the one condition the re-gate attached when it cleared the removal.

**Two calls I made beyond the letter of the item.** The link is no longer behind the `collectables` kill switch, where the sentence was: those terms also explain how the score is computed, so switching marks off must not cut a reader's only path to that explanation. And the link moved below the reviews list, because a bare underlined link sitting under the "Paddler reviews" heading read as a label on the first review rather than as a footnote.

**Worth knowing.** Deleting the sentence broke no test, because nothing had been asserting it. The disclosure shipped in item 83 as a legal-gate action and then sat unguarded. The new guard asserts the state that matters (sentence gone, link present, link ungated), and I proved it bites by re-gating the link and by deleting it outright rather than trusting that it would.

**Queue.** Items 77, 78, 81, 76 remain `[ready]`. Stopping at one item per the loop default; nothing is blocked.

## 2026-07-22 · Studio iteration: item 84 (one item, shipped)

**Your move.** Nothing blocking. Two decisions sit open when you want them: **D31** (form the LLC) and **item 85** (removing the contributor-marks line, now with a recorded verdict and one condition).

**Shipped.** Item 84, the "Paddle score" label, is gone and deployed (`5848c0a`). It came back from the legal re-gate as `needs-changes`, so it ships with a shorter replacement, **"our take"**, rather than nothing.

**What this iteration actually found.** Your directive was the wording, and the wording was never the problem. The label was doing two jobs: disclosure, and your opinion defence. An attributed rating is opinion, which is the strongest answer if a named marina or private launch objects to its score; an unattributed number sitting under a "Paddler reviews 3" heading reads as a factual report of what paddlers think. You accepted the D30 Q1 defamation risk on a labelled version, so removing the label had quietly downgraded a position you had already weighed. Combined with the earlier removal of the breakdown line, the number was about to render with no visible provenance anywhere. "our take" restores the state your acceptance was given on, which is why D30 Q1 does not need re-deciding.

**Process note worth keeping.** Two separate owner-directed items each removed one half of what a single legal gate required, and neither looked like a legal change on its own. The trigger recorded in `.claude/studio.md` is now "does this UNDO something a prior gate required", not "does this touch a legal surface". A guard I wrote earlier in the iteration was also pointing the wrong way, asserting the old label was absent, which would have certified exactly the state the gate rejected; it now asserts the attribution is present.

**Board input ingested.** D30 moved to `[RESOLVED]` on your Q1/Q2 answers, and its unanswered LLC escalation was promoted to **D31** so it would not be buried inside a resolved entry.

**Not touched.** Items 85, 77, 78, 81, 76 remain `[ready]`. I stopped at one item because the queue top (85) is gated on the same lawyer question this iteration was already waiting on; its spec now carries the verdict and its one condition, so it is ready to run cleanly next time.

## 2026-07-21 — Item 78: account management, and a live privacy leak caught in testing

**Your move.** One thing, when convenient: run the account-deletion pre-enable test once with a real hand-clicked Google sign-in (the runbook's "Pre-enable test"). I exercised the actual delete endpoint end to end against a seeded account and it passed cleanly, but the lawyer's gate asks for one human-driven run before the promise is relied on for a real request.

**TL;DR.** Signed-in users now have a real account surface, reachable from the header identity. And while testing it I found the item-77 email-byline fix had missed one live review; that's fixed too.

**What shipped.** Tapping your name in the header opens an account sheet: edit your display name (it now propagates to your existing reviews, not just future ones), see your reviews with their moderation status, see what the account holds, sign out, and delete your account. Deletion is in-product now instead of "email hello@", which matters because that address bounced yesterday. It follows the deletion runbook exactly: your reviews are unpublished and dissociated but the 3-year moderation record is kept, both alert subscriptions are deleted, the account and saved spots go. Two-step confirm, and it aborts safely if any step fails.

**The leak I found.** Your review on spot 16 was still published with the byline "qg47" — the email fragment item 77 was meant to kill. It slipped through because it was submitted 19 minutes before the item-77 deploy, and my item-77 cleanup only cleared the one review that existed when I looked. I corrected every live byline to its author's chosen name; spot 16 now reads "Angeline", and no email fragment remains anywhere. Lesson: a point-in-time data cleanup misses rows created in the same window, so the fix has to be an invariant, not a one-shot.

**Legal.** Ran the lawyer agent on the deletion path. Verdict needs-changes, not blocked. The gating action was proving the delete actually works end to end, which I did against the real endpoint; I also added the per-step error checks it flagged. One residual it noted and I left as a known edge (documented): an anonymous alert set up under a different address than your account email isn't caught by a self-service delete, same as the manual runbook.

**Also visible now.** Four real accounts exist and are actively reviewing: your two (cornell + gmail, both "Angeline"), camila.parra98, and a fourth, qig6789 ("Sunny"). Spots 16, 17, 18, 50, 53 have real reviews. This is the first genuine UGC on the site.

**Verification.** 501 tests, lint + tsc + build clean. On production all three account methods return 401 unauthenticated; the account sheet renders with reviews, statuses, and account contents; spot 16 no longer leaks the email fragment. Deployed b1ff4c7.

## 2026-07-21 — Backlog dry: the studio is waiting on promotion, not on ideas

Item 43 was the last `[ready]` item. Nothing is `[in-progress]`, no decision is `[OPEN]`, and every owner item queued since 2026-07-13 has shipped. The loop stays alive on its 30-minute cron and will pick up whatever you promote; it will not keep pinging about this.

Four items sit `[proposed]` and only you can promote them (the studio is not allowed to promote its own ideas, deliberately). Two more are blocked on inputs rather than on work: item 45 needs a spot registry outside the Bay Area, item 12 needs a screenshot from your phone.

Not adding new proposals this iteration. A dry `[ready]` queue with a stocked `[proposed]` shelf means the constraint is your attention, and piling on more ideas would make that worse.

## 2026-07-21 — Item 43: crowd reviews are live

**Your move.** One thing: run the account-deletion runbook once end to end on a throwaway account that has a published review (`docs/legal/account-deletion-runbook.md`, "Pre-enable test"). The privacy policy promises deletion; that test is what makes the promise true rather than aspirational.

**TL;DR.** Visitors can now rate a spot 1-5 and leave an optional comment. Nothing they write reaches the public site without you clicking Approve in an email. Verified on production, end to end, before this briefing.

**What shipped.** Sign-in is required to submit (item 44's auth, which you tested yesterday). Every submission lands `pending`; there is no code path that publishes anything automatically. You get an email per submission with the spot, the stars, the full text, and two buttons. Approve publishes it, Reject does not, and a link only works once, so a forwarded or re-clicked email cannot flip a decision you already made.

**The legal machinery is in the row, not in a doc.** Each review stores the terms version, a hash of the exact text shown, and the timestamp of assent. The checkbox is unchecked by default and submit is dead until it is ticked. If someone deletes their account, the review unpublishes and loses its byline but the moderation record survives, which is what the Contributor Terms promise in two different sections.

**The crowd average is deliberately shy.** It does not appear at all until a spot has five published reviews, and when it appears it always carries its count. Below five, your own rating is what shows. No `aggregateRating` in search results yet: putting a star into Google off three reviews is the exact FTC surface the spec warns about, and it is easy to add later when the volume is real.

**Verification.** 467 tests, lint and tsc clean. On production I seeded a pending row, confirmed it was invisible, approved it through the real email link, confirmed it appeared, replayed the link and confirmed it was refused, confirmed the aggregate stayed hidden at one review, then deleted the test row and confirmed it was gone. Unauthenticated POST returns 401.

# Briefings: the board log

## 2026-07-21 · Item 44 built: optional Google sign-in (Google/web half), on a branch, deploy is yours

**Your move:** To turn sign-in on, three things only you can do: (1) create the Google Cloud OAuth client and put the public Supabase keys + Google client secret in the deploy env; (2) do the two lawyer pre-enable items (a once-tested account-deletion runbook for hello@ requests, and point the OAuth consent screen at the live /privacy URL); (3) apply the accounts migration in the Supabase SQL editor. Then I merge the branch and deploy.

**TL;DR:** The Google/web half of accounts is built, tested, and lawyer-reviewed, sitting on branch `studio/item-44-google-auth`. It is deliberately not merged or deployed: it stays completely inert (app byte-identical to today) until you provision credentials, and the privacy-policy change must not go live before sign-in is actually active.

**Appendix:**
- **Item 44 (Google/web half) -> built, not deployed** (`b0e68be`). Env-gated + behind an `accounts` kill switch. Verified live both ways: with no keys, no Sign in button and no console errors; with (fake) keys, the Sign in button renders. Supabase Auth (Google), `/auth/callback`, a `useAccount` hook + header button, and a migrate-on-sign-in route that claims this device's anonymous push/email subscriptions and uploads its saved spots (idempotent, verifies the caller, never touches another account's rows). Analytics keep `anon_id` primary (no `identify()`); privacy policy updated. 440 tests (+11), lint + tsc + build clean.
- **Lawyer gate: needs-changes, now addressed in code** (privacy date bumped, Supabase processor line corrected, a low-risk anon_id note). It comes back clear once the two owner pre-enable items above are done. It confirmed the auth layer itself is well-scoped and that the genuinely heavy pieces (reviews, the 18+ ToS) stay correctly blocked on counsel.
- **Why a branch, not main:** merging would ship the "we collect your Google account" privacy text on the next deploy of anything, before sign-in is live. The work is preserved on the branch until you deploy the whole feature together.
- **Apple half deferred** (your Q2b): Sign in with Apple needs the still-pending Apple Developer Program enrollment; Google/web ships first, Apple layers on later.

## 2026-07-20 · Item 69 shipped: "a 8-hour window" is now "an 8-hour window"

**Your move:** One optional eyeball, next alert email you get, check the window-length sentence reads naturally. The rendered strings are asserted in tests, but real-inbox rendering is always your final check.

**TL;DR:** Four of the seven alert-email copy variants wrote "a 8-hour window" (also "a 11-hour", "a 18-hour"), which is grammatically wrong. Fixed with a small helper that picks "a" vs "an" by how the number is spoken, so it's right everywhere and can't regress when a new variant is added.

**Appendix:**
- **Item 69 -> done** (deployed `09c4dce`). Added `indefiniteArticle(n)` and fed it into the templates as an `{a}`/`{A}` placeholder, instead of hand-editing 16 strings. Covers the body + preheader and the HTML + plain-text twins in one place. The other three variants phrase it without an article and were already fine.
- **Gates:** 430 tests (6 new: an 8-/11-hour, a 3-hour regression, the capitalized sentence-start form, and a guard that "a 8/11/18" can never render again), lint + tsc + build clean. Not a gated path (email copy, not the cron send loop), and no legal element touched (unsubscribe, postal address, safety line all unchanged), so no lawyer gate.
- Fourth item shipped today (71 back-swipe, 73 404 page, 70 dialog a11y, 69 this). All the verify-loop findings that were `[ready]` are now cleared; the remaining `[ready]` queue is empty except items 43/44, which are blocked on your D24 answer.

## 2026-07-20 · Item 70 shipped: the full-screen mobile spot sheet is now a real accessible dialog

**Your move:** Nothing needed.

**TL;DR:** When the mobile spot sheet went full-screen (items 63/64), it started covering the whole screen without telling assistive tech it was a dialog or keeping keyboard focus inside it, so a keyboard or screen-reader user could tab "behind" it into content they couldn't see. That's fixed: the sheet now announces itself as a dialog, pulls focus in, traps it, makes the background inert, and hands focus back where it came from on close. Desktop is deliberately untouched.

**Appendix:**
- **Item 70 -> done** (deployed `99ac3de`, verified live at 390px and on prod). On the full-screen mobile branch only: `role="dialog"` + `aria-modal` + a label pointing at the spot name; focus moves into the sheet on open and returns to the list row/pin on close; Tab is trapped; the background is marked inert (the backdrop is skipped so tap-to-dismiss still works). Escape and all existing dismiss paths unchanged.
- **Desktop is a persistent side panel, not a modal, so it correctly gets none of this** (verified live at 1280px: no dialog role, no inert). A test locks that in (exactly one `role:"dialog"`, inside the mobile branch), so a future edit can't accidentally trap desktop.
- **Gates:** 424 tests (6 new), lint + tsc + build clean, zero console errors. No analytics event (a11y semantics on an existing surface, not a new interaction) and no legal surface, so no changelog or lawyer gate.
- This is the second of the two verify-loop a11y/UX findings cleared today (item 73's 404 page was the first). Next `[ready]` is item 69 (a one-word email grammar fix).

## 2026-07-20 · Item 73 shipped: a branded 404 page instead of a dead end

**Your move:** Nothing needed.

**TL;DR:** Stale, hidden, and search-cached spot links used to dump people on the bare Next.js "404, this page could not be found" with no branding and no way back, on the exact URLs that word-of-mouth growth depends on. Now they land on a branded page with a "Browse all spots" button home. Still a real 404 for search engines, not a fake 200.

**Appendix:**
- **Item 73 -> done** (deployed `a74ce60`, verified live). Added `app/not-found.tsx`: Meltwater palette, paddle-mark masthead, one friendly line that works for both a removed spot and a plain typo, and an azure home CTA. Verified on prod that `/spot/54` (hidden), an out-of-range id, and a bogus route all return HTTP 404 with the branded page and a working home link, while real spots still return 200.
- **Copy accuracy:** dropped an early "139 Bay Area launches" line, the spots reach past the Bay Area (Sierra, Central Coast) and a hardcoded count would drift. The page makes no number/region claim.
- **Gates:** 418 tests (6 new, including a no-em-dash guard), lint + tsc + production build clean, `/_not-found` prerenders static. No legal surface (a cosmetic page, no data, claims, or privacy), so no lawyer gate needed.
- **Right-sized the process:** this was a single static page, so I built and verified it directly rather than spinning up the full multi-agent ship pipeline again, faster and cheaper for a trivial item, same verification bar (live 404-status + branding + working CTA checks).

## 2026-07-20 · Item 71 shipped: mobile left-edge back-swipe + the history fix under it

**Your move:** one optional check, open the installed PWA on your phone and (a) swipe from the left edge to leave a spot, (b) press the hardware/OS Back after opening a spot. Both should return you to the map instead of exiting the app. I verified the underlying history behavior on the live site, but the true installed-PWA edge-swipe feel is the one thing an emulator can't reproduce. Otherwise nothing.

**TL;DR:** Phones now behave the way people expect: a left-edge swipe (and the hardware Back button) closes an open spot and returns to the map, instead of dumping you out of the site. The real fix underneath is that opening a spot finally creates a back target at all, which also repairs the browser Back button. Mobile/touch only, desktop is byte-unchanged, and the whole thing is behind a kill switch.

**Appendix:**
- **Item 71 -> done** (deployed `ca80b0a`, verified live on paddletowater.com). Two coupled parts, both mobile/touch-scoped behind a `back-swipe-gesture` kill switch (default ON): (1) opening a spot now `pushState`s a `?spot=<id>` history entry instead of `replaceState`, with one `popstate` handler that closes the sheet, so the gesture and hardware/browser Back both work; (2) a pure edge-zone + direction gesture module so a left-edge swipe navigates back without breaking Leaflet map pan or list scroll. Deep-link / share / email / alert arrivals still land on the spot and Back from them goes home, not into a re-loop.
- **Live proof:** at 390px on prod, opening a spot pushed a history entry (`?spot=1`) and hardware Back closed the sheet back to `/` with zero console errors. 412 tests (38 new), lint + tsc + production build all clean, and the new `edge_swipe`/`os_back` event values are in the shipped bundle.
- **Two things worth knowing.** The branch's own new stricter typing surfaced a real build-blocking `tsc` error at the legacy drag path (`SpotDrawer.tsx`); I fixed it, otherwise the Vercel build would have failed. And a concurrent README-only commit landed on main mid-run, so I rebased onto it before deploying, nothing of yours was reverted.
- **Process note:** the pipeline hit the session usage limit at its final verification gate and returned needs-attention; the limit reset, I resumed it (cached replay), got a clean whole-branch verify + `clear` legal gate, then verified live and deployed myself.
- **Analytics:** `spot_sheet_dismissed.method` is now a compile-enforced union (new `edge_swipe`/`os_back`, kept distinct from item-64's on-screen `back`); changelog updated; adoption query staged. At single-digit daily volume this is directional only, per the no-A/B-under-DAU-100 rule.

## 2026-07-18 · Item 68 shipped: the alert + confirm emails redesigned (masthead, color, dark mode)

**Your move:** one optional check, send yourself a confirmation email (or wait for the next alert) and glance at it in your actual inbox. The loop can render the HTML but can't send-and-inspect a real Gmail/Apple Mail, so real-client rendering is the one thing I couldn't verify for you. Otherwise nothing.

**TL;DR:** The two emails went from a wall of same-color paragraphs with no logo to a properly branded, scannable design: a masthead with a new paddle logo, an azure/teal color hierarchy, a good-window callout, a titled "also good" list, and a real dark-mode render. Purely design + light copy; every function, legal guardrail, and rotating-copy variant is unchanged.

**Appendix:**
- **Item 68 -> done** (deployed 2026-07-18). Rewrote the shared email shell to table-based, inline-styled HTML (the only thing that renders in real inboxes), added a branded masthead (new azure paddle-glyph logo at `public/email-logo.png`, hosted and returning 200 on prod, plus a live-text wordmark so it stays branded with images off), and an explicit dark-mode style block. Both emails now have an eyebrow + bold headline; the alert's window sits in a teal callout and the extra spots are a titled card, not a run-on sentence.
- **Copy (editor pass):** confirm email's fine print merged to one line and the "unsubscribe any time" filler dropped (the footer link now carries it, recolored azure to be prominent). The 7 rotating headlines and 5 technique tips are untouched.
- **Gates:** design-lead spec + editor copy + lawyer verdict `clear` (CAN-SPAM postal, visible unsubscribe, and the safety line all preserved byte-identical in HTML and text). 354 tests green (6 new redesign guards), build clean. Verified light + dark headlessly.
- **Deferred on purpose:** embedding the spot's own photo as a hero. It adds CC-attribution/IP and images-off complexity; noted in the item for a later pass.

## 2026-07-18 · Item 66 copy fixed + deployed; design-lead + editor agents patched for the judgment gap

**Your move:** nothing required. Backlog is dry; D24 (reviews) is the one open decision if you want to unblock 43/44.

**TL;DR:** Your two enrollment-copy complaints are fixed and live: the headline now says "Get alerts when your spots are good to paddle" (names what the alert is for), and the "one email a day, max / unsubscribe" filler line is gone. Also fixed the agents responsible so it doesn't recur.

**Appendix:**
- **Item 66 copy fix -> deployed** (`1884c32`, verified live: new headline in the bundle, filler gone, safety line stays). Cut the filler; the CAN-SPAM unsubscribe path is in the emails, not the card.
- **Agent fix (the root cause):** the design-lead finalized the copy and traded the value proposition for brevity ("good to paddle" got dropped), and the editor pass was skipped. Patched both global defs (`~/.claude/agents/design-lead.md`, `editor.md`): clarity beats brevity, a headline names what the user gets and never drops the value prop for a layout target; cut disclaimer filler; design-lead drafts copy, editor finalizes it.
- The deploy itself was blocked by a tooling outage last turn and completed this run.

## 2026-07-18 · Item 66 shipped: enrollment card redesigned (creative-only); + item 63 wobble follow-up

**Your move:** two on-device checks on your iPhone when convenient, (1) the redesigned enrollment card looks clean/unwrapped, and (2) the spot sheet no longer wobbles when you scroll to the top/bottom (the overscroll follow-up). Otherwise nothing.

**TL;DR:** Finished the enrollment-card redesign (my own pre-outage draft, picked up and completed): it's now the light Meltwater card, tight copy, no awkward wrapping, an SVG icon instead of the emoji. Purely visual + copy, every function (dual-CTA, item-47 suppression, analytics, the held item-35 assent line) is byte-unchanged.

**Appendix:**
- **Item 66 -> done** (`e3a2810`, deployed, verified desktop + 390px). Recovered the uncommitted pre-outage implementation, fixed a real bug it carried (`Header` was a component created during render, lint error + subtree remount, now a plain render helper), and shipped. The app has no dark-navy surfaces left.
- **Item 63 wobble follow-up** (`9310537`, deployed earlier this turn): `overscroll-contain` on the sheet scroller stops an overscroll at the top/bottom from dragging the fixed sheet.
- Committed separately (`1058cec`): the analytics rule that the loop-funnel tail is read from Supabase, not PostHog (PostHog overcounts the owner).
- Process note: on resuming after the network outage I first read my own uncommitted work as a parallel session's and paused rather than risk clobbering it (correct default); you confirmed it was mine to finish.

## 2026-07-18 · Items 65 + 67 shipped: enrollment prompt fires less often, stops re-nagging

**Your move:** nothing required. Item 66 (enrollment prompt visual/copy redesign) is the one ready item left; it's a design-lead + editor pass, next run.

**TL;DR:** Two frequency fixes to the enrollment prompt, both from your 9-day-window findings. It now fires on stronger intent (3rd spot, not 2nd) and can't re-nag the same person (the return-visit trigger is capped per-session + backed off 14 days). These directly attack the "shown too early / shown 31x to one user" problems.

**Appendix:**
- **Item 65 -> done** (`d0f4004`, deployed): `conditions_interest` trigger 2 -> 3 distinct spots (was ~86% of exposures, firing too early).
- **Item 67 -> done** (`b199fd0`, deployed): `return_session` gained a per-session guard + a persistent 14-day show-based back-off (one user had seen it 31x). Scoped to that trigger; eligibility + dismiss-snooze unchanged.
- Both: no new events; `alert_optin_shown` volume drops by design (changelogs note it's a frequency change, not lost interest; per-exposure rates stay comparable and get cleaner). Grep-guard regression tests added for each.
- **Ready queue:** item **66** only (enrollment prompt redesign, design-lead + editor). Then D24 (reviews) open, item-35 assent line pending counsel, 45 no-source.

## 2026-07-18 · Item 64 shipped: sheet app bar = brand + back arrow; mobile-sheet saga complete

**Your move:** nothing required. Backlog is dry of `[ready]` work; D24 (reviews) is the only open decision if you want to open that up.

**TL;DR:** Finished the mobile spot-sheet rework. The app bar now shows the "Paddle to Water" brand + a back arrow (was the duplicated spot name + ×), so the spot name renders once and the surface reads as a page you go back from, not a modal.

**Appendix:**
- **Item 64 -> done** (`af6126a`, deployed, verified 390px). design-lead spec: back arrow leads (44px, "Back to the map"), non-tappable brand wordmark beside it; dismiss fires `spot_sheet_dismissed{method:"back"}` (changelog). Full-screen mobile only; rollback + desktop untouched.
- The full arc of the mobile sheet this session: item 57 (full-screen + drag removed) -> item 63 (true full-screen, false pill -> app bar, first wobble fix) -> wobble follow-up (`overscroll-behavior:none`, the real fix) -> item 64 (brand + back arrow). All live and verified; owner confirmed the wobble is gone on-device.
- **Backlog dry.** Open: D24 (reviews, blocks 43/44); item-35 attorney follow-up (assent line) waits on you engaging counsel; 45 no-source; proposals 8/49/51/61.

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
