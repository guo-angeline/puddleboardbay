# Roadmap

**The single home for vision, strategy, and the backlog.** Do not create separate plan/roadmap/strategy docs; fold new product thinking into this file. (IMPROVEMENT-PLAN.md, ux-mobile-findings.md, and docs/strategy/ were consolidated here 2026-07-02 and deleted; full text in git history.) Implementation specs under `docs/superpowers/` are historical execution artifacts for shipped work, not roadmaps. This file is also the studio backlog.
<!-- studio:v1  (resumed 2026-07-07: deployed, both PostHog flags created, both experiments live. Only D1 still open, non-blocking.)  statuses: proposed | ready | in-progress | blocked(D<n>) | parked | done -->
<!-- The studio loop works the top-most [ready] item. Steer by editing statuses: promote [proposed] to [ready], demote to [parked], reorder. Shipped items move to the Shipped section with date + commit + deploy refs. -->
<!-- Pause everything by changing the marker above to studio:paused -->

> **Current focus (Jul–Sep 2026): retention is the #1 goal.** Everything else is secondary until the return rate moves. 78% one-and-done, W1 13-17%, first durable read ~early Aug. The bet: own a low-friction, reliable channel to re-reach users (email first, PWA push second, native never for now) and give them a reason to come back (calm-window alerts + a cold-open reason to check). Acquisition, SEO, UGC, and PaddlePass all wait behind proof that we can retain. See the "Retention: reach + enrollment redesign" epic below.

---

## Vision: the Paddle-Morning Oracle

*(Consolidated 2026-07-02 from the retired competitive-strategy doc of 2026-06-29.)*

The thing a Bay Area paddler opens at 7am to answer "where's good today?" Not a directory: forecast data plus local microclimate judgment, later hardened by crowd ground-truth reports ("paddled Richardson Bay, glassy til 11").

- **The gap:** nobody owns "should I paddle this spot today?" AllTrails is land-biased and structurally can't do conditions-as-habit. Windy/Windguru is raw meteorology for experts, no per-spot judgment or discovery. Surfline proved people pay (~$96/yr) for exactly this answer, but only for surfers. We are Surfline for the paddlers who aren't surfers.
- **The moat:** local depth and habit, not scale. A national app gives a wind number; we give the answer ("Crissy is blown out by 10am, go to Richardson Bay instead"). Per-spot microclimate/tide/fog knowledge for 140 Bay Area put-ins is the one moat a solo founder can build that AllTrails/Windy/Surfline won't bother to.
- **Alternatives considered and sequenced, not rejected:** safety-co-pilot framing folds in as a trust layer on the conditions judgment; community ("the local paddle tribe") is deferred until there are retained users to seed it. Habit first; community is a consequence of habit.
- **Business-model bet:** PaddlePass subscription is real but thin alone (~3,000 engaged locals x 7% x $35 ≈ $7k/yr). Local commerce/lead-gen (board rentals, lessons, clubs near a put-in) monetizes free users too and may out-earn the subscription. Revisit once retention is proven.

## Strategy: what the data says

From the Jun 7 to 27, 2026 analytics (`reports/analytics-2026-06-27.md`, PostHog project 458289):

