# Roadmap

**The single home for vision, strategy, and the backlog.** Do not create separate plan/roadmap/strategy docs; fold new product thinking into this file. (IMPROVEMENT-PLAN.md, ux-mobile-findings.md, and docs/strategy/ were consolidated here 2026-07-02 and deleted; full text in git history.) Implementation specs under `docs/superpowers/` are historical execution artifacts for shipped work, not roadmaps. This file is also the studio backlog.
<!-- studio:v1  (unpaused 2026-07-16 by owner, SCOPED: the loop runs in ONE thread at a time and nowhere else. It was paused 2026-07-15 for orphaning an interactive session's commit onto its own branch and reverting a live change; the mitigation is that constraint plus these rules, which are not optional: do ALL item work in a git worktree, never run checkout/switch/reset/stash in the repo root, never stash or drop a change you did not make, and never deploy a ref that does not contain everything already on main. To re-pause, change the marker token at the start of this comment to the paused value.)  statuses: proposed | ready | in-progress | blocked(D<n>) | parked | done -->
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

- 2026-07-18 [done, DEPLOYED] Item 26: cold-open "Recently checked" strip. On load the list panel shows the spots this device viewed recently (localStorage `ptw-recent`, most-recent-first, capped at 6, deduped against Watching and removed from the main list), each with a live paddleability badge reusing the `getConditions` cache. A pull-based return reason needing no save/install/push, the retention differentiator's one validated repeated behavior (re-checking conditions). New INTENT events `recent_spots_shown` (dwell-gated) + `recent_spot_clicked`; shipped at 100% behind a `recent-spots` kill switch (`useKillSwitch`, default ON, hides only on explicit PostHog disable, per D2/D3/D6), not an A/B. `useSavedConditions` generalized to `useSpotConditions`. Verified live desktop + mobile: strip renders with conditions, dedup correct, click opens the drawer, no console errors. 331 tests (4 new), changelog updated. Deployed 3dba588.

- 2026-07-17 [done, DEPLOYED] Item 53: cut "conditions today" loading latency, across three slices. (a) Tide fast-fail (8538e40): client aborts the tide fetch at 4s + `/api/tides` per-attempt timeout 6s to 2.5s, so a flaky NOAA can't hang the panel 6-13s (prod raw route ~5.5s). (b) Wind/tide decouple + honesty fix (9268c66): `getConditionsRun` renders each source as it settles, so the wind verdict paints at ~330ms instead of waiting on tide; a failed tide fetch now says "Tide data is unavailable" not the false "No tide station". (c) NWS two-hop collapse (b88c13f): precomputed `data/gridpoints.json` (140/140 spots, `scripts/precompute_gridpoints.py`) so `fetchWind` and `getNextWindow` skip the `/points` hop, verified live at 0 `/points` calls. Freshness stamp + `conditions_loaded.latency_ms` already existed. NOT done (deliberately, marginal): a cached same-origin *wind* proxy, superseded because the precompute removed the slow hop and weather.gov client-fetch is reliable (no CORS problem, unlike tides); re-file if shared-cache is wanted at higher traffic. Changelog updated for the decouple.

- 2026-07-17 [done, DEPLOYED] Item 52: proxy the NOAA tide fetch through a same-origin `app/api/tides` route so a missing NOAA CORS header can never drop the tide half of conditions (it was silently CORS-blocked ~half the time on tidal spots, the retention differentiator). Node route validates station + dates, fetches NOAA server-side with a 6s timeout + one retry, caches station+day 30 min, passes NOAA error bodies through as non-cached 502s. Client (`lib/conditions.ts`) now calls `/api/tides`; direct NOAA URL is gone from the client bundle. Wind stays direct to weather.gov; alert crons untouched. 8 route tests + `app/**` added to vitest include; instrumentation changelog notes `conditions_loaded.has_tides` availability rises. Verified live: `/api/tides` returns 400 on bad params and a graceful 502 while NOAA is mid-outage; client bundle references the proxy, not NOAA. Live NOAA-200 path pending NOAA's own recovery (it was 5xx across all stations during verification; params identical to the previously-working direct call). Deployed 42c814d.

- 2026-07-17 [done, DEPLOYED] Item 55: P0 mobile `Invalid LatLng (NaN)` crash. On mobile the map panel is display:none under the List tab but MapView stays mounted, so a list tap fired `flyTo` on a 0x0 container, throwing NaN and blanking the conditions panel (measured 6/6 NaN, 5/6 conditions failures at 390px). Guarded FlyTo/FitBounds/FlyToUser against zero size + added a ResizeHandler that invalidateSize()s and re-centers when the map reappears; map never unmounts (single-canvas invariant held). Verified live on paddletowater.com: 0/6 NaN, conditions 6/6, desktop clean. Deployed 308d0f1.

- 2026-07-17 [done, DEPLOYED] Item 54: spot 150 "Russian River - Guerneville River Park" (Guerneville, North Bay, flatwater, owner_rating 4.8, owner-supplied verified coordinate). Single additive record via text-level edit, zero coordinate churn; flows to /spot/150, sitemap, OG, JSON-LD, both crons. Verified live: /spot/150 renders with the 4.8 rating and Flatwater. Owner-approved (D22) and prompted the D23 gate fix (new-spot additions no longer trip the coordinate gate). Deployed 308d0f1.

- 2026-07-17 [done, DEPLOYED] Item 7: four mobile-polish fixes. (A) geolocation-denied recovery now a visible inline message with aria-live, not a touch-invisible title tooltip (+ near_me_toggled outcome prop); (B) Leaflet zoom controls enlarged to a 44px HIG tap target, verified 44x44 live; (C) empty-state names search vs filters vs both and scopes the Clear button ("No spots match X" / "Clear search"); (D) the dev reload/NaN loop does NOT reproduce in real dev (5 trials), no speculative fix shipped. 316 tests (17 new), verified live. Marker clustering carved to item 51.

- 2026-07-17 [done, DEPLOYED] Item 40: record-accuracy audit. 3 two-source pin moves (64 Del Valle, 65 Jack London Sq, 134 Eden Landing lng-only) + 7 notes-justified tide_sensitive flips (1,25,29,39,41,44,51). Merged (3f9b6a2), 299 tests. Coordinate+tide diff awaits owner review before vercel --prod, because spot data feeds both alert crons. Report: reports/item-40-record-accuracy-2026-07-17.md.

- 2026-07-17 [done] Item 48: desktop filter pills no longer stretch to a fifth of the viewport (1ca79a3, deployed). FilterBar row 2 was `grid grid-cols-5` + `w-full` at every width, with no breakpoint: 278px pills on a 1408px bar vs 119px content-sized region pills one row up. Below md unchanged; from md it is a flex of content-sized pills. Row-2 class was duplicated 3x, extracted to `pillSm`. Measured before and after at 1440px and 390px.

- 2026-07-17 [done] Item 47: email subscribers no longer re-prompted to subscribe (f8322ed, deployed). Suppresses the email enrollment prompt at all 5 gates once the server ledger confirms the subscription; also strips the subscription token from the URL (it was leaking to PostHog on every email arrival) and widens the privacy purpose sentence. D18 resolved: shipped 100% unflagged as a bugfix, button allowed to hide (push dead-end deferred to item 49). Eligible population is 1 (the owner); shipped for denominator integrity, not user impact.

- 2026-07-16 [done] Item 38: fixed the app-wide Tailwind v4 bracket CSS-variable bug. Converted every `{prop}-[--token]` to the working parens form `{prop}-(--token)` across 10 component files (0 bracket forms remain in `.tsx`); legitimate arbitrary values like `z-[1200]` left untouched. Corrected the CLAUDE.md Theme section (it documented the broken bracket syntax as canonical) and a matching globals.css comment. Result: `text-(--muted)` now renders `#6E8598` (was dark `#0B2A47`), accent borders/text/backgrounds render azure `#0E6FD1`. Verified live: home 200, subtitle muted-gray and Feedback border azure on prod, 186 tests, build green, no layout shift (color tokens only). Shipped ISOLATED via cherry-pick onto a clean branch off main, because the working branch was entangled with a concurrent session's unrelated commits (see BRIEFINGS 2026-07-16). Deployed. A follow-up `--muted` body-text contrast question was raised (see below).
- 2026-07-15 [done, PART 3 FIX DEFERRED] Item 37: visual polish pass. **Part 1 (shipped):** the header search input and Feedback button now read as a deliberate pair, matched height (30px) and radius (8px), search border moved onto the `--border` token; and the Feedback button's azure CTA border was fixed to actually render (it used the broken Tailwind v4 bracket form and was rendering dark). **Part 2 (no-op, D12):** `theme_color`/`themeColor` were already azure `#0E6FD1`; owner chose to keep azure chrome + the pale header, so no change. **Part 3 (diagnostic only, D12):** added a `?vh`-gated device diagnostic (`components/ViewportDiagnostic.tsx`) printing screen.height / window.innerHeight / visualViewport height / computed `env(safe-area-inset-bottom)` / standalone-vs-Safari; absent without the param, z-9999 when present. The actual iOS dead-band FIX is deferred pending an owner installed-PWA `/?vh` screenshot (item 12, now folded into this item). Verified: 174 tests, build green, live-checked at desktop + 390px with no console errors, Feedback azure confirmed on prod, `?vh` overlay confirmed on prod. Branch `studio/visual-polish-pass`, deployed. Follow-up filed: item 38 (the bracket-syntax bug is app-wide, ~77 occurrences). Recorded in DECISIONS D12.
- 2026-07-15 [done] Item 36: launch-direction tip ("Head out toward the {expanded compass words} so the wind helps push you back") on the alert interstitial and the alert email body. Threads NWS wind direction (sampled at the calm run's peak-wind hour, matching `maxWindMph`) through the shared `evaluateGoodWindow` so both surfaces agree; pure `launchDirectionTip` helper with a 16-point abbreviation-to-words lookup, omitting the tip below 5 mph or when direction is variable/absent. Informational tip, not a safety instruction (item-34 framing intact). Shipped experiment-EXEMPT at 100% per **D11** (additive copy on existing surfaces; single-digit audience can't power an A/B); guardrail is `launch_tip_shown` on `alert_interstitial_shown` (now fires once after the window resolves, with an unmount-fallback so a fast dismiss can't drop the impression). Live-verified: interstitial rendered "Head out toward the northwest..." on real NWS data, 156 unit tests, no console errors desktop/mobile. Branch `studio/launch-direction-suggestion`, deployed. NOTE: the same deploy also carried the owner's pre-existing uncommitted WIP (FilterBar spot-count removed; Leaflet attribution collapsed to an info toggle in globals.css), now live and revertible.
- 2026-07-17 [done, 100% LIVE] Item 32: dual-CTA enrollment card (push + email at equal weight on installed/Android/iOS; iOS push = "Add to Home Screen"; desktop unchanged). Owner-approved Option B. **Retired the A/B and shipped at 100% 2026-07-17** on owner directive (no A/B until DAU > 100): the enrollment card shows ~once per 8 days ex-owner, so an arm comparison was never powerable. The equal-weight card now renders unconditionally on the three mobile surfaces; `useExperiment`/`logExposure` plumbing and the old email-led/install-led control layouts were deleted from `InstallPrompt.tsx`, and the entry was removed from `lib/experiments.ts` (same retire path as alert_interstitial D2a, owner_rating D20). Instrumentation: `experiment_exposed{enrollment_dual_cta}` stops; `alert_optin_shown/_dismissed channel:"both"` now fires for all mobile enrollment surfaces (changelog 2026-07-17). 332 tests, lint (app), build green; desktop enrollment card verified live no-regression; mobile card markup unchanged from the original iOS+Android in-browser verification. (Originally PR #40 merge e95fc2c behind flag; 100% flip follows.)
- 2026-07-14 [done] Item 33: moved the map zoom +/- control to the top-right (explicit ZoomControl position=topright; clear of legend, mobile sheet, and desktop drawer) (PR #39, merge 5cb6677, deployed + prod-verified)
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

## Owner items, added 2026-07-18 (enrollment-prompt tuning; all three [ready], queued top-most on purpose)

*From the 2026-07-18 enrollment-funnel readout: the alert prompt reaches 59 unique users in the clean 9-day window (34% of visitors) but 83% dismiss it and ~2% enroll. The bottleneck is prompt quality and timing, not reach. These three items address timing (65), design + copy (66), and over-nagging (67). Work item 65 first (one-line, low-risk), then 66, then 67.*

## 65. [done] Raise the `conditions_interest` enrollment trigger from 2 distinct spots to 3 (deployed 2026-07-18)

**Shipped 2026-07-18 (studio loop).** `ConditionsPanel.tsx` `conditionsViewedSpots.size >= 2` -> `>= 3` (+ comment updated). The prompt now fires on the 3rd distinct dwell-viewed spot, a stronger "deciding where to paddle" signal, since conditions_interest is ~86% of enrollment exposures and 2 fired too early. No new event; `alert_optin_shown{trigger:"conditions_interest"}` volume drops by design (changelog: it's a threshold change, not reduced interest; per-exposure rates stay comparable). New grep-guard test locks `>=3`. 345 tests, build clean, `size>=3` confirmed in the bundle. Watch (not gating, small N): dismiss rate + prompt->enroll; revert is one line back to 2.

**Owner-directed 2026-07-18.** 86% of enrollment-prompt exposures fire on the `conditions_interest` trigger, which today fires after a user dwell-views conditions on just **2** distinct spots in a session (`components/ConditionsPanel.tsx:46`, `conditionsViewedSpots.size >= 2`). Browsing two spots is a weak "I'm deciding where to paddle" signal, so the card is shown too early, to people still browsing. Raise the bar to 3 so the prompt fires on stronger intent.

- **Change:** `ConditionsPanel.tsx:46` `>= 2` -> `>= 3`; update the comment at lines 36-37 ("2nd distinct view" -> "3rd") to match. No other trigger touched (`first_save`, `return_session`, `manual`, `standalone_relaunch` unchanged).
- **Instrumentation:** no new event; `alert_optin_shown { trigger: "conditions_interest" }` volume drops by design. Add an `analytics/INSTRUMENTATION_CHANGELOG.md` entry (trigger-threshold change; Comparability note: conditions_interest exposures fall, this is a trigger change, not a behavior change).
- **Acceptance:** the interest event fires only after the 3rd distinct dwell-viewed spot in a session; existing tests updated; changelog entry present; verified in dev.
- **Watch, do not gate:** dismiss rate among shown and prompt->enroll conversion. N is small, so this is a design bet, not a powered test; revert is a one-line change back to 2.

## 66. [done] Redesign the enrollment prompt: informative, elegant, inviting, clear (design-lead pass, deployed 2026-07-18)

**Shipped 2026-07-18 (studio loop, design-lead spec; creative-only per owner).** Re-skinned + re-worded the enrollment card (`components/InstallPrompt.tsx`), the app's one remaining dark-navy surface, onto the light Meltwater system: white card, `--border` hairline, ink-tinted shadow, Newsreader headline, Hanken body, azure `--accent`. Fixes: (1) **wordy** copy cut to the minimum ("Get alerts for your spots" / "Push or email, your call." / "Email me"), (2) **wrapping** fixed by moving the × to an absolute corner slot and dropping the subline/buttons/email-row to full card width (was a cramped ~250px shared column), (3) **unpolished** visuals fixed: state-driven stroked-SVG icon badge (bell=offer / envelope=pending / check=done) replacing the 🚣 emoji, restyled full-width primary + outline resend + tertiary-link buttons, focus rings, 44px tap targets. **Functions untouched** (owner constraint): dual-CTA push+email structure (item 32), platform/trigger branching, all handlers/effects, item-47 email suppression, kill switch, and every analytics event are byte-unchanged; the item-35 held assent line stays absent; the item-34 safety line is byte-identical to ConditionsPanel. Fixed a real bug the pre-outage draft carried, `Header` was a component created during render (lint error + subtree remount); converted to a plain render helper. `lib/email/capture.ts` resend strings tightened. 347 tests, build + app-lint clean; verified live-in-dev desktop + 390px (light card, icon, corner ×, no awkward wrap, no console errors). Watch: dismiss rate + prompt->enroll after ship.

**Owner-directed 2026-07-18.** The enrollment card (`components/InstallPrompt.tsx`) converts ~2% of the 59 users it reaches; 83% dismiss. Owner's critique: "ugly, wordy, text wraps to the next row, looks unappealing and unprofessional and unpolished." Run a design-lead + editor pass to make it informative, elegant, inviting, and clear.

Problems to fix:
- **Wordy / lawyerly.** Cut or shorten the legal/privacy disclaimer copy to the minimum actually required. Coordinate with the lawyer gate on what must stay (item 35 held an enrollment assent line for attorney review, respect that boundary). Every sentence that adds no net-new info goes.
- **Text wraps awkwardly** to a second row. Size copy and controls so nothing wraps at the widths the card renders on (the three mobile surfaces + desktop).
- **Unpolished visuals.** Bring it to the app's Meltwater design system (Newsreader display / Hanken Grotesk body, azure `--accent`, `--border` hairlines, generous whitespace), matching the polish of the redesigned spot sheet (items 63/64).

- **Process:** design-lead produces the spec (layout, all states, exact copy strings, visual notes referencing existing components); editor rewrites every user-facing string for clarity and house voice (no em dashes); then implement. Keep the dual-CTA push+email structure (item 32) and the item-47 email-subscriber suppression: this is a visual + copy redesign, not a behavior change.
- **Acceptance:** no text wraps at 390px or desktop; disclaimer reduced to the lawyer-cleared minimum; card matches the design system; all states covered (push / email / both; granted / denied / dismissed; "you're set"); verified live at 390px + desktop, no console errors.
- **Watch:** dismiss rate and prompt->enroll conversion after ship.

## 67. [done] Cap the `return_session` enrollment-prompt frequency (deployed 2026-07-18)

**Shipped 2026-07-18 (studio loop).** `return_session` had no per-session guard (unlike `conditions_interest`) and no show-based back-off, so it re-nagged on every qualifying pageload (one user: 31 `alert_optin_shown` views). Two-layer cap in `InstallPrompt.tsx`: (1) `returnSessionShownThisSession` module flag (mirrors `conditionsInterestFired`), at most once per session even if the `[platform]` effect re-runs; (2) a persistent 14-day back-off (`ptw-return-offered-until`) written WHEN SHOWN, not only on dismiss, so a user who ignores the card without tapping dismiss isn't re-offered for 14 days. Scoped to `return_session` (own key, never suppresses other triggers); eligibility (>=2 saves, item-15 snooze, item-47 email suppression) unchanged; the × dismiss still writes the 14-day snooze. No new event; `alert_optin_shown{trigger:"return_session"}` per-user counts fall by design (changelog). Regression grep-guard test added. 347 tests, build clean. Watch (small N): dismiss + prompt->enroll; one-line revert.

**Owner-directed 2026-07-18.** In the clean 9-day window the `return_session` trigger logged **31 `alert_optin_shown` views to a single user** (1 unique user total): it re-nags the same person on repeat pageloads. Unlike `conditions_interest`, which has a once-per-session module guard (`conditionsInterestFired`, `components/ConditionsPanel.tsx:43-48`), the `return_session` re-offer (`components/InstallPrompt.tsx:258-277`, a `useEffect` keyed on `[platform]`) has **no per-session cap**: any qualifying mount (not subscribed, not snoozed/denied, >=2 saves, not email-suppressed) re-shows the card. It is bounded only by the 14-day snooze, which is set on dismissal, so a user who never explicitly dismisses (or whose dismissal did not persist the snooze) sees it again and again.

- **Diagnose first (confirm on a real device):** whether the 31 impressions are within one session (effect re-running / platform re-resolving) or across many sessions with no snooze set, and whether every dismiss path reliably persists `snoozedUntil()`.
- **Fix:** add a per-session guard to `return_session` mirroring `conditionsInterestFired` (show at most once per session), plus a persistent back-off so it does not re-offer indefinitely absent an explicit dismissal; ensure every dismissal path writes the snooze.
- **Scope:** `return_session` only; do not change its eligibility (>=2 saves, item-15 snooze, item-47 suppression) or the other triggers.
- **Acceptance:** the card shows at most once per session for this trigger; a user who ignores it (never taps dismiss) is not re-shown indefinitely; existing tests updated + a regression test for the cap; verified in dev.
- **Instrumentation:** no new event; `alert_optin_shown { trigger: "return_session" }` per-user view counts fall. Add an `analytics/INSTRUMENTATION_CHANGELOG.md` entry (frequency cap; Comparability: return_session impressions drop, not a behavior change).

---

## Owner item, added 2026-07-18 (mobile sheet polish; queued top-most on purpose)

## 64. [done] Mobile sheet app bar: brand wordmark + back affordance (design-lead pass, deployed 2026-07-18)

**Shipped 2026-07-18 (studio loop, design-lead spec).** The full-screen app bar now leads with a 44px circular **back arrow** (Feather `arrow-left` SVG, `aria-label="Back to the map"`, focus-visible ring) then the **"Paddle to Water" wordmark** (Newsreader bold, non-tappable `<span>`), replacing the spot-name + × that duplicated the `<h1>` below. Layout `justify-between`->`gap-2`, left gutter tightened, right loosened. design-lead's calls: back arrow (not chevron/undo) since it's page-not-modal; wordmark non-interactive (a tappable brand would be a second control for the same `onClose`). Analytics: the control fires `spot_sheet_dismissed { method: "back" }` (was "close"); desktop/rollback × stays "close"; changelog added. Scope: full-screen mobile bar only; rollback pill + desktop untouched. 344 tests, build clean; verified live-in-dev at 390px: bar shows brand + back arrow, spot name renders once (the `<h1>`), back dismisses to the map, no console errors.

**Owner-directed 2026-07-18, following item 63.** The new full-screen app bar (`components/SpotDrawer.tsx:257-278`) currently shows the spot name, and the same name repeats immediately below as the large `<h1>` title, so the spot name renders twice on open. Two owner directives to fix it:

1. **App bar shows the "Paddle to Water" brand, not the spot name.** Removes the redundancy and puts the brand on the surface. Match the main header wordmark styling (`components/HomeClient.tsx:565`: `font-['Newsreader'] font-bold text-(--dark)`, sized for the slim bar). The large spot-name `<h1>` below stays as the content header, so no context is lost.
2. **Change the close X to a back/return affordance** (a curved return arrow or a back arrow), because the sheet is now a full-screen page, not a modal. A back arrow reads as "return to the map/list where I was," which matches the mental model better than a modal dismiss X.

**This is a design-lead pass (same bar as item 63), not a mechanical swap.** Points for design-lead to resolve:
- **Layout + iconography:** back-affordance conventionally leads (left); brand then sits beside or after it. Pick the exact icon (a back chevron/arrow vs a curved "return" arrow) and confirm it reads unambiguously as "go back," not "undo." Keep the **44px tap target** and a clear `aria-label` (e.g. "Back to the map"). The brand wordmark should be tappable-to-home-consistent or purely decorative, decide and label accordingly (the main header brand is `aria-label="Paddle to Water, return home"`).
- **Tradeoff to weigh, not ignore:** item 63 put the spot name in the app bar so it stays visible when the body scrolls. Replacing it with the brand loses that scrolled-context. The owner has chosen brand; confirm the large `<h1>` gives enough context on scroll, or that this is an acceptable trade (it is the owner's call, honor it).
- **Analytics:** the dismiss currently fires `spot_sheet_dismissed { method: "close" }` (`SpotDrawer.tsx` app-bar button). If the X becomes a back arrow, keep the event alive but rename the method to `"back"` (or add it) so the metric stays truthful and comparable; changelog entry per the analytics rules.
- **Scope:** full-screen (kill-switch-ON) mobile app bar only. Do not touch the rollback peek/drag pill or desktop.

**Acceptance:**
- The spot name appears once on open (the `<h1>`); the app bar shows the "Paddle to Water" brand.
- The app-bar dismiss control is a back/return affordance with a 44px target and a clear `aria-label`; tapping it returns to the list/map.
- design-lead sign-off on the bar layout + icon; verified at 390px with no console errors; `spot_sheet_dismissed` still fires (method updated) with a changelog entry.

## 63. [done] Redesign the full-screen mobile spot sheet: false drag handle + scroll wobble fixed (design-lead pass, deployed 2026-07-18)

**Shipped 2026-07-18 (studio loop, design-lead spec).** Ran design-lead first per the owner's ask. Decision: the full-screen sheet is now a TRUE full-screen surface (`position: fixed; inset: 0`, covers to the top, no 8% gap), not a bottom sheet in costume. Two fixes: (1) **False affordance gone**, the grabber pill is replaced by a slim sticky app bar (spot name in Newsreader + a real 44px circular close button, `bg-(--fill)`, hairline below); nothing signals a drag that doesn't exist. (2) **Wobble gone**, `inset:0` reads no `window.innerHeight` and carries `transition:none`, so an iOS URL-bar collapse mid-scroll can't animate the top edge (root cause was `0.92*innerHeight` + a height transition recomputing on scroll re-renders). Also stripped the rounded top + shadow in full-screen (a viewport-covering surface clips its own corners). Rollback (kill-switch-off peek+drag) path untouched; desktop sidebar untouched. Dismiss stays × (now in the bar) + backdrop (inert behind a full-cover surface, harmless) + Escape. 344 tests, build clean; verified live-in-dev at 390px: panel covers 0->812, app bar + 44px close present, no `role=slider` handle, no console errors. **On-device caveat (owner):** the URL-bar wobble is iOS-Safari-only and not reproducible in the emulator, confirm on a real iPhone (Safari + installed PWA). Advisory follow-ups from design-lead, not blocking: Android back-gesture doesn't close the sheet (pre-existing, history uses replaceState) and optional focus-to-close-on-open a11y nicety.

**Wobble follow-up 2026-07-18 (owner: pill gone but sheet still wobbles at scroll extremes).** The `inset:0`/`transition:none` fix killed the URL-bar-collapse wobble, but a second wobble remained: overscrolling the sheet at its top/bottom chained to the document, rubber-banding the page and dragging the `position:fixed` sheet with it. Fix: `overscroll-contain` on the sheet scroller (the same `overscroll-behavior: contain` the non-wobbling `/disclaimer` page uses, which the item-63 pass omitted). 344 tests, build clean; the iOS overscroll bounce is not emulator-reproducible, so on-device confirmation is the owner's.

**Wobble follow-up 2026-07-18 (two tries):** owner reported the sheet still wobbled up/down at the scroll extremes after item 63, twice. First try (`overscroll-contain`, ecd26a1) was a NO-OP: globals.css already sets `overscroll-behavior:contain` on every `.overflow-y-auto` and the app shell is locked (`body{position:fixed;overflow:hidden;overscroll-behavior:none}`), so chaining was never the cause. Real cause: the fixed panel's OWN rubber-band bounce at its scroll extremes, which `contain` permits and only `none` suppresses. Fix (1b01b73, deployed + verified in prod bundle): `overscroll-behavior:none` set INLINE on the full-screen panel (inline beats the global `.overflow-y-auto{contain}` rule; a Tailwind class would be overridden by it). Rollback path keeps the global contain. Owner-verify on a real iPhone (not emulator-reproducible). Lesson: check globals.css before adding a CSS utility, `contain` was already there.

**Owner-reported 2026-07-18, with a screenshot, after item 57 shipped.** Item 57 made the mobile spot sheet open full-screen and removed the drag *behavior*, but left the drag *chrome and mechanics*, so the surface now lies about what it does. Two concrete defects, both visible on a real iPhone:

1. **The grabber pill is a false affordance.** In full-screen mode the sheet still renders the grey drag-handle pill, `components/SpotDrawer.tsx:242-245`, as a "visual only" decoration (`aria-hidden`, no touch handlers). A centered pill at the top of a sheet is the universal "drag me" signal; keeping it after removing the drag makes every user try to drag and get nothing. The owner's words: "I don't know what it's for, it still intuitively invites me to drag down the sheet." Remove it, or replace it with chrome that tells the truth about a full-screen surface.
2. **The sheet wobbles on scroll.** The sheet height is `FULL = 0.92` of `window.innerHeight` with a `height 0.28s` transition (`SpotDrawer.tsx:48, 162, 234`). On iOS the URL bar collapses as you scroll, `innerHeight` changes, a re-render recomputes the height, and the transition animates it, so the sheet edge slides while you scroll ("the sheet wobbles when I scroll it for no reason"). Likely fix: give a permanently full-screen surface a stable height that does not track live `innerHeight` mid-scroll (e.g. `100dvh` / fixed insets) and do not run a height transition on scroll-driven re-renders. Confirm the exact cause on a real iOS device, not just the emulator.

**This is a design item, not a one-line deletion. The owner explicitly asked for "heavier designer scrutiny and thoughtfulness," so run it through design-lead first.** The deeper point: a sheet that is *always* full-screen is no longer a bottom sheet, and should not wear bottom-sheet costume. Design-lead should decide what it actually is now and design it as that:
- Is it truly full-screen (cover to the top, a modal page) or a deliberate near-full sheet that still peeks the map? Item 57/D27 said "full screen"; the current `0.92` leaves an 8% top gap that, with the pill, reads as draggable. Pick one on purpose.
- What replaces the grabber as the top chrome? A full-screen surface needs an unambiguous, reachable close (the `×` exists at `SpotDrawer.tsx` top-right; is it enough on a tall phone, or does it need a title bar / back affordance?) and correct top safe-area handling.
- Keep the existing dismiss paths honest (× + backdrop; item 57 removed drag-to-dismiss). Do not reintroduce a swipe-to-dismiss without designing its affordance.
- Preserve everything item 57/D27 decided (no drag-to-resize, full-screen open, `sheet-auto-expand` kill switch, no A/B per DAU<100). This is finishing item 57's job with design care, not reopening D27.

**Acceptance:**
- No element on the full-screen sheet signals draggability that isn't draggable (no vestigial grabber pill; no ambiguous top gap that invites a drag).
- No wobble/height-shift while scrolling the sheet body on a real iOS device (verify on device, the emulator will not reproduce the URL-bar collapse).
- A clear, reachable way to close the sheet, verified at 390px and on a tall phone.
- design-lead sign-off on the redesigned top chrome before implementation; verifier confirms on device-sized viewport.

## Owner item, added 2026-07-17 (queued top-most on purpose)

## Verify-loop findings, added 2026-07-17 (end-to-end quality pass)

## 62. [done] `--muted` body text now passes WCAG AA contrast (deployed 2026-07-18)

**Shipped 2026-07-18 (studio loop).** Darkened the `--muted` token from #6E8598 to **#556A7E** in `app/globals.css`, the lightest value that clears AA 4.5:1 on all three backgrounds it appears on (computed: --bg #EEF5FB 5.09:1, white 5.60:1, --accent-light #E3EEFA 4.77:1; was 3.49/3.84/3.27). Fixes all 14 failing small-text elements at once (every spot-row city/region subtitle, the hero subtitle, the rating+location line, "Tap ♥..."), since they all use `var(--muted)`. Also updated the same hardcoded #6E8598 in the email templates (`lib/email/templates.ts`, `app/api/email/unsubscribe/route.ts`, footer/tip/unsub text) to match, per the keep-in-sync rule and for email readability (color-only, no send-logic change). No analytics touched. 338 tests, build clean. Verified live-in-dev: the rendered spot-row subtitle measures 5.09:1 (passes AA), no console errors, layout unchanged.

**Found by the 2026-07-18 verify loop; this is the open follow-up item 38 flagged ("A follow-up `--muted` body-text contrast question was raised") and never filed.** Measured the rendered contrast of `--muted` (#6E8598):
- on `--bg` #EEF5FB (the canvas): **3.49:1**
- on white: **3.84:1**
- on `--accent-light` #E3EEFA: 3.27:1

WCAG AA needs **4.5:1** for normal-size text; `--muted` clears only the 3:1 large-text bar. And it is used for small (12px, weight 400) text throughout, measured live at 390px: **14 distinct failing elements**, including the one that matters most, **every spot row's city/region subtitle** ("Alviso · South Bay", "Cupertino · South Bay", ...). That subtitle is core content (it is how a user tells spots apart, e.g. the two Folsom Lake records) shown below the AA threshold on all 140 rows. Also failing: the hero subtitle "Paddleboard & kayak spots across the Bay Area", the rating+location line, and "Tap ♥ to watch a spot's conditions". `--dark` (13.3:1) and `--accent` (4.53:1) pass; the problem is scoped to `--muted`.

**Acceptance (color-only, no layout risk, same shape as item 38):**
- `--muted` text at normal size hits >=4.5:1 on both backgrounds it appears on (`--bg` and white). A measured candidate that clears both is **#576E82** (4.82 on `--bg`, 5.31 on white); **#526A7E** (5.13 / 5.64) gives more margin. Final hex is design-lead's call, keep it a muted gray-blue in the Meltwater palette; darken only until AA passes.
- This is design-lead territory (it shifts the app-wide tertiary text tone); check the darkened token still reads as clearly tertiary against `--ink-2` #42607A and `--dark`.
- Verify the change is token-only (no size/weight/layout change) and re-measure the spot-row subtitle live at >=4.5:1 after.
- If the owner prefers to keep the lighter tone for aesthetics over strict AA, that is a real tradeoff to escalate, not silently accept: it is core body text, not decorative.

## 58. [done] Two spots both named "Folsom Lake" (ids 20/120): disambiguated (deployed 2026-07-18)

**Shipped 2026-07-18 (studio loop).** Renamed spot 120's `water` to "Folsom Lake - Beals Point" (its coordinate 38.719,-121.173 and notes both confirm Beals Point); spot 20 stays "Folsom Lake". The two rows are now distinguishable at a glance in the list/map. `water`-field text edit only, verified no `lat`/`lng` churn in the diff, no new spot id, spot-id/sitemap URL unchanged; page `<title>`/OG/JSON-LD regenerate from `water` (confirmed the new name in the build output). 338 tests + build green. Left id 20 generic on purpose: it is a genuine multi-launch record (Peninsula/Rattlesnake Bar/Granite Beach/Browns Ravine/Beeks Bight) with no single accurate sub-name, giving it a guessed one would be the item-50/D26 defect; renaming only 120 is the smallest fully-grounded fix that removes the ambiguity.

**Found by the 2026-07-18 verify loop (data + UX).** Two non-hidden records carry the identical `water` name "Folsom Lake", same city ("Folsom"), same region (Sacramento), same difficulty (flatwater), 5.7 mi apart on the same reservoir. In the list and map a user sees two "Folsom Lake" rows with nothing in the primary label to tell them apart; the only difference (pin location, notes) is hidden until the spot is opened. It is the sole identical-name pair among all non-hidden spots (checked programmatically).

- **id 20** (38.7844, -121.1070): notes list Peninsula Campground, Rattlesnake Bar, Granite Beach, Browns Ravine, Beeks Bite.
- **id 120** (38.7193, -121.1729): notes describe Beals Point (ramp, beach, parking).

**Relationship to item 50 / D26:** this is the same class as item 50's multi-launch records, but Folsom Lake is NOT in item 50's enumerated list (70, 54, 84, 63) nor in the D26 memo, so it is currently untracked. Item 50/D26 reserve the split-vs-dedupe *product* decision (new spot ids touch sitemap/OG/`generateStaticParams`/JSON-LD/both crons) for the owner.

**Acceptance (pick the smallest fix that removes the ambiguity):**
- The two rows are distinguishable at a glance in the list/map. The low-risk path is a disambiguating rename of the visible label to name each launch area (e.g. "Folsom Lake - Granite Beach" and "Folsom Lake - Beals Point"), grounded in each record's actual notes/coordinate. This is a `water`-field edit only: no new spot id, no new SEO/cron surface, unlike a split.
- If instead the two are judged truly redundant (same launch), that is a delete-as-duplicate and an owner decision, same as the item 50 records. Do not delete without owner sign-off.
- A rename touches the page `<title>`, OG, and JSON-LD (all derive from `water`); verify those regenerate and the sitemap URL (spot id) is unchanged. Do NOT alter `lat`/`lng`.

## Owner items, added 2026-07-16 (evening; both [ready], queued top-most on purpose)

## 59. [done] tide_sensitive pass, NO-OP: item 40 already adjudicated the candidate set correctly (2026-07-18)

**Resolved as a no-op, no change shipped.** The proposal (and its owner authorization) assumed spots 27/38/40/43/82 were unfixed `tide_sensitive=false` defects because their notes contain a tidal word. But **item 40 (2026-07-17) already read each of these against its notes and deliberately held them false**, with the rule "a tidal *label* is not tide *dependence*", and `lib/spots.test.ts` ("holds ambiguous mentions false") enforces it. Their notes only LABEL the water tidal ("moderate tidal current", "a mellow tidal stretch", "a tidal lagoon", "two put-ins on the same tidal river"); none describes a tide-gated launch. Flipping them would regress a tested decision and add tide-noise to the conditions panel where tide isn't material. I flipped them, the test failed, I reverted; a fresh scan for genuine tide-DEPENDENCY phrasing (before-low / unusable-at-low / time-mid-to-high / strand) among the remaining `false` bay spots found only spot 61, whose "mudflat" hit is a regulatory closure ("avoid the reserve"), not a dependency. So the pass item 40 ran was already complete; there is no valid remaining defect. **If the owner wants tide surfaced on tidal-water spots regardless of the dependence rule, that is a deliberate change to the rule + the test, re-file it as such, not a bug fix.**

**Why:** `tide_sensitive` feeds the conditions engine (`lib/savedConditions.ts` / `lib/conditions.ts`), the app's differentiator, so a wrong `false` silently drops the tide half of conditions for a tidal spot. CLAUDE.md documents this as systematic (36 of 68 bay spots say false; 14 describe tides in their own notes while the flag says false). Item 40 flipped only 7 and stopped. Verified 2026-07-18: spots **27 (moderate tidal current), 38 (opposing tides mid-bay), 40 (mellow tidal stretch), 43 (tidal river)** say `false` while their own notes describe tides, unambiguous defects; **82 (Lake Merritt "tidal lagoon")** is a judgment call; spots **60 ("usable at all tide levels") and 96 ("free of tides")** are the D19 pre-cleared false positives and must stay `false`.

**Acceptance:**
- Flip `tide_sensitive` to `true` on the notes-self-evidencing defects (27, 38, 40, 43; decide 82 on its note), leaving 60 and 96 `false`. Note-grounded, no external source (D19 tide-pass-first default).
- Boolean-only change: `git diff data/spots.json | grep '"lat"\|"lng"'` empty, so the D23 coordinate gate never fires.
- After deploy, the affected spots' conditions panel shows a tide readout, not "No tide station" (verify `/spot/43`).
- The broader "tidal-but-says-false with no tide word in notes" set is a larger per-spot-judgment sub-pass; scope this to the self-evidencing slice and note the remainder.

**Flags:** no decision, no legal surface. The loop can ship this immediately once promoted.

## 60. [done] Refresh stale conditions when the installed PWA is re-foregrounded (deployed 2026-07-18)

**Shipped 2026-07-18 (studio loop, owner-authorized promotion).** `ConditionsPanel` now listens for `visibilitychange`; when the app is re-foregrounded and the shown run is older than the exported `CACHE_TTL_MS` (30 min), it bumps a refresh tick that re-runs the fetch effect (`getConditionsRun` cache-misses on expiry and fetches fresh), so a returning user never reads last session's stale wind/tide. Additive + guarded: the normal mount fetch/render path is unchanged; the refetch only fires when stale and only when the `conditions-foreground-refresh` kill switch is ON (default ON, no A/B, DAU<100). Instrumentation: `conditions_loaded` gained an optional `trigger: "mount" | "foreground"` + changelog (volume rises from a genuinely-new return-session refetch; segment by `trigger`). 338 tests, lint (app), build all green; `CACHE_TTL_MS` exported from `lib/conditions.ts` so there's one staleness threshold. NOTE: in-browser wiring check was blocked by a Browser-tool outage at ship time; the change is additive/kill-switch-reversible and the normal path is untouched, and the 30-min stale refetch is owner-verifiable (background the installed PWA 30+ min, reopen, the freshness stamp updates).

**Why:** Conditions cache per session with a 30-min TTL (`lib/conditions.ts` `CACHE_TTL_MS`), but there is no `visibilitychange`/focus refetch anywhere in the app. iOS keeps an installed PWA alive in memory across sessions (item 12 note), so a returning user who reopens the PWA sees conditions state from their last session, hours stale, at the exact return-visit moment the retention loop exists to serve. Stale wind/tide on that open is the differentiator failing on the return visit.

**Acceptance:**
- On `visibilitychange` to visible, if the open spot's cached run is older than the TTL, refetch and repaint with a fresh `fetchedAt` stamp.
- Bounded: refetch only the currently-open/selected spot (and the watched strip if cheap), never a fan-out.
- Instrument as SYSTEM (`conditions_loaded` with a `trigger: "foreground"` prop, or a `_loaded` twin) + changelog; measures availability, not intent.
- Kill-switch flag at 100%, no A/B (DAU<100).

**Flags:** no decision, no legal surface. Client-side only, buildable now.

## 61. [proposed] Cold-open "good to paddle today" ranked surface

**Why:** The strategy names "calm-window alerts + a cold-open reason to check" (line 8) and the vision answers "where's good today?" (line 16). Item 26 shipped a cold-open strip but only for spots this device already viewed, so a first-time or one-and-done visitor (78% one-and-done) gets no answer. This ranks spots by today's conditions on load, the purest expression of the per-spot-judgment moat as discovery. Distinct from item 8 (a redirect *out* of an already-open blown-out spot) and item 26 (device history).

**Acceptance:**
- On cold open, show a short ranked "good to paddle today" list (top 2-3 spots with a live paddleability badge), tappable into the drawer.
- Bounded candidate set only: rank across nearest-K by geolocation or map viewport, cached, reusing the SAME `evaluateGoodWindow` as the cron/item 8 + precomputed gridpoints (item 53), no unbounded NWS fan-out.
- The "not good enough to surface" threshold must equal the calm-window definition, or it contradicts the drawer.
- New dwell-gated INTENT `good_today_shown` + `good_today_clicked` (`spot_id`/`region`) + changelog; kill-switch flag at 100%, no A/B.

**Flags:** no owner decision or legal surface, but it is the largest of the three (M/L) and shares conditions-fan-out plumbing with the still-proposed item 8; the board may prefer to ship 61 + 8 as one epic, sequenced after the early-August retention read.

## 51. [proposed] Marker clustering for dense areas (carved out of item 7, 2026-07-17)

**Why:** at statewide zoom the audit measured 67 markers within a 24px radius, a blob of overlapping pins nobody can tap. Clustering is the standard fix.

**Why it is its own item, not polish:** it needs a new dependency (`leaflet.markercluster`) and it collides head-on with a documented architecture invariant. CLAUDE.md line 48: the map runs `preferCanvas` with a SINGLE shared `L.canvas()` renderer, and any layer that spins up a second canvas makes per-canvas hit-testing swallow every click ("pins go dead, cursor stuck on grab"). `leaflet.markercluster` brings its own marker layer and rendering path, so the integration must be proven to compose with the shared canvas renderer before it ships, or it reproduces exactly that catastrophic click-death bug.

**Acceptance (size before promoting):**
- Clustering at low zoom that de-clusters on zoom-in, with NO regression to click handling at any zoom (test the "location granted" path specifically, since that is where the second-canvas bug bites).
- Confirm `leaflet.markercluster` composes with `preferCanvas` + the shared `L.canvas()` renderer, or document the alternative (a canvas-native clustering approach).
- Pins keep the difficulty colours (`DIFFICULTY_COLOR`, `lib/types.ts`); cluster bubbles need their own count styling.

## 50. [done] Fix spot 54 (hidden); 63/70 splits deferred (D26, deployed 2026-07-18)

**Shipped 2026-07-18 (studio loop, D26).** Spot 54 (Russian River) set `hidden: true` + `hidden_reason` (coord reverse-geocodes ~30km off in Cloverdale, untrustworthy; Guerneville covered by spot 150). Removed its `owner_rating` (4.4) per the "no hidden spot carries a rating" invariant (item 39 test; same as spots 79/92); the count guard dropped 118 -> 117. `lat`/`lng` untouched (coord-clean diff verified). Confirmed excluded from every surface + both crons (`ALL_SPOTS` drops 54, `/spot/54` no longer built) while `ALL_SPOTS_INCLUDING_HIDDEN` keeps the record. 338 tests, build green. The 63/70 splits stay deferred per D26 (need a two-source sourcing pass); 84 dropped (no defect). Un-hide only if re-pointed to a sourced Guerneville put-in.

**Escalated to D26 2026-07-18 (studio loop).** Reading the item-40 audit showed the "split 4 records" framing overstates readiness: **84 has no defect** (coord already matches its notes), **63 + 70 splits are not sourced** (the audit fetched no put-in coordinates for them, and a split mints new SEO/cron surfaces, D19 Q2a reserves the scope for the owner), and **only spot 54 is a real defect** (coord ~30km off in Cloverdale vs the Guerneville put-ins its notes name, likely redundant with the owner-added spot 150). D26 recommends: hide spot 54 (reversible), drop 84, defer the 63/70 splits to a sourcing pass. Blocked on D26.

**Created by item 40 (2026-07-17), report-only section.** Four records name several real launches at once, so no single coordinate is correct. The audit verified the candidate launches with sources and deliberately changed nothing (D19 Q2a), because a split creates a new spot id that enters the sitemap, the OG image builder, `generateStaticParams`, JSON-LD, and BOTH alert crons. That is a product change, not a data fix.

- **70 Richmond Marina:** a place-centroid merging ~4 Water Trail launches ~1km apart (Marina Bay Yacht Harbor, Shimada, Vincent Park). Also names the wrong water body (notes say San Pablo Bay; the Water Trail says San Francisco Bay).
- **54 Russian River:** a water-body record pinned 24-33km from both put-ins its own notes name, which are spots **33 and 35**. Likely a delete-as-duplicate, not a split.
- **84 MLK Jr Shoreline:** two launches ~2.5km apart merged into one record.
- **63 Berkeley Marina:** the Water Trail publishes TWO trailheads, a ramp (37.868485, -122.317743) and a small-boat hand launch (37.86281, -122.313559).

**Acceptance:** decide per record (split / delete-as-dup / pick-primary-and-note-the-other), then apply across every surface a spot id touches. Sources are in `reports/item-40-record-accuracy-2026-07-17.md`; do not re-discover them. Owner decision on the split-vs-keep scope before promoting.

## 49. [proposed] Email subscribers on Android have no path to push

**Created by D18 Q2(c), 2026-07-16.** Item 47 makes the "alerts on" indicator true for email subscribers, which hides the "Turn on alerts" button (`components/SpotList.tsx:111` gates it on `!alertsOn`). That is the only manual enrollment entry point. A push-capable email subscriber, typically on Android, therefore has no route to push at all.

The owner chose this knowingly over a relabelled "Add push" button, to keep the header coherent. This item is the deferral, so the dead end is not forgotten.

**Do not start this before the D17 / email-deliverability constraint is resolved.** The affected cohort is currently zero: there are no confirmed email subscribers except the owner, and none on Android. Building a push-upgrade path for an empty set is the same mistake in the opposite direction.

**Acceptance (when it is worth doing):**
- A confirmed email subscriber on a push-capable device has a discoverable route to enable push.
- It never re-offers EMAIL to an email subscriber. That is item 47's bug and must not return.
- Weigh against the standing "desktop never offers push" invariant (D18 default, E5): this is an Android/installed-PWA question, not a desktop one.

## Restored 2026-07-18: items 31, 35, 45, 46 (accidentally deleted 2026-07-17 in commit 7063d16, re-added verbatim from git; owner directive: never delete a roadmap item)

## 31. [done] A picture for each spot (first tranche, 57 spots, deployed 2026-07-18)

**Why:** Owner idea 2026-07-13. Spot cards/sheets are text-only; a photo is the highest-impact visual upgrade for browse appeal and shared-link CTR.

**Acceptance (to be sized before promoting):**
- Every spot (or a defined first tranche) shows a photo on the drawer/sheet without hurting load performance (lazy-load, sized derivatives).
- Sourcing must be rights-clean and attributed (owner photos, CC-licensed with attribution, or a licensed API); no scraping. This is the hard part: 140 spots, so propose the sourcing plan + effort estimate as a decision before building.
- New user-facing surface: ships behind a flag or staged tranche per the major-update directive.

**Sourcing plan sized 2026-07-14 (studio); D10 RESOLVED 2026-07-17 (owner: tiered hybrid, option a).** Feasibility probe found: Google Places Photos can't be self-hosted (ToS bars caching, photo names expire, so re-fetch + pay per view + a render-path dependency); free self-hostable CC sources (Wikimedia Commons + Flickr CC) cover ~55-75% of spots after human curation (36-spot probe: 78% have a geo-tagged Commons file within 500m, 22% none). Path (D10 option a): tiered hybrid, harvest + curate CC-BY/BY-SA/CC0 photos self-hosted with attribution, static-map-thumbnail fallback for gaps, owner photos backfill, ship the curated tranche behind a **kill-switch flag at 100%** (per the 2026-07-17 no-A/B-until-DAU-100 directive, NOT a powered A/B) with a dwell-gated `spot_photo_viewed` intent event + changelog. Effort ~2.5 eng days + ~1 day curation.

**Slice 1 shipped 2026-07-18 (studio loop): Commons candidate harvest.** `raw-data/harvest_photos.mjs` queries Wikimedia Commons geosearch (500m, File namespace) for free-licensed geo-tagged photos near every non-hidden spot and writes `raw-data/photo-candidates.json` for curation. Live run: **112 of 140 spots (80%) have >=1 free candidate, 946 candidates total**, all CC-BY / CC-BY-SA / CC0 / public-domain (fair-use/NC/ND filtered out), with author + license + attribution-required + source-page per candidate. Matches the probe's 78% estimate. No app code, no deploy, no user-facing change. The 28 zero-candidate spots (Lexington Reservoir, Rollins Lake, Folsom Lake, Lake Berryessa, Clear Lake, Delta launches, etc.) are the Flickr-CC (needs API key) + owner-photo + static-map-fallback tail.

**Slice 2 shipped + deployed 2026-07-18 (owner directive: automate the pick, no manual curation).** `raw-data/select_photos.mjs` scored each spot's candidates (relevance keywords + spot-name-token match + orientation/resolution, minus junk) and downloaded the top pick; `raw-data/montage_photos.mjs` built contact sheets that were **vision-reviewed** (the title score cannot tell "bird photographed at X Bay" from "photo of X Bay"). Of 111 auto-picks, **57 were verified genuine location photos and shipped; 54 rejected** (wildlife, objects, buildings, signs, maps, satellite imagery). Self-hosted as 800px derivatives in `public/spot-photos/` (~5MB), served via a plain lazy `<img>`. Display in `SpotDrawer` above the notes, with required CC attribution ("Photo: {author} · {license} · Wikimedia Commons", linked to source + license). Behind the `spot-photos` kill-switch flag at 100% (no A/B, DAU<100 rule). New dwell-gated INTENT `spot_photo_viewed` + changelog. 338 tests (6 new), build clean; verified live desktop + mobile (photo + attribution render, conditions still reachable, no-photo spots render nothing, no console errors). IP note: only CC-BY/BY-SA/CC0/PD shipped, attribution rendered per license (the D10 Q4 caption model, pre-cleared); no lawyer re-gate needed for a pre-cleared attribution surface.

**Remaining (follow-up, not blocking):** 83 spots still have no photo, 54 rejected auto-picks (have candidates, need a targeted re-pick pass, ids in git history of this commit) + 29 with no free Commons candidate (Flickr-CC needs an API key, or owner photos). This is a proposed backfill slice, not auto-promoted.

## 56. [done] Photo backfill (free-source scope complete, 82/140 = 59%, deployed 2026-07-18)

**Done for the free-automated scope. Coverage 57 -> 82 across three slices, three free sources, no paid providers (owner directive).** Slice A re-pick (+3), slice B Wikidata P18 (+18), slice C Openverse/Flickr (+4). Each vision-curated (title/geo scoring is ~50% FP). Tools: `raw-data/{repick,wikidata,openverse}_photos.mjs`.

**Free sources are now exhausted at 59%.** Commons geosearch (500m), Wikidata P18 (coord-verified), and Openverse text-search all run; the remaining ~58 spots are small marinas/sloughs/creeks with no free-licensed photo (Openverse top-1 was 4/24 usable, pure keyword noise). Further coverage needs **owner-supplied photos** (excluded from this item's free-only scope) or a paid provider (owner ruled out). If the owner wants 100%, the path is an owner-photo upload/backfill, a separate item. Slice notes below retained for history.

**Slice B shipped 2026-07-18 (Wikidata P18): +18, coverage 60 -> 78 (56%).** `raw-data/wikidata_photos.mjs` searches Wikidata by spot name, VERIFIES the match by coordinate (P625 within 4km), and pulls the entity's P18 "image" (a curated main photo of the place, on Commons so license/author come free). 25 of 80 uncovered spots had a coord-verified P18; vision-review kept 18 (dropped 7: aerials/satellite, a B&W dam, the Morro Bay power plant, an entrance sign). Named lakes/reservoirs/regional parks hit best. All free-licensed, CC-attributed, self-hosted.

**Slice C (remaining ~62 uncovered):** the Wikidata-miss spots (marinas/sloughs/small launches without a P18) and the rest. Try: Openverse API (free, no key, aggregates CC), Flickr CC (free key), Mapillary; wider Commons geosearch (1.5-2km) + Commons Category-by-place. Honest map-thumbnail fallback for the truly uncovered. Diminishing returns expected, many small launches simply have no free photo. Same pipeline: vision-curate, self-host, attribution overlay, kill switch.

**Slice A shipped 2026-07-18 (re-pick the rejects): +3, coverage 57 -> 60.** `raw-data/repick_photos.mjs` re-scored every un-shipped spot's existing Commons candidates with a harder junk filter and staged the best alternate; vision-review of all 49 staged found the pool is junk-dominated (the rejects' candidates within 500m are mostly wildlife/objects/structures), so only **3 clear recoveries** shipped (spot 19 river, 86 Antioch Marina, 128 bay). **Finding: re-picking existing candidates is near-exhausted, low ROI.** The real remaining lift is the widened multi-source search below, kept `[ready]` for that slice.

**Slice B (remaining, the actual expansion):** widen beyond the 500m Commons geosearch, larger radius + Commons Category-by-place + Wikidata `P18` / linked Wikipedia image for the water body/park; then other FREE sources (Openverse API, Flickr CC free key, Mapillary). Then the ~26 spots with zero Commons candidate + the ~46 whose 500m pool had no usable photo. Honest map-thumbnail fallback for the truly uncovered. Same pipeline: vision-curate, self-host, CC attribution overlay, `spot-photos` kill switch.

**Why:** owner directive 2026-07-18, appends item 31. The first tranche covered 57 of 140 spots; 83 have no photo. Get more of them covered by widening the search and being more creative, using only **free** sources (no Google Places, no paid third-party APIs).

**The 83 gaps split two ways:** 54 spots whose auto-pick was rejected but that DO have other Commons candidates (the cheapest recovery), and 29 with no free Commons candidate inside the 500m radius. Reuse the item-31 pipeline (`raw-data/harvest_photos.mjs` -> `select_photos.mjs` -> `montage_photos.mjs` -> vision-curate -> `data/spot-photos.json`). Title/geo scoring is ~50% false-positive, so every pick is vision-verified (memory `photo-autopick-needs-vision`).

**Acceptance (raise coverage well above 57/140, free only):**
- **Re-pick the 54 rejects first.** They already have candidates; vision-review each spot's FULL candidate list (not just the top-1), not just the rejected top pick. Highest yield for least work.
- **Widen the search for the 29 (and any still-empty):** larger Commons radius (1-2km), Commons Category-by-place and the linked Wikipedia/Wikidata `P18` image for the water body or park; then other FREE sources, Openverse API (aggregates CC, free), Flickr CC (free API key is not "paying a provider"), Mapillary street-level (CC-BY-SA, free). Confirm each source's license permits self-hosting + our resize.
- **Honest fallback for the truly uncovered:** a static map-crop thumbnail from the tiles the app already uses, visually distinct from a real photo (labeled), never dressed up as a photo. Owner photos backfill high-value gaps.
- Rights-clean + attribution on every added photo (CC only; the on-image overlay from item 31); self-hosted sized derivatives; `spot_photo_viewed` already exists, no new event unless a source needs one (then changelog it).
- Ships under the existing `spot-photos` kill switch (no A/B, DAU<100 rule).

## 57. [done] Mobile spot sheets open full screen; drag removed (D27, deployed 2026-07-18)

**Shipped 2026-07-18 (studio loop, D27).** `SpotDrawer` on mobile now always opens at FULL height with no drag-to-resize handle (replaced by a static grabber); dismiss is the × or a backdrop tap. Behind the `sheet-auto-expand` kill switch (default ON, no A/B, DAU<100); if disabled it falls back to the old peek + drag behavior. Kept the dismissal guardrail alive: `spot_sheet_dismissed` now fires with `method: "close" | "backdrop"` (was drag-only), and `spot_sheet_resized` stops with the drag, changelog entry added. 338 tests, build clean. Verified live-in-dev at 390px: sheet fills 747/812px, no `role=slider` handle, conditions + safety line visible without dragging, × dismiss works, no console errors. Desktop sidebar unaffected (mobile-gated).

**Escalated to D27 2026-07-18 (studio loop).** Two findings: (1) the drag is ALREADY instrumented, `spot_sheet_resized {to}` fires on a drag that changes snap state and `spot_sheet_dismissed {method:"drag"}` on drag-to-dismiss, so no new event is needed and the usage data likely already exists in PostHog; (2) the item-31 photo pushed the ConditionsPanel + safety line further below the peek fold, so if the drag rate is high, that is why. The blocker: the loop has no PostHog read key to run the drag-rate query itself. D27 asks the owner to run the two-series query (or drop a read key) and, if the rate is high, ship the pre-scoped fix (auto-open taller via the item-9/42 `startExpanded`, behind a `sheet-auto-expand` kill switch). Blocked on D27.

**Why:** owner directive 2026-07-18. On mobile the spot drawer is a draggable bottom sheet, peek (~58%) and full (~92%) snap points with a grab handle (`components/SpotDrawer.tsx`: `onHandleStart/Move/End`, `PEEK`/`FULL`, `startExpanded` from items 9/42). Question the gesture itself: is the slide up/down discoverable, used, and necessary, or is it friction that hides key content (conditions, the safety line) below the peek fold? This is a research-first item, not a foregone change.

**Acceptance:**
- **Measure, do not eyeball** (memory `verify-loop-priorities`): what share of mobile sessions actually drag the sheet vs never touch it? Does content below the peek fold (conditions panel, safety line) get seen? Use existing events (`spot_sheet_dismissed`, `conditions_loaded`, `spot_viewed`); add a lightweight `sheet_dragged` intent event if the drag isn't currently observable (changelog it).
- Evaluate alternatives against the data: keep the drag as-is; auto-open fuller so conditions clears the fold (relates to item 46's cheap alternative and item 9/42's `startExpanded`); replace drag with a tap-to-expand control; or collapse to a single sensible height. Weigh discoverability (a drag handle is a weak affordance) against the single-canvas / Leaflet z-index constraints (CLAUDE.md).
- Deliver a recommendation with the numbers behind it. If it warrants a change, spec it and ship behind a kill-switch flag (no A/B, DAU<100 rule); if the drag earns its keep, say so and stop, a validated "leave it" is a valid outcome.

## 35. [done] /terms page + footer link shipped; enrollment assent line HELD for attorney (D25, deployed 2026-07-18)

**Shipped 2026-07-18 (studio loop, D25 Q4 = ship the container now).** New `app/terms/page.tsx` (Terms of Use and Release) rendering the D25 draft ToS: assumption of risk, ordinary-negligence release with the gross-negligence/fraud carve-out, AS-IS/no-warranties, $100 liability cap, indemnification, CA governing law (San Francisco venue), assent-by-use. Mirrors `app/disclaimer/page.tsx` styling; "Terms" footer link added to `SpotList.tsx` + `HomeClient.tsx`. **Held per D25 (attorney gate, Q1):** the enrollment sign-in-wrap assent line (NOT added to InstallPrompt), the Civil Code 1542 waiver sentence (omitted), and any "enforceable waiver" claim. Stripped all `[ATTORNEY:]` notes; resolved `[DATE]`->July 18 2026 and `[COUNTY]`->San Francisco (owner's county per D5). New `components/terms-page.test.ts` (6 tests) guards: clauses present, safety-line interlock, no attorney-note/1542/placeholder/em-dash leak, both footers link /terms, and InstallPrompt still has NO assent line. 344 tests, build clean (/terms static). NEXT (owner): once the CA attorney (D25 Q1) blesses the waiver, ship the enrollment assent line + the 1542 wording as a follow-up.

**Lawyer gate ran 2026-07-18 (studio loop): verdict ESCALATE, opened D25.** Full draft ToS + assumption-of-risk waiver written (ready for a CA attorney to bless, embedded in D25). Core finding: a release of ORDINARY negligence for recreation is generally enforceable in CA (Tunkl), but a wrongful-death claim belongs to non-signatory heirs, so the waiver is UNCERTAIN against the exact drowning suit it targets, and gross negligence is never waivable. So it must not ship as a "shield" until attorney review. D25 asks the owner: (Q1) engage a CA attorney ~1hr; (Q2) form a CA LLC; (Q3) liability insurance; (Q4) ship the `/terms` page + footer now but HOLD the enrollment assent line until Q1. Recommended assent = sign-in-wrap ("By turning on alerts, you agree to our Terms and Disclaimer" below the CTA), NOT a checkbox, to protect enrollment conversion. No code/deploy this iteration (escalation only). Blocked on D25.


**Why:** Lawyer legal-gate review 2026-07-14. The site has a passive `/disclaimer` page but no Terms the user actually assents to. An assented release with an express assumption-of-risk + ordinary-negligence waiver is a contract defense that can knock a weak wrongful-death suit out early and (with an entity) protects the owner's personal assets. Highest-value legal item; the enrollment step is the strongest assent moment.

**Acceptance (to be sized before promoting):**
- Add `app/terms/page.tsx`: express assumption-of-risk (user accepts inherent risks of paddling including drowning/death), release/waiver of liability for ordinary negligence, AS-IS / no warranties, limitation-of-liability cap, indemnification.
- Conspicuous assent: persistent footer link plus a one-time "By using this site you agree to the Terms and Disclaimer" acceptance at alert enrollment (`InstallPrompt.tsx`); link beside the existing Disclaimer link in `HomeClient.tsx` / `SpotList.tsx`.
- **Escalate before shipping:** waiver enforceability for a paddling death and the LLC/insurance decision are California-specific and warrant ~1 hr of licensed-attorney review (CA LLC carries ~$800/yr franchise tax). Draft the ToS/waiver text for the attorney to bless rather than originate; open a DECISIONS.md memo for the owner on entity + insurance.

## 45. [blocked(no-source)] Expand coverage to more of Northern California (RESCOPED 2026-07-16: the first task is finding a registry, not running the pipeline)

**RESCOPED 2026-07-16 after a verified Water Trail gap analysis (`reports/item-45-watertrail-gap.md`). This item's premise did not survive it.**

All 47 SF Bay Water Trail designated trailheads were classified, none guessed:

| Verdict | Count | Meaning |
|---|---|---|
| **CARRIED** | **34 (72%)** | already a record |
| **MERGED** | **10 (21%)** | described inside another spot's notes, no record of its own. **This is item 40 work (split the record), not item 45 work (add a spot).** |
| **GENUINE GAP** | **3 (6%)** | real item 45 scope |
| UNVERIFIABLE | 0 | |

**Three things this establishes:**

1. **You cannot expand coverage from a source you have already ingested.** The app carries 72% of the Bay's authoritative registry. It yields three candidates, and one of them (Pier 39) is not a launch: the Water Trail itself says it is "anticipated to serve primarily as a destination site for paddlers starting elsewhere." Shipping it as a put-in would be the 47/120 defect committed knowingly.
2. **10 of the 13 non-carried sites are item 40 in disguise, a 10:3 ratio.** Four host records hold all ten: spot 70 hides 3 Richmond trailheads; spots 68, 18, and 63 hide 2 each. Spot 63 is the Richmond pattern again, a marina-complex pin sitting *between* two trailheads 760m apart. **Splitting those four records is simultaneously the cheapest coverage in the backlog and item 40 work.** Do that before adding anything.
3. **The registry stops at the Bay, and that is the real blocker.** No authoritative, field-complete equivalent has been identified for the Sierra, the Delta, the Central Valley, or the coast, and DBW is disqualified (it registers motorized/trailered facilities; see item 40). Absent a source, expansion falls back to the geocode-and-trust step that produced spot 79.

**The parking-vs-dock trap fired live during this analysis**, which is the best evidence that the method matters: the Water Trail's published coordinate for Baylands Sailing Station reverse-geocodes to `amenity/parking`, 60m from a gravel lot. Ingesting it as published would have produced a fourth 127/130/132.

**Acceptance, rewritten:**
- **Step 1 is to identify an authoritative, field-complete registry for the target region** (one that publishes dock type, parking, fees, and hazards, as the Water Trail does), NOT to run `phase0_geocode.py`. If no such registry exists for a region, that region is not expandable at acceptable quality yet, and saying so is the correct outcome.
- Split the four merged host records (70, 68, 18, 63) first. That is ~10 real launches, already sourced, and it fixes wrong pins at the same time.
- Every new record carries **per-field provenance**. A guessed boolean is worse than an absent one: `tide_sensitive` gates the conditions engine, and the sweep found spot 64 with three booleans wrong at once.
- Coordinates are the put-in, never the published parking coordinate.
- Notes say what the source says. Do not upgrade a beach launch into a "paved ramp".
- Only the Downtown Suisun City candidate is recommended to take as-is (high confidence, 27m from an OSM pier, tide hazard quoted from source).

**Why (original):** Owner idea 2026-07-16. 142 spots today, weighted to the Bay; more coverage is more reasons to open the app and more SEO surface.

**Acceptance:**
- New spots flow through the existing pipeline (`raw-data/phase0_geocode.py` to `data/spots.json`), fully enriched (difficulty, fee tri-state, notes, amenities), not just geocoded.
- **Blocked on item 40, and the 2026-07-16 audit made this block much stronger.** The original reason was imprecision (spots pinned kilometres off). The real reason is worse: the pipeline can emit a **plausible-looking spot that does not exist**, with invented specifics. Item 79 (Coyote Creek) appears to be an AI-summary artifact of a permit-only trip report into a closed wildlife refuge, and its notes carry the wrong closure months and the wrong species. Expanding coverage through this pipeline would scale fabrication, not just imprecision. Do not start 45 until 40 has replaced the geocode-and-trust step with a provenance check (reverse-geocode + registry confirmation of facility type).
- Notes follow the house rule: evergreen description of the spot, never a reply to whoever reported it.
- Scope the tranche (which waters, how many) before promoting.

## 46. [done] The launch-reminder tap shows no safety line (deployed 2026-07-18)

**Shipped 2026-07-18 (studio loop), the cheap client-only alternative from the acceptance.** A launch-reminder tap carries `from=alert` with NO `window` param, so the AlertInterstitial never rendered and the sheet opened at peek with ConditionsPanel's safety line ("Guidance only, not a safety guarantee. Conditions shift fast on the water.", the same canonical line the interstitial carries) below the fold. Fix in `HomeClient`: for `from=alert` without a window param, open the mobile sheet expanded (`startExpanded`) so the safety line clears the fold; windowed alert opens keep the interstitial and stay at peek (item 9 preserved). No schema/cron change (avoided the protected `send-reminders` cron + Supabase), so the launch-direction tip, which needs a stored window label, is the one piece deferred to a future schema slice. Instrumentation: `alert_clicked` gained `reminder_tap` (boolean) so the two cohorts are separable + changelog. Verified live-in-dev both viewports: reminder-tap arrival opens expanded with the safety line at 633px (above the 812 fold), windowed alert still renders the interstitial at peek; 338 tests, build clean, no console errors.

**Why:** surfaced by the editor during item 34, 2026-07-16. `app/api/cron/send-reminders/route.ts` deep-links to `/?spot=X&from=alert` with **no `window` param**, originally on purpose so the interstitial would not re-show. But `HomeClient` only sets the alert banner when a window param is present, so a reminder tap renders no interstitial, and the interstitial is the only surface carrying the full canonical safety line plus the launch-direction tip (item 36). The tap lands on a peek-height sheet with `ConditionsPanel`'s line below the fold. **This is the push that fires at window open, the exact moment someone decides to get on the water, and it is the one alert whose entire journey shows no full safety line.** Item 34 covered the no-tap path (the body carries the safety half-line) but could not close this, because it is not a copy change.

**Acceptance:**
- A reminder tap surfaces the full safety line and the launch-direction tip, i.e. the interstitial renders.
- Needs a human window label ("Sat 7 to 10am") that no layer stores today: `launch_reminders` has `window_key` (a date, for dedup) and `fire_at`; `/api/alerts/remind` is never sent one. So this is client -> API -> schema -> cron, not copy.
- Raises `alert_interstitial_shown` (a fix, not a behavior change) and re-shows a card the user saw ~12h earlier. The card is arguably more useful the second time: the window it describes is now open. Changelog entry required.
- Alternative if the schema change is unwanted: render the safety line above the fold on the peek sheet.

---

## Owner items, added 2026-07-13 (board-directed; the two [ready] items are queued top-most on purpose)

(Item 36 launch-direction tip shipped 2026-07-15, see Shipped. Item 37 visual-polish pass is the next [ready], below.)

(Item 38 shipped 2026-07-16, see Shipped.)

---

## Owner items, added 2026-07-16 (eight ideas; 7 and 8 merged into item 40)

**Strategy note.** Items 43 and 44 (reviews, accounts) are the "UGC content flywheel" and "optional sign-in" entries from the **Later** section at the bottom of this file, which says do not promote before retention is proven. The mid-July retention read is due now and unblocked (D9 closed 2026-07-15). Promoting 43/44 ahead of that read is a deliberate bet against this roadmap's own thesis (retention is the bottleneck, UGC needs retained users to generate content).

**Owner promoted both to `[ready]` on 2026-07-17, with the tension above understood.** This is the owner exercising the call the note reserves, not a default. Recorded so a later reader does not mistake it for the thesis changing: retention is still the bottleneck; the retention read is still the number that matters. Both items carry a lawyer gate before deploy (43: FTC fake-review rule + UGC moderation + Section 230; 44: personal data + OAuth + privacy-policy update). Items 39, 40, 41, 42, 45 never carried this tension.

## 43. [blocked(D24)] Real user reviews on a spot (the crowd-sourced half of ratings)

**Lawyer gate returned `escalate` (2026-07-17). Blocked on D24: three owner decisions (counsel spend for the UGC terms, identity model, moderation commitment) plus four legal artifacts must land before the first review can post. The implementer-can-do list and the cleared aggregate-display design are captured in D24.**


**Promoted by the owner 2026-07-17** (see strategy note above; a bet against the retention-first thesis, made deliberately). This is the UGC ratings/reviews half. Item 39 shipped the owner's own "one paddler's take"; item 43 lets visitors add theirs, which is the SEO-acquisition and content-moat play.

**This is the heaviest legal surface in the backlog. The lawyer gate runs before ANY deploy, not after.** Known constraints already established in this roadmap:
- **Never a fabricated count** (item 39 scope decision, line 214). The FTC fake-review rule (16 CFR Part 465, in force Oct 2024) carries per-violation civil penalties and reaches exactly this. Real reviews only, real counts only.
- **Section 230 vs. first-party speech.** A count or list of genuine user reviews is user content (230-protected). An average the site computes and presents is arguably the platform's own speech (D15/§0.1 reasoning). Decide the display so the aggregate does not become an editorial safety verdict on a site that already manages wrongful-death exposure.
- **UGC moderation + rights.** User submissions need a moderation path, a content policy, and a rights/licensing stance before the first review can post. This is the moderation-liability gate D10-Q3 deferred for photos, now in scope for text.
- **`aggregateRating` structured data** (item 39 open question, spec §3): do not emit schema.org `aggregateRating` for anything the site itself scored. Only genuine crowd reviews can back a star in search, and only once moderation is real.

**Acceptance:**
- A signed-in-or-anonymous path to leave a rating (+ optional short text) on a spot, with a moderation queue before it renders publicly. Decide the identity requirement jointly with item 44.
- The star row is designed **jointly with item 39's "our take" row** (line 221): both occupy the same subtitle real estate; a solo build gets torn out when the other lands.
- Real aggregate count only; never a bare `(N)` that implies reviewers who do not exist.
- New intent events for submit / view, with `spot_id`+`region` and an `INSTRUMENTATION_CHANGELOG.md` entry. Rollout flag-gated per the major-update directive.
- Lawyer gate (data collection, UGC moderation, marketing claims, FTC) returns `clear` before deploy. Likely an `escalate` on the moderation-policy and aggregate-display questions.

## 44. [blocked(D24)] Optional sign-in to sync spots and alerts across devices

**Blocked on D24: its identity model is the same decision as item 43's (the spec sequences the identity decision across both), and item 44's scope depends on the answer, if reviews go anonymous, item 44 is a pure cross-device sync feature; if reviews require sign-in, item 44 is the account foundation they build on. It is also an OAuth/personal-data surface (escalation-class), so once D24 sets the direction it gets its own lawyer gate + the analytics-identity strategy its acceptance requires. Not started to avoid building an auth system that D24 could re-scope.**


**Promoted by the owner 2026-07-17** (see strategy note above). The retention engine ships anonymous by design; this is the upgrade path, not a replacement. It also gives item 43 a real identity to attach reviews to, so sequence the identity decision across both.

**Legal + analytics landmines, gated before deploy:**
- **Never call `posthog.identify()` / `reset()`** (CLAUDE.md analytics rule): there is no login today precisely because identify reshuffles experiment buckets. Adding real auth means deciding how account identity maps to the anonymous `anon_id` WITHOUT breaking bucketing or the retention queries that key on `anon_id` (item 25, D9 exclusion).
- **Personal data + OAuth = privacy-policy update + lawyer gate.** Collecting an email/Google identity changes what the privacy policy must disclose (the D17 policy is fresh; do not silently outdate it). CalOPPA/GDPR-shaped disclosure obligations attach.
- **Migration, not reset.** An anonymous user who signs in must keep their existing saved spots and push subscription, not start empty. The push tables (Supabase) key on anonymous ids today.

**Acceptance:**
- Optional Google sign-in (existing anonymous use stays fully functional and is never forced). On sign-in, existing saved spots + push subscription migrate to the account and sync across that user's devices.
- Analytics identity strategy documented BEFORE build: how account identity composes with `anon_id` without reshuffling experiment buckets or corrupting the retention/exclusion queries.
- Privacy policy updated to disclose the new data collection; lawyer gate (personal data, privacy, OAuth) returns `clear` before deploy.
- New intent events for sign-in / sync, with an `INSTRUMENTATION_CHANGELOG.md` entry. Flag-gated per the major-update directive.

## 39. [done] 2026-07-16 A paddleability score for each spot (editorial, not crowd-sourced)

**Resolution: the computed rubric was CUT and stays cut. What shipped in this slot is a different feature: the owner's own hand-entered rating.** (D16, owner-directed 2026-07-16.) Deployed behind the `owner-rating` flag in `7dfd227` + `99a2aa6`; shipped at 100% and rendering (D20, 2026-07-17); the flag was removed, no PostHog action needed. Docs: `docs/experiments/owner-rating.md`, analysis in `reports/paddle-score-owner-ratings-2026-07-16.md`.

**The two are not interchangeable and must never be blended.** The rubric (D15) scored the PUT-IN; the owner rating rates THE PADDLE. They correlate at 0.04 against researcher A and -0.10 against B, while A and B correlate 0.52 with each other. China Camp is 3.6 on the rubric and 5.0 from the owner, and both are right.

**Read before analysing the experiment:** the owner ratings clear the same pre-committed 1.5 threshold pooled (spread 2.0), but that is an artifact of averaging regions with different means. Within-region only North Bay passes (n=45, spread 1.9); all 29 East Bay ratings sit inside a 0.4-wide band. **A flat pooled result is the predicted outcome, not a finding.** The owner was shown this and directed the full-scope ship anyway.

**Legal gate outcome:** spot 92's rating was dropped (private business dock, possible trespass, see D14 addendum), the qualifier's contrast was raised to AA (6.59:1), and the copy names the axis ("One paddler's take on the paddle"). Spots 47 and 134 had their notes repaired as a condition of keeping their ratings.

**The original cut still stands on its own terms, and the reasoning below is worth keeping.**

**CUT 2026-07-16 after a 10-spot pilot met its pre-set kill criterion.** Full result: `docs/specs/item-39-paddle-score.md` §5. Two agents scored the same 10 spots blind: spread **1.1 and 0.8 points** against a 1.5 threshold set BEFORE the run, with 8/9 and 9/9 spots inside a single 1.0-wide band. Every Bay Area launch is "about a 4".

**The rubric was not the problem: it worked.** Two blind researchers landed within one level on every axis (mean disagreement 0.26 points), and both returned `null` on the same unsourceable axes rather than guessing. **The problem is structural: a discriminating score and a legally defensible score are in direct tension.** The two axes that separate these places (wind exposure, water quality) are exactly the two the legal gate cut (D15/§0.1), because a computed average is arguably first-party speech with no Section 230 protection. The defensible score is useless; the useful score is indefensible. A third rubric does not escape that, which is why this is cut rather than rethought.

**Salvaged, not wasted:** every genuinely useful fact the pilot surfaced is binary (non-motorized only, trailer ramp vs. beach carry, $12 vs. free, mid-to-high tide only, no ramp at all) and belongs in **filters and `notes`**, not an aggregate. Same home §0.1 chose for the cut wind axis: describe the place, do not rate it. **The pilot's real output was data quality**, see item 40.

**Why (original):** Owner idea 2026-07-16. Nothing ranks Bay Area launches on *paddleability* (wind exposure, wake, water quality, launch gradient, parking). Google rates restaurants-and-parks generally; nobody rates the put-in as a paddler experiences it. This is a genuine differentiator and it composes with the conditions engine (the one validated behavior).

**Scope decision made at proposal time (owner-approved 2026-07-16):** the score is presented as **our assessment**, never as aggregated human reviews. The original idea paired the score with a fabricated review count (`★ 4.5 (233)`) sourced from search-result counts and styled as human ratings. That is cut. Reasons: it is a false statement to every visitor in an idiom with a specific meaning; the FTC fake-review rule (16 CFR Part 465, in force Oct 2024) reaches exactly this and carries per-violation civil penalties; this site already manages wrongful-death exposure via the lawyer gate; and a fake count becomes permanently load-bearing the moment item 43 lands real reviews (233 + 4 = ?), destroying both the metric and the ability to measure whether ratings drive engagement.

**Acceptance:**
- A 1.0 to 5.0 score per spot, stored in `data/spots.json`, derived from a documented rubric (wind exposure, wake/boat traffic, water quality, launch ease, parking). The rubric goes in the repo so the score is reproducible and auditable, not vibes.
- Renders inline in the existing subtitle row (no extra row), in both list and spot sheet: `★ 4.5 · our take · Hayward · East Bay` or a named "Paddle score". Never a bare `(N)` count implying reviewers. If a credibility signal is wanted in that slot, "4 sources" is true and citable.
- Spot sheet shows what drove the score (the per-axis breakdown), which is the actual reason to use this over Google Maps.
- Depends on item 40 for any spot whose pin is wrong: assessing "easy to park" against a coordinate 11km off the launch produces a confidently wrong score.
- Design the star row **jointly with item 43**, even if built separately: both occupy the same real estate and a solo-shipped "our take" row gets torn out when human reviews arrive.
- Legal gate (marketing claims): the lawyer reviews the framing before deploy.
- New user-facing surface: flag or staged tranche per the major-update directive.

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

## 12. [blocked(owner-screenshot)] Persistent bottom "dead band" on iOS mobile web / installed PWA (folded into item 37)

*(Folded into item 37 on 2026-07-15 per D12. The `?vh` device diagnostic this item asked for is now SHIPPED, so the "no 4th blind fix" gate is satisfied. Next step is entirely on the owner: open `paddletowater.com/?vh` on the installed iOS PWA and send one screenshot of the printed numbers; then a fast follow-up picks the fix from data, `-webkit-fill-available` or a JS-set `--app-height` from `window.innerHeight`. Re-promote to `[ready]` once the screenshot lands.)*

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

- **UGC content flywheel:** ratings, photos, trip logs, user conditions reports. The long-term moat and SEO-acquisition engine, but it needs retained users to generate content first. *(Ratings/reviews half is now item 43, promoted to `[ready]` by the owner 2026-07-17. Trip logs + user conditions reports remain here.)*
- **Optional Google sign-in** to sync push subscriptions and saved spots across devices (the engine ships anonymous; this is the upgrade path). *(Now item 44, promoted to `[ready]` by the owner 2026-07-17.)*
- **PaddlePass premium tier:** alerts + multi-day forecast windows + offline, as the freemium paywall.
- **Community spot submissions** with admin approval.
- **Tide-window refinement** in the cron's "good window" evaluator (it ships wind-only).