- **286 users, but 78% are one-and-done.** Next-day return 7%, W1 retention 13 to 17%. Acquisition is steady (~14 new/day); the problem is retention, not traffic.
- **Conditions is the differentiator.** The thesis holds: water is conditions-gated in a way hiking is not, so conditions is the wedge and the moat ("AllTrails for water", where dynamic conditions are the thing AllTrails can't do). But the old evidence was overstated: "96 users pulled conditions 1,157 times (~12 each)" was `conditions_viewed` firing on every spot open when the fetch settled, i.e. fetch-success-rate and spots-per-user, not confirmed looks. The defensible read is **conditions data loads reliably (~91% of opens)** — an availability metric. True engagement is now instrumented via a dwell-gated `conditions_viewed` (see `analytics/INSTRUMENTATION_CHANGELOG.md`, 2026-06-29); watch that series before re-asserting "used heavily".
- **Saving and installing were dead because they had no payoff** (favorites 6 users, PWA 1 install from 182 prompts). The fix is to make them the on-ramp to conditions.
- **Funnel leaks:** 247 landed, 105 opened a spot (58% bounce without opening anything), 15 took a real action. "Get Directions", the true "I'm going" signal, was clicked by 5 users in 20 days.
- **Growth is word-of-mouth, not search:** 82% direct, Google sent 10 users. The 140 SEO pages are too new to rank.

**Business model:** freemium "PaddlePass". Free = discovery + check conditions. Paid = conditions alerts for your spots + multi-day forecast windows + (later) offline. Conditions alerts are the natural paywall: high value, recurring, uniquely water.

---

## Shipped

- 2026-07-14 [done] Item 30: fixed the map legend not displaying (Leaflet tile pane painted over it; the map now owns its stacking context via `isolate` on MapContainer; colors still from DIFFICULTY_LEGEND; committed Playwright regression check) (PR #38, merge 788c811, deployed + prod-verified 10/10)
- 2026-07-14 [done] Item 29: removed unlabeled emoji glyphs from the spot list (amenity icons, empty-state surfer, alerts-button bell; facts remain as labeled drawer tags; heart toggle kept) (PR #37, merge 88ca3c2, deployed + live-verified)
- 2026-07-13 [done] Alert email copy rotation: 7 editor-written wording sets, deterministic day-over-day rotation (no weekday pinning), variant tagged on the deep link + email_alert_opened for per-wording reads (60396cf, deployed)
- **Retention epic: conditions alerts (Stages A to D), shipped + live 2026-06-29.** Save a spot, install the app, get a capped daily web push when a watched spot has a calm window in the next 1 to 3 days. Stage A (Your Spots ranked by conditions), B (install/opt-in + service worker + push subscription), C (Supabase store + `/api/alerts/subscribe`), D (Vercel Cron watcher that sends). Spec: `docs/superpowers/specs/2026-06-27-retention-hook-design.md`; plans under `docs/superpowers/plans/2026-06-27-retention-hook-stage-{a,b,c,d}.md`.
  - **Unproven, watch the data before building more retention/premium:** opt-in grant rate (`alert_optin_result`), `alert_clicked`, and whether alerted users beat the 13 to 17% W1 baseline. As of 2026-07-01: 1 granted subscription (iOS standalone, 2026-06-30). **Re-check the save -> opt-in -> push -> return funnel around 2026-07-15 to 2026-07-22**; if saves are still ~2 users/week, fix the landing bounce (item 3) before iterating on alerts.
  - **Evaluator redesigned 2026-07-02:** the original day-period evaluator required the whole 6am to 6pm forecast max wind <= 8 mph, which never happens in SF Bay summer, so alerts could never fire. It now uses the NWS hourly forecast and alerts on >= 2 consecutive calm daytime hours (calm mornings count).
  - **Real-device test: complete.** Install + opt-in verified on a real iOS device 2026-06-30; subscription row confirmed in Supabase 2026-07-02; push confirmed landing and deep-linking to the spot on iOS 2026-07-03 (owner verified; copy well received). The full save -> install -> push -> return loop is now proven end to end for n=1. Cron moved 2026-07-02 from 13:00 UTC (6am PDT, woke sleeping users with a same-morning alert) to 02:00 UTC (7pm PDT / 6pm PST): with the hourly evaluator an evening send advertises tomorrow's window, which gives lead time to plan. Dry-run check: `curl -H "Authorization: Bearer $CRON_SECRET" "https://paddletowater.com/api/cron/check-conditions?dry=1"`.
- **Instrumentation pass, shipped + live 2026-06-29.** `spot_viewed` now carries `source: "list" | "map" | "deeplink" | "alert" | "related"` (canonical `SpotViewedSource` in `lib/analytics.ts`), and `alert_clicked` fires when the app opens from a push (the service worker tags the deep link `from=alert`). Outbound on Get Directions / Share was deferred (the `spot_action` click already captures intent; true "the link left" detection is fuzzy and low value).
- **Mobile UX conversion pass, shipped 2026-06 (branch `mobile-ux-fixes`, PRs #1 and #2).** Fixed the blockers from the 4-agent mobile audit: install banner no longer covers the drawer and dismissal persists in localStorage, Bay-default map with non-destructive pin selection, 44px save heart with first-run nudge, favorites hydration fix, map-tab empty state, place-name-first short search, partial-height draggable sheet, region-pill peek hint. Source docs (ux-mobile-findings.md, IMPROVEMENT-PLAN.md) retired 2026-07-02; still-open leftovers are backlog item 7.
- 2026-07-09 [done] Spot sheet: removed the "Report an issue" button (item 10). Dropped the low-traffic report link + its FeedbackModal wiring from the spot sheet; issue reports still route through the header Feedback button. Also fixed the disclaimer copy that pointed at the removed link and cleaned two em dashes there (house style). Verified live (sheet DOM + disclaimer). Merge `322b43b` (+ follow-ups `1a35fe8`, `05e3796`), deployed.
- 2026-07-09 [done] Spot sheet: re-weighted the CTAs for Save-first, Share-second (item 11). Save is now the full-width filled-azure primary (retention target), Share the outlined secondary (virality target), Get Directions + Photos demoted to a neutral row; saved state stays the soft-pink confirmed treatment. Shipped straight to 100%, NO A/B flag, per owner direction (DECISIONS.md D3, explicit exception to the flag policy: ~14 users/day can't power a test). Existing `favorite_toggled` / `spot_action` events unchanged; comparability note added (save/share rates rise, directions fall, as a layout effect from 2026-07-09, not organic). Verified live on prod (`/?spot=1`): Save filled primary, Share outlined secondary, Get Directions + Photos demoted. Deployed.

---

## Owner items, added 2026-07-13 (board-directed; the two [ready] items are queued top-most on purpose)



## 31. [proposed] A picture for each spot

**Why:** Owner idea 2026-07-13. Spot cards/sheets are text-only; a photo is the highest-impact visual upgrade for browse appeal and shared-link CTR.

**Acceptance (to be sized before promoting):**
- Every spot (or a defined first tranche) shows a photo on the drawer/sheet without hurting load performance (lazy-load, sized derivatives).
- Sourcing must be rights-clean and attributed (owner photos, CC-licensed with attribution, or a licensed API); no scraping. This is the hard part: 140 spots, so propose the sourcing plan + effort estimate as a decision before building.
- New user-facing surface: ships behind a flag or staged tranche per the major-update directive.

## 32. [proposed] Enrollment window: make the push CTA as prominent as email

**Why:** Owner call 2026-07-13: after tapping "Watch this spot", the enrollment window leads with the email field and buries push. Owner wants the push option presented at equal visual weight so push-capable users are not funneled into email by default.

**Acceptance (to be reconciled before promoting):**
- On platforms where push is possible (installed PWA, Android, desktop with permission), the enrollment card (`InstallPrompt.tsx`) presents push and email at equal prominence (equal-weight buttons or side-by-side choice), not email-primary with push as small print.
- Note the tension with item 23's per-platform channel matrix (email was deliberately made the lead on desktop/iOS Safari because push there needs an install first); resolve the matrix vs equal-prominence question explicitly in the design step, escalate to a decision if they can't both hold.
- Enrollment funnel events (`alert_optin_shown` `channel` prop, `alert_optin_result`, `email_capture_submitted`) must keep working so the mid-July funnel read stays comparable; changelog entry for any prop/semantics change. Changed core flow: behind a flag or explicit owner exception per the D3 precedent.

## 33. [proposed] Move the map zoom +/- control to the right side

**Why:** Owner call 2026-07-13: the +/- control sits top-left over the map; owner wants it on the right.

**Acceptance:**
- Leaflet zoom control renders on the right (`zoomControl` position, `MapView`), on desktop and mobile, not overlapped by the drawer (desktop right sidebar) or the mobile bottom sheet / legend at any viewport; verify with the drawer open.
- One-line UI change, exempt from the A/B flag rule.

---

## Epic: retention reach + enrollment redesign (email-first) — 2026-07-10

The lead work for the 2-month retention push. Install converts at ~1% (1 install / 182 prompts) and iOS web push needs an install first; email converts far higher, works on desktop, and is cross-device + identity-bearing (it also fixes the iOS Safari/PWA partition that blinds retention measurement). This epic adds an anonymous email alert channel on the SAME calm-window evaluator as push, and turns the install-only opt-in into a channel-agnostic enrollment surface that picks the right ask per platform. Full spec, schema, copy, and instrumentation: `docs/superpowers/specs/2026-07-10-email-alert-channel-and-enrollment.md`. Two blocking owner escalations before the first send: **D5** (CAN-SPAM postal address) and **D6** (rollout mechanism). Sequence: 21 (cheap, ship now) -> 22 (the build) -> 23 (placements, depends on 22).

## 21. [done] 2026-07-10 Rename Save -> Watch + broaden the enrollment trigger to conditions-interest

**Shipped 2026-07-10 (commit 1d1e2d9, by a parallel studio session; status reconciled here).** Save→Watch rename (SpotDrawer button, SpotList "Watching" header + nudge) and the conditions-interest enrollment trigger (fires the alerts prompt when a user dwell-viewed conditions on 2+ distinct spots in a session, `trigger: "conditions_interest"`). Confirmed present in the code and building.

Two cheap, independent Phase-0 wins that need no email backend. (a) Rename "Save this spot" to "Watch this spot" and the saved-section header to "Watching (N)": favorites = watch list = alert set are one array, so "watch" teaches the payoff and is honest even pre-subscribe (the saved section already shows live condition badges). Copy tweak, ships to 100%, no flag. (b) Broaden the enrollment prompt from save-only to conditions-interest: fire when the user genuinely viewed conditions (dwell-gated `conditions_viewed`) on 2+ distinct spots in a session, in addition to save / return-session, respecting the existing 14-day snooze. A bigger, better-qualified pool than savers (many check conditions without saving).

Acceptance: PRD section 13 Phase 0. Add `trigger: "conditions_interest"` to `alert_optin_shown` (`lib/analytics.ts`), an `INSTRUMENTATION_CHANGELOG.md` entry, and confirm the string lands in `.next/static`. Monitored 100% rollout with guardrails (shown volume by trigger, dismiss rate), not a powered arm.

## 22. [done] 2026-07-10 Email alert channel (anonymous, same evaluator as push)

**Shipped + deployed 2026-07-10** (commit `8dd1fdc`, deploy `dpl_2MnY8z...`). Migration `0003` applied to Supabase; Resend domain `alerts.paddletowater.com` verified (DKIM/SPF/DMARC). Spine live-proven end to end: subscribe -> Supabase pending row + Resend confirm email -> confirm token -> `confirmed_at` set. All five routes verified live on prod. D5 (postal address = 500 Folsom St) and D6 (100% rollout behind `EMAIL_ALERTS_ENABLED` kill switch) resolved. Nightly `send-email-alerts` cron accepted at 02:00 UTC. Known: the first confirm email hit Outlook spam (new-domain reputation, expected); warmup + DMARC->quarantine (~2026-07-24, tracked in memory) is the path to inbox.

The load-bearing build. Anonymous email alerts (email + watched spots, no account) fired by the SAME `evaluateGoodWindow` (`lib/alerts/conditions-window.ts`) as the push cron, so the two never disagree. Provider: Resend (React Email, free tier covers current scale, one-click List-Unsubscribe + complaint webhooks). New parallel Supabase tables (`email_subscriptions` / `email_watched_spots` / `email_sends` / `email_opens`, migration `0003`, kept off the protected push path), double opt-in, a daily `/api/cron/send-email-alerts` (1/UTC-day cap, per-(spot,window) dedup, `?dry=1`), one-click unsubscribe, and the ITP-proof `email_opens` return ledger. Full schema + copy + events: PRD sections 6-13.

Gated: the first lawful send needs **D5** (postal address for the CAN-SPAM footer) and **D6** (rollout mechanism). The build can start now; the send cannot go out until both are answered. First PII the app stores, handled per PRD section 8 (minimal storage, instant unsubscribe, delete-on-request). Deliverability (SPF/DKIM/DMARC on `alerts.paddletowater.com`) per PRD section 7; new events + changelog per section 11.

## 23. [done] 2026-07-10 Per-platform enrollment matrix (email as the fallback tier)

**Shipped + deployed 2026-07-10** (commit `fa1ada8`, same deploy). `InstallPrompt` is now the channel-agnostic enrollment card: desktop and iOS Safari lead with email, push-denied installed users get the email rescue, Android keeps one-tap install with an email fallback. `alert_optin_shown/_dismissed` gained `channel` + `platform:"desktop"`; `email_capture_submitted` gained the `push_denied` trigger (changelog item 23). Deliverability tweaks (preheader, human copy, `EMAIL_REPLY_TO`) shipped alongside. Verified: 87 tests, lint, build, bundle strings.

Depends on 22. Redesign `components/InstallPrompt.tsx` into a channel-agnostic enrollment card that shows ONE ask at a time by platform: desktop leads with email (today's desktop prompt is a dead, button-less card); iOS Safari leads with email and demotes install to a secondary "add to home screen too" (install converts ~1%); the push-denied installed user (`DENIED_KEY`) gets an email rescue instead of a dead end; Android keeps the one-tap install primary with email as the decline fallback. Full matrix + exact copy strings: PRD section 10; acceptance: PRD section 13 Phase 2.

## Epic: retention post-13-17 gaps (2026-07-10 journey re-audit)

After items 13-17 shipped, a full re-audit of every live retention journey (save -> install -> alerts, the push -> return loop, the launch-reminder loop, and in-session re-engagement) surfaced three gaps that blunt the funnel we just repaired. Sequenced 18 (highest leverage) -> 19 (cheap unblock, shippable independently now) -> 20 (trivial governance). Owner picked these three on 2026-07-10. These fix the push channel; the email second-channel that was considered alongside them was promoted the same day into the "retention reach + enrollment redesign" epic above (items 21-23), which now leads the backlog. The "nothing calm this week" fallback (folds into item 8) and a cold-open "Calm near you today" home stay deferred, not dropped.

## 18. [done] 2026-07-10 iOS install loses saved spots: the Safari -> PWA storage partition voids items 13/14

**Repro confirmed by owner (D7=a): the bug is real.** Then a technical obstacle: the approved "persist favorites keyed to the anon id" can't bridge the partition, the anon id is localStorage too, so the installed PWA gets a fresh one and can't look up the Safari session. Owner chose the **recovery-nudge floor** (over a fragile URL-token rehydration bridge or leaning on email). **Shipped 2026-07-10:** on an installed (standalone) launch with empty favorites, the empty-state nudge now reads "Re-save your spots here to get calm-window alerts. Saves from Safari don't carry into the installed app." instead of the generic first-run "Tap ♥" copy, so the loss is acknowledged and re-saving re-arms the item-14/15/16 alert re-offers. The strategic answer to the iOS install wall remains the email channel (items 22/23, email-first on iOS, no install, no partition). Full localStorage rehydration deferred (not worth the fragile URL bridge + a Supabase table given email sidesteps it). Verified: 87 tests, lint, build clean; Playwright confirms the recovery copy on standalone and the normal nudge in-browser.

Highest-leverage retention work available. `app/manifest.ts` sets `start_url: "/"`, and favorites are localStorage-only with no server persistence until a push subscription exists (`watched_spots` only syncs after subscribe, `lib/push.ts:161`). iOS gives an installed PWA a storage partition separate from Safari, so the installed app launches with an empty `ptw-favorites`. Item-14's re-offer gate (`readFavoriteIds().length > 0`, `components/InstallPrompt.tsx:115`) then fails, the return-session re-offer never fires, and the manual "Turn on alerts" button (needs `savedSpots > 0`, `components/SpotList.tsx:96`) never renders. The installed iOS user lands on an empty app with no saves and no alert offer, a dead end. iOS was ~72% of historical saves, so this likely nullifies items 13/14 on the platform that matters most.

Verify first: on a real iOS device, save a spot in Safari, Add to Home Screen, launch the PWA, and confirm `ptw-favorites` is empty and no prompt fires. Some iOS versions capture the current page URL at add-time, which could partly mitigate; the repro is the gating experiment before any fix.

Acceptance: saved spots survive the Safari -> installed-PWA transition, OR the installed-with-empty-favorites state shows an explicit recovery ("re-save your spots") instead of a blank app, so the item-14 re-offer becomes reachable. Approaches to weigh at build time: (a) persist favorites server-side keyed to the anon id or a pre-subscription token so the PWA rehydrates; (b) bridge the saved spot through `start_url` / the add-time URL and re-save on first launch; (c) empty-state recovery UI as a floor. Instrument the recovery path (`alert_optin_shown` already carries `trigger`; add a value or a distinct event) with an `INSTRUMENTATION_CHANGELOG.md` entry. New user-facing behavior on the primary platform: A/B flag is the data-lead's call given low traffic, but the changelog entry is required.

## 19. [done] 2026-07-10 Wire the launch-reminder scheduler (the loop is shipped but dead)

**Done 2026-07-10 (already wired; this closes the residual).** The scheduler was wired earlier this session: the owner created a Supabase **pg_cron** job `send-launch-reminders` (`*/15`) that hits `/api/cron/send-reminders` with the `CRON_SECRET` (Vercel Hobby can't do sub-daily crons, D4). Confirmed active by the owner via `select ... from cron.job`. This item's remaining acceptance, "record the scheduler in the deploy notes so it is not lost", is now done: documented in `CLAUDE.md` Deployment > "Scheduled jobs". The one open piece is the on-device confirmation that a real reminder push lands at fire time (owner declined the smoke test); everything up to it is verified in prod. The CTA is no longer a broken promise.

`app/api/cron/send-reminders/route.ts` is deliberately excluded from `vercel.json` because Vercel Hobby rejects sub-daily crons (DECISIONS D4), so every "Remind me at launch time" tap in the alert interstitial writes a `launch_reminders` row that never fires (`sent_at` stays null). A complete retention loop sits inert, and the CTA is a broken promise.

Acceptance: an external sub-daily scheduler hits `/api/cron/send-reminders` with the `CRON_SECRET` bearer every ~15-30 min, and a reminder fires ~30 min before its window opens. Preferred: Supabase pg_cron + pg_net (Supabase is already the store); alternatives are a GitHub Actions cron or a Vercel Pro upgrade. Verify with a dry-run (`?dry=1`) then a real scheduled fire landing on a device. If it cannot be wired, hide the "Remind me at launch time" CTA in `components/AlertInterstitial.tsx` so we stop promising what we do not deliver. No new client events required; record the scheduler in the deploy notes (`.claude/studio.md` / CLAUDE.md Deployment section) so it is not lost.

## 20. [done] 2026-07-10 Ship "Next good window" to 100% (retire the underpowered A/B)

**Shipped 2026-07-10.** Removed the `next_good_window` experiment gate from `NextGoodWindowPanel`; the "Looking ahead / next calm window" panel now renders for every user (it was hidden from half). Kept the dwell-gated `next_window_viewed` intent event for a monitored rollout; stopped emitting `experiment_exposed(next_good_window)`. Doc marked RETIRED / 100% rollout; changelog notes `next_window_viewed` volume rises as a rollout effect (do not compare across 2026-07-10). Verified: 64 tests, lint, build clean; Playwright confirms the panel renders with no experiment flag present.

`components/NextGoodWindowPanel.tsx` renders only for the `next_good_window` treatment arm, but the test needs ~430-680 exposed per arm (months at ~14 users/day) and cannot cleanly measure return short-term (`docs/experiments/next-good-window.md`). It is the one surface that makes opening the app cold (not via a push) worthwhile, and it is hidden from half of users.

Acceptance: remove the experiment gate so the "Looking ahead / next calm window" panel renders for everyone; keep the dwell-gated `next_window_viewed` intent event for a monitored rollout. Owner-approved D3-style exception to the A/B-flag policy (low traffic cannot power the test). Update `docs/experiments/next-good-window.md` to "retired, 100% rollout" and add an `INSTRUMENTATION_CHANGELOG.md` comparability note (the panel shows to all users from the ship date, so `next_window_viewed` volume rises as a rollout effect, not organic).

*Considered and deferred (do not open yet): email as a no-install alert channel (bypasses the iOS install wall, needs a provider + unsubscribe); a "nothing calm this week, here is a calmer nearby spot" fallback for silent-churn savers (fold into item 8); a cold-open "Calm near you today" home surface (the 7am-oracle vision as a default view, sequence after the loop is proven).*

## Epic: repair the save -> install -> alerts funnel (2026-07-09 journey audit)

The retention loop (save a spot, install, enable web push) is discoverable at the top but breaks in the middle. Five findings from auditing the live flow, sequenced by impact-to-effort. Items 13 and 14 sit on the main path and are the priority; 15 and 16 overlap (re-ask cadence) and may be built together; 17 is OS-constrained polish. These repair an existing, already-shipped flow, so per the flag policy small fixes are exempt; where an item changes the core flow (13, 14) a flag is the data-lead's call, but instrumentation + a changelog entry is required for any event change regardless.

## 13. [done] 2026-07-10 Prompt is suppressed by the very Save button that should trigger it

**Shipped 2026-07-10.** `InstallPrompt` no longer returns null when a drawer is open; it renders even with the drawer open and anchors to the TOP so it clears the drawer's bottom Save/Share actions (the old "cover Get Directions" concern is moot, item 11 demoted it). So a save via the in-drawer primary CTA now surfaces the enable-alerts step at save time on both mobile (bottom sheet) and desktop (persistent sidebar). `alert_optin_shown`/`_result` unchanged; changelog notes the shown-rate rises as a fix, not behavior. Verified: 64 tests, lint, build clean; Playwright confirms the prompt is visible + top-anchored with a drawer open, and still bottom-anchored with none.

Highest-leverage fix. `InstallPrompt` returns `null` whenever a spot drawer is open (`drawerOpen`, `components/InstallPrompt.tsx:165`), a rule added so the banner never covered the drawer's Get Directions. But since the 2026-07-09 CTA reweight (Shipped item 11), the full-width primary "Save this spot" button lives inside that drawer (`components/SpotDrawer.tsx:310`). So a user who saves via the primary CTA sees nothing at save time: the banner appears only later, when they happen to close the drawer, its alert framing now detached from the save that earned it. On desktop the drawer is a persistent sidebar that may never close, so the prompt can sit invisible indefinitely. Net effect: the reweight quietly routed most saves into the one place the prompt refuses to render.

Acceptance: after a save, the enable-alerts step is visible at save time even with the drawer open (surface it inline in the drawer post-save, or allow the banner to render above the drawer without covering the primary actions). The old "hide over Get Directions" concern is now moot since Get Directions was demoted to a secondary row. Verify on both desktop (persistent sidebar) and mobile (bottom sheet). Existing `alert_optin_shown` / `alert_optin_result` events unchanged; changelog note that shown-rate will rise as a fix, not a behavior change.

## 14. [done] 2026-07-10 iOS silently dead-ends after install

**Shipped 2026-07-10.** On a standalone relaunch, `InstallPrompt` now auto-surfaces the enable-alerts step (generic "Turn on alerts for your saved spots" copy) when there are saved spots, no push subscription, and no opt-out or hard-denial, so the installed iOS user no longer has to save another spot to find it. Hard denials are now persisted (`ptw-alerts-denied`) so they are not re-offered. `alert_optin_shown` gains a `trigger: "first_save" | "standalone_relaunch"` prop (changelog noted). Verified: 64 tests, lint, build clean; Playwright confirms auto-surface with saves + unsubscribed, and correctly quiet with no saves / after dismiss / after denial.

On iOS the banner gives manual Add-to-Home-Screen instructions ending "Open it from there to turn on alerts" (`components/InstallPrompt.tsx:214`). But on the next standalone launch `visible` starts `false` and only flips on a fresh `ptw:spotsaved` event (`components/InstallPrompt.tsx:64,111`), so the installed iOS user lands in the app and is never shown the enable-alerts step. They must save another spot to resurface it, with no hint that's required. iOS is the bulk of saves (owner's iOS PWA drove ~72% per the excluded-persons analytics), so this dead-end sits on the main path.

Acceptance: on a standalone launch, if there are saved spots and no active push subscription (`readStashedSubscription()` is null) and the user has not permanently opted out, auto-surface the "Enable alerts" step without requiring a new save. Do not re-prompt once granted or hard-denied. Reuse `alert_optin_shown` with a `trigger: "standalone_relaunch"` prop so the resurfaced prompt is distinguishable in the funnel; changelog entry for the new prop.

## 15. [done] 2026-07-10 One dismiss kills the entire funnel forever, with no fallback entry point

**Shipped 2026-07-10.** Three parts: (1) dismiss is now a **14-day snooze** (`ptw-alerts-snoozed-until`), not a permanent kill; the old `ptw-install-dismissed` permanent flag is no longer read. (2) An always-available **"🔔 Turn on alerts"** entry point in the saved-spots header (`components/SpotList.tsx`) for unsubscribed users, dispatches `ptw:enablealerts` which InstallPrompt handles, bypassing the snooze. (3) Hard denials stay permanent (item 14). New `alert_optin_dismissed` event; `alert_optin_shown.trigger` gains `"manual"` (changelog noted). **This defines the re-ask cadence (14-day snooze + manual entry) that item 16 reuses.** Verified: 64 tests, lint, build clean; Playwright confirms the entry point shows/re-opens the prompt, dismiss sets a snooze (no permanent flag), and a save while snoozed does not re-surface.

`handleDismiss` writes `ptw-install-dismissed=1` (`components/InstallPrompt.tsx:131`) and `onSaved` early-returns on that key (`components/InstallPrompt.tsx:113`), and there is no other entry to alerts anywhere in the app (no bell, no settings, no re-ask). Dismiss the banner once, before understanding it, and alerts can never be enabled again on that device short of clearing storage. A single shared flag also gates both the install step and the separate enable-alerts step.

Acceptance: dismissal becomes a snooze, not a permanent kill (re-offer after N further saves or after a cooldown); decouple the install-dismiss flag from the enable-alerts flag so declining one does not silence the other; add a low-friction always-available entry point to enable alerts for users with saved spots (candidate: a small bell/"Alerts off" affordance on the "Your saved spots" section header in `components/SpotList.tsx:77`). Instrument the new entry point (`alert_optin_shown` with a `trigger` prop) and log dismissals with the snooze reason; changelog entry.

## 16. [done] 2026-07-10 The alerts offer only ever fires on the first save

**Shipped 2026-07-10.** A non-installed user with 2+ saved spots and no subscription is now re-offered alerts on a later visit (new `return_session` trigger, auto-surfaced on load), not only at the first save. Reuses item 15's re-ask cadence: gated by the 14-day snooze and hard-denial so it never nags, and the engaged gate (2+ saves) avoids pestering a single-save user. Standalone (installed) relaunch is item 14; this covers the non-installed browser return. `alert_optin_shown`/`_dismissed` `trigger` gains `"return_session"` (changelog noted). Verified: 64 tests, lint, build clean; Playwright confirms auto-surface with 2+ saves on iOS UA, and quiet with 1 save or while snoozed.

The prompt is triggered solely by the first `ptw:spotsaved` (`components/HomeClient.tsx:147` -> `components/InstallPrompt.tsx:111`). Someone who saves several spots on day one, dismisses, and returns engaged on day three is never re-asked, yet re-engaging returning users is the entire point of the loop. The offer fires exactly once, at the least-committed moment. Overlaps item 15's re-ask cadence; likely built together.

Acceptance: broaden the trigger so an engaged-but-not-subscribed user is re-offered alerts at a natural later moment (e.g. on a subsequent save once they hold 2+ saved spots, or on a return session with saved spots and no subscription), respecting the item-15 snooze/cooldown so it never nags. Cap frequency to avoid noise. Reuse `alert_optin_shown` with a `trigger` prop identifying the occasion; changelog entry. Decision to settle with item 15: the single re-ask cadence both items share, define it once.

## 17. [done] 2026-07-10 iOS enable step is a wall of instructions with no tap target

**Shipped 2026-07-10.** The iOS enable step now leads with the payoff ("Get pinged when your spots are calm") and turns the run-on instruction into a short numbered sequence (1. tap Share icon, 2. Add to Home Screen, 3. open it to turn on alerts). Apple still has no programmatic install, so the manual steps stay, but they read as steps, not a paragraph. Copy/layout only, no new events; no em dashes. Verified in the Playwright render check (payoff line + 3-step ordered list).

Android gets an Install button; iOS gets a paragraph describing OS chrome plus an inline Share glyph and no button (`components/InstallPrompt.tsx:214`). It is Apple's constraint that there is no programmatic install, but nothing softens the highest-friction step: no reinforcement of the payoff, no sense of progress. Lowest priority, cosmetic and OS-bounded.

Acceptance: tighten the iOS copy and layout so the payoff ("get pinged when your spots are calm") stays visible alongside the mechanical steps, and the steps read as a short numbered sequence rather than a run-on sentence. House style: no em dashes, cut any line that does not add a fact. No new events required unless the layout adds a distinct interaction.

## 1. [done] 2026-07-04 Alert deep-link interstitial: tell the user exactly when and where to go (content bugfix 2026-07-09)

Owner directive 2026-07-03, top priority (after the first real-device push landed and deep-linked correctly). When the app opens from a push (`from=alert`, already tagged by the service worker), opening the bare spot drawer loses the alert's context. Show a floating info box or interstitial over the deep-linked spot carrying the alert-specific message: exactly when the calm window is and where to launch (put-in details from the spot's notes). The cron already computes the window; the message needs to survive the click (e.g. via URL params or notification data payload). User-facing flow change: ship behind an A/B flag per policy, and instrument dismiss/engage.

**Shipped (code merged), NOT deployed:** `vercel --prod --yes` has not been run from this branch; production is unchanged until the owner deploys. `composeAlert` (`lib/alerts/select.ts`) now carries the window label as a `window` URL param on the notification's deep link. `AlertInterstitial` (`components/AlertInterstitial.tsx`) renders a floating card over the drawer with that window label and the spot's `notes`, with a Get Directions shortcut, gated behind the `alert_interstitial` PostHog flag (`docs/experiments/alert-interstitial.md`), control renders nothing, so today's behavior is unchanged until the flag is turned on. New events `alert_interstitial_shown` / `alert_interstitial_result` (see `analytics/INSTRUMENTATION_CHANGELOG.md`, 2026-07-04). Verification: `npm test` (44 passed, including new `composeAlert` URL cases), `npm run lint` (clean), `npm run build` (clean; confirmed `alert_interstitial_shown`/`alert_interstitial_result`/`alert-interstitial` strings land in `.next/static`). No cron schedule, dedup, or Supabase-write behavior changed, only the URL payload the cron already sends. **Superseded 2026-07-08 (item 6b, D2(a)):** the `alert_interstitial` A/B flag was retired; the card is now a monitored 100% rollout and renders on every alert-open, so the "control renders nothing" note above no longer describes production.

**Instrumentation follow-up (PR #6, merged + DEPLOYED 2026-07-05):** live in production. **Experiment STARTED 2026-07-07** (owner created the `alert-interstitial` flag, control/treatment 50/50). Read via `analytics/queries/experiment_alert_interstitial.sql` after the 14-day / 30-exposed-per-arm window. the first cut could not measure lift: `experiment_exposed` logged only in the treatment branch (control had no exposed cohort) and the card's directions tap never hit the shared `spot_action`. Fixed to symmetric trigger-based exposure for both arms + `spot_action(directions, source=alert_interstitial)` as the arm-comparable primary metric. Caught before the flag was turned on, so no data lost. **Do not create the PostHog flag / start the experiment until this is deployed**, or the first data collects against the broken instrumentation.

## 2. [done] 2026-07-04 Conditions: "next good window" for this spot (within 3 days)

Owner directive 2026-07-03, top priority. In the spot drawer's conditions section, add a small section showing the next good launch window for this spot within the next 3 days, if one exists ("Next calm window: Sat 7 to 10am"). Reuse the same hourly calm-window evaluator the cron uses (`>= 2` consecutive calm daytime hours) so the alert and the in-app answer never disagree. This is also the natural preview of the PaddlePass "multi-day forecast windows" paid feature. New user-facing surface: A/B flag + instrumentation required.

**Verified, PR #7 (open), NOT deployed.** A "Looking ahead / Next calm window" block in the spot drawer conditions area, behind the `next-good-window` A/B flag (control renders nothing). Reuses the shared `evaluateGoodWindow` (extended with `startHour`/`endHour` for the time range; `windowKey`/`label` and the cron's behavior unchanged, all existing alert tests still pass), fetched client-side via `lib/nextWindow.ts` mirroring the `getConditions` cache/dedup and failing quietly. Exposure logs symmetrically for BOTH arms at the evaluation-resolved trigger (the corrected pattern, not the alert_interstitial bug); primary metric is the shared `spot_action`/directions among exposed users; `next_window_viewed` is a dwell-gated treatment-only diagnostic. **Built partly under a session-limit interruption** (the pipeline's own whole-branch verify agent died mid-run); the studio manager finished the verification by hand: 55 unit tests pass, lint clean, build clean, and a Playwright drawer smoke confirms treatment+calm renders the window, no-window renders the quiet settled line, NWS failure renders nothing, and control / flag-absent render nothing, no JS errors. Live PostHog event capture was not observable locally (no key), same as item 1; wiring verified by review. **Merged + DEPLOYED 2026-07-05** (live in prod). **Experiment STARTED 2026-07-07** (owner created the `next-good-window` flag, control/treatment 50/50). Read after the same window.

## 3. [parked] stale in-progress (2026-07-02 session ended without landing fix code; re-promote to ready to resume) Fix the 58% landing bounce

142 of 247 visitors never open a single spot. On mobile (77% of users), surface value on load instead of a bare map: auto-open or prompt the nearest spot, or a "good to paddle near you today" view. Near-me works when asked, but nobody asks (10 users). Pairs naturally with the conditions data Stage A already fetches.

## 4. [parked] SEO: monitor, do not build yet (recheck organic traffic ~2026-07-20; if still flat, promote to ready as an indexing investigation)

Organic is 10 users; expected this soon after the 140 spot pages went live. Recheck organic traffic in 4 to 6 weeks. If still flat, the spot pages are not indexing and that becomes a real work item. No build now.

---

## 5. [parked] Tech follow-ups (from building the retention engine): deferred per D1(a) 2026-07-08

The `npm audit fix` sub-task shipped (PR #8, merged). The three remaining sub-tasks all touch the protected alert cron or need a schema migration. D1 resolved (a): **defer all three** until the watched set grows and the two experiments read out. They stay parked, not abandoned; re-promote to `[ready]` when scale (more than 1 subscription / many watched spots) actually justifies touching the cron. The bounded-concurrency refactor has zero benefit at 1 subscription and is pure risk to the path that wakes real users.

Small items, one ship each, in this order:

- **Bounded-concurrency NWS fetch** in the cron (`app/api/cron/check-conditions`): it does 2 serial NWS calls per unique watched spot, which approaches the 60s function limit as the watched set grows. Batch with bounded concurrency + cache the `/points -> forecast URL` resolution. Do before many spots are watched.
- **`npm audit fix`** [done 2026-07-04, PR #8]: non-breaking pass cleared 2 advisories (lockfile-only, semver-compatible). 3 moderate prod advisories remain (dompurify, postcss) that need `npm audit fix --force` (breaking major bumps); left for an owner-reviewed pass, not done autonomously. Dev-only high/critical untouched.
- **UNIQUE `alert_sends` dedupe index + `ON CONFLICT`** for DB-level dedup (currently app-enforced via `sentKeys`). Note: schema change touching alert infrastructure, expect this to escalate per studio policy.
- Restrict the cron's unique-spot fetch to spots reachable from an enabled subscription; sort the alert headline by soonest window. Note: cron behavior change, expect escalation.

## 6. [done] 2026-07-03 Confirm push lands and deep-links on a real device

Owner verified 2026-07-03: push landed on iOS, copy well received, click deep-linked to the spot. Loop proven end to end; follow-up product ideas from this test are items 1 and 2.

## 6b. [done] 2026-07-08 Recalibrate the experiment method (per D2(a))

**Status:** merged to `main` (c243cc4) and **DEPLOYED to production 2026-07-08** (owner ran `vercel --prod`). Verified live: homepage 200, and the deployed JS chunk is byte-identical to the verified local build. Production confirms the `alert-interstitial` flag string is gone (100% rollout) while the monitoring events (`alert_interstitial_shown`/`_result`) and the still-active `next-good-window` flag remain. build + 55 tests pass; verifier CONFIRMED.

Owner answered D2 (a): the two live A/B tests are underpowered at ~14 users/day and can't read this year. Three things done:
- **Convert `alert_interstitial` to a monitored 100% rollout.** It fires only on push-opens with 1 subscription, so it collects ~0 exposures/week and can never reach significance. Ship the treatment card to everyone; watch guardrails (`spot_sheet_dismissed`, `conditions_loaded`) for regressions instead of comparing arms.
- **Decontaminate `next_good_window`'s primary.** The always-on interstitial now fires `spot_action`/`directions` (`source: "alert_interstitial"`) for every alert-open, which would pollute the shared metric. Exclude interstitial-sourced directions from the `next_good_window` primary so its exposed-cohort directions rate stays a clean drawer-vs-drawer comparison.
- **Recalibrate `next_good_window`'s decision rule to a realistic MDE.** ~430-680 exposed/arm for a 5pp lift at the ~5-10% base rate; the old "30/arm, ship on +5pp" only detected a 20+pp swing. State the honest read window (months) and mark early reads directional-only. It stays a flag-gated A/B (board directive), just with a truthful decision rule.

This sits against the board directive "every major update behind an A/B flag, never straight to 100%", but D2(a) is the owner's explicit exception for the interstitial, with rationale documented. No new user-facing surface: the card already shipped and was already shown to 50%.

## 7. [proposed] Mobile polish leftovers (deferred from the Jun 2026 mobile UX pass)

Carried over when IMPROVEMENT-PLAN.md was retired; verify each still reproduces before working it.

- Marker clustering for dense areas (needs `leaflet.markercluster`; the audit measured 67 markers within a 24px radius at statewide zoom).
- `npm run dev` fast-refresh reload loop (~1/sec, Leaflet never mounts, `Invalid LatLng (NaN,NaN)`; dev-only, blocks local QA).
- Geolocation-denied recovery: guidance lives in a `title` tooltip invisible on touch; show an inline toast.
- Map zoom controls are 30px (HIG minimum 44) and far from the thumb.
- Empty-state copy says "filters" when search caused it, and "Clear filters" silently also clears search.

---

## 8. [proposed] "Go here instead": nearby calmer alternative when your spot is blown out

*(Proposed by the studio 2026-07-05. Sequenced AFTER the ~2026-07-15 retention read, not before.)*

The vision's signature promise is a redirect, not a wind number: "Crissy is blown out by 10am, go to Richardson Bay instead" (line 18, the stated moat). Today an opened spot that reads breezy/windy dead-ends, yet ~half of conditions checks land there (breezy 569 / windy 62 of ~1,155, `reports/analytics-2026-06-27.md`). When the selected spot has no near-term calm window, surface the 1-2 nearest spots that are calm now or soonest, each a tap-through. Clearest in-app expression of the per-spot-judgment moat, and a within-session reason to keep exploring instead of leaving.

Acceptance: in the drawer, when the selected spot is not calm near-term, show up to 2 nearest calm/soonest-calm spots as tap-throughs; reuse the SAME `evaluateGoodWindow` as the cron/item 2 so nothing disagrees; scope candidate fetch to nearest-K + cache (no unbounded NWS fan-out); A/B flag (control shows nothing); new `alt_suggested_shown`/`alt_clicked` intent events with `spot_id`+`region` and a changelog entry. Decision to settle first: the "not good enough to recommend" threshold must equal the calm-window definition, or the app contradicts itself.

## 9. [done] 2026-07-11 Shared-link arrivals open the full spot card on mobile (conditions + CTAs visible)

**Shipped 2026-07-11.** The Share button's deep link now carries `from=share` (`/spot/<id>?from=share`); on a `from=share` arrival, `HomeClient` opens the mobile bottom sheet at FULL height (0.92vh) instead of the 0.58vh peek, so the conditions view and the Watch/Share/Directions/Photos row are fully visible without a drag (`SpotDrawer` gained a one-shot `startExpanded` prop; any in-app selection resets to peek). Desktop unaffected. Alert/email arrivals deliberately excluded (they carry the interstitial). Attribution: `spot_viewed` gains `source: "share"` (was folded into "deeplink"); changelog entry added. Rollout: flagless (adversarial review found a client-side mount-time kill switch fails open for first-time share recipients, so it would not gate the target population; rollback is revert + redeploy, monitoring is the `source: "share"` count + existing `spot_sheet_dismissed` / `conditions_loaded` guardrails). Verified: build + lint clean, 107 unit tests, `from=share` lands in `.next/static`; adversarial review confirmed the mount-ordering, one-shot reset, and desktop no-op. NOT visually verified on device: the browser window was hidden (owner away from laptop) so the expanded-sheet layout could not be observed; owner-verifiable on a phone by opening `paddletowater.com/spot/<id>?from=share`, and it is revert-reversible in minutes.

*(Re-scoped 2026-07-11 by the owner from the original "conditions-first share" idea. Now a concrete mobile bottom-sheet behavior, not an OG/landing-copy change. Has a retention angle, not pure acquisition, see below.)*

Growth is ~82% word-of-mouth (Google sent 10 users; the 140 SEO pages are not ranking, `reports/analytics-2026-06-27.md`), so shares are the real distribution, but Share was used by 1 user / 3 events. Today a shared link opens the mobile bottom sheet at PARTIAL height: the card is cut off mid "Looking ahead" and NONE of the CTA buttons show (owner screenshots 2026-07-11). A first-time recipient (no context) sees a truncated card, no conditions payoff, and no visible Watch/Share/Directions actions. Change: a shared-link arrival on mobile opens the sheet EXPANDED to full height, so the conditions view (wind + next calm window) AND the CTA row are completely visible without the recipient having to discover the drag. This also surfaces "Watch this spot" (the enrollment on-ramp) to every shared arrival, so it feeds the retention loop, not just acquisition.

Acceptance:
- On mobile, an arrival that opens a spot from a shared/organic deep link initializes the bottom sheet at full/expanded height instead of partial. Tag the Share deep link `from=share` and gate the expand on that (do NOT expand for `from=alert` / `from=email` arrivals: they carry the item-1 interstitial and force-expanding underneath it layers badly). Desktop is unaffected (the sidebar drawer is already fully visible).
- The existing partial-height drag + dismiss (X / drag-down) still work, so the recipient can reach the map from the expanded state.
- Attribution: recipient arrivals already carry `spot_viewed` `source: "deeplink"`; add the `from=share` marker (and an `INSTRUMENTATION_CHANGELOG.md` entry for the prop) so share arrivals are separable from other deep-links.
- Rollout: monitored 100% behind a kill-switch flag with guardrails (`conditions_viewed` / `favorite_toggled` from a deeplink source, `spot_sheet_dismissed`), NOT a powered A/B (D2/D3/D6 low-traffic reality).

Caveat: share volume is tiny today (1 user / 3 events), so the immediate lift is modest; the win is a better first impression for any shared arrival and a cleaner on-ramp as sharing grows. Cheap to build (reuses the existing draggable sheet). The old inline-paddleability-dots idea stays folded into parked item 3.

## 12. [proposed] (lower priority) Persistent bottom "dead band" on iOS mobile web / installed PWA

*(Owner-reported 2026-07-09; three fix attempts that day did not clear it. Lower priority, cosmetic.)*

A permanent sage strip (the `--bg` body background) sits along the very bottom of the screen on iOS, in the home-indicator zone, showing below the map, the list, and the open spot sheet. It is an installed-PWA / iOS-mobile-web artifact and does NOT reproduce in desktop Chrome (the shell fills correctly there), which is why it resisted blind fixes.

Attempts 2026-07-09 in the `app/globals.css` shell, none cleared it on-device: (1) the original `html,body { height:100% }` on a `position:fixed` body; (2) `100dvh`; (3) dropping the explicit height so `position:fixed; inset:0` defines the box (current prod state, commit 4cd984b). Known-good facts to build on: `viewport-fit=cover` IS in the rendered viewport meta; `public/sw.js` has no fetch/cache handler so deploys DO reach the device, BUT iOS keeps an installed PWA's page alive in memory, so a full force-quit is required to load new code (may have masked whether an attempt worked). Do NOT attempt a 4th blind CSS change. Next step: ship a device-only diagnostic (gate behind `?vh`) printing `screen.height`, `window.innerHeight`, computed `env(safe-area-inset-bottom)`, and standalone-vs-Safari; get one screenshot; THEN pick the fix (candidates: `-webkit-fill-available`, or a JS-set `--app-height` from `window.innerHeight`). No functional impact.

---

<!-- Candidates proposed 2026-07-10 by the studio loop (product-visionary, dry-backlog branch). NOT promoted: the owner promotes to [ready] by editing the status. Ordered by impact per effort: 24 protects the channel shipped today, 25 must exist before the mid-July retention read, 26 is a durable pull-based reason-to-return. -->

## 27. [done] 2026-07-11 Alert email leads with the exact window (hours, length, wind, named spots)

**Shipped 2026-07-11 (PR #33, merge `70d287c`, deployed to prod, verified live: deployment Ready, home 200; new copy on main). Owner-authorized the merge in chat, so the D8 self-merge guard let it through. The next nightly cron send (02:00 UTC) uses the new copy.** Owner feedback on the live 7:55pm alert emails: the copy was vague. The email said "looks calm Saturday morning" while the evaluator already knew the exact hours and wind, then discarded them. Now the alert leads with "{spot} is good to paddle {weekday}, {hours}" (owner directive: drop the "is calm"/"looks calm" framing), states window length + peak wind ("topping out at N mph"), and NAMES the other good spots (capped at 3) instead of "(+N more)". CTA "Open in the app" -> "See the forecast" (email is the no-install channel). Feature term "calm-window alerts" -> "paddle alerts" in the shared footer + confirm email. `GoodWindow` gained `maxWindMph` (additive; push behavior unchanged). Copy by the editor agent. 106 tests + lint + build green; rendered both variants in-browser. Monitored behind the `EMAIL_ALERTS_ENABLED` kill switch, no A/B (copy change). Follow-up noted: the in-app enrollment card still says "calm-window alerts"; rename it to match in a later pass.

## 24. [done] 2026-07-11 Rescue the email confirm step: make double opt-in observable and recoverable

**Shipped 2026-07-11 (PR #32, merge `25c56e9`, deployed to prod, verified live).** Resend control on the pending card (spam line + a Resend button that dims for a 20s cooldown), confirm-link losses now redirect to `/?email_confirmed=0&reason=no_token|stale` and fire `email_confirm_failed` (SYSTEM), a monitored `analytics/queries/email_confirm_funnel.sql` (Supabase primary + PostHog cross-check, guardrail flag), and `email_capture_failed` gained `source: submit|resend` so resend-fails don't corrupt the submitter correction. Monitored 100% behind the `EMAIL_ALERTS_ENABLED` kill switch, no A/B (D6). Live checks: prod confirm route returns the new redirect; resend card + cooldown dimming driven in-browser; 97 tests, lint, build all green. Note: the studio's own PR auto-merge was blocked by a new review guard (merge landed first); flag for the owner in BRIEFINGS.

**Why:** The email channel shipped today but the first confirmation email hit Outlook spam (item 22 note; memory `dmarc-quarantine-followup`). Confirm is the single gate between `email_capture_submitted` and `email_capture_confirmed`, so if it silently lands in spam, every email enrollment dies there and the ~2026-07-15 to 07-22 retention read sees a zero email cohort. The 2026-07-09 report already shows the loop essentially unentered (1 opt-in shown, 0 grants ex-owner), so we cannot afford a silent leak in the one channel built to bypass the iOS install wall.

**Acceptance:**
- Post-submit state tells the user to check spam and offers a user-initiated "resend confirmation" (transactional, gated by the existing `EMAIL_ALERTS_ENABLED` kill switch; does NOT touch the alert-send cron or push path).
- A monitored query reports submit to confirm conversion and time-to-confirm from the existing `email_capture_submitted` and `email_capture_confirmed` series, with a guardrail threshold that flags a low confirm rate.
- New intent event `email_confirm_resend_clicked` (or a `resend` action prop on `email_capture_submitted`), plus an `analytics/INSTRUMENTATION_CHANGELOG.md` entry.
- Rollout: monitored 100% behind the existing kill-switch flag (D6 precedent), not an A/B. Explicitly complementary to, not a duplicate of, the DNS DMARC to quarantine warmup already tracked for ~2026-07-24; no DNS work here.

## 25. [done] 2026-07-11 Unified enrollment to activation to return funnel, ready before the mid-July retention read

**Shipped 2026-07-11 (analytics contract only, no app code, no new events, no deploy). Designed by the data-lead, verified against the real migration columns.** New `analytics/queries/enrollment_return_funnel.sql` reads the whole loop end to end across BOTH channels in one window: exposure (by `channel`/`trigger`/`platform`) to grant/confirm to enrolled to returned, with a Supabase PRIMARY block (rate of record for enrolled to returned) plus a commented PostHog companion for the shown to grant/confirm exposure Supabase cannot see, the two-store seam and cross-channel `anon_id` dedup handled explicitly. It COMPOSES the existing queries (reuses `email_confirm_funnel.sql`, `reachable_audience_retention.sql`, `active_subscriber_retention.sql`, `alert_optin_funnel.sql` definitions verbatim) and supersedes none: the per-channel survival curves and the confirm-leak query remain authoritative for their slices. GLOSSARY gained the enrolled-cohort return metric definitions (reachable vs active, per channel and combined). No INSTRUMENTATION_CHANGELOG entry (a query moves no series). Surfaced D9: the push Supabase tables have no owner-exclusion key, so the owner's push subscription contaminates this AND the two existing push retention queries at single-digit N (the query ships with a NO-OP placeholder + caveat, D9 is the real fix). Ready before the ~07-15 to 07-22 retention read.

**Why:** The first durable retention read is due ~2026-07-15 to 07-22, but enrollment now spans two channels (push via `alert_sends`/`alert_opens`, email via `email_sends`/`email_opens`) and seven `alert_optin_shown` triggers, with no single query stitching shown to grant/confirm to server-side return, and no dedup for a user enrolled in both. Without it the read cannot attribute where the funnel leaks (the report flags the loop as unentered but cannot say at which step), and an unattributed retention read is not a trustworthy one.

**Acceptance:**
- Add `analytics/queries/` for a cross-channel enrollment funnel: `alert_optin_shown` (segmented by `trigger`/`channel`/`platform`) to grant/confirm to server-side return (`alert_opens` union `email_opens`), with an explicit cross-channel dedup note.
- Define the enrolled-cohort return metric in `analytics/GLOSSARY.md` (reachable vs active, per channel and combined), each citing its query.
- No new client events required (existing series only); if any prop is added, an `INSTRUMENTATION_CHANGELOG.md` entry. Analytics contract only, no protected surface touched.
- Delivered before the read window opens so the early-August numbers are interpretable.

## 26. [proposed] Cold-open return surface: your recently-checked spots, with conditions now

**Why:** Conditions checking is the one validated, repeated behavior (89 of 100 openers genuinely view the dwell-gated conditions panel; the ~16% who return come back to re-check, per `reports/analytics-2026-07-09.md`), and it is the only reason-to-return not gated on the unproven alert loop or an install. A returner today lands on a bare map and must re-find their spots. Give cold opens a personal strip of the spots they recently viewed with live paddleability: a pull-based return reason that needs no push, no email, no install.

**Acceptance:**
- On load, if the device has recently-viewed spot ids (localStorage, last N), show a compact "Recently checked" strip with each spot's current paddleability badge, reusing the `getConditions` cache (no unbounded NWS fan-out; cap at N and dedup against the Watching section).
- New intent events `recent_spots_shown` / `recent_spot_clicked` carrying `spot_id`+`region`, plus an `INSTRUMENTATION_CHANGELOG.md` entry.
- Rollout: monitored 100% behind a kill-switch flag with guardrails (`spot_viewed`, `conditions_loaded`), per the D2/D3/D6 low-traffic precedent, not an A/B.
- Net-new vs item 3 (first-time landing bounce), item 8 (calmer alternative when blown out), and item 20 (per-spot next-window): this targets returners with view history, not first-timers or a single open drawer.

## 28. [done] 2026-07-12 Copy consistency pass: finish the calm -> good-to-paddle migration + de-stiffen the enrollment card

*(From the 2026-07-11 editor-agent review of all user-facing writing. Shipped 2026-07-12.)*

**Shipped 2026-07-12.** Copy-only pass across 11 surfaces. Unified the alert promise to "good to paddle / good window" (push body, launch-reminder push, InstallPrompt desktop/iOS/Android/pending, confirm toast, SpotList nudge, NextGoodWindowPanel + `lib/nextWindow.ts`, AlertInterstitial subline), reserving "Calm" for the wind scale (untouched). De-stiffened InstallPrompt with contractions. Standardized on "Watch" vocab + aligned aria-labels. "Get Directions" -> "Get directions" (+ disclaimer ref). Trimmed the meta description (~300 -> ~155 chars, dropped the "paddleboard and SUP" redundancy). Search placeholder unified. Confirm email hedge tightened. Kept the safety disclaimer as-is (editor confirmed it reads human). 107 tests, lint, build green; em-dash scan + alert-promise "calm"-leak sweep both clean. Note: also fixed a "calm window" leak in the PROTECTED `send-reminders` cron, TEXT ONLY, no send behavior changed.

Item 27 moved the ALERT EMAIL to a "good to paddle" promise but did not propagate: the app still tells users at enrollment "we'll email you when your spots are **calm**", then sends an email that says "**good to paddle**". Same event, two names, sitting on the conversion path. Reserve "Calm" for the wind-scale label only (Calm/Breezy/Windy in ConditionsPanel/ConditionsBadge, DO NOT touch); use "good to paddle" / "good window" everywhere the app names the alert trigger or promise. Second theme: `InstallPrompt.tsx` (the biggest conversion surface) never uses contractions ("We will", "You are", "it is") so it reads robotic, while emails/toasts/interstitial all contract.

Acceptance (owner OK needed on one judgment call: extending the calm->good framing app-wide, since item 27 was scoped to email):
- Unify the alert promise to "good to paddle / good window" across: push body (`lib/alerts/select.ts` "looks calm at" -> "looks good"), `InstallPrompt.tsx` (desktop/iOS/Android/pending-card headers + sublines), the confirm toast (`HomeClient.tsx`), the `SpotList.tsx` re-save nudge, `NextGoodWindowPanel.tsx` + `lib/nextWindow.ts` ("Next calm window" -> "Next good window", `noWindowLine`), and `AlertInterstitial.tsx` ("Calm window" subline). Leave the Calm/Breezy/Windy wind scale alone.
- De-stiffen `InstallPrompt.tsx` with contractions throughout.
- Standardize on "Watch" vocabulary (kill the last "save/re-save" leaks in the SpotList nudge + mismatched aria-labels).
- `"Get Directions"` -> `"Get directions"` (SpotDrawer + the disclaimer's quoted reference): the only Title Case button in the app.
- Trim `app/layout.tsx` meta description (currently ~300 chars, truncates ~155 in SERPs; also "paddleboard and SUP" is redundant).
- Copy-only, no behavior/flags; scan `grep -n "—"` clean before deploy. Keep the safety disclaimer copy AS-IS (editor confirmed it reads human and is a real caveat).
- Separate future pass (not this item): audit the 140 `data/spots.json` notes for the "reply to a feedback sender" anti-pattern (grep for "Yes," / "you can").

---

## Later (after retention is proven) — all [proposed], do not promote before the ~2026-07-15 funnel re-check

- **UGC content flywheel:** ratings, photos, trip logs, user conditions reports. The long-term moat and SEO-acquisition engine, but it needs retained users to generate content first.
- **Optional Google sign-in** to sync push subscriptions and saved spots across devices (the engine ships anonymous; this is the upgrade path).
- **PaddlePass premium tier:** alerts + multi-day forecast windows + offline, as the freemium paywall.
- **Community spot submissions** with admin approval.
- **Tide-window refinement** in the cron's "good window" evaluator (it ships wind-only).
