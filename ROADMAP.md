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

- 2026-07-22 [done, DEPLOYED] Item 110: AlertInterstitial now matches the light Meltwater card system with a white tokenized surface, border, dark/muted text hierarchy, accent reminder CTA, announced success state, and 44px focusable controls. Copy, canonical safety line, reminder behavior/API, and analytics are unchanged. Rendered verification also found and fixed a pre-existing mobile hit-test defect caused by nesting the fixed overlay inside an overflow-hidden container. 644 tests, lint, local/preview/production builds, editor pass, lawyer clear, adversarial review, and live mobile interaction verified. Commits `a7389d3`, `27cffdc`, `f63e3c1`, `292fad1`, `c1b98b3`; deployment `dpl_AA1jcbEpqXgbnKLw1NaxTz3PYYps`.

- 2026-07-22 [done, DEPLOYED] Item 109: zero filtered catalog matches now show the existing scoped empty-state message and clear action after Watching and Recently checked, while pinned spots stay visible. The condition keys on incoming filtered matches, not the deduped main list, so a valid result that is already pinned never receives a false zero message. Accessible polite status and 44px clear target included. Commits `50e9bc1` + `dd2ceee`; 637 tests, lint, local/preview/production builds, adversarial review, and live 390px interaction verified. Production deployment `dpl_GbAoyj2fdznWJZupGPFz7yKqG47L`.

- 2026-07-22 [done, DEPLOYED] Item 107: alert evaluation now fails closed when NWS wind is missing or malformed. Empty, null, and garbage wind values are ineligible for a good window; numeric `0 mph` and NWS `Calm` remain valid calm readings. Owner approved the protected alert-path deploy in chat. Commit `31dc221`, deployed in production release `a58ff2d`, 630 tests, lint, local build, Vercel build, and live 200 checks passed.

- 2026-07-22 [done, DEPLOYED] Item 108: the default map now frames California instead of the Bay Area, and region pills read north to south. Commit `10ec36f`, deployed with item 107 in production release `a58ff2d`; live domain and representative spot page return 200.

- 2026-07-21 [done, DEPLOYED] Item 78: account-management sheet. Opened from the header identity: editable **display name** (propagates to the author's existing reviews via `PATCH /api/account`, since the byline is denormalised per row), **your reviews** with moderation status (Pending / Published / Not approved), saved-spot count + alert state, **sign out**, and in-product **account deletion**. Delete follows the deletion runbook: reviews unpublished + dissociated with the 3-year moderation record retained, both alert subscriptions deleted, account deleted (cascades saved spots); two-step confirm, exact about kept-vs-deleted. Every handler takes ownership from the verified session, never a request param; DELETE checks each write and aborts on first failure (idempotent retry) so a partial delete can't orphan a bylined public review. Lawyer gate returned needs-changes; gating action was the end-to-end pre-enable test against the real endpoint, done and recorded in the runbook. Header label now prefers the chosen display name over the email local part. While testing, found and fixed a live item-77 miss: spot 16 was still published with the email-derived byline `qg47` (submitted 19 min before the item-77 deploy); corrected every live byline to its author's chosen name. New INTENT events `account_sheet_opened` / `account_name_saved` / `account_deleted`; changelog updated. 501 tests. Deployed b1ff4c7.

- 2026-07-21 [done, DEPLOYED] Item 43: crowd reviews (star rating + optional comment). Signed-in-only submit (item 44 auth), pre-moderation with **no auto-publish path in the code**: every row inserts `status='pending'` and only a one-click Approve/Reject link in the operator email can publish it, single-use so a replayed link cannot flip a decision. New `spot_reviews` table (`supabase/migrations/20260722_reviews.sql`, hand-applied), `user_id` on delete SET NULL so the moderation record survives an account deletion while the byline does not. Assent is captured per the Contributor Terms: checkbox unchecked by default, submit disabled until ticked, `terms_version`+`terms_hash`+`assented_at` stored with the row. Crowd average replaces the owner star only at 5+ published reviews and always ships its count; below that the aggregate endpoint returns nothing. New `/contributor-terms` page (Part 1 only), `/terms` + `/privacy` cross-references, deletion runbook extended. No `schema.org` aggregateRating in v1 (FTC surface, gated on real volume). New INTENT events `review_form_opened` / `review_submitted` / `reviews_viewed` (dwell-gated); changelog updated. 467 tests (+13). Verified on production end to end: unauthenticated POST 401s, a pending row is invisible publicly, the Approve link publishes it, the replayed link is refused, the aggregate stays hidden at 1 review. Deployed ef7444f.

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

## Studio review, added 2026-07-22 (high-bar hourly pass; one native-parity gap surfaced, filed [proposed] pending an owner call on native release scope)

## 133. [blocked(apple-enrollment)] Native app has no reviews surface at all, not a display bug, an entire UGC feature is absent

**Problem, grounded in code:** web `SpotDrawer.tsx` imports and renders `ReviewsSection` (the published-reviews list, the sign-in-gated write form, and item 89's just-shipped "no one has written about this spot yet" invitation on ~176 of 177 spots). `native/src/components/SpotSheet.tsx` has zero review references (grep confirms none), and no native reviews component exists anywhere under `native/src`. Native renders only the raw `owner_rating` star number. So an iOS user cannot read a single paddler review, cannot write one, and never sees the item-89 invitation the owner directed and shipped. This is broader than item 80 (native shows a different rating *number*, scoped to score attribution) and distinct from item 132 (native safety copy outside the no-inducement sweep). It is the third and largest native-parity gap now on the board.

**Direction:** port `ReviewsSection` + `ReviewForm` to native, reusing the shared validation/fetch logic, gated by the same sign-in flow (item 44) and reviews kill switch. If a full form port is too large for one slot, ship item 89's quiet invitation plus a "read and write reviews on the web" link first (native-authored copy, run through the no-inducement sweep per item 132), so native at least discloses the feature exists.

**Grade:** [proposed], NOT [ready]. Real, grounded, and material (a whole missing feature on the platform being prepped for the next EAS build, kin to native-parity items 80 and 132). Held at [proposed] on purpose: reviews are the lifestyle/UGC half the roadmap deliberately defers behind the early-August retention read, native is not yet in users' hands, and review volume is near zero, so whether to spend a build slot on this now (vs. gate it as a pre-TestFlight parity decision alongside 80/132, vs. wait for the retention read) is an owner call, not a foregone [ready].

## Studio review, added 2026-07-22 (high-bar hourly pass; one item cleared the bar, a cross-platform regression on the moat)

## 122. [done] Native iOS conditions panel reaches web parity (889d772; native-only, ships with next EAS build)

**Problem, grounded in code:** `native/src/components/ConditionsPanel.tsx` (last touched Jul 19) is a straight port of the web panel from before the 2026-07-22 conditions-rethink bundle (items 97/98/99). It imports the shared `@/lib/conditions`, which already carries everything the bundle added (`WindInfo.tempF`, `WindInfo.precipPct`, `isStormyForecast()`, `tideDirectionLine()`), but the native component reads none of it. Confirmed: grep for `tempF|precipPct|isStormy|tideDirectionLine|launchDirection` returns zero hits in the native panel and 11 in the web panel. So on iOS there is no air-temp/precip line, no storm badge, tide still renders as a raw high/low list with no "Rising, turns to falling at 4:53pm" direction line, no launch-direction tip in the panel (item 99 wired it into native's AlertInterstitial but not the drawer), and the split wind-failure copy ("No forecast for this spot" vs "Wind data unavailable right now") is missing. The native app shipped pitched as "full web parity" (item 72); on the one differentiating surface it silently regressed to the pre-bundle experience for every iOS user.

**Direction:** port the `readoutOn`-gated rendering from `web/components/ConditionsPanel.tsx` into the native panel (weather line with air temp + precip, storm badge, `tideDirectionLine` as the primary tide sentence with raw events demoted, launch-direction tip under the wind reading, split wind-error copy), reusing the same `conditions-readout` flag key so both platforms flip together. Native already has its own `useKillSwitch` port, so gating is not the blocker; the UI simply was not updated when the bundle shipped.

**Grade:** [ready], high confidence. Not polish and not ambiguous: it is a real dent in the conditions moat across a whole platform, on the exact readout the owner just spent a dedicated strategy pass (item 91) plus three build items proving out. Clears the high bar precisely because it is the differentiator, not a cosmetic gap.

## Studio review batch, added 2026-07-22 (hourly product + design review vs the north star: "California's best utility AND lifestyle app for SUP paddlers and kayakers"). CEO-graded: [ready] = high confidence, clear problem + direction, aligned, build now; [proposed] = worth doing but needs a decision or sits behind the retention read. Items 108 to 121.

## 107. [done] Alert engine fails OPEN: missing/malformed NWS wind is read as dead calm, so a "good to paddle" alert can fire on absent data

**SHIPPED 2026-07-22.** Owner approved the protected deploy in chat. Commit `31dc221` shipped in production release `a58ff2d`; the one-use `DEPLOY_APPROVAL` file was removed after deployment. Fresh evidence: 630 tests, lint, local production build, Vercel production build, deployment READY, and live home/spot checks returned 200.

**Found by the 2026-07-22 verify loop, adversarially testing `evaluateGoodWindow` directly.** The good-window evaluator is otherwise solid, I threw 12 hard cases at it (data gaps, pre-6am, the 17/18 boundary, "5 to 12 mph" ranges, duplicate timestamps, beyond-horizon, DST spring-forward, peak-wind direction) and 11 behaved correctly. The 12th is a real defect:

- `parseMaxWind` (`lib/alerts/conditions-window.ts:21-24`) returns **0** for any string with no digits (`""`, `null`-ish, `"garbage"`).
- `paddleabilityFromWind(0)` returns **"calm"** (`lib/conditions.ts:338`, `maxMph <= 8`).
- So a period with missing or unparseable `windSpeed` is treated as **dead calm and eligible**. Verified: a 6/7/8am run of `["", "garbage", "0 mph"]` produces a good window `6-9, maxWind 0`.

**Why the data can actually be bad:** `findGoodWindow` (`conditions-window.ts:132-134`) casts the NWS response straight to `HourlyPeriod[]` (`as { periods?: HourlyPeriod[] }`) and passes it to the evaluator with **no validation of `windSpeed`**. A TypeScript cast is a compile-time fiction; if NWS omits `windSpeed`, returns null, or changes format on any hour, that hour silently scores as 0 mph. This runs unattended daily in the cron.

**Why it matters (direction of failure):** this is the conditions-alert loop, the retention engine and a safety-adjacent surface. Failing open means **absence of wind data is announced to the user as a positive "this spot is calm, good to paddle" push/email**. That is the exact opposite of how the rest of the app treats missing data: item 53 deliberately shows "Tide data is unavailable" rather than invent a reading, and the whole product is wrapped in "guidance only, not a safety guarantee." A false calm signal is the worst way for a paddling app to be wrong.

**The fix already has a home in the type system.** `Paddleability` (`lib/conditions.ts:78`) already has an `"unknown"` value, and the evaluator's eligibility check already requires `paddleabilityFromWind(wind) === "calm"`, so `"unknown"` is correctly excluded. The defect is only that missing data maps to `"calm"` instead of `"unknown"`.
- Distinguish "no parseable wind" from "0 mph". A period whose `windSpeed` contains no number should map to unknown (ineligible), NOT calm.
- **Preserve the two legitimate low-wind cases:** a literal `"0 mph"` is real calm, and NWS sometimes uses the word **"Calm"** for windSpeed, which is also real calm. So the rule is: has a number -> use it; is exactly "Calm" (case-insensitive) -> 0; otherwise -> unknown/skip. Do not naively reject everything without a digit.
- Consider validating in `findGoodWindow` too (drop or mark periods with no usable wind before evaluating), so the guarantee does not rest on one helper.

**Acceptance:** a period with empty/null/garbage `windSpeed` never contributes to a good window (unit test it: `["", "garbage"]` at calm hours yields null, while `["0 mph","0 mph"]` and `["Calm","Calm"]` still yield a window). No behavior change for well-formed NWS data. Add the cases to `conditions-window.test.ts`. Not a legal surface, but it touches the alert send path, so run the verifier on the diff.

## 108. [done] California-wide default map view (the brand shipped statewide, the map still opens on the Bay)

**SHIPPED 2026-07-22 (`10ec36f`).** Released with the owner-approved item-107 deploy in production release `a58ff2d`. The map opens on a statewide frame and the region pills read north to south. Live domain and representative spot checks returned 200.

**Problem:** Items 90/94/95/96 added 29 SoCal spots (LA, San Diego, Orange County, Ventura), 16% of 177, and the site now says "across California". But `MapView.tsx` hardcodes `BAY_CENTER = [37.55, -122.25]` at zoom 9 for any cold visitor with no location grant, and `REGIONS` in `lib/types.ts` appends the four new SoCal regions last, so a SoCal visitor scrolls past the whole pill row to find their own coast. First impression contradicts the rebrand for exactly the audience the expansion was for.

**Direction:** widen the unfiltered default to a full-state framing (zoom out to show all clusters, tighten to a region only on first interaction) or key the initial center off a coarse signal (IP geo, timezone) when available; reorder or reflow the region pills so new regions are not structurally last.

**Grade:** [ready], high confidence. Grounded, clear fix, undercuts a rebrand that shipped the same day.

## 109. [done] Zero-match filter can render with no "0 results" message

**SHIPPED 2026-07-22 (`50e9bc1`, `dd2ceee`).** Zero incoming filtered matches now render the scoped message and clear action after pinned Watching/Recently checked content. Live mobile verification confirmed Watching remains visible, the clear target is 44px, and clearing the search removes only the zero state. Production deployment `dpl_GbAoyj2fdznWJZupGPFz7yKqG47L` is READY.

**Problem:** `SpotList.tsx`'s empty-state guard only fires when main, saved, and recent lists are all empty. Saved and recent spots are computed unfiltered (`HomeClient.tsx`), so a filter/search matching zero spots leaves the Watching and Recently-checked sections showing (spots that ignore the filter), the main list silently renders nothing, and no "no spots match" text appears anywhere. Reads as the app being broken. Gets more likely as saves/recents grow with retention work.

**Direction:** show the scoped empty-state message (`emptyState.title`/`clearLabel`, already computed) inline after the pinned sections whenever `mainSpots.length === 0` but those sections are not empty.

**Grade:** [ready], high confidence. Functional-confusion bug, not polish; the scoped copy already exists.

## 110. [done] AlertInterstitial reskin to the light card language (settled by item 66, one component got missed)

**SHIPPED 2026-07-22.** The final dark overlay now uses the settled light-card treatment. All alert copy and behavior remain unchanged. The same pass fixed the mobile stacking defect that made the visible dismiss control untappable over the full-screen drawer. Production deployment `dpl_AA1jcbEpqXgbnKLw1NaxTz3PYYps` is READY and verified live.

**Problem:** Item 66 converged the enrollment prompt from a dark navy bubble to a light Meltwater card, and every other overlay (InstallPrompt, FeedbackModal, SignInSheet, AccountSheet) is a light card with dark text. `AlertInterstitial.tsx` is the one survivor still rendering solid `var(--accent)` with white text, and it appears in the same push-alert flow as the now-light InstallPrompt, so the two patterns visibly fight.

**Direction:** reskin to white background, `1px solid var(--border)`, dark text, accent only on the button/badge, matching InstallPrompt's post-item-66 treatment.

**Grade:** [ready], high confidence. Applies an already-validated owner decision to a component that was missed; the fix pattern exists in the codebase.

## 111. [parked] Weekend / multi-day outlook in the conditions panel

**PARKED 2026-07-22 with a finding: this is substantially already shipped, and the useful increment needs an owner call.** Verified against the code (specs-are-the-reference):

- The premise "in-app a paddler only sees today" is **not accurate**. `NextGoodWindowPanel` (shipped as item 20, inside `ConditionsPanel`) already renders "Next good window: {Weekday} {range}" across the full `DEFAULT_HORIZON_DAYS = 3` horizon, using the same `evaluateGoodWindow`. A Wednesday visitor whose Saturday is calm already sees "Sat 7 to 10am".
- The item's OWN free-tier boundary is "the existing 1-3 day good-window" with deeper multi-day left to PaddlePass. That existing 1-3 day window is exactly what is already live. So the free version the item asks for is done.

**Two genuine but gated increments remain, both owner calls, which is why this is parked not shipped:**
1. **Framing copy** ("this weekend looks good at X", or relative "today/tomorrow" labels instead of a bare weekday). Small, touches web + native panels, and borderline the "too trivial" line the owner drew on review batch 2. Worth a slot only if the owner wants it.
2. **The real UX gap:** `evaluateGoodWindow` returns only the SOONEST window, so when today or tomorrow is also calm it CROWDS OUT the weekend view. Surfacing "today calm AND this weekend calm" needs a second, weekend-constrained evaluation and starts to look like the multi-day grid the item reserves for PaddlePass. **Where the free/premium line sits here is a monetization decision, not mine to make unilaterally.**

**Recommendation:** close as already-delivered, or promote a narrow follow-up for increment 1 only if the owner judges the framing worth it. Do not build increment 2 without a PaddlePass free-vs-premium boundary decision.

**Problem:** `nextWindow.ts` already computes a 1-to-3-day good-window for alerts, but in-app a paddler only sees "today". The most natural return trigger, checking Thursday to plan Saturday, has no surface. Retention is the #1 goal and this reuses logic already in flight.

**Direction:** surface the existing 1-3 day window as a free "this weekend looks good at X" line in the panel, reusing `evaluateGoodWindow` so nothing contradicts. Note the overlap: PaddlePass names "multi-day forecast windows" as a premium bullet, so ship a bounded free version as a retention driver and leave deeper multi-day for the paywall.

**Grade:** [ready], high confidence. Cheap (logic exists), targets the actual #1 goal. Flag the premium-tier boundary in the spec.

## 112. [done] Spot photos in the per-spot OG share card (deployed 2026-07-22, 1851bb3; IP-gated)

**Problem:** `spot-photos.json` has real photos for 109 of 177 spots (62%), but `app/spot/[id]/opengraph-image.tsx` never imports `getSpotPhoto`, so every shared link renders the same generic navy text card. Share is a primary tracked action and growth is ~82% word-of-mouth; the app's real social-distribution surface is not using the imagery it already has.

**Direction:** when `getSpotPhoto(spot.id)` resolves, composite it as the OG background with the existing navy gradient/wordmark overlay for legibility; fall back to today's text card when no photo exists.

**Grade:** [ready], medium-high confidence. Real organic-growth lift, data already exists, scoped mainly by `next/og` image-loading effort.

## 113. [proposed] Paddler profile: tune the conditions verdict to skill and craft

**Problem:** `paddleabilityFromWind(speedMax)` gives everyone the same calm/breezy/windy. "Breezy" is a fine day for an experienced kayaker and a dangerous one for a beginner on a SUP. The moat is per-spot judgment, but judgment without knowing the paddler is only half the answer. It is also the cheapest real identity primitive the app can add, which serves the thin lifestyle half of the north star.

**Direction:** an optional lightweight profile (beginner/intermediate/expert, SUP/kayak) that shifts verdict thresholds and copy, stored via the existing `setPersona`. Ship behind a kill switch, no A/B.

**Grade:** [proposed], not [ready]. High value, but it changes a safety-critical verdict: an "expert" threshold must not become an inducement to paddle worse conditions (same concern the item-82 and item-34 notes raise). Needs an owner decision on the safety gate before build.

## 114. [proposed] Home water: set a home region once

**Problem:** the app re-prompts geolocation each session and has no persistent sense of where a paddler is based, which every "near me" surface (cold-open item 61, any digest) needs.

**Direction:** let a paddler set a home region once; personalize cold-open ranking and future digests without a repeated location prompt.

**Grade:** [proposed]. Small and it unblocks personalization behind items 61/111/117, but only worth it as an enabler. Strong candidate to merge into item 113's profile rather than build standalone.

## 115. [proposed] Shareable "it's good today" conditions card

**Problem:** growth is ~82% word-of-mouth and Share is barely used, yet there is no artifact worth sharing. Item 9 fixed how a shared link opens; nothing makes the conditions themselves shareable ("Richardson Bay, glassy til 11am, let's go").

**Direction:** one-tap share of the current conditions as a rich card/OG image tied to the spot, native to how paddlers recruit each other.

**Grade:** [proposed]. Cheap and on-brand, but acquisition sits behind the retention read in the owner's sequence, so it competes with items 111/112 for a slot. Relation to items 9 and 112 to be stated in the spec.

## 116. [proposed] Nearby rentals and lessons at a put-in

**Problem:** the exploring journey explicitly includes "check rentals if needed" and the vision names local commerce (rentals, lessons, clubs) as a revenue engine that may out-earn the subscription. The app surfaces neither, so the exploring journey dead-ends before the paddler can act.

**Direction:** a per-spot "rentals & lessons nearby" section, curated or lightweight lookup. Ship unmonetized first as pure utility; the lead-gen model is a later layer.

**Grade:** [proposed]. Real utility and real strategic value, but monetization is deferred until retention is proven, and data-sourcing cost needs an honest estimate before this gets promoted.

## 117. [proposed] "This weekend near you" re-engagement digest

**Problem:** the only reach channel is the calm-window push, whose bottleneck is enrollment conversion, not input (~1 enrollment / 8 days, 83% dismiss). A lower-commitment, higher-frequency touch could re-reach the 78% who never enroll.

**Direction:** an opt-in weekly "where's good this weekend near your saved/recent spots" email, softer than the per-spot push.

**Grade:** [proposed]. On-strategy, but it adds a reach channel that inherits the same low enrollment and risks reading as a dupe of the alert loop. Sequence after the early-August retention read confirms whether the reach channel, not the trigger, is the problem.

## 118. [proposed] Beginner on-ramp: a curated "new to paddling" starter set

**Problem:** the app opens as 177 pins, intimidating to the largest lifestyle audience, first-timers. There is no welcoming entry ("start here: calm, free, easy parking, rentals nearby").

**Direction:** a small curated starter collection plus beginner-framed copy. Editorial, low build.

**Grade:** [proposed], low confidence now. On the thin lifestyle half and cheap, but it leans acquisition/SEO, which the roadmap defers behind retention. Park until the August read, or ship only the curation if it rides along with item 113.

## 119. [proposed] Visual fallback for spots without a photo

**Problem:** 68 of 177 spots (~38%) have no photo, and `SpotDrawer.tsx` renders nothing in that case, jumping from badges straight to plain notes. Photo coverage is effectively random to a visitor, so browsing alternates between an editorial-feeling card and a bare text list, which reads as unfinished. The lifestyle half of the north star is only present for 62% of spots.

**Direction:** a non-fabricated placeholder: a difficulty-tinted gradient/illustrated panel (existing `DIFF_STYLES` palette) with a paddle/water glyph. Never a fake photo.

**Grade:** [proposed], medium. Real but purely aesthetic; reasonable to sequence behind photo-coverage growth (item 56).

## 120. [ready] Mobile first-run value prop before the map loads

**Promoted [proposed] -> [ready] 2026-07-23 (owner).** Chosen as the multiplier on the just-shipped conditions moat (items 100/61/8): ~82% of traffic is mobile cold-open landing on unlabeled dots, and those retention features sit one tab away under "List" while the app opens on "Map", so the exact one-and-done cohort barely sees them. Fixing the cold-open funnel step is higher leverage this week than more depth. **Absorb item 61's deferred escalation E1** while speccing: prefer surfacing a compact "good today" answer on the mobile Map tab (its E1 map-tab banner), not just a generic value-prop strip, so the moat work actually reaches the mobile landing. Ship at 100% behind a kill switch (no A/B, DAU<100); guardrail is cold-mobile bounce must not regress. No owner decision, no legal surface.

**Problem:** the only descriptive copy ("Paddleboard & kayak spots across California") lives in a `hidden lg:inline` span, so mobile visitors (the majority, ~82% direct) land on a map of unlabeled colored dots with nothing saying what the product does or its scope.

**Direction:** surface a compact one-line value prop on mobile too: a dismissible one-time strip above the filter bar, or fold the count/scope into the mobile "Map (N)" tab label. Per the E1 note above, the stronger version answers "what's good today" on the map tab, not just "what is this".

**Grade:** medium. Plausible bounce-rate cost on cold mobile landings, but unproven without data. Cheap to test.

## 134. [proposed] Onboarding flow to let users customize their experience

**Owner-added 2026-07-22.** A first-run flow that lets a new user set up the app to their taste (candidate inputs: home region(s), difficulty/water-type preference, a home spot or two to watch, units, whether to be asked about alerts). The intent is a more personal first session than the current cold map of colored dots.

**Read this against the strategy before scoping, because it cuts two ways.** The product's #1 problem is 78% one-and-done, and the explicit bet is a **low-friction** anonymous experience (no signup wall, no gate). An onboarding flow that stands between a cold visitor and the map risks *raising* the bounce it is meant to reduce, this is the single highest-stakes moment for a new visitor and 82% of them arrive direct on mobile. So the design question is not "what can we ask" but "what earns its friction". Likely answers:
- **Optional and skippable, never a wall.** The map must remain reachable in one tap. Default to showing the product, then offering to tailor it, not the reverse.
- **Prefer inferring over asking.** Geolocation already sorts by distance and "Recently checked" already personalizes on return; much of what an onboarding form would ask can be inferred or deferred to the moment it matters (ask about alerts when they save a spot, not upfront).
- **Persist without an account.** All current personalization is anonymous localStorage (`ptw-favorites`, recents); onboarding choices should store the same way so the flow does not smuggle in a sign-in requirement (accounts exist but are optional, item 44).

**Relationship to existing items, do not duplicate:**
- **Item 120** ([proposed]) is the narrow first-run *value prop* strip (tell mobile users what the product is). Onboarding is the broader *customization* flow; 120 could be its first screen, or they could stay separate. Decide when both are specced.
- The 2026-06 mobile UX pass already shipped a first-run *save-heart nudge* and a region-pill peek hint (see Shipped), so some first-run scaffolding exists to build on rather than reinvent.

**Gating:** [proposed]. Retention is the current focus, and this is squarely a retention play, but it is also a friction risk, so it needs a PRD from product-visionary that (a) picks the minimum set of inputs that measurably help, (b) proves skip is truly free, and (c) defines the guardrail metric (cold-mobile bounce must not regress) before any build. No A/B until DAU > 100 still applies; ship skippable at 100% behind a kill switch and watch the bounce guardrail.

## 121. [proposed] Map loading skeleton on cold load

**Problem:** `dynamic(() => import("MapView"), { ssr: false })` has no `loading` fallback, and map is the default mobile tab, so a cold visitor's first paint is header + filter bar + an unstyled blank pane where the map will mount.

**Direction:** add a `--bg`/`--border` skeleton matching the map panel dimensions so the transition into tiles does not read as broken.

**Grade:** [proposed], low-medium. Likely a short window (Leaflet warms from cache), but a real gap on every cold load, the highest-stakes moment for a new visitor.

## Owner items, added 2026-07-22 (first-review prompt + conditions rethink + trip-planner demand test; all three [ready], queued top-most on purpose)

## 89. [done] Prompt the first review on a spot that has none (deployed 2026-07-22, ba262a2; byline half escalated as D32)

**Shipped:** one line of prose on the ~176 of 177 spots with no published review, plus item 89's **header** half (a mark count beside the account button, self-visible only). **The byline half is NOT built:** it escalated, and is D32.

**Deliberately quiet, and that was a design constraint not a taste call.** A full-width filled "Write a review" already sits in the action row, so the invitation is prose with no control of its own. A guard asserts it never grows a `<button>`.

**What the legal gate actually caught, which is the value of running it first:**
- **The Contributor Terms link was gated on `hasReviews`**, i.e. absent from exactly the 176 spots where the invitation renders. **Item 85's removal of the in-line marks disclosure was cleared ON THE CONDITION that link survives.** Shipping as built would have quietly voided a prior verdict, and nothing would have failed.
- **`first-report` is a LIFETIME mark**, so naming it to someone who already holds it is a false statement repeated across 176 spots. The reward clause is conditional; unknown state omits it, because silence is never false.
- The incentive now acts a screen earlier than the form, so the **non-conditioning clause travels with it**. This ADDS to `ReviewForm`'s disclosure, never replaces it (item 87b still binds).
- **"Know this spot?"** is an eligibility qualifier (16 CFR 465), deliberately knowledge-shaped rather than water-shaped, since nothing may reward going.
- **No "be the first".** The owner asked for those words; on a pre-moderated surface they cannot be said truthfully. Verified absent from the production bundle.

**Two things checked rather than assumed, both of which the spec got wrong:**
1. **The spec predicted a `reviews_viewed` discontinuity. There is none.** That observer is separately gated on `reviews.length > 0`, so it never arms on a zero-review spot. The series is continuous. That gate is now load-bearing and the changelog says so.
2. **The spec asked for an impression event AND a click event. There is no click event**, deliberately: the invitation has no control, so the funnel completes through the existing `review_form_opened`. Inventing a click for a paragraph would put a step in the funnel no user can perform.

**Guards were repointed, not deleted.** Two tests asserted the exact opposite of this item. Rewriting them to the new invariant (rather than dropping them) keeps the protection, and **both were proven to fail when the invariant is broken**.



**Owner-directed 2026-07-22.** In the spot sheet, on a spot with no published reviews, invite the reader to write the first one and name what they get for it. Owner's phrasing: *"be the first to review this spot to earn a [gold badge etc.] by your name"*.

**Read item 83 before designing this. It names this exact mechanic as gated.** Item 83's "Never without a specific gate" list includes **"first to report"**, alongside check-ins, streaks, leaderboards and novelty rewards. The owner is that gate and has now opened it, so this is `[ready]`, not a conflict to resolve upward. But the reasons the line existed do not disappear, and they constrain the build:

- **Nothing may reward getting on the water.** A first-review prompt rewards *writing*, which is on the right side of that line. Keep it there: the copy must never imply going, visiting, or launching.
- **The existing `first-report` mark is your first report anywhere, not first at a spot** (`web/lib/marks.ts:67`, criterion "One report written"). The owner's ask is a per-spot novelty. Decide deliberately whether this reuses `first-report` (nothing new to earn, the prompt just surfaces an existing mark) or adds a seventh mark. **Recommendation: reuse.** A per-spot novelty mark is a collect-them-all mechanic over 140 launch sites, which is the one shape item 83 was built to refuse, and it would need a denominator to feel like anything, which is banned outright.
- **"By your name" means the account display name, not a legal name** (owner clarification, 2026-07-22). That is the name set in the account sheet (`PATCH /api/account`, item 78), shown in the header identity (`components/AccountButton.tsx`) and as the review byline (`components/ReviewsSection.tsx`, `r.display_name ?? "A paddler"`). The owner named both surfaces: **top right and on comments.** So the mark is meant to sit beside the display name in the header and beside the byline on every published review.
- **That makes the mark public, and today marks are private to the earner** (item 83 decision 3). This is not a naming question, it is a visibility one: the *byline* is already public, the *mark* is not. Showing it next to the byline is item 83's staged **v2, public standing as a factual qualifier**, arriving early, and item 83 says v2 needs a fresh lawyer gate. Scope it as v2 rather than slipping it in as prompt copy. v2's own constraint still binds: a factual qualifier ("Angeline · 6 reports"), **never a rank**, so no tiering, no leaderboard, and nothing that lets two bylines be compared. The header instance is the easier half (self-visible only) and could ship first if the gate splits them.

**Required first step: run the `lawyer` agent.** This is a stronger material connection than anything gated so far. Items 83 and 85 both turned on the incentive being weak, private, valueless and unconditioned; a prompt that dangles a specific reward *at the moment of asking for a review* is an incentive acting on the writer at the point of writing, and making it public would compound it. Specifics to put in front of the gate:
- Does the existing writer-side disclosure (`DISCLOSURE` in `web/lib/markCopy.ts`, rendered above the assent box in `components/ReviewForm.tsx`) still cover this, or does the prompt itself need one? Item 87b recorded that the item-85 verdict depends on that disclosure continuing to exist; this item must not weaken it.
- Reader-side: item 85 removed the in-line disclosure to readers on the grounds that the incentive was disclosed at the point of writing. A louder incentive may move that answer back.
- 16 CFR Part 465 is not the risk here (the reward still cannot read a rating), but Endorsement Guides materiality is.
- The public half specifically: a mark rendered beside a byline tells a *reader* that this reviewer was rewarded, which is arguably disclosure rather than a new risk, but it also decorates the review it sits next to. Ask whether a visible mark changes how the aggregate reads, and whether the header instance (self-visible) and the byline instance (reader-visible) need the same answer.

**Truthfulness problem, must be solved not hand-waved.** Reviews are pre-moderated: a submission lands `pending` and only a human Approve publishes it (item 43). So "be the first" can be false in three ways: someone already submitted and is in the queue; two readers are both told they will be first; the reader writes one and it is rejected. Do not promise the outcome. Word it as an invitation ("No one has written about this spot yet"), and make the post-submit moment carry the honest state, which `confirmation()` in `markCopy.ts` already does.

**Where it goes.** `components/ReviewsSection.tsx:145-151` returns `null` when a spot has no published reviews and the form is closed. That early return was deliberate: *"An empty review block on all 140 spots advertises a feature the site cannot deliver yet."* This item reverses that decision on purpose, so replace the comment with the new reasoning rather than deleting it. Note the blast radius: this renders on **all 140 spots minus the handful with reviews**, so it is the highest-traffic new surface in the app. It must be quiet. Also check the review trigger in the action row, so the sheet does not end up with two competing asks.

**Sign-in.** Submitting requires an account (item 44). The prompt is shown to signed-out readers too, so the flow has to survive the auth hop without losing the spot context, and the copy should not read as a promise to someone who then hits a sign-in wall.

**Kill switch, not an A/B** (DAU < 100). Fold it into the existing `reviews` switch or add its own; do not build an arm comparison that can never be called.

**Measurement.** New INTENT events for the prompt impression (dwell-gated, per the house rule, not on mount) and its click, both carrying `spot_id` + `region`. Goal metric is reviews submitted per prompt shown, read from **Supabase**, not PostHog. Guardrail: `spot_action{action:"directions"}` per spot open must not step up, the same accidental-inducement check item 83 pre-registered. `analytics/INSTRUMENTATION_CHANGELOG.md` entry required, with a comparability note that `reviews_viewed` volume changes meaning once the section renders on spots with zero reviews.

**Acceptance:** a spot with no published reviews shows one quiet invitation with an honest, non-promissory claim; the reward named is real and matches what the code actually awards; the lawyer verdict is recorded (DECISIONS.md if it escalates); the writer-side disclosure and its guards are intact or deliberately updated; no denominator, no progress meter, no per-spot collectable marker (item 83's guard forbids the last one); if a mark ships beside the display name it is a factual qualifier with no rank or tier, and a guard asserts that; verified at 390px and desktop, signed-in and signed-out. No em dashes.

## 91. [done] Conditions rethink: complete the readout, do not build the plan (recommendation filed 2026-07-22; build is items 97 to 106)

### RECOMMENDATION: option 1, minus its own two over-reaching clauses. Build items 97 to 106 below.

**Three of this item's own premises were wrong, and checking them changed the answer.** Verified live before any design work:

1. **Temperature and precipitation are free.** Confirmed against a live NWS response: `temperature`, `temperatureUnit`, `probabilityOfPrecipitation`, `isDaytime`, `detailedForecast` all arrive in the payload `fetchWind` already downloads and discards at its type annotation. This item was right about this one.
2. **WRONG: "the intra-day shape is one endpoint over".** `web/lib/nextWindow.ts` **already fetches `/forecast/hourly` in the browser on every spot open** (156 periods, 84KB, ~400ms) to render the "Next good window" line, and `ConditionsPanel.tsx:330` nests that panel inside itself. `interface HourlyPeriod` declares three fields, so hourly temperature, hourly precipitation and the entire intra-day curve are discarded at the type boundary. **Intra-day shape costs nothing. It is already in memory.**
3. **WRONG: "interpreting wind direction needs a new per-spot field".** `web/lib/launchDirection.ts` already exports `launchDirectionTip()`, returning "Wind is from the west-northwest. An upwind start leaves the downwind leg for the way back." No per-spot data. It **is** this item's option 3, already built, already through the item-34 lawyer gate, already locked by `no-inducement.test.ts`. It renders **only** in `AlertInterstitial` and the alert emails, so no visitor who has not enrolled in alerts has ever seen it. Enrolled users are single digits.

**The 1-vs-3 choice was not real.** Both options as printed say "wind direction relative to the shoreline / the water", so both needed the same missing per-spot field. And option 1's "tide as flood/ebb **with direction of travel**" is about **current**, not height, which makes option 1 *more* aggressive than option 3, i.e. **this item had its own risk ordering inverted**. Once the shoreline field is subtracted, option 3 collapses into option 1.

**So the honest split is four categories, not two options:**

| | What | Cost | Verdict |
|---|---|---|---|
| **(a)** | Air temp, precipitation, storm gating, the whole intra-day curve | Zero new requests | **Ship** |
| **(b)** | Tide rising/falling and when it turns | Pure arithmetic on data already parsed | **Ship** |
| **(c1)** | Wind geometry stated generically | Already written, gated and tested. A port | **Ship** |
| **(c2)** | Wind relative to *this* shoreline | New hand-curated field, 177 records, no published source | **Do not start** |

**Recommendation: ship (a) + (b) + (c1) as one bundle behind one `conditions-readout` kill switch. Do not start (c2).**

**The risk, named:** completing the readout raises the panel's apparent authority faster than its actual knowledge, and the beginner most helped by "76F, no rain, tide turns at 3:40" is the one most harmed by over-trusting it. Three controls, each test-locked: **precipitation may only downgrade a verdict, never upgrade one** (`POP: 0` means no measurable rain forecast, not "no gusts, no thunderstorm"); **say heights, never currents** ("flood"/"ebb"/"current" are current vocabulary and slack water lags the height turn, so the word choice IS the safety control); **label air temperature as air**, since water temp is available from nowhere in the stack and cold shock, not air comfort, is the NorCal safety variable.

**Cost of (c2), so it is not re-litigated:** no registry publishes shoreline orientation (not CCC, Water Trail, DBW or NOAA). Deriving it from OSM coastline bearing fails twice on grounds already documented here: the input is the coordinate, and a known set of coordinates are the Water Trail's *parking* rather than the put-in, so the bearing would be silently wrong for exactly the records already wrong; and OSM is ODbL with share-alike attaching to a derived database. The only trustworthy method is per-record imagery reading, which at the observed pace of items 90 to 96 is 12 to 25 item-sized passes. **It is a data programme, not a sub-task.** Gate it on item 93.

**Metric:** distinct days on which a person fires at least one `conditions_viewed`, over 14 days, owner-excluded. Measurable today with zero new instrumentation (the event already carries `spot_id`, `region`, `difficulty`, `paddleability`, `had_data`). Pull the 14-day baseline **before** the bundle ships or the comparison is worthless, **and see item 105 first: the existing conditions query does not exclude owner traffic.** Read as a raw count at this DAU, never a percentage. Guardrails: `spot_action{action:"directions"}` must not step up, plus a sharper free one, directions clicks per conditions view **on spots reading `windy`**.

**Relationships.** Item 61 is independent and sequenced after, with one binding constraint: the precip rule must live in the shared module, not inline in `ConditionsPanel`, or 61 ships a ranking that contradicts the panel it links into. `nextWindow.ts` keeps the single definition of "good"; no second definition. Item 53: cost is zero new requests, so `conditions_loaded.latency_ms` must not regress.

**Bundling is deliberate and its cost is accepted:** at ~31 DAU a move cannot be attributed to any one of 97/98/99. Shipping serially buys no attribution either, each slice is too small to read. Ship as a bundle, declare it a bundle in the changelog, and refuse any later claim that "temperature did it".

**LIVE DEFECT FOUND BY THE GATE, blocking item 99.** Spot 72 (Elkhorn Slough, visible in production) reads: "Start on a flood tide so you're not fighting the current under the Highway 1 bridge **on the way back**." That is an imperative plus a return-leg representation, **the exact pair the item-34 gate removed from the tip**, live on a public spot page. Spots 1, 77 and 79 carry milder directives. **`data/spots.json` is not swept by `no-inducement.test.ts` at all**, so no guard has ever seen these. Filed as item 102, which blocks 99.

**GUARD HOLE FOUND, and it invalidated both agents' reasoning.** `scripts/predeploy-gate.py` has `PROTECTED_PATTERNS = ("web/app/api/cron/*", "web/app/api/alerts/*")`, matched on path. Exercising its own matcher: `web/lib/alerts/conditions-window.ts`, `web/lib/nextWindow.ts`, `web/lib/launchDirection.ts` and `web/lib/email/templates.ts` are all **NOT GATED**. So a change to `evaluateGoodWindow`, which decides **which push alerts fire**, would deploy with no owner review. Filed as item 106.



**Owner-directed 2026-07-22. This is a strategy and design item, not an implementation item.** The deliverable is a `product-visionary` brief plus a `design-lead` spec, both filed back into this item, with the build broken out as separate numbered items. Do not let an implementer start from this text.

Conditions is the stated differentiator and the moat ("per-spot judgment, not a wind number"). This item asks whether the current panel actually earns that, measured against how a paddler really decides.

**The owner's decision process, verbatim, as the design input.** Two routes, converging:

**Route A, familiar spots.** Want to paddle -> a few known spots in mind -> is the weather stormy? -> is the temperature warm but not too hot? -> is the wind not too strong? -> **which direction is the wind?** -> what is the tide doing? -> **draw a mental plan: when to launch, which direction to paddle out, so the return leg rides the wind and tide, for safety.**

**Route B, exploring.** Feeling adventurous -> look for a new spot -> check its view, parking, facilities, launch condition -> check rentals if needed -> then the identical conditions sequence and the same mental plan.

**Read the routes as one shape, because that is the finding.** Both end at the same place, and it is not a number. The paddler's real question is **"when do I launch and which way do I go so I get back safely"**. The app today answers "is it windy". Everything below is downstream of that gap. Route B's first half is a discovery problem (item 61 and the spot-detail fields); Route A is pure conditions; the shared tail is where the product is thin.

**Grounded audit of what exists today, so the brief starts from facts and not from the panel's reputation.** Read `web/lib/conditions.ts` and `web/components/ConditionsPanel.tsx` first:

| Step in the routes | What ships today | Verdict |
|---|---|---|
| Not stormy | `shortForecast` string only; never gates the verdict | Present but inert |
| Temperature warm, not too hot | **Nothing. No air temp, no water temp anywhere in the app** | Missing |
| Wind not too strong | `paddleabilityFromWind(speedMax)` -> calm / breezy / windy | The one step done well |
| Wind direction | `WindInfo.direction`, a raw compass string like "WNW" | Displayed, not interpreted |
| Tide | `TideInfo.next`, raw NOAA high/low events with heights | Displayed, not interpreted |
| The launch plan | **Nothing** | Missing, and it is the whole point |

**The cheapest finding, verify it before designing anything.** `fetchWind` parses exactly four fields off `periods[0]` (`conditions.ts:305-326`): name, windSpeed, windDirection, shortForecast. The same NWS response already carries **`temperature`, `temperatureUnit`, `probabilityOfPrecipitation`, `isDaytime`**, and roughly a dozen further periods, and `/forecast/hourly` is a sibling endpoint. Two of the six steps above ("not stormy", "warm not too hot") are being fetched and thrown away right now, at zero added latency and zero new dependency. The intra-day shape needed for "when to launch" is one endpoint over. Confirm this against a live response, then treat it as the floor, not the ambition.

**The strategic question to actually answer, not the feature list.** A verdict badge is a *readout*: it tells you a fact and leaves the synthesis to you. The routes describe a *plan*: launch time, first heading, return leg. Moving from one to the other is the difference between "AllTrails for water with a weather widget" and the Paddle-Morning Oracle this roadmap claims to be building. Frame the options honestly and recommend one:
1. **Complete the readout.** Add the missing inputs (temp, precip) and interpret the two raw ones (wind direction relative to the shoreline, tide as flood/ebb with direction of travel rather than a table of times). Cheapest, lowest risk, still leaves the synthesis to the paddler.
2. **Add the plan.** A suggested launch window and an out-and-back heading derived from wind + tide, so the return is downwind/with the current. Highest value, highest risk, and see the safety gate below. **DEFERRED BY OWNER DIRECTIVE, 2026-07-22. Do not build it. Do not spec it. It is replaced by a demand test, item 93.**
3. **Something between them:** surface the ingredients of the plan (wind direction relative to the water, when the tide turns) without issuing an instruction.

**Owner directive, 2026-07-22: the plan is not built, it is measured first.** The owner's actual ambition is larger than option 2 and further off: **an AI-led trip planner, native, that answers when, where and how.** It plans a route that rides the wind and tide on the way back, and optionally optimises the route for good views. That is a real product, not a panel feature, and the owner is not committing to build or monetise it on a hunch. **So this item's scope is now options 1 and 3 only, and the plan gets a placeholder button whose only job is to count who wants it (item 93).** Read the two paragraphs below as the cost of the thing being deferred, not as blockers to design around: they are the reason a demand test comes first.

Say which of 1 or 3 you recommend, and why. A recommendation with the risk named beats a survey.

**The blocker that decides how far this can go: a launch plan is safety advice.** "Wind is 8mph WNW" is a fact. "Launch at 9, head west first, ride the flood home" is an instruction that can put someone offshore in a rising wind with no way back. That is a categorically different liability posture, and this app already runs a no-inducement discipline (`web/lib/alerts/no-inducement.test.ts`) precisely because copy that nudges someone onto the water is the thing it must not do. **Run the `lawyer` agent on option 2 (and on option 3 if it names a direction) before any design work is specified, not after.** Ask specifically: does a directional or timing recommendation change the disclaimer's adequacy; is there a line between describing conditions and instructing a route; does per-spot geography being approximate (see below) make a heading recommendation reckless.

**The data problem that gates option 2, and this is where it will actually fail.** A return-leg recommendation needs to know the water's shape: which way the shoreline runs, where the fetch is, where you would be blown to. The app has one lat/lng per spot and nothing else. It has no shoreline orientation, no prevailing-fetch axis, no "if the wind is from the west you end up here" field. And per the house rule on provenance, the fields it does have are not all trustworthy: `tide_sensitive` was systematically wrong (36 of 68 bay spots), several coordinates are the Water Trail's parking rather than the put-in, and the wrong pin for a plan-generating feature is worse than the wrong pin for a map. **Any option that computes a heading needs a new per-spot field, hand-curated, with a stated source.** Cost that honestly across 140 spots (and note item 45 wants statewide) rather than assuming it can be derived.

**Do not re-litigate settled ground.** `lib/nextWindow.ts` already computes a next-good-window for alerts; check whether the in-app surface should reuse it rather than invent a second definition of "good" (the `next_good_window` experiment is parked per the no-A/B-until-DAU-100 rule, but the logic exists). Item 61 (cold-open "good to paddle today" ranked surface) is the discovery half of Route B and is still `[proposed]`; this item should say whether 61 is subsumed, sequenced after, or independent. Latency is already tuned (item 53) and the tide proxy already exists (item 52), so any proposal must state its latency cost against that baseline.

**Measurement, decided in the brief and not bolted on.** The current instrumentation can tell you conditions *loaded* (~91% of opens, an availability number) and, since the dwell gate, that someone *looked*. Neither can tell you the panel was **useful**, and that is exactly the claim this item is testing. Name the metric that would move if this worked, before choosing an option. Repeat conditions checks per user is the honest candidate (re-checking is the one validated repeated behavior, per item 26); `spot_action{action:"directions"}` is the accidental-inducement guardrail and must not step up. No A/B at this DAU.

**Acceptance:** a written recommendation between options 1 and 3, with its risk named (option 2 is out of scope, see the owner directive above); the free-today findings (temperature, precipitation) confirmed against a live NWS response and either scoped or explicitly deferred with a reason; the relationship to items 61 and 53 and `nextWindow.ts` stated; a metric that would move; and the build filed as new numbered roadmap items. The lawyer gate and the per-spot geography cost move to item 93's decision point, since nothing that needs them is being built here. No em dashes.

## 97. [done] Air temperature, precipitation and storm gating in the panel (deployed 2026-07-22, 852fd8a)

Read `temperature`, `temperatureUnit`, `probabilityOfPrecipitation`, `isDaytime` off `periods[0]` in `fetchWind` (`web/lib/conditions.ts`). Zero new requests.

Copy (design-lead, 2026-07-22): weather line becomes `{periodName}: {shortForecast}, {temp}F`, appending ` - {value}% chance of rain` only when precip >= 20% and no storm badge is showing. **Omit the clause below 20%**: "0% chance of rain" is noise restating the default. **No qualitative Mild/Warm/Hot tier**: a raw number is already legible, and inventing a comfort threshold nobody validated is the opposite of this item's point. **Label it "Air"**, never a bare number, because water temp is absent from the stack and cold shock is the real variable.

**Night case, must not be missed:** at 9pm `periods[0]` is "Tonight" and its temperature is an overnight low. Do not render that as today's paddling temperature.

**Precipitation may only DOWNGRADE a verdict, never upgrade one.** Test-locked.

Also split the wind failure state, which today collapses two different things into "Wind forecast unavailable.": `ok:true, wind:null` (outside NWS coverage) becomes "No forecast available for this spot."; `ok:false` becomes "Wind data is unavailable right now.", mirroring the tide side, which already draws this distinction.

**Storm badge** (display only, no cron involved): when `isStormyForecast(shortForecast)` matches (`/thunderstorm|t-storm|tstorm|lightning/i`), replace the calm/breezy/windy pill in the same slot, never stack both. Label "Storm risk", tone "Lightning risk on open water, per the forecast." Shows for **every** difficulty, not just flatwater: lightning is not a flatwater-only fact. Reuse `--wind-alert` / `--wind-alert-fill`, already defined and already the Windy pill's pair. **Record that the keyword match is a heuristic, not NWS Alerts**, so nobody later assumes it is exhaustive.

**Acceptance:** ships in the 97+98+99 bundle behind one `conditions-readout` kill switch; one changelog entry naming it a bundle; `conditions_loaded.latency_ms` does not regress; no em dashes.

## 98. [done] The tide reads as a direction, not a table of times (deployed 2026-07-22, 3d122b6)

`next[0].type === "H"` means rising now, turning at `next[0].time`. Pure arithmetic on `TideInfo.next`, already parsed. Zero new data.

Copy: "Rising, turns to falling at {time}." / "Falling, turns to rising at {time}." Reuse the existing `isNextDay` handling for a tomorrow event. Demote, do not delete, the raw event list beneath it: a 1ft low versus a 5ft low still changes how far you carry the board.

**HEIGHT VOCABULARY ONLY. A test must fail on "flood", "ebb" and "current" in the panel copy.** We predict tide *height*; slack water lags the height turn, which is why NOAA publishes separate current stations. "The current turns at 3:40 so you can ride it home" is an inference we would be inviting and cannot support. This is the provenance failure in miniature: good source, meaning lost.

**Acceptance:** in the bundle; the vocabulary test bites; existing degraded states (no station in range, NOAA down, no further events) unchanged; no em dashes.

## 99. [done] Launch-direction tip on the conditions panel, reworded for the public context (deployed 2026-07-22, c5cb69b)

One import. The highest-value line in this whole item, because it is the closest thing the codebase has to an answer to "which way do I go so I get back safely", and today only alert enrollees (single digits) ever see it.

**LAWYER GATE RETURNED `needs-changes`, 2026-07-22. Required actions, all of them:**

1. **Reword for the public context.** Ship: "Wind is from the {words}. An upwind start leaves the downwind leg for the way back, **where the shoreline allows**." The added clause signals the geometry is generic and may not fit the water in front of the reader. **This is a change to the OUTPUT of a prior gate**: update the comment block in `launchDirection.ts` and `launchDirection.test.ts` (which asserts the exact string) in the same change. Three properties must hold in any rewording: no verb aimed at the reader, no representation that they will get back, an explicit signal the geometry is generic.
2. **Blocked on item 102.** Do not ship while spot 72's note is live.
3. **Placement:** render inside `WindReading`, directly after the `{periodName}: {shortForecast}` line, so it reads as an annotation on the wind fact. **Never below the disclaimer, never inside or after `NextGoodWindowPanel`** (which renders *after* the disclaimer at line 330, so content there is already uncovered). Only render in a branch where the disclaimer also renders.
4. **Do NOT add a second, tip-specific disclaimer.** That is the "papering it" pattern item 34 named, and the suite forbids a competing wording. The qualification goes inside the sentence.
5. **Guard:** add `components/ConditionsPanel.tsx` to `PROSE_MODULES` in `no-inducement.test.ts`, and assert that when the panel renders the tip it also renders the canonical disclaimer. **Assert what must be PRESENT.**

Also expand the raw compass string unconditionally: the panel prints "from WNW" today, and a 2-to-3 letter abbreviation should never be shown to a user again.

**The boundary, recorded so the next item does not have to guess:** this stays inside the gated envelope because it names the direction the wind comes FROM and states a tradeoff. **The moment the panel names a direction for the paddler to GO, or pairs a launch time with a heading, it is option 2**: it needs the per-spot shoreline field and licensed counsel first.

## 100. [done] Today's shape, the intra-day wind curve, from the hourly payload already in flight (deployed 2026-07-23, 1338843)

Shipped a "today's shape" read to the conditions panel: a one-line summary of the rest of today's daytime wind ("Calm the rest of today." / "Winds pick up by {h}{am/pm}." / "Winds ease by {h}{am/pm}." / "Storms possible later today.", omitted on a multi-transition day, mirroring `evaluateGoodWindow` returning null) plus an hour-by-hour sparkline, scoped to the same 6am-6pm daytime bound the alert path uses. The live-reading eyebrow "Conditions today" is renamed "Right now".

**The fetch consolidation is real WITHOUT touching the protected file.** New `getHourlyPeriods` in `lib/nextWindow.ts` fetches the NWS hourly payload ONCE per spot; both `getNextWindow` and the new `getTodaysShape` derive from it, so the curve adds zero network requests. `HourlyPeriod` was deliberately NOT extended in `lib/alerts/conditions-window.ts` (protected: a change there freezes the deploy train and gates on owner approval). The raw hourly periods are a structural superset of `HourlyPeriod` and feed `evaluateGoodWindow` unchanged; the new pure, DOM-free `lib/todaysShape.ts` reads the extra fields off the same payload, so the native port is a clean lift.

**fetchWind finding (the item asked to evaluate it):** the separate twelve-hourly `/forecast` fetch is KEPT. It feeds the shipped "Right now" readout (period name, half-day short forecast, daytime-aware temperature), the saved-spots batch, and native, each with different semantics from per-hour hourly data. Dropping it would change already-shipped copy and needs its own item; not safe to fold in here.

Behind the `todays-shape` kill switch (default ON, no A/B, DAU<100). New dwell-gated INTENT `todays_shape_viewed` (`has_summary`, `hours`) + changelog. Lawyer gate CLEAR (descriptive forecast facts, not directives; the same round moved the safety disclaimer to co-render unconditionally at the panel foot, closing a pre-existing gap where `NextGoodWindowPanel` could paint with no disclaimer if the current-reading fetch errored). Adversarial verifier PASS (679 tests, +22; protected files untouched; it ran an off-by-one mutation on the transition hour that the tests caught). Verified live on prod, desktop + mobile, with real NWS data. Native twin port filed as item 135.

## 101. [blocked(item 93)] Per-spot shoreline orientation across 177 records

Do not start. Full cost in item 91's recommendation. A data programme, not a sub-task, and the only feature that needs it is the deferred trip planner.

## 102. [done] Spot notes join the safety-copy sweep, and one live promise is gone (deployed 2026-07-22, cf8d792)

Spot 72 (Elkhorn Slough, **visible in production**) read: "Start on a flood tide so you're not fighting the current under the Highway 1 bridge **on the way back**." An imperative plus a return-leg representation: **the exact pair the item-34 gate stripped out of `launchDirectionTip`**. It survived because `data/spots.json` was outside every copy sweep, while `SpotDrawer` renders notes directly above the conditions panel on every public spot page.

Four notes rewritten into descriptive voice, keeping the fact and dropping the instruction (spot 1 now says the sloughs drain toward mud near low water; spot 72 says the current under the bridge runs hard on an ebb). Coordinates untouched, text-level edit, zero removed lat/lng lines.

**The guard needed more than a new filename in the list, and this is the reusable part. NONE of the four existing `OUTCOME_PROMISES` or `DIRECTIVES` patterns matched ANY of the four live notes.** Adding `spots.json` to the sweep as-is would have gone green over the very copy the sweep exists to stop: this suite's own documented failure mode, repeating. Five patterns added, each derived by grepping all 177 records rather than from memory, each verified to hit exactly its target and nothing else BEFORE being committed. Hidden records are swept too, because `hidden` is reversible and un-hiding does not re-run a copy review (spot 79 was hidden and carried one). **Verified the guard bites:** restoring spot 72's sentence fails the suite by spot id.

**Found by item 99's lawyer gate, 2026-07-22. Blocks item 99.**

`web/data/spots.json` notes render at `SpotDrawer.tsx:549`, immediately above the conditions panel, with no separator, and **`no-inducement.test.ts` does not sweep the file at all.**

- **Spot 72, Elkhorn Slough, VISIBLE IN PRODUCTION:** "Start on a flood tide so you're not fighting the current under the Highway 1 bridge **on the way back**." An imperative plus a return-leg representation, **the exact pair the item-34 gate removed from `launchDirectionTip`**. Fix first.
- Spots 1, 77 and 79 carry milder directives ("push off about an hour before low", "Time the flood tide", "timing with the flood is critical"). 79 is hidden.

Rewrite all four into descriptive voice: state the fact, not the instruction (e.g. "The current under the Highway 1 bridge runs hard on an ebb."). Then **extend the `no-inducement.test.ts` file sweep to cover `data/spots.json` notes against `OUTCOME_PROMISES` at minimum**, and prove the guard bites.

Note the adjacency risk this closes: notes carrying launch timing, directly above a panel carrying wind heading, reads as when-to-launch plus which-way-to-go, i.e. the launch plan the owner deferred, assembled by adjacency rather than by decision.

**Acceptance:** four notes rewritten with no lat/lng touched (text-level edit, `git diff` shows zero removed coordinate lines); the sweep covers spots.json and fails when a promise is reintroduced; deployed.

## 103. [ready] PROTECTED: `evaluateGoodWindow` has no precipitation or thunderstorm term

**Promoted [proposed] -> [ready] 2026-07-23 (owner).** The correctness backbone of the just-shipped conditions features (100/61/8 all call `evaluateGoodWindow`), scheduled before the wet season. STILL PROTECTED: it feeds the push cron + alert emails, so the deploy requires owner approval (do NOT auto-deploy; build + escalate the deploy per the PROTECTED rule, and note the deploy-train-freeze implication if it lands unapproved).

`web/lib/alerts/conditions-window.ts` gates a good window on three things only: inside the horizon, spot-local hour 6 to 18, and wind calm. **No precipitation term, though precipitation sits unread in the same payload.** That function feeds the in-app panel, **the push cron and the alert emails**, so the product can name a window "good" during a thunderstorm.

**Measured before filing, so it is not dramatised:** 285 daytime wind-calm hours sampled live across 6 regions (North Coast, San Diego, Sierra, North Bay, Central Coast, LA). **Zero** hours at precipitation >= 30%; the maximum in any calm hour was 12%. In July in California this bites **zero times**. It is a correctness fix with a natural deadline, the wet season, not a fire.

Two tiers, different severities: a **hard exclusion** for thunderstorm hours (changes which windows exist, shared by push and email) and a **soft caveat** for plain rain (in-app label only: "rain likely" >= 60%, "chance of rain" 30-59%; a wet window is labelled, never suppressed, because rain is a comfort fact the paddler judges).

**Do NOT fold into 97.** Owner escalation required before deploy. Note item 106: the predeploy gate would **not** currently catch this change, which is why the escalation has to be deliberate rather than relied on.

## 104. [done] Water temperature: source hunt shows CO-OPS is not viable statewide (2026-07-23, research only, no deploy)

**Measured, not assumed. Full report: `reports/water-temp-coverage-2026-07-23.md`.** NOAA CO-OPS is NOT a viable statewide water-temperature source, and it is absent for exactly the spots where the cold-shock case is strongest.

- The metadata list (`type=watertemp`) named 16 CA stations; screening on it said 46% of spots sit within 10 mi of one. **That number is false: 7 of the 15 nearest stations return no data from the datagetter** (San Francisco, Alameda, Redwood City, Martinez, Los Angeles, Port San Luis, North Spit are all listed but dead). Same trap as the `tide_sensitive` stations: a listed sensor is a claim, not data. Only **8 CA stations are datagetter-live** (San Diego, La Jolla, Santa Monica, Monterey, Richmond, Point Reyes, Port Chicago, Arena Cove), all open-coast or outer-bay.
- Against the 8 live stations: 28% of spots within 10 mi, 46% within 20 mi, median 24 mi. **And even that overstates it**, because water temperature is water-body-specific: an ocean station near an inland reservoir reports the wrong water. There is **zero** inland-lake or freshwater-Delta water-temp sensor in CO-OPS.
- The worst-covered region is **Sierra Nevada** (14 snowmelt lakes: Tahoe, Donner, Fallen Leaf, Echo, Huntington, Shaver), nearest live station 120-161 mi away in the ocean or bay. That is precisely the cold-shock use case that would justify the dependency, and CO-OPS cannot serve it. Sacramento/Delta (freshwater), Central Valley, South Bay, Peninsula, Orange County are also uncovered.

**Recommendation (feature build stays deferred, its own later item):** do not build water temp on CO-OPS; if a coastal-only pilot is ever wanted it must gate per spot on a same-water-body live station within ~10 mi (roughly SF Bay + SoCal coast) and never show a number for inland lakes. The inland gap needs a DIFFERENT source, unmeasured so not assumed: candidate is **USGS NWIS** (param 00010) for lakes/reservoirs/rivers and **NDBC** for the coast, held to the same datagetter-confirmation bar. Naming them is not measuring them; that is a separate source hunt. Keep water temperature out of the conditions engine until a source is confirmed for the cold-shock spots.

## 105. [done] Owner traffic excluded from ten analytics queries, guarded (2026-07-22, 487f762; analytics-only, no deploy)

`analytics/EXCLUDED_PERSONS.md` states every query MUST exclude the owner's five `person_id`s, which were ~72% of all saves. **Five query files hard-code them; nine do not**, so per-query exclusion is the convention and these simply lack it:

`alert_ctr`, `alert_driven_returns`, `alert_optin_funnel`, `conditions_availability`, `conditions_engagement`, `directions_conversion`, `retention_w1`, `saved_conditions_engagement`, `spot_open_rate`.

**This is not academic.** `conditions_engagement.sql` is the source of the ~86% figure cited as evidence that conditions is genuinely used, i.e. the evidence for the moat claim, and item 91's own metric would have been built on it. `retention_w1` and `spot_open_rate` are core. At ~31 DAU, five owner devices are a large share.

Same shape as the "tests must grep the tree, not your memory" rule: the exclusion was applied to the queries someone remembered. The newer files (backswipe, enrollment) got it right; the older core ones did not.

**Acceptance:** all nine carry the exclusion; a guard or a documented check makes a new query without it visible; any figure previously reported from these queries is re-read and the delta noted in the next report.

**Done: a TENTH query (`experiment_next_good_window`) was found by grepping the tree rather than trusting this list, which is why the fix ships with `web/lib/analytics-owner-exclusion.test.ts` (fails when any events+person_id query omits the exclusion; `token_leak_check` allowlisted with reason) instead of a one-time edit. `alert_ctr` was Supabase-keyed, so it drops the owner push subscription, not a person_id. Delta re-read flagged for the next report (needs the PostHog personal key). Full note in the changelog.**

## 106. [done] The predeploy gate now sees the send-path libraries (2026-07-22, 39482d0; script + doc only, no deploy)

**Follow-up (b85533e):** the broadened trigger first fired on any command that merely MENTIONED the deploy string (a commit message, a heredoc writing these docs), blocking legitimate work minutes after ship. `is_prod_deploy` now strips quoted spans first, so only a bare invocation gates. Two false-positive fixtures added to `--selftest`.

`scripts/predeploy-gate.py` has `PROTECTED_PATTERNS = ("web/app/api/cron/*", "web/app/api/alerts/*")`, matched on **path**. Exercising the gate's own matcher:

```
NOT GATED  web/lib/alerts/conditions-window.ts   <- decides WHICH push alerts fire
NOT GATED  web/lib/nextWindow.ts
NOT GATED  web/lib/launchDirection.ts            <- copy that ships IN the alert email
NOT GATED  web/lib/email/templates.ts            <- the alert email itself
GATED      web/app/api/cron/check-conditions/route.ts
```

So the shared library that determines send behaviour and alert copy is outside the guard that exists to protect send behaviour. A change to `evaluateGoodWindow` would deploy with no owner review, which is exactly what item 103 proposes to change.

**This also settled a disagreement between two agents on item 91**, both of whom reasoned about whether folding the storm fix into a UI bundle "would trip the gate". Neither checked. It would not.

**SECOND HOLE, FOUND 2026-07-22 WHILE DEPLOYING ITEM 102, AND IT IS WORSE THAN THE PATH ONE: THE GATE DOES NOT RUN AT ALL FOR THE COMMAND WE ACTUALLY USE.** `main()` returns 0 immediately unless the command contains the literal substring `vercel --prod`. Every deploy in this session used `vercel deploy --prod --cwd web`, which does **not** contain it, so `find_block()` was never called:

```
CHECKED  'vercel --prod --yes --cwd web'      <- what studio.md documents
SKIPPED  'vercel deploy --prod --cwd web'     <- what actually works, and what we use
```

**Root cause is drift, not carelessness:** the Vercel CLI now rejects the bare `vercel --prod --yes` form and prints the `vercel deploy --prod` form as the correct invocation, so the documented command stopped working and its working replacement silently bypasses the guard. Four production deploys today (San Diego, Orange County, statewide, item 89) went out ungated. None of them needed the gate (coordinate churn was checked by hand every time), but the guard was not what protected them.

**Acceptance:** the protected set covers the alert/push *library* surface, not just the route paths; the trigger matches any real production deploy invocation, not one literal string; `.claude/studio.md`'s documented deploy command matches what the CLI actually accepts; the gate is exercised against a fixture list of BOTH command forms and BOTH path classes, proving each is caught (assert what must be CAUGHT); a deliberate dry run shows a `conditions-window.ts` edit gating under the real command.


## 135. [blocked(apple-enrollment)] Port "today's shape" to the native conditions panel

**Filed while shipping item 100 (web).** Item 100 added the intra-day "today's shape" read (summary line + hourly sparkline) and renamed the panel eyebrow "Conditions today" -> "Right now" on web. The native twins (`native/src/components/ConditionsPanel.tsx`, `native/src/components/NextGoodWindowPanel.tsx`) did NOT get it: a web UI change does not auto-propagate to its native mirror (item 122's whole lesson). So iOS users see the pre-item-100 panel, including the old "Conditions today" eyebrow.

The logic is already portable by design: `web/lib/todaysShape.ts` is pure and DOM-free, and the native app imports shared `@/lib/*` through the Metro alias, so `buildTodaysShape` and the shared `getHourlyPeriods` fetch carry over unchanged. The work is the RN presentation: a sparkline (no SVG-div trick, use `react-native-svg` or styled Views), the summary line, the eyebrow rename, and the `todays_shape_viewed` intent (the event name + props already exist in the shared `analytics-events.ts`, so native just emits it). Gate behind the same `todays-shape` kill switch.

**Grade:** [proposed]. Low-risk parity port, but native ships are gated on the outstanding EAS/Apple enrollment (item 72) and there are no iOS users to measure yet, so it is not urgent. Verify with `cd native && npx tsc --noEmit && npm test`; a full simulator build is the owner's check.

## 132. [blocked(apple-enrollment)] Native safety copy is outside every no-inducement sweep

**Found while shipping item 122.** `web/lib/alerts/no-inducement.test.ts` sweeps web surfaces (`PROSE_MODULES`, and since item 102 `data/spots.json`) for directives / urgency / outcome-promises, but it reads NOTHING under `native/`. Proof it matters: the native conditions panel carried "Check back before you head out" (the exact `head out` directive item 34/102 removed from web) live and undetected until item 122's parity port happened to replace it. Native `AlertInterstitial` and `NextGoodWindowPanel` render alert-adjacent copy too, and some is native-authored, not shared.

**Direction:** extend the no-inducement sweep to native component/prose files (or add a native-side mirror suite), asserting the same DIRECTIVES / URGENCY / OUTCOME_PROMISES patterns. Grep the native tree first to enumerate the surfaces, per the "tests must grep the tree, not your memory" rule. Low effort, closes a safety-copy hole on a whole platform.

**Grade:** [proposed]. Real gap, but filing not building: it is a test-infra addition the owner may want scoped alongside the broader native-parity/QA posture.

## 93. [done] Demand test for the AI trip planner: honest fake-door button live (deployed 2026-07-22, 507ad11)

**BLOCKED on D33 (2026-07-22).** Ready to build, but two acceptance requirements are owner inputs by design: the PRE-REGISTERED decision rule + expiry (must be set before the test runs, or the number gets rationalised, and the point is the owner commits), and the email-capture-vs-pure-count fork (a new data-collection decision). D33 carries both with recommended defaults for a one-line approval. Nothing built yet, to avoid building the wrong (email vs count) version.

**Owner-directed 2026-07-22.** Do not build the trip planner. Build the button that measures whether anyone wants it, run it, and bring the owner a number they can decide on.

**What the eventual product is, recorded so the button describes the real thing and not a vaguer one.** An **AI-led trip planner, native**, that answers **when, where and how**: it plans a route that rides the wind and tide on the way back, and optionally optimises the route for good views. The owner will decide whether to build it, and whether to charge for it, from this item's result. Item 91 option 2 (a launch window plus a heading, inside the conditions panel) was the small version of this and is deferred in favour of measuring first.

**This is a fake door, so build it like one that stays honest.** A button that appears to work and does nothing is a broken app; a button that quietly does nothing is a lie. The pattern that is neither:
- The button is honestly labelled before the tap. Something like "Plan my trip" with a small "coming soon" or "not built yet" qualifier visible without interaction. Do not hide the status until after the click.
- The tap opens a short sheet that says plainly it does not exist yet, describes what it would do in one or two sentences, and offers exactly one action: leave an email to hear when it is ready, or nothing at all if the owner prefers a pure count.
- No spinner, no fake result, no "generating your plan". Nothing that reads as an attempt that failed.
- **It never implies a safety judgement it cannot make.** The eventual feature is safety advice (item 91 records why); a placeholder must not let anyone believe a route was checked for them today. This is the one hard constraint.

**The measurement, and be honest about what it can and cannot prove.** A click on a new button measures **curiosity**, not demand, and nowhere near willingness to pay. Novelty inflates the first two weeks. Three reads, in increasing order of trustworthiness:
1. Click-through rate on impressions. The weakest number, but the one that separates "nobody cares" from "something here".
2. **Repeat taps by the same person on different days.** The real signal. Someone who taps a known-empty door twice wants the thing.
3. Email-leave rate, if the sheet asks. The closest thing to a costly signal available without charging money.

Instrument as an impression/click pair or the rate has no denominator: a **dwell-gated** impression event (per the house rule, not on mount, use `lib/useGenuineView`) plus a click event, both carrying `spot_id` and `region`, plus a sheet-dismissed-vs-email-left outcome. Add to `IntentEventName` in `lib/analytics.ts`, with an `analytics/INSTRUMENTATION_CHANGELOG.md` entry. **Do not price-test in v1.** Showing a price for a thing that does not exist is a much stronger claim than showing a button, and it contaminates the interest number. If v1 clears the bar, a price question is a second, separate test.

**Pre-register the decision rule before shipping, or the number will just get rationalised.** The owner should write down, in this item, what result means build, what means kill, and what means run it longer. Set it in absolute counts, not rates: at this DAU the denominator is small enough that a percentage will swing on single-digit noise. **Also set an expiry**, a number of impressions or a date, whichever comes first. A fake door with no end date stops being a test and becomes a permanent piece of dishonesty in the product.

**Placement decides the number, so decide it deliberately.** In the spot sheet near conditions it will be seen by nearly everyone who opens a spot; behind a menu it will be seen by nobody, and a high click rate on 20 impressions means nothing. Recommend one placement and hold it fixed for the whole test window; moving it mid-test destroys comparability. **Web first, not native**, despite the eventual product being native: the native app is still gated on Apple Developer Program enrollment (item 72) and has no users to measure.

**Kill switch, not an A/B** (DAU < 100, per the standing directive). It must be removable in one flip, because this is the kind of surface most likely to need pulling fast.

**Legal is small here but not zero.** The full feature needs a lawyer gate; a placeholder mostly defers that. What survives is the **claim in the button copy**: "AI" claims are an active FTC enforcement area, and a promise about routes and safety is a promise even when the feature is a stub. If the sheet collects an email, that is a new collection purpose and the privacy policy has to cover it. Run the `lawyer` agent on the **copy and the email capture**, not on the unbuilt feature.

**Acceptance:** a placeholder button and sheet that state their own status honestly before and after the tap; no fake progress and no implied safety judgement; impression + click + outcome events wired, dwell-gated, with a changelog entry; a written decision rule and an expiry date recorded in this item before it ships; one fixed placement; behind a kill switch; lawyer verdict on the copy and any email capture recorded; verified at 390px and desktop, signed-in and signed-out. No em dashes.

---

## 75. [proposed] Review moderation cannot depend on an email that can bounce silently

**Found 2026-07-21 by a real bounce.** The first genuine user review (spot 18, from `qg47`) submitted fine, but the moderation notice to `hello@paddletowater.com` **bounced** ("Generic Temporary Delivery Failure"). `hello@` is a Cloudflare Email Routing alias that forwards onward, and the onward hop rejected it. The review sat `pending` with nobody told.

**The failure is invisible by construction.** Resend accepts the send and returns 200; the bounce arrives asynchronously afterwards. `app/api/reviews/route.ts` only sees the 200, so it logs success. There is no path by which the app learns the operator was never notified. Approve/reject links are the ONLY way to publish a review, so a silent bounce means the whole UGC pipeline stops and looks healthy.

**Partly mitigated 2026-07-21 (deploy `24f97cc`):** `MODERATOR_EMAIL` is now an env var pointed at a directly-delivering mailbox instead of the forwarding alias. That removes the known-broken hop. It does NOT make a future bounce visible.

**Still needed:**
1. **A moderation queue in the app.** A signed-in owner-only view listing `status='pending'` with approve/reject. Email becomes a notification, not the only door. This is the real fix: it cannot bounce.
2. **Bounce visibility.** A Resend webhook writing delivery failures somewhere the owner sees, or a periodic "N reviews pending older than 24h" nudge. Either turns a silent stall into a signal.
3. **Do not route operator mail through `hello@`.** It is a forwarding alias, appropriate as a public contact address, not as a delivery target for anything the product depends on.

**Related compliance exposure, verify separately.** The Privacy Policy and the Contributor Terms both tell users to email `hello@paddletowater.com` to request account/content deletion, and the deletion runbook is built on that address receiving. The 2026-07-21 bounce is evidence that address may not currently deliver. If it does not, the deletion promise is inoperable, which is the exact FTC Act Section 5 problem the item-44 lawyer gate flagged. Confirm `hello@` receives, in the Cloudflare Email Routing dashboard, and re-verify D17.

---

## Studio finding, added 2026-07-21 (auth defect found while diagnosing a real failed sign-in)

## 74. [proposed] Auth-email hardening: nothing stops a clickable link returning to the sign-in templates

**STATUS 2026-07-22: the live break is FIXED and needs no owner action.** Both templates were verified code-only from the dashboard on 2026-07-22 ("Confirm sign up" and "Magic link or OTP", `{{ .Token }}` only, no `{{ .ConfirmationURL }}`, subject "Your Paddle to Water sign-in code"). What remains in this item is the **code-side hardening in "STILL OPEN" below**, which is loop work. Do not re-report the dashboard edit as owed: it is done. The diagnosis below is kept in past tense as the record.

**Filed as a defect with direct evidence, not as an idea.** The studio does not add proposals to a stocked shelf, but this was found while diagnosing an actual sign-in the owner could not complete (`qg47@cornell.edu`, 2026-07-21), and losing it would leave a live P0 unrecorded.

**What happened.** The Supabase auth email contained BOTH a clickable confirmation link and the `{{ .Token }}` code. Corporate and university mail systems pre-click every URL in inbound mail to scan it (Microsoft Defender **Safe Links**, Google Workspace equivalents). That click consumes the single-use token, so the code printed in the same message is dead before the human ever opens it. The user sees "the code doesn't work", or never registers that a code was there at all.

**Evidence (2026-07-21, `qg47@cornell.edu`, Cornell is on `cornell-edu.mail.protection.outlook.com`, i.e. Microsoft 365):**
- Supabase `confirmation_sent_at` 19:54:06.583Z; `email_confirmed_at` **19:55:28.058Z**, 82 seconds later.
- Vercel logged `GET /` at **19:55:28.25Z**, 0.2s after that confirmation: the redirect landing after the link was followed.
- `last_sign_in_at` on the account is still **empty**. The address was confirmed by something that never became a signed-in session.
- 19:57:31 to 19:57:40: every link in one of our emails fetched 3-6 times each, plus a bare `OPTIONS /`. A scanner sweeping a message, not a person reading one.

**Why it matters more than one user.** Microsoft 365 and Google Workspace are most corporate and university mail. Sign-in is now required to post a review (item 43), so this silently excludes a large class of users from the whole UGC feature, and there is no error message anywhere: the app reports the code as invalid, which reads as our bug to the user and as user error to us.

**Fix, in order of leverage:**
1. ~~**Make the auth emails code-only.** Supabase Dashboard -> Authentication -> Emails -> **"Confirm signup"** and **"Magic Link"**: drop `{{ .ConfirmationURL }}`, keep `{{ .Token }}`.~~ **DONE, verified in the dashboard 2026-07-22.** With no URL in the message there is nothing to detonate. This was the owner dashboard action and it fixed the failure outright. Steps 2 and 3 remain and are code.
2. **Stop depending on the template.** The app should also survive a link click: today `createBrowserClient` uses PKCE, so a link followed from a mail client can never complete a session in the user's browser, and `/` has no handler for the landing. Either handle the `token_hash` + `type` landing in a route, or assert the code-only template in a test that fails loudly if a link ever reappears.
3. **Surface the real failure.** "That code did not work" should distinguish an expired/consumed token from a wrong code, so the next occurrence is diagnosable from the UI instead of from Vercel logs.

**Acceptance:**
- A sign-in code sent to a Microsoft 365 address still verifies after the mail system has scanned the message.
- A regression guard that fails if the auth email regains a clickable link, or if the app is left unable to complete a link landing.
- The consumed-token case produces a distinct, honest error string.

**ROOT CAUSE FOUND 2026-07-21 21:0xZ, and the "race" reading below was WRONG.** Opening the actual templates settled it:

- **"Confirm sign up"** (sent to brand-new addresses) was **link-only**: `<p><a href="{{ .ConfirmationURL }}">Confirm email address</a></p>` and **no `{{ .Token }}` anywhere**. A first-time email user received an email containing **no code at all**, while the app asked them for a code. That is a 100% failure for every first-time email sign-in, not an intermittent one.
- **"Magic link or OTP"** (sent to addresses that already exist) was already code-only and already branded. It works.

So the two attempts differed by **template, not by timing**. Attempt 1 hit Confirm-sign-up and contained no code. The Safe Links scanner then clicked the only thing in the message, which confirmed the address as a side effect. Attempt 2 hit Magic-link **because the address was now confirmed**, and that template carries the code. The owner did not win a race; they were silently moved onto the working template by the scanner's click.

The scanner evidence is still real and still worth defending against, but it is the second-order problem. The first-order one was a template with no code in it.

**FIXED 2026-07-21:** "Confirm sign up" is now code-only (`{{ .Token }}`, no URL), subject "Your Paddle to Water sign-in code", verified persisted after reload. "Magic link or OTP" needed no change.

**STILL OPEN (the hardening, why this item stays):**
1. Nothing prevents a link returning to either template. Assert it.
2. `createBrowserClient` uses PKCE, so a link followed from a mail client can never complete a session. If a link ever reappears, the failure is silent again.
3. "That code did not work" cannot distinguish a consumed/expired token from a wrong code, which is why this took server logs to diagnose instead of being readable from the UI.

**Superseded reading (kept for the record, do not act on it): "it is a RACE, not a hard failure".** The owner retried and succeeded, and the timings say why:

| attempt | code sent | outcome | gap |
|---|---|---|---|
| 1 | 19:54:06.583Z | scanner consumed the token at 19:55:28.058Z, no session | **82s** |
| 2 | 20:44:37.381Z | real sign-in at 20:44:51.734Z | **14s** |

Whoever reaches the single-use token first wins. Act inside ~15 seconds and it works; leave the mail sitting while a scanner sweeps it and the code is dead on arrival. So this fails intermittently, by timing, for reasons invisible to the user: it will pass every hands-on test (the tester is fast and watching for the mail) and fail the ordinary user who reads mail a minute later. Do not treat "I retried and it worked" as evidence the defect is gone.

Second attempt used the **Magic Link** template (`recovery_sent_at`), the first used **Confirm signup** (`confirmation_sent_at`), confirming both templates carry the link and both need the fix.

**Not fixed by the 2026-07-21 OTP-length fix.** That was a separate defect (client truncated a 6-10 digit code to 6). This one is independent and still live.

---

## 83. [done] Collectables: "Your log", a private record of what you know about this water (built 2026-07-21)

**Owner-directed 2026-07-21.** A collectable layer so people invest and build an identity here. Designed by the product-visionary against a competitive teardown of 14 B2C apps (Foursquare, Untappd, Strava, Pokemon Go, eBird, Yelp Elite, Local Guides, Stack Overflow badges, NPS passport, Letterboxd, and others).

**Thesis: collect judgment, not launches.** The identity on offer is "I know this water", earned by knowing, never by going. Every comparable app is built on the check-in, and that is the one mechanic this product cannot have.

**Three owner decisions shaped it, all settled in chat:**
1. **Nothing rewards getting on the water. No check-ins.** A collection is a worse inducement surface than a push line if it ever nudges someone to launch, because a push expires and a collection accumulates. This also dodged a hard blocker: `spot_reviews_one_per_spot` is a unique index on `(user_id, spot_id)`, so a review could never have doubled as a repeatable check-in. Repurposing reviews as check-ins, from the original request, was not buildable as described.
2. **Existing contributions count retroactively**, so marks derive from lifetime counts and **v1 needed no migration**.
3. **Private to the earner.** Account sheet only, never on public bylines. Known cost, stated up front: the ask was "identity and reputation", and a private collection builds identity but cannot build reputation. v1 delivers half the ask on purpose; public standing is staged below.

**What shipped:** six marks (First report, In your own words, Local knowledge, Scouted, Around the bay, Watching), a "Your log" section in the account sheet, a post-submit moment (a mark drawn in one 600ms stroke, reduced-motion aware), and an FTC disclosure above the submit button with a matching Contributor Terms clause (bumped to v1.3 in the same commit). Behind a `collectables` kill switch at 100%. Two INTENT events, `mark_shown` and `log_viewed`.

**Rules the tests enforce, because each is one careless edit from a different product:** no denominator or progress bar ever (a completion meter over launch sites is the Pokemon Go mechanic rebuilt on purpose); unearned marks show their criterion, never the distance to it (the Stack Overflow steering effect, aimed at a safety product); no comparison to any other user; the reward function cannot read a rating at all, so sentiment-conditioned rewards are unwritable, not merely unwritten (16 CFR Part 465 bars both directions, which is why a "reported a hazard" mark was rejected too).

**Two defects found by verifying the real flow rather than reasoning about it**, both fixed:
- Marks keyed to `published` gave the bare-star path instant recognition and made the written-review path wait on our moderation queue, so "In your own words", the mark that exists to value sentences over stars, could never fire when someone wrote them. Marks now count `published` or `pending`; the log still says "N reports live" for published only, plus "N in review".
- The reported-spot dot sat inside a `truncate` element, so it was clipped away on exactly the long spot names most likely to need it. Invisible at 390px, caught at 1280px. **Removed entirely at the owner's request on 2026-07-22:** they did not want a per-spot marker in the list. A guard now keeps one from coming back, since a per-spot marker over launch sites is the seed of the collect-them-all display this feature must never become.

**Measurement, honestly:** the goal metric is repeat contribution from Supabase (not PostHog, per the house rule on the loop tail), and at ~2-3 genuine contributors it will be a count between 0 and 3 for months, not a rate. No A/B, no cohort read, no significance test will ever run on this. Safety guardrail to watch: `spot_action{action:"directions"}` per spot open, where a step change up would mean we built an inducement by accident. **Pre-registered kill criterion:** if 60 days after ship no account other than the operator's and known testers' has earned any mark, flip the kill switch off, leave the code, revisit at DAU 100.

**Comparability warning:** `spot_viewed` and `conditions_viewed` are expected to rise for SIGNED-IN users from ship date, because two marks are earned by dwell-qualified spot views. Retention reads must segment signed-in from anonymous from 2026-07-21. Recorded in `analytics/INSTRUMENTATION_CHANGELOG.md`.

**Staged, not now:** v1.5 at 25 signed-in accounts, persist the explored set server-side (the one mechanic that genuinely forces a migration). v2 at 25 reviewing accounts, public standing as a factual qualifier ("Angeline · 6 reports"), never a rank, needing a fresh lawyer gate. v3 at 100 contributors and not before an entity exists (D25 Q2), discretionary owner-granted recognition in `app_metadata` (barnstar, not karma). **Never without a specific gate:** check-ins, streaks, leaderboards, "first to report", completion percentages, novelty rewards, marks with monetary value, any push or email about a mark.

**Strategy note.** This is the third deliberate exception to this roadmap's own retention-first thesis (items 43 and 44 were the first two, recorded the same way). The thesis has not changed: the owner is exercising the call it reserves. A later reader should not mistake this for a pivot.

---

## 80. [blocked(apple-enrollment)] Native app shows a different number than the web under the same star

**[proposed] -> [blocked(apple-enrollment)] 2026-07-23 (D35=a).** Native is committed, but its parity items (80, 132, 133, 135) are executed as ONE pre-TestFlight sweep, not piecemeal, so they gate together on the owner completing Apple Developer enrollment (the long-pole enablement step). They un-gate as a batch once native is TestFlight-bound. See D35 for the five owner enablement steps.

**Flagged by the 2026-07-21 legal gate (D30, good-practice action 9), filed rather than fixed because the native app is not shipped yet.**

The web score is now the blend of the owner rating with published paddler reviews (D30). `native/src/components/SpotCard.tsx:53` and `native/src/components/SpotSheet.tsx:141` still render `spot.owner_rating` raw, because native never fetches `/api/reviews/aggregates`. Same spot, same star glyph, two different numbers, with no label on either telling you which is which.

Not user-visible today (native is gated on Apple Developer Program enrollment, item 72), which is the only reason this is `[proposed]` and not `[ready]`. It MUST be resolved before the first TestFlight build goes to anyone outside the owner.

**Two ways to close it, in order of preference:**
1. Have native fetch the aggregates endpoint and use the shared `web/lib/rating.ts` (already a pure module, already imported by native via the `@/` alias, already unit-tested). One formula, both platforms.
2. If the fetch is not worth it, label the native number "our take" so it is at least honestly attributed, and accept that the two platforms show different numbers.

**Acceptance:** a spot with published reviews shows the same number on web and native, or native labels its number as the owner's own rating. Web's `lib/rating.test.ts` covers the math; native needs no second copy of it.

---

## Owner items, added 2026-07-21 (rating + reviews copy removal; both [ready], queued top-most on purpose)

## 84. [done] Drop the "Paddle score" label next to the rating number (deployed 2026-07-22, 5848c0a)

**Owner-directed 2026-07-21.** Remove the "Paddle score" wording that sits beside the rating numbers.

**Where it lives:** `components/SpotRating.tsx` renders it twice, and the two are not the same thing:
- **line 34**, the visible `aria-hidden` label under/next to the number. This is the one the owner means.
- **line 30**, inside the screen-reader string: `" out of 5, Paddle score combining our own rating with {n} paddler {reviews}"`. This is the accessible description, not visible copy.

**Two things to decide, do not just delete both strings:**
1. **Keep the accessible description meaningful.** If line 30 loses the whole phrase, a screen-reader user hears a bare "4.6 out of 5" with no idea what it blends. Drop the brand term but keep the sense, e.g. `"4.6 out of 5, combining our own rating with 3 paddler reviews"`.
2. **The label was doing provenance work.** Per the comment at `SpotRating.tsx:10`, "Paddle score" specifically marks the BLENDED number (owner rating + paddler reviews) as ours rather than a pure crowd rating. With no label, a blended number can read as if it were purely user-generated. That is the owner's call, but make it knowingly; if the label goes, consider whether the blend is disclosed anywhere else.

**Guards that will fail and must be updated deliberately (not deleted wholesale):** `components/reviews-guards.test.ts` asserts the label at **lines 179, 189, 203, 208** (`expect(blended).toContain("Paddle score")` and two `aria-hidden ... Paddle score` matchers). Rewrite them to assert the NEW intended state so the guard still bites. Also update the now-stale comments referencing the label in `SpotDrawer.tsx:465-468` and `SpotRating.tsx:10`.

**Acceptance:** no visible "Paddle score" text anywhere; the screen-reader description still explains what the number is; guards updated to the new state and passing; verified at 390px and desktop on a spot with reviews and one without. No em dashes.

**Shipped 2026-07-22, with one correction from the re-gate.** "Paddle score" is gone everywhere and the accessible description keeps its meaning ("combining our own rating with N paddler reviews"). The item's own point 2 turned out to be the whole story: the label WAS doing provenance work, and the re-gate returned `needs-changes` on removing it outright. With the sheet's breakdown line already gone (8d9bfbe), a blended number would have had no visible provenance at all. The floor is one short visible attribution, so it ships as **"our take"**: the owner rejected the wording "Paddle score", not the concept. The sharpest finding was not FTC but defamation posture, an attributed rating is opinion (the strongest defence if a named business objects) while a bare aggregate under a "Paddler reviews N" heading reads as a factual report of paddler sentiment. Verified at 375px on blended and owner-only spots; no subtitle row truncates. Guards now assert the attribution is PRESENT (the version that asserted the old label's absence would have certified the rejected state).

## 85. [done] Remove the contributor-marks line from the paddler reviews section (deployed 2026-07-22, 7410928)

**Owner-directed 2026-07-21.** Remove this from the reviews section (`components/ReviewsSection.tsx:182-189`):

> "Contributors get small participation marks. They are private, have no cash value, and never depend on what a review says. [Contributor Terms]"

**Flagging this before it is actioned, because it is not decorative copy.** The code comment directly above it (`ReviewsSection.tsx:178-180`) records why it shipped, as part of item 83: *"the reader of a review, not just its writer, should know contributors get something. Weak material connection (private, no cash value, never conditioned on opinion), so one quiet line is proportionate."* **"Material connection" is FTC Endorsement Guides language.** This line is a disclosure to the *reader* that the people writing reviews receive something (participation marks). It came out of the collectables legal gate (`199cfa7`, "legal gate fixes, needs-changes -> all eight actions done").

Deleting it while the app still awards marks for contributing removes a disclosure that was added on purpose. That may be perfectly fine, the connection really is weak (private, no cash value, not conditioned on opinion), but it is a compliance decision, not a copy tweak.

**Required first step: run the `lawyer` agent on this removal.** Give it the item-83 context and ask specifically whether the disclosure can be dropped from the reviews surface given marks are private, valueless and unconditioned, or whether it must merely be relocated.

**Options for the lawyer to weigh, cheapest first:**
- Remove entirely (the owner's request), if the material connection is judged too weak to require reader-side disclosure.
- Keep the disclosure but move it off the reviews list, e.g. only on the Contributor Terms page and in the review form (where the writer already sees it).
- Shorten to a single short clause plus the existing Contributor Terms link.

**Also note:** the reviews guards reference contributor terms (`reviews-guards.test.ts:45`, and `:98`/`:306` cover the `/contributor-terms` page). Removing the paragraph must not silently weaken those guards; update them to match whatever the lawyer approves, and leave the `/contributor-terms` page itself in place.

**LAWYER VERDICT RECORDED (2026-07-22, re-gate run during item 84).** Removing the sentence is **defensible, with one condition**: marks are private, valueless and never conditioned on what a review says, and the incentive is **disclosed at the point of writing and in the linked terms, so no in-line reader disclosure is required**. **The condition: keep a `/contributor-terms` link on the reviews surface.**

A bare link with no sentence is fine. `ReviewsSection.tsx` is the ONLY reader-facing route to that document (`ReviewForm.tsx` is writer-only, behind the form), so deleting the whole block leaves a reader with no path from the number to the document explaining it. Also corrected by the gate: the review form carries an assent checkbox plus a terms link, NOT a marks disclosure, so "the writer already sees it" is not true today.

**Narrowed 2026-07-22 (item 87b).** The verdict above originally read "fails the Endorsement Guides materiality test in the direction of disclosure not required". Taken literally that would have authorised deleting the WRITER-side disclosure too, which it does not. The position that actually holds is the narrower one now recorded, and it depends on three artifacts continuing to exist, none removable without a fresh gate: the `{DISCLOSURE}` rendered above the assent box in `components/ReviewForm.tsx`, the string itself in `lib/markCopy.ts`, and the marks clause in Contributor Terms section 2. All three are now asserted in `components/reviews-killswitch.test.ts`, so the dependency is executable rather than a note someone has to remember.

**Acceptance:** the lawyer verdict is recorded (in DECISIONS.md if it escalates); the reviews section matches the approved outcome; **a `/contributor-terms` link survives on the reviews surface**; guards updated to assert the new intended state and still passing; the review form's own disclosure and the Contributor Terms page are unaffected unless the lawyer says otherwise.

**Shipped 2026-07-22.** Sentence gone, link kept, both verified live. Two calls beyond the letter of the item: the link is NOT gated on the `collectables` kill switch (the removed sentence was), because the terms also explain how the score is computed (s6.4) and killing marks must not cut a reader's path to that; and the link moved BELOW the reviews list, since as a bare link under the heading it read as a label on the first review. Nothing had been asserting the sentence, which is why deleting it broke no test, so the new guard asserts what actually matters (sentence gone, link present, link ungated) and was proven to bite by re-gating the link and by deleting it outright.

## Owner items, added 2026-07-21 (header polish + label clarity; both [ready], queued top-most on purpose)

## 77. [done] Header: make the account/Sign-in button visually consistent with the Feedback button beside it (deployed 2026-07-22, 0a67cd3)

**Owner-reported 2026-07-21.** The top-right account button does not match the button next to it. Measured from the code, the two are built on different shapes:

- **Feedback** (`components/HomeClient.tsx:779`): `text-xs font-medium px-3 py-1.5 rounded-lg border border-(--accent) text-(--accent)`, so an **8px radius**, extra-small text, azure outline that fills azure on hover.
- **Account / Sign in** (`components/AccountButton.tsx:34` and `:60`): `rounded-full ... px-2.5 py-1.5 sm:px-3 text-sm border border-(--border) text-(--dark)`, so a **full pill**, small text, neutral hairline border.

Three mismatches sit side by side in the header: **radius** (pill vs 8px, the owner's main complaint), **text size** (`text-sm` vs `text-xs`), and **border/colour** (neutral vs azure). Item 37 already established the header standard: the search input and Feedback button were deliberately matched at 30px height and 8px radius; the account button shipped later (item 44) and never joined that system.

**Design note, do not blindly copy Feedback's colours:** Feedback's azure outline reads as a call to action. Cloning it exactly would put two competing azure CTAs in the header. The likely right answer is **match the geometry** (radius, height, padding, text size) while keeping the colour hierarchy deliberate (Feedback stays the accented one, account stays neutral). design-lead decides.

**Acceptance:** the account/Sign-in button and the Feedback button share radius, height and text size, and sit in the header as a deliberate set with the search input (the item-37 pair). Check both signed-out ("Sign in") and signed-in (account name, which truncates at `max-w-[7rem]`) states, and the `sm` breakpoint where the label hides. No layout shift, no horizontal overflow at 390px.

**Shipped 2026-07-22.** Geometry matched (`rounded-lg`, `text-xs`, `px-3 py-1.5`, same 30px box); colour deliberately not, per this item's own design note, so Feedback keeps the single azure outline and the account button stays neutral. Both AccountButton variants now share one `HEADER_BUTTON` constant so they cannot drift apart again. **Measuring rather than eyeballing found a third mismatch this spec did not list:** the mobile search glyph rendered 38px tall beside two 30px buttons, because `text-base` gives it a 24px line box; `leading-none` holds it to 30. Verified at 1280px and 390px, signed in (long name truncating) and signed out, and at the `sm` breakpoint: all three controls 30px / 8px / 12px, one azure border among them, no overflow.

## 78. [done] Rename the water-type labels to Lake / Coast / River (deployed 2026-07-22, 73ba881)

**Owner-reported 2026-07-21, from user feedback.** The water-type vocabulary is not landing: people do not know what "Flatwater" and "Open water" mean. Replace with something understandable but **not wordy** (these render as compact filter pills and badges, so length is a hard constraint).

**Single source of truth:** `DIFFICULTY_LABEL` in `web/lib/types.ts:76-79` (`flatwater` -> "Flatwater", `bay` -> "Open water", `river` -> "River", `unknown` -> "Unknown"). `DIFFICULTY_LEGEND` derives from it, so the map legend follows automatically.

**Do NOT rename the underlying enum values.** The keys `flatwater` / `bay` / `river` feed `DIFFICULTY_COLOR`, the map pin colours, the filter state, and analytics event props. Change the **display strings only**; renaming the values would break pin colours and destroy analytics comparability. If what gets *logged* changes as a result, that needs an `analytics/INSTRUMENTATION_CHANGELOG.md` entry per the house rule.

**Sweep the tree, do not trust this list.** Hardcoded occurrences of the current strings live outside `types.ts` in at least: `components/ConditionsPanel.tsx` (copy such as "good for flatwater"), `lib/search.ts` (search synonyms), `scripts/verify-legend.mjs` (a legend guard that will fail if labels move), and `data/spots.json` (prose inside `notes`, which must NOT be mass-renamed). Grep for both strings and decide each hit deliberately.

**Editor constraints:**
- Keep search working for the OLD words too: someone who types "flatwater" must still find the same spots (`lib/search.ts` synonyms), and ideally the new words match as well.
- **Avoid colliding with the conditions vocabulary.** "Calm" is already a live *conditions* verdict (`ConditionsBadge` / `PADDLE_COPY`). A water-type label like "Calm water" would blur a permanent property of the spot with today's forecast. Pick words that cannot be mistaken for a conditions state.
- Two words maximum per label; they must not wrap in a filter pill at 390px.
- `river` and `unknown` probably stay as they are; the problem words are the first two.

**Acceptance:** new labels render everywhere the old ones did (filter pills, spot badges, map legend, spot sheet, OG/JSON-LD if present) with no leftover instances of the old strings outside deliberate prose; pins keep their colours; search still matches the old terms; `verify-legend.mjs` and the test suite pass; verified at 390px and desktop with no pill wrapping. No em dashes.

**Shipped 2026-07-22 as Lake / Coast / River**, after two owner revisions in chat. The owner first proposed **Lake / Ocean / River**; checked against the data, "Ocean" was wrong for 52 of the 67 spots in that bucket (36 SF Bay/estuary, 12 slough/marsh, only 15 genuinely ocean, 4 lakes/harbours), so the owner revised the middle label to "Coast".

**The owner also rejected this item's framing**, asking why `difficulty` was treated as the only way to categorise when the point is to be intuitive. That critique was correct and the data proved it: the four Lake Tahoe spots were split 2/2 across `bay` and `flatwater` with no principled difference (Kings Beach and Fallen Leaf already `flatwater`; Sand Harbor and Waterman's Landing in `bay`). The field was a water-type taxonomy wearing a difficulty name, applied inconsistently, so naming it by water body is a correction rather than a loss. **Sand Harbor (#11) and Waterman's Landing (#15) moved to `flatwater`** so Tahoe is one thing. The spots.json diff is exactly two lines, both `difficulty`, lat/lng verified untouched.

Enum keys untouched as this spec required, so pin colours, filter state and the `difficulty` analytics prop are unchanged. Search keeps the old vocabulary working alongside the new. `verify-legend.mjs` updated and **it was already stale** (it expected "Ocean", a label the site stopped rendering at the earlier rename). Nothing had asserted the labels, so the rename broke no test; the new guard covers labels, enum keys, search in both vocabularies, and Tahoe consistency, and was proven to bite on each.

**Follow-up worth filing separately:** none of the four Tahoe spots' notes mention wind, fetch or cold, which is the actual risk there. The labels never carried that warning and still do not; the notes are where it belongs.

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

**Copy fix 2026-07-18 (owner: content lacked judgment).** Two owner complaints, both fixed: (1) the dual-CTA headline "Get alerts for your spots" hid WHAT the alert is for, restored to "Get alerts when your spots are good to paddle" (and "Get alerts when {spotName} is good to paddle" on first_save), so the value (good paddling conditions) is stated; (2) cut the "One email a day, max... Unsubscribe anytime" reassurance line, filler that added no needed info and wrapped ugly on mobile (the CAN-SPAM unsubscribe path is in the emails, not here). The item-34 safety line stays. Root cause + agent fix: the **design-lead** finalized copy and traded the value proposition for brevity, and the **editor** pass (the copy authority) was skipped. Patched both global agent defs (`~/.claude/agents/design-lead.md`, `editor.md`): clarity beats brevity, a headline/CTA must name what the user gets and never drop the value prop to fix a layout problem; cut reassurance/disclaimer filler; design-lead drafts copy but the editor finalizes it. 348 tests, build clean; deployed `1884c32`, verified live in the prod bundle (new headline present, filler gone).

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

## Owner item, added 2026-07-19 (native iOS app)

## 72. [done] Native iOS app v1 (Expo), full web parity, shipped 2026-07-19

**Owner-directed 2026-07-19, built same day.** React Native (Expo SDK 57) iOS app in `native/`; the repo split into `web/` + `native/` (deploy is now `vercel --prod --yes --cwd web`). Full feature parity with the web app: CARTO map with difficulty pins, list with Watching (calm-first, live badges) + Recently checked, filters + relevance search, full-screen spot sheet (photos w/ CC attribution, notes, live NWS wind + NOAA tides via the prod `/api/tides` proxy, next good window), saves, share/directions, feedback, deep links (`paddletowater:///spot/<id>` + query form + push data.url), alert interstitial with launch-time reminders, and the enrollment funnel. Spot data, conditions logic, search, alert evaluator, and the typed analytics contracts are imported from `web/` through a Metro alias, so the platforms cannot drift. Backend gained an Expo push transport (`push_subscriptions.kind`, `expo-sender.ts`, cron branches) alongside web-push; native analytics emit with `display_mode: "native_ios"`. Verified in the iOS 26.5 simulator via Maestro flows (smoke + deeplink, both green).

Remaining owner steps (see `native/README.md` runbook): run `supabase/migrations/20260719_native_push.sql` in the SQL editor, approve the gated web deploy of the M5 backend, `eas init`, set `EXPO_PUBLIC_POSTHOG_KEY`, and (for real push delivery + TestFlight later) enroll in the Apple Developer Program.

## Owner item, added 2026-07-19 (mobile back-swipe; queued top-most on purpose)

## 71. [done] Left-edge swipe (left-to-right) to go back on mobile: close the spot sheet, or return home (deployed 2026-07-20)

**Shipped 2026-07-20 (studio loop; design-lead spec, adversarial + whole-branch verify, lawyer clear).** Two coupled, strictly mobile/touch-scoped parts, both behind one `back-swipe-gesture` kill switch (`useKillSwitch`, default ON; desktop and the killed path keep the exact prior `replaceState`, byte-unchanged). (1) **History fix:** opening a spot from closed now `pushState`s one `?spot=<id>` entry instead of `replaceState` (spot-to-spot switches still `replaceState`, so Back never steps through every browsed spot); a single `popstate` handler closes the sheet, so hardware/browser Back AND the gesture both resolve through it. Deep-link/`from=share|email|alert` arrivals seed history so one Back lands on `/` (after the token-strip `replaceState`, never leaking a live `t`); `/spot/[id]` routes to `/`; the home root does not trap. (2) **Gesture:** a pure DOM-free decision module (`web/lib/backGesture.ts`, edge-zone + horizontal-distance + direction threshold that rejects mostly-vertical swipes so Leaflet pan and list scroll are untouched) driving a `useBackGesture` hook that calls `history.back()` past threshold; `prefers-reduced-motion` honored. Analytics: `spot_sheet_dismissed.method` is now a compile-enforced union with new `edge_swipe`/`os_back` values (kept distinct from item-64 `back`), changelog entry added, adoption query in `analytics/queries/backswipe_adoption.sql`. Verified LIVE on paddletowater.com at 390px (internal-flagged): opening a spot pushes a history entry (`?spot=1`), hardware Back closes the sheet back to `/` instead of exiting, zero console errors; 412 tests (38 new), lint + tsc + `npm run build` clean, `edge_swipe`/`os_back` in the bundle. Fixed a build-blocking `tsc` error the branch's own union-typing surfaced at the legacy drag path (`SpotDrawer.tsx`). Concurrent README-only commit on main reconciled by rebase (no overlap, nothing reverted). Deployed `ca80b0a`. On-device caveat: the true edge-swipe touch feel and standalone-PWA behavior are the owner's real-device check (emulator can't reproduce installed-PWA history exactly).

**Owner-directed 2026-07-19.** Add the platform-standard back gesture: a swipe starting at the **left edge** of the screen, dragging right, navigates back (close the open spot sheet and return to the map/list; on the standalone `/spot/[id]` page, return to home). Mobile/touch only; desktop unaffected.

**Why it matters most in the installed PWA:** in a browser, Safari/Chrome already give an edge-swipe that navigates browser history. In **standalone (installed PWA) there is no browser chrome and no back gesture at all**, so right now the only way out of a full-screen spot sheet is the back button. This gesture is the expected way home on a phone, and its absence is most felt exactly where retention lives (the installed app).

**This connects to a real navigation gap, fix them together.** Opening a spot uses `window.history.replaceState` (`components/HomeClient.tsx:287-289`), NOT `pushState`, so opening a spot adds **no history entry**: even the browser Back button (or a browser edge-swipe) exits the site instead of closing the sheet. A correct back gesture needs actual back state:
- On mobile spot-open, `pushState` a history entry (`?spot=<id>`) instead of `replaceState`, and add a `popstate` handler that closes the sheet when that entry is popped. Then the edge-swipe can simply call `history.back()` and both the gesture AND the hardware/browser back behave correctly.
- Define "back" precisely: sheet open -> close sheet (return to map/list); standalone `/spot/[id]` -> navigate to `/`; at the home root with nothing open -> do NOT trap, let the OS/browser handle it. Preserve the deep-link/`from=share`/`from=email`/`from=alert` arrival flows (they must still land on the spot, and back from them should go home, not re-loop).

**This is a design-lead pass because of one real conflict:** the map pans on horizontal drag (Leaflet), so a left-to-right swipe on the Map tab is a pan. The back-swipe MUST be scoped to a **narrow left-edge zone** (match the iOS/Android ~20px edge) and must not break map panning or list scrolling. Design-lead owns: the edge-zone width, the horizontal-distance + direction threshold (and rejecting mostly-vertical swipes so it doesn't fight scroll), whether to show an interactive drag-follow (the sheet slides out under the finger, iOS-style) or a simple threshold-triggered dismiss, and `prefers-reduced-motion` handling.

**Acceptance:**
- A left-edge left-to-right swipe on mobile closes an open spot sheet (returns to map/list), and on the standalone `/spot/[id]` page returns home; verified in the installed/standalone PWA context, not just mobile browser.
- Map panning and vertical list scrolling are NOT degraded (test a horizontal drag that starts away from the edge = still pans the map; a mostly-vertical swipe = still scrolls).
- Hardware/browser Back also closes the sheet now (the `pushState` + `popstate` fix), instead of leaving the site.
- The back button / existing dismiss paths still work; gesture is additive, not the only way. No console errors; design-lead sign-off; verified at 390px.

## Owner item, added 2026-07-18 (email polish; queued top-most on purpose)

## 68. [done] Polish the alert + confirm email design and copy: brand header, visual hierarchy, color (deployed 2026-07-18)

**Shipped 2026-07-18 (studio loop; design-lead spec, editor copy, lawyer gate clear).** Rewrote the shared `shell()` in `lib/email/templates.ts` from a `<div>` layout to a **table-based, fully-inline-styled** email shell: a branded **masthead** (a new azure paddle-glyph PNG at `public/email-logo.png`, served from `${SITE_URL}/email-logo.png`, alongside a live-text "Paddle to Water" Georgia-serif wordmark, so it stays branded with images blocked), an explicit **dark-mode** `<style>` media query (owns the palette instead of leaving clients to auto-invert), and a restructured footer with the safety line boxed. Both emails now carry an azure eyebrow kicker + a large bold headline; the alert's good-window sits in a teal callout (length + wind + launch tip), the pro-tip gets an azure `Pro tip:` lead-in, and the extra spots render as a titled "Also good today/soon" card instead of a run-on sentence. Copy (editor): confirm fine-print merged to one line ("At most one email a day, only when a spot's good to paddle. Didn't sign up? Ignore it: nothing happens."), dropping the "unsubscribe any time" filler now that the footer link is azure-prominent. Guardrails preserved byte-identical: CAN-SPAM postal, visible unsubscribe (both parts), item-34 safety line, `text/plain` twin, 7 rotating headlines + 5 technique tips. New CSS class `ptw-card-good` (not `-calm`) to avoid the template's no-"calm" copy guard. **Photo hero deferred** (kept out of scope: adds CC-attribution/IP + images-off complexity). Verified: 47 template tests (6 new redesign guards) + 354 suite green, build clean, lawyer verdict `clear`, and rendered headlessly in **light and dark** (Playwright) plus the prod logo asset returns `200 image/png`. **Real email-client rendering (Gmail/Outlook/Apple Mail, images-off) is the owner's final check**, the loop can't send-and-inspect a real inbox; send yourself a confirm email to eyeball it.

**Owner-reported 2026-07-18.** The emails are "unappealing, no visual or picture of logo, only paragraph after paragraph of words of similar color." Grounded in `lib/email/templates.ts`: the shared `shell()` (lines 50-64) wraps BOTH emails (confirm + alert) and it is all `<p>` text blocks in two colors, dark ink `#0B2A47` and muted `#556A7E`, with the azure CTA button (`#0E6FD1`) the only accent. There is **no logo/brand image anywhere** (the "Paddle to Water" wordmark exists only as plain footer text), and **no hosted logo asset exists in `public/`** to drop in, so one has to be produced. Both the confirm email (`composeConfirmEmail`) and the daily alert (`composeAlertEmail`) share this shell, so fixing `shell()` + the block styles fixes both.

**This is a design-lead + editor pass.** Route it through both: design-lead owns the visual system, editor owns the words. Concrete direction (design-lead refines):
- **Brand header:** a real masthead with the Paddle to Water wordmark/logo at the top. Needs a **hosted image asset** (create one; `public/` has none email-ready) referenced by absolute URL, plus a **text wordmark fallback** so it still brands with images off (see constraint below).
- **Visual hierarchy + color:** break the wall of same-color paragraphs. Use the Meltwater palette's accents (azure, and the water-type teal/rust/azure coding already in `lib/types.ts`) for structure, not just dark + muted. Give the headline, the window/hours, the pro-tip, and the "also good" list distinct visual weight instead of near-identical `<p>`s.
- **Reuse the spot photo (nice-to-have):** alert emails could embed the spot's own photo (item 31/56 assets, `getSpotPhoto`) as a hero. If so, it MUST carry the CC attribution the app renders (IP), and it MUST NOT be load-bearing (images-off fallback below).
- **Editor:** the copy is already house-clean (7-variant rotation, no em dashes), so editor's job is tightening for the new layout and writing any new brand/masthead microcopy, not a full rewrite.

**Email-specific hard constraints (this is why it needs designer scrutiny, not a quick HTML swap):**
- **Client compatibility:** email HTML is not web HTML. Use table-based layout + fully inline styles (Gmail/Outlook/Apple Mail), not the current div-and-flex approach, or it breaks in real inboxes. Test the rendered HTML in a real client, not just a browser.
- **Images are blocked by default** in most clients, so **nothing load-bearing can be an image**: the logo needs `alt` text and a text fallback, a hero photo must degrade to a clean text email. Design the images-off state deliberately.
- **Dark mode:** many clients invert or recolor; do not rely on a light `#EEF5FB` background surviving. Check the dark-mode render.
- **Keep in sync + keep the guardrails:** the `text/plain` twin (`textFooter` + each `text` field) must stay in sync with any HTML change; keep the CAN-SPAM postal address + the visible unsubscribe link (legal, D5) and the "guidance only, not a safety guarantee" safety line (item 34); keep `lib/email/templates.test.ts` green (update it for new structure). No em dashes.
- If the redesign touches anything legally load-bearing (new footer claims, the safety line, image rights), run the lawyer gate.

**Acceptance:**
- Both emails render with a branded masthead (logo image + text fallback), clear visual hierarchy, and more than two text colors, verified in at least one real email client (light AND dark), and with images OFF.
- `text/plain` twin still in sync; CAN-SPAM postal + visible unsubscribe + safety line all still present; `templates.test.ts` green; no em dashes.
- design-lead + editor sign-off before send; if a hosted logo/hero image is added, it is committed to `public/` (or a stable host) with alt text and an images-off fallback.

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

## 86. [done] The `reviews` kill switch now reaches the spot list (deployed 2026-07-22, e610d05)

**Found by the lawyer re-gate on item 85 (2026-07-22), independently verified in code.** The `reviews` kill switch exists to pull user-generated content in a hurry, `ReviewsSection.tsx:47-50` says so directly ("this is the surface most likely to need pulling in a hurry (UGC)"). It does not cover the list.

Verified:
- `components/SpotDrawer.tsx:76` reads `const reviewsOn = useKillSwitch("reviews")` and **line 234 gates the crowd data**: `const crowd = spot && reviewsOn ? aggregates[spot.id] : undefined;`
- `components/SpotList.tsx` **never calls `useKillSwitch` at all**, and passes `crowd={aggregates[spot.id]}` ungated at **lines 147, 173 and 195**.
- `components/SpotCard.tsx:36` then does `displayRating(spot.owner_rating, crowd)`, so the crowd value genuinely changes the number rendered on the card.

**Consequence.** Flip the `reviews` switch off and: the sheet stops blending, `ReviewsSection` returns null, the reviews and the Contributor Terms link disappear. But **every card in the list still shows a number that incorporates published contributor ratings**, still labelled as our take, with no reviews visible and no route to the document that explains the blend. In the exact incident the switch is for (a named marina objects, a defamatory or spam review lands), the owner would flip it, believe contributor input was pulled, and be wrong.

**Fix (small, and make it drift-proof):**
- Add `const reviewsOn = useKillSwitch("reviews");` to `SpotList.tsx` and pass `crowd={reviewsOn ? aggregates[spot.id] : undefined}` at all three call sites, matching `SpotDrawer.tsx:234`.
- Add a guard test asserting **both** consumers gate identically, so the two cannot drift apart again. This is the second time a UGC guard has needed pairing (see `eefa4cf`, "gate-required copy must be guarded when it ships").
- Verify by flipping the flag: with `reviews` off, no card in the list shows a blended number, and the number falls back to the owner rating alone.

**Shipped 2026-07-22.** All three `SpotList` card sites now gate on `useKillSwitch("reviews")`, matching `SpotDrawer`. **Verified behaviourally, not just structurally**, by forcing the flag off locally (reverted immediately after): Rollins Lake renders **3.9 with no attribution** when off, and **4.2 "our take, combining our own rating with 2 paddler reviews"** when on. Guard asserts both consumers read the same flag and that no ungated survivor remains. The pre-existing "gives EVERY card the review totals" guard asserted the old literal, so its intent was preserved and its string updated rather than deleted, and the per-card count stays owned by that one test rather than duplicated.

## 87. [done] Two small follow-ups from the item-85 lawyer re-gate (deployed 2026-07-22, a89f037)

**From the same re-gate (2026-07-22). Both minor, both cheap.**

**(a) The now-bare Contributor Terms link fails WCAG 2.2 target size.** Item 85 removed the sentence around the link, so the anchor became the only content of its own paragraph at `text-xs` with no padding, roughly a 16px-tall hit area (`components/ReviewsSection.tsx:207-213`). WCAG 2.2 SC 2.5.8 wants 24x24 CSS px. The "inline" exception used to cover it precisely *because* it sat inside a sentence, and that sentence is what item 85 deleted. This repo already treats target size as live (`components/zoom-control-target-size.test.ts`). Fix: make the anchor `inline-block` with vertical padding so the box clears 24px, e.g. add `inline-block py-1`.

**(b) Amend item 85's recorded rationale, it is broader than the position that actually holds.** As written it says the connection "fails the Endorsement Guides materiality test in the direction of 'disclosure not required'", which taken literally would authorise deleting the WRITER-side disclosure too. The defensible position is narrower and depends on three artifacts continuing to exist: the `{DISCLOSURE}` rendered above the assent box (`components/ReviewForm.tsx:164`), the string in `lib/markCopy.ts:70-71`, and the marks paragraph in Contributor Terms section 2. Reword to "disclosed at the point of writing and in the linked terms, so no in-line reader disclosure is required", and name those three as not removable without a fresh gate. Doc-only, no code change.

**Shipped 2026-07-22.** (a) `inline-block py-1` takes the anchor to a measured **24px** box, verified in the browser locally and on prod rather than inferred from the classes. (b) Rationale narrowed in item 85 above. **Deliberately NOT left doc-only:** the three artifacts the narrower position depends on are now asserted in `components/reviews-killswitch.test.ts`, because a dependency recorded only in prose is exactly how the item-83 reader disclosure came to sit unguarded and get deleted without breaking a test.

## 81. [done] Every page now serves exactly one `<h1>` (deployed 2026-07-22, 0f2ac73)

**Found by the 2026-07-21 radical journey harness.** Measured with a direct fetch, **zero `<h1>` elements** on the home page and on spot pages, on **both local and production**:

```
/            -> <h1> count: 0     (local and paddletowater.com)
/spot/1      -> <h1> count: 0     (local and paddletowater.com)
```

**There is a documentation drift here, do not assume this is already done.** ROADMAP items 63 and 64 both describe the spot title as "the `<h1>`" ("the same name repeats immediately below as the large `<h1>` title", "spot name renders once (the `<h1>`)"). The code does not match: `components/SpotDrawer.tsx:438` renders that title as **`<h2 id="spot-sheet-title">`**. The standalone spot page (`app/spot/[id]/page.tsx:62`) then adds another `<h2>` ("More paddleboard spots in {region}"), so the outline is h2 -> h2 with no h1 above it.

**Why it matters:**
- **SEO across 139 spot pages, which are the entire organic growth plan.** The strategy section notes growth is ~82% direct and the spot pages are "too new to rank"; shipping them all without an `<h1>` removes the strongest on-page topical signal exactly where ranking is the goal.
- **Accessibility.** Screen-reader users navigate by heading level. With no `<h1>` there is no top-level document heading, and starting an outline at `<h2>` breaks the expected hierarchy.

**Fix (small, but needs two decisions):**
- **Standalone `/spot/[id]`:** the spot name should be the `<h1>`. Promote the `SpotDrawer.tsx:438` title from `<h2>` to `<h1>` **when it is rendering as a page** (not when it is the home-page dialog). Keep `id="spot-sheet-title"` intact, `aria-labelledby` on the dialog points at it.
- **Home page:** it needs its own `<h1>`. The visible wordmark is an interactive control, so design-lead should decide between styling a real heading or adding a visually-hidden `<h1>` carrying the site's purpose (something like "Paddleboard and kayak launch spots in the SF Bay Area"). Do not put a second `<h1>` on the page when the drawer is open as a dialog.
- Keep exactly one `<h1>` per rendered page in every state (home, home-with-drawer, standalone spot, 404).

**Acceptance:** `/` and `/spot/<id>` each expose exactly one `<h1>` in the served HTML (verify by fetch, not by inspecting React), the dialog's `aria-labelledby` still resolves, heading order is h1 -> h2 with no skips, and the 139 spot pages all carry the spot name as their `<h1>`. Add a test that fetches a couple of routes and asserts the `<h1>` count, so this cannot silently regress again.

**Shipped 2026-07-22, and this item's own fix instruction was wrong.** It said to promote the drawer's `spot-sheet-title` from `<h2>` to `<h1>`. That would have changed nothing a crawler sees: the drawer mounts CLIENT-side after an effect selects the spot, so `/spot/1` served exactly one heading (the sr-only "More paddleboard spots in {region}" h2) and no `spot-sheet-title` at all. The acceptance line, "verify by fetch, not by inspecting React", is what caught it.

The h1 is therefore **server-rendered by the page component**: `app/spot/[id]/page.tsx` renders the spot name above the existing nav h2, and `HomeClient` renders the site-purpose h1 gated on `initialSpotId === undefined` so a spot page never serves two. `sr-only` in both cases: on a spot page the visible title arrives with the drawer moments later, and on home the wordmark is a button while the tagline is `hidden lg:inline`, so promoting either would have produced an h1 that is `display:none` for most users. The drawer title stays `<h2 id="spot-sheet-title">`, so the dialog's `aria-labelledby` still resolves.

**Verified live by fetch:** `/`, `/spot/1`, `/spot/33`, `/spot/120` each serve exactly one h1, carrying the spot name on spot pages. `/privacy` and the 404 already had one and were untouched.

## 76. [parked] Tablet (md, 768-1023px) map sliver: real, cosmetic, and ~2% of traffic does not justify a slot

**Found by the 2026-07-19 verify loop while verifying the item-"desktop card 1.5x wider" change (`0fe5758`).** That change is correct and verified (drawer 320px at md, 479px from lg, map 224px@1024 / 480px@1280 / 640px@1440, no horizontal overflow at any width). This item is about the **map pane at md**, which the commit deliberately left alone.

**Measured at 768px (iPad portrait) with a spot open:** list 320 + map **128** + drawer 320. At 128px the map cannot do its job (you see 2-3 pins and clipped label fragments, no spatial orientation), yet it still consumes width the list and drawer could use. Screenshot confirms it reads as a broken sliver, not a map.

**Concrete defect inside it:** the map pane's own footer links overflow that 128px pane, "Disclaimer" (right 461) and "Privacy" (right 522) extend past the map's right edge and are clipped behind the drawer. **Severity is limited**: the SAME links also render un-clipped in the list-panel footer (right <=249), so legal/policy access is NOT blocked; this is a visual defect, not an access problem. At 1024px (map 224px) nothing clips.

**Options (design-lead's call, all reasonable):**
- At md with a spot open, overlay the drawer on top of the map instead of squeezing it into the flex row.
- Or hide the map pane entirely at md-with-spot-open and give the width to the drawer.
- Or fall through to the mobile full-screen sheet behaviour at md.
Whatever is chosen, the map should either be usable or absent, never a 128px sliver, and the map-pane footer links must not clip.

**Weigh before building:** this is tablet-only (768-1023px) and does not affect phone or desktop, so check whether tablet traffic justifies it before spending a slot. It is filed so the measurement is not lost, not because it is urgent.

**Acceptance:** at 768px and 1023px with a spot open, the map is either usable or intentionally hidden, no clipped footer links in the map pane, no horizontal overflow, and phone (390px) + desktop (>=1024px) layouts are unchanged.

**PARKED 2026-07-22, after doing the traffic check this item asked for.** The measurement was re-confirmed first, so nothing is lost: at 768px with a spot open the map pane is still exactly **128px** (ends at x=448) and its footer links still run to 461 and 522, clipped behind the drawer. The list-panel copies sit at right <=249, so legal access is genuinely not blocked, exactly as filed.

**Why parked rather than built.** This item told the next reader to weigh tablet traffic before spending a slot. Weighed, from `reports/analytics-2026-06-09.md` ("Mobile 28 users, Desktop 8, Tablet 1") and `reports/analytics-2026-06-27.md` ("77% mobile, 21% desktop, 2% tablet"): **tablet is ~2% of traffic**, and the affected band is narrower still, since it is 768-1023px with a spot open, i.e. portrait tablets only (landscape iPad is >=1024px, where the map is 224px and nothing clips). A cosmetic defect on a fraction of 2%, against an explicit instruction to check first, is not a slot.

**If it is ever picked up, the cheapest correct fix** is the second of the three options already listed: at `md` with a spot open, hide the map pane and give its width to the list and drawer. That removes the dead sliver and the clipping in one change, and leaves phone and desktop untouched. Unpark it by editing this line back to `[ready]`.

## 73. [done] Custom 404 page: a stale/hidden spot link dead-ends on the bare Next.js 404 with no way back (deployed 2026-07-20)

**Shipped 2026-07-20 (studio loop).** Added `app/not-found.tsx` (App Router convention), so `notFound()` from `spot/[id]` (hidden ids like 54/79 and out-of-range ids) and any unmatched route now render a branded page instead of the bare Next.js default, keeping the real 404 status (no soft-200). Meltwater palette + house fonts (Newsreader heading, Hanken body), the paddle-mark masthead linking home, a "404" eyebrow, one friendly shared line ("We couldn't find that spot. The link may be old, or the spot was taken down. The rest of the map is still here."), and an azure `Browse all spots` CTA to `/`. Copy claims no region/count (spots span beyond the Bay Area; a hardcoded number would drift). Verified LIVE on paddletowater.com: `/spot/54`, `/spot/99999`, and a bogus route all return HTTP 404 with the branded content; a valid spot still 200; the CTA navigates home. 418 tests (6 new grep-guard, incl. a no-em-dash assert), lint + tsc + `npm run build` clean (`/_not-found` prerendered static). No legal surface (cosmetic page, no data/claims/privacy). Deployed `a74ce60`.

**Found by the 2026-07-19 verify loop.** There is no `app/not-found.tsx`, so every 404 renders the bare Next.js default. Confirmed on production for `https://paddletowater.com/spot/54` (spot 54, just hidden via D26): a centered "404 / This page could not be found." with **no branding and zero links** in the body (an anchor grep returned nothing). The user hits a dead end with no path back to the app.

**Why it matters (not a cosmetic nit):** these URLs are hit by real people, not just typos:
- **Hidden spots** now 404: spot 54 (D26) and spot 79 (fabrication) return this page, and any spot hidden in future will too.
- **Stale shared links.** Growth is word-of-mouth (strategy section: ~82% direct), so shared `/spot/<id>` links ARE the acquisition channel. A link shared before a spot was hidden/renumbered lands a prospective user on a dead end with no CTA.
- **Search-engine cached** URLs to removed/renumbered spots.

A branded 404 with a "browse all spots / back to the map" CTA recovers these arrivals instead of bouncing them, and it is squarely on the retention/acquisition goal.

**Fix (small, design-lead sign-off on copy + look):**
- Add `app/not-found.tsx` (App Router convention; it catches `notFound()` from `app/spot/[id]/page.tsx` and unknown routes) styled in the Meltwater palette + house fonts, with the Paddle to Water masthead.
- One friendly line (a hidden/removed spot and a genuine typo can share copy, e.g. "We couldn't find that spot.") and a primary CTA link to `/` ("Browse all spots" / "Back to the map"). No em dashes.
- Keep it a real 404 status (Next's not-found already returns 404); do not soft-200. Verify `/spot/54`, `/spot/99999`, and a bad route all render the branded page with a working home link, and still return HTTP 404.

## 70. [done] Full-screen mobile spot sheet is now an accessible dialog: focus move + trap + restore, role, inert background (deployed 2026-07-20)

**Shipped 2026-07-20 (studio loop).** The full-screen mobile sheet is now a proper modal dialog, scoped to the `forceFull` (kill-switch-ON mobile) branch ONLY, so the desktop side panel (a persistent non-modal region beside the map/list) is untouched, verified live at 1280px: no `role=dialog`, no `aria-modal`, no inert. On the mobile full-screen branch (`components/SpotDrawer.tsx`): `role="dialog"` + `aria-modal="true"` + `aria-labelledby` on the panel (pointing at the spot-name `<h2 id="spot-sheet-title">`); on open, focus moves into the sheet (the container carries the dialog name, so AT announces the spot); on close, focus restores to whatever opened it (list row / map pin), guarded by `document.contains`; Tab/Shift+Tab are trapped within the sheet; the background siblings under HomeClient's root get `inert` while open (the backdrop is skipped so tap-to-dismiss survives, the panel is skipped). Escape-to-close and every existing dismiss path unchanged. No analytics event (a11y semantics on an existing surface, not a new interaction); no legal surface. Verified LIVE at 390px (dialog role/label present, focus moves in, 18 Tab presses stay inside and never land on an inert element, Escape closes + clears inert + returns focus to the opener row) and on paddletowater.com; 424 tests (6 new grep-guards, incl. a "desktop stays non-modal" assert that there is exactly one `role:"dialog"` and it sits inside the `forceFull` branch), lint + tsc + build clean, zero console errors. Deployed `99ac3de`.

**Found by the 2026-07-18 verify loop.** Items 63/64 made the mobile spot sheet a viewport-covering surface (`position:fixed; inset:0`, `components/SpotDrawer.tsx` panel ~line 224), but it is not marked or managed as a modal dialog. Measured at 390px, opening a spot from the list:
- **No `role="dialog"` / `aria-modal="true"`** on the sheet (grep of `SpotDrawer.tsx` confirms none), so a screen reader is never told a dialog opened.
- **Focus is not moved into the sheet** on open. It stays on the list row behind, so a keyboard user's focus is on content now hidden under a full-screen surface.
- **Focus is not trapped.** Tabbing leaks to the list behind the full-screen sheet on the first Tab. The user tabs through invisible content they cannot see, with no way to tell where focus is.

Escape-to-close already works, and the × back button has a label, those parts are fine. The gap got worse when the sheet went full-screen: with the old peek sheet the list behind was partly visible, so leaked focus was less disorienting; now the sheet covers everything, so tabbing "behind" it is a real trap (WCAG 2.4.3 Focus Order, 4.1.2 Name/Role/Value, and the modal dialog pattern).

**Scope: the full-screen MOBILE sheet only.** The desktop drawer is a persistent side panel, not a modal (the map + list stay interactive beside it), so it should NOT get a focus trap; do not change desktop behavior.

**Fix (standard modal-dialog pattern):**
- Add `role="dialog"` + `aria-modal="true"` + `aria-labelledby` pointing at the spot-name heading, on the full-screen sheet container (kill-switch-ON / `forceFull` branch only).
- On open, move focus into the sheet (the back button or the sheet container); on close, restore focus to the element that opened it (the list row / map pin).
- Trap Tab / Shift+Tab within the sheet while open.
- Make the background inert while the sheet is open (`inert` on the app shell, or `aria-hidden`), so AT and Tab cannot reach the covered list/map.
- Keep Escape-to-close and the existing dismiss paths. Verify at 390px with a keyboard (focus stays in, Escape closes, focus returns) and ideally a screen reader.

**Acceptance:** opening a mobile spot sheet moves focus into it, traps Tab within it, exposes it as a modal dialog to AT, and returns focus on close; desktop side-panel behavior unchanged; no console errors.

## 69. [done] Alert email grammar: "a 8-hour window" now reads "an 8-hour window" (a/an agreement on the window length, deployed 2026-07-20)

**Shipped 2026-07-20 (studio loop, owner-requested).** Added `indefiniteArticle(n)` to `lib/email/templates.ts` (returns "an" for numbers spoken with a leading vowel, 8/11/18 and the 80s; "a" otherwise) and fed it into `fill()` as `{a}` (and `{A}` for the sentence-initial weather-nerd variant) rather than hand-editing 16 strings. Replaced the hardcoded article before `{lengthHours}-hour` in the 4 affected variants (baseline, friendly-local, weather-nerd, pencil-it-in); the other 3 phrase it without an article. One placeholder covers the body + preheader and the HTML + text/plain twins (they share the variant strings), so a future variant can't re-introduce the bug. 6 new tests (an 8-/11-hour, a 3-hour regression, capitalized "An 8-hour run" sentence start, and a guard that "a 8/11/18" never renders); 430 tests total, lint + tsc + build clean. Not a gated path (email copy, not cron/send behavior); no legal element touched (unsubscribe, postal, safety line all unchanged). Deployed `09c4dce`. Real-inbox rendering across clients is the owner's final eyeball per the email-verification convention, but the rendered strings are asserted in the suite.

**Found by the 2026-07-18 verify loop, rendering the redesigned alert email (item 68).** 4 of the 7 alert copy variants hardcode the indefinite article "a" before "{lengthHours}-hour", so an 8-hour window (common) renders "**a 8-hour window**", and 11- or 18-hour windows would read "a 11-hour" / "a 18-hour". English wants "an" before those (they start with a vowel sound: eight, eleven, eighteen). Confirmed visible in the shipped email render.

Occurrences in `lib/email/templates.ts` (`bodyNoWind` / `bodyWithWind` / `preheaderNoWind` / `preheaderWithWind` each): **baseline** (lines ~200-204, "about a {lengthHours}-hour window"), **friendly-local** (~224-228, "a {lengthHours}-hour stretch"), **weather-nerd** (~260-264, "A {lengthHours}-hour run"), **pencil-it-in** (~272-276, "a {lengthHours}-hour window"). The other 3 variants (plain-report, hours-first, your-watchlist) phrase it without an article and are fine.

**Fix (small, editor + a helper):**
- Add a tiny `indefiniteArticle(n)` helper (returns "an" for numbers spoken with a leading vowel: 8, 11, 18, 80-89, ...; "a" otherwise) and feed it into `fill()` as an `{a}`/`{A}` placeholder (capitalized form for the sentence-initial weather-nerd variant), rather than editing 16 strings by hand and re-introducing the bug on the next variant.
- Keep it in both the HTML and the `text/plain`/preheader paths (they share the same variant strings, so one fix covers all).
- Add a unit test asserting an 8-hour and an 11-hour window produce "an" for each affected variant; `lib/email/templates.test.ts` is the home. No em dashes.

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

## 61. [done] Cold-open "good to paddle today" ranked surface (deployed 2026-07-23, ff15d41)

Shipped the pull-based cold-open discovery surface: a third pinned section in the list panel (Watching -> **Good to paddle today** -> Recently checked) ranking the nearest spots that still have a calm daytime window left today, each with a live paddleability badge, tappable into the drawer. Zero enrollment, install or permission grant, the move both the ceo and product-visionary named for retention (D34's pull-first argument). A first-time / one-and-done visitor now gets an immediate "where's good today?" answer instead of a cold map of dots.

**Architecture (reuses the item 100 hourly plumbing).** New pure `lib/goodToday.ts`: `evaluateGoodToday` reuses `evaluateGoodWindow` (the SAME calm-window bar as the cron and drawer, so the section never contradicts the drawer it opens into) and flags good-today only when the soonest window's `windowKey` is today's spot-local date; `selectGoodToday` ranks nearest-first / calmer-first, calm-only, never padded to a row count. Bounded fan-out: `useGoodToday` fetches ONE cached hourly payload per candidate via the shared `getHourlyPeriods`; the candidate set is the nearest K=8 to the user, or to the map's default center (`GOOD_TODAY_ANCHOR`) when geolocation is not granted, deduped against Watching + Recently checked. Four honest states (loading skeleton, ranked rows, "Nothing's calm nearby right now.", and a distinct "Couldn't check conditions right now." only when every candidate's fetch errored); the section hides entirely when there is no candidate to check.

**Legal gate: needs-changes -> resolved.** "Good to paddle today" is the app's affirmative "conditions are good" representation on a NEW surface, so it now co-renders the canonical caveat "Guidance only, not a safety guarantee. Conditions shift fast on the water." under the header, verbatim, exactly as the push/email/panel/install surfaces do. Guarded by a test so a later edit can't drop it. (The guard lives in `components/good-today-section.test.ts`, NOT in `lib/alerts/no-inducement.test.ts`, because the predeploy path gate treats any `web/lib/alerts/*` change, including a test, as a send-path change and would gate the deploy.)

Behind the `good-today` kill switch (default ON, no A/B, DAU<100). New dwell-gated INTENT `good_today_shown` (count, located) + `good_today_clicked` (spot_id, region) + changelog. Adversarial verifier PASS (698 tests, +19; protected files untouched, no coordinate changes; ran a good-today-definition mutation the tests caught). Design brief by design-lead (placement/copy/states); the `/ship` PRD workflow was skipped (it hard-fails on its schema, see item 100). Verified live on prod, desktop + mobile, with real NWS data: the section ranked 3 calm rows, the caveat co-rendered under the header, clicking a row opened the drawer with a matching Right-Now verdict, and a clicked spot moved from good-today into Recently-checked (dedup). Escalation E1 (a mobile map-tab banner, since mobile opens on Map and the list is one tap away) is a possible fast-follow, not built.

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

## 92. [done] Statewide framing: the brand is California (deployed 2026-07-22, 764378a)

**Prerequisite for item 90 (LA) and for item 45 generally.** Found while verifying the first LA candidates: the records are ready and cannot be added, because the product is Bay Area by construction.

- **`REGIONS` in `lib/types.ts` is a closed enum** (South Bay, Peninsula, East Bay, San Francisco, North Bay, Sacramento, Sierra Nevada, Central Valley, Central Coast). There is no value an LA spot could take. This is the hard blocker; the rest is copy.
- **`app/layout.tsx`**: title "Paddleboard & Kayak Spots in the Bay Area", description "across the SF Bay Area and Northern California", and keywords including "paddleboard spots SF Bay Area", "SUP launch Bay Area", "kayak launch spots Bay Area", "Bay Area water sports".
- **Header tagline** and the **`<h1>`** added in item 81 both say "across the Bay Area".

**Decisions for the owner, this is a brand question not just a string change:** is the product now "California", or "Bay Area + LA", or does it stay Bay-first with a second region badge? The answer changes the title, the h1, the OG image copy, and the region filter's shape (9 regions is already a lot of pills at 390px; adding SoCal regions needs a design call, possibly grouping).

**Watch the SEO trade.** The current title ranks, or is meant to rank, on Bay Area terms across 139 spot pages. Broadening the wording dilutes that signal for the 139 in exchange for a signal on 4 new LA spots. **Do not broaden the per-spot titles until the LA set is large enough to justify it**; the site-level title and the region enum are the parts that must change first.

**Acceptance:** a spot outside the Bay Area can be added with a valid region; the site title, description, keywords, tagline and `<h1>` no longer claim a coverage area the data contradicts; the region filter still fits at 390px without wrapping; `npm test`, lint and build pass; no existing `lat`/`lng` changes.

## 96. [done] Statewide close-out: the last 5 CCC launches, 4 more refusals (deployed 2026-07-22, 8b4ba2f)

**This closes the CCC sweep. California-wide the source publishes 30 paddle-specific launches, and all 30 are now either shipped or refused with a stated reason. 177 records.** Full analysis: `reports/oc-ingest-2026-07-22.md` and the LA/SD reports.

**Shipped:** Stone Lagoon and Hookton Slough (**new North Coast region**), Hooper Beach at Capitola and Morro Bay State Park Marina (Central Coast), Marina Park in Ventura (**new Ventura region**). Morro Bay State Park Marina is the spot the owner asked for by name on 2026-07-22.

**Refused, and the reasons are the reusable part:**
- **Stillwater Cove** and **Leffingwell Landing**: imagery shows exposed Pacific with white water breaking across rock, and Stillwater's pin is 400 m inland in forest. The Malibu class.
- **Harbor Beach, Santa Cruz**: it **is** spot 123, Santa Cruz Harbor, 0.42 mi away and already described as the protected harbour launch. **The 500 m dedupe threshold passed it because the threshold answers "how far", not "is this the same launch".** Second occurrence of the duplicate-name failure after Folsom Lake (item 58).
- **Humboldt Bay NWR**: imagery shows the refuge headquarters, managed wetland impoundments and trails, no open water. Hookton Slough 2 mi south in the same refuge is the real put-in.

**Two fields a blanket default would have got wrong.** **Stone Lagoon is `tide_sensitive: false`** and `difficulty: flatwater`, because it is a barrier lagoon closed to the ocean. Every other coastal record in these batches is `true`; defaulting this one would have shown it a tide it does not have, sourced from Humboldt Bay 40 mi away. **The conditions engine cannot tell a wrong `true` from a right one, so the per-record judgment is the only control.**

**Tides:** added Ventura, Santa Cruz and Hookton Slough, each confirmed against the datagetter first. Hookton Slough gets its **own** station 0.6 mi out, the closest match in the app. **NOAA publishes no Morro Bay station at all**, so Morro Bay falls back to Port San Luis 13 mi south: the honest best available, now written down in `conditions.ts` rather than rediscovered later. Worst station distance across all 177 records is now 20.9 mi (Buckley Cove, a pre-existing Delta spot).

**Finding for the owner, not fixed here:** the region filter is now **14 chips** in a horizontally scrolled row (`scrollWidth` 1610 vs 359 client on a 375 px viewport). No layout break, the page itself does not scroll sideways. But the SoCal regions sit at the **far end** of that scroller because `REGIONS` is ordered Bay-Area-first, and SoCal is the stated target market. Reordering is a product call, so it is filed rather than done.

## 95. [done] Orange County ingest: 7 spots live, 4 candidates refused (deployed 2026-07-22, a62f640)

**172 records total.** Full analysis: `reports/oc-ingest-2026-07-22.md`.

**Orange is the richest county CCC has produced:** 11 paddle-specific launches vs San Diego's 6 and LA's 2, almost all in Newport Harbor. Shipped Channel Place Park, Lido Park, 10th Street Beach, Montero Beach, Bayside Drive County Beach, China Cove Beach, Baby Beach.

**Coordinate corroboration was the best of any batch, and it corrects a standing rule.** Newport is well mapped in OSM, so 4 of 7 CCC pins land **within 41 m** of an independently mapped beach and are fine as stored. The statewide inventory's "CCC coordinates are always locators, always re-derive" was too pessimistic. **Corroborate every pin and re-derive only the ones that fail.** Blanket distrust costs work and invites replacing a good coordinate with a hand-estimated one.

**Four refused, each on an established precedent:** Balboa Island (pin mid residential block, nearest beach 358 m; an island is not a put-in, the "3 miles of frontage" case); Upper Newport Bay Ecological Reserve (pin 2,092 m from any water feature); Newport Island Park (imagery at 245 m shows housing and no water, so no put-in was invented); **Newport Aquatic Center** (CCC `FEE=Yes`, a membership facility with its own dock, i.e. the **spot 92 pattern**, the one failure class that has already reached production).

**THE TRAP THIS BATCH NEARLY WALKED INTO.** Orange County had no tide station, and **it would not have failed**: Los Patos sits 9 to 12 miles away, inside `MAX_STATION_MI`, so every Newport spot would have shown a confident tide reading **taken from a different harbor**, and item 94's brand-new coverage test would have passed. Added Newport Bay Entrance and Balboa Pier (confirmed against the datagetter first); spots now resolve from 0.1 to 2.6 mi. No pre-existing spot changes station.

**The lesson upgrades item 94's.** That one: a gating boolean needs a test that it can be honoured. This one: **the test's threshold is a floor, not a definition of correct.** "In range" and "relevant" are different claims and only the first is mechanically checkable. Applies anywhere a distance cut stands in for a quality judgment.

**Also fixed:** British spellings ("harbour", "neighbourhood") written into the notes here and in the already-live San Diego batch. Notes-only edit, no coordinate churn.

**Open for the owner** (in the report): is North Star Beach public separately from the Aquatic Center; where people actually put in on Upper Newport Bay; whether a specific Balboa Island beach should ship; and whether 6 spots inside one harbor reads as clutter.

## 94. [done] San Diego ingest: 16 spots live, and the tide fix the batch exposed (deployed 2026-07-22, 297c367)

**Shipped 165 records total.** 5 paddle launches (El Carmel Point, Playa Pacifica, Crown Cove, Agua Hedionda, La Jolla Shores) + the 11 boat ramps the owner asked to include. Cardiff State Beach excluded as recommended.

**The method changed mid-item, because the owner asked "have you tried something more sophisticated" and the honest answer was no.** Google Places was ruled out on licensing (its terms bar use near a non-Google map and cap coordinate caching at 30 days; this app is Leaflet + CARTO and stores coordinates permanently). **USGS aerial imagery, public domain, is the answer and should have been first.** Every dataset here publishes a *site locator*; a put-in is a physical feature you can see. Four of the five coordinates the owner was asked to look up were readable off imagery in about a minute each. **Reach for imagery before asking a human to look something up.**

**`has_fee` is deliberately asymmetric, and this is the durable rule.** CCC's `FEE` was caught wrong at Agua Hedionda (a Carlsbad permit is required). So CCC `Yes` -> `true`, CCC `No` -> `null`, never `false`. We do not tell someone a launch is free on the authority of a field that has already lied in exactly that direction.

**THE FINDING THAT MATTERED MOST WAS NOT IN THE SPEC: 20 spots were asserting tide sensitivity while the conditions engine ran blind on them.** Every SoCal spot is `tide_sensitive: true`, and `TIDE_STATIONS` stopped at Port San Luis, so all 16 San Diego spots **and the 4 LA spots shipped two days earlier** resolved "no tide station near this spot". The differentiator was dark on the entire new region and **every gate passed**: lint, 582 tests, build, and the LA deploy. Nothing tied the flag to the coverage it implies. Found only by reading a rendered page.

- 13 SoCal stations added from NOAA's own `tidepredictions` metadata, each confirmed to return hi/lo from the same endpoint `/api/tides` proxies. **No pre-existing spot changes station**, so no comparability break.
- **`/api/tides` validated `station` as `\d{6,8}`.** Mission Bay is served by *subordinate* stations whose ids are not numeric (`TWC0413`), so the regex would have 400'd seven of these spots into silence with no error anyone would see. Replaced with an allowlist built from `TIDE_STATIONS`, which is **strictly tighter** than the regex it replaces.
- A coverage test now fails if any `tide_sensitive` spot has no station in range, and it was **proven to bite**: removing the new stations fails it by spot name.

**The lesson, and it generalizes past tides:** a boolean that gates a feature is a claim, and a claim needs a test that it can be honoured. `tide_sensitive` joins the list of load-bearing booleans (2026-07-16 sweep) that were wrong in a way no gate could see. **Ask what silently degrades when a region expands, not just what fails.**

<details><summary>Original analysis and lookup list (superseded by the above)</summary>

Full analysis: `reports/sd-ingest-candidates-2026-07-22.md`.

**San Diego is the better county, as the statewide inventory predicted.** 197 CCC records, 65 paddle-plausible, 17 with an explicit launch type, and **6 paddle-specific** (hand / kayak / small-craft) against LA's 2. Most sit in **Mission Bay**, which is protected, purpose-built for watersports, and the densest paddle water in the state. None is within 500 m of an existing spot.

**Tier 1, strongest candidates found in any county so far:** **El Carmel Point** (Mission Bay, "Bay beach, kayak launch"), **Playa Pacifica** (Mission Bay, typed `Kayak Launch`), **Crown Cove** (Coronado, hand launch at the Crown Cove Aquatic Center).

**Tier 2, need a call:** **Agua Hedionda Lagoon** (protected, but see the fee finding) and **La Jolla Shores** (the iconic San Diego kayak launch, and genuinely open ocean; CCC's own description is "Swimming, surfing, diving").

**Tier 3, recommend excluding:** **Cardiff State Beach**, typed `Hand Launch` but described by CCC as "Swimming, **surfing**, surf fishing". The Malibu class from the LA batch.

**THE FINDING THAT CHANGES THE INGEST RULE: CCC's `FEE` field is wrong on the first candidate checked.** CCC records Agua Hedionda as `FEE = No`. A **Carlsbad city permit is required to be on the water** (~$9/day), plus a $10 launch fee from the California Watersports beach; a free public launch on Bayshore Drive avoids the launch fee but not the permit. This is precisely the SoCal failure mode the statewide inventory predicted: **records fail by staleness and access rules, not by drifting from a good source.** CCC's lineage is a 2014 guidebook and a later permit regime is invisible to it. Shipping `has_fee: false` would tell a paddler they can launch free when they would be on the water illegally.

**So `FEE` may NOT be carried from CCC unverified for San Diego.** It was safe in LA only because the owner confirmed each record. Store `null` over a value that cannot be stood behind.

**Coordinates are weaker here than in LA.** Two of three Overpass boxes returned 504, and the Mission Bay box shows no slipway within 400 m of any paddle-specific candidate (El Carmel Point 456 m, Playa Pacifica 1,322 m). Consistent rather than alarming, since a bay-beach kayak launch has no slipway to map, but it means **OSM cannot correct these and they need the owner's eyes.**

**The 11 boat ramps** (6 in Mission Bay, 5 on San Diego Bay, plus Oceanside Harbor) are all protected water, but **the owner's LA precedent was to exclude the Fiji Way ramp** because a trailer ramp is not obviously somewhere a paddler is welcome. That precedent should settle these as a category.

**Acceptance:** only owner-confirmed records ship; `FEE` is verified per record or stored `null`; each coordinate is a put-in, not CCC's locator; `BT_FACIL_TYPE` used verbatim; `precompute_gridpoints.py` re-run in the same change (item 90's lesson); `spots.json` edited text-level, never reserialized (item 90's other lesson); no existing `lat`/`lng` touched.

</details>

## 90. [done] LA County ingest: 6 spots live, first coverage outside the Bay Area (deployed 2026-07-22, 67d150a)

**Owner-directed 2026-07-22: start statewide expansion with LA.** Full analysis and the lookup list: `reports/la-ingest-candidates-2026-07-22.md`.

**What the source actually yields for LA.** 230 CCC records, 37 flagged `BOATING=Yes`, **51 paddle-plausible after filtering, of which only 11 carry an explicit launch type**. None is within 500 m of an existing spot, so all 11 are genuine coverage. Field completeness is the reason to use this source at all: **FEE 50/51, PARKING 51/51, RESTROOMS 50/51, ADA 51/51**.

**Ingest from the 11, NOT the 51, and this is a safety call rather than a data-quality one.** The other 40 are overwhelmingly **Malibu open-ocean surf beaches and cliff-stairway accesses**: El Matador, El Pescador, La Piedra, Leo Carrillo, Point Dume, Broad Beach, Carbon Beach, Lechuza, and five separate Puerco Beach stairways. Exposed Pacific with shore break, several reachable only by bluff stairs. CCC catalogues coastal ACCESS; it never claimed these were launches. Listing them as put-ins on a site carrying drowning-risk exposure is the "ingested a good source and lost what it meant" failure in its purest form.

**A useful refinement to the statewide coordinate warning.** The inventory's "20 of 20 CCC coordinates are not put-ins" test was run on hand/kayak/**beach**-launch types. Checked against OSM slipways here, two boat-ramp-typed records (**Cabrillo Beach Boat Ramp**, **South Shore Launch Ramp**) sit **4 m** from a mapped slipway, i.e. their coordinates are good. **The coordinate risk is concentrated in the hand and beach launches, which is exactly where this app's best spots are.**

**The 11:** Mother's Beach (MdR), Fiji Way ramp (MdR), King Harbor (Redondo), Cabrillo Beach + Cabrillo Beach Boat Ramp (San Pedro), South Shore Launch Ramp, Long Beach City Beach, Belmont Shore, Alamitos Bay, Marine Park, Marine Stadium (all Long Beach).

**BLOCKED ON THE OWNER**, per `reports/la-ingest-candidates-2026-07-22.md`, section A and B:
- A put-in coordinate for 7 of the 11 (3 unknown because the Marina del Rey Overpass box timed out twice; 4 have no slipway within 400 m).
- **Cabrillo Beach is ambiguous by name**: the inner harbour beach is protected and the outer is open ocean. That distinction decides whether it is safe to list at all.
- Access rules **no dataset carries**: permits, launch fees beyond parking, event closures at Marine Stadium, whether the Fiji Way ramp is trailer-only, and Cabrillo's water-quality advisory history. CCC has **no ownership or access field**.
- `tide_sensitive` is **published by no source**, and it gates the conditions engine.

**OWNER ANSWERED 2026-07-22 (`reports/la-ingest-candidates-2026-07-22.md`).** Four are verified and ready: **Mother's Beach MdR** (54 m from CCC's pin), **King Harbor** (moved 401 m to the hand launch), **Cabrillo Launch Ramp, inner** (66 m from a mapped OSM slipway, best-corroborated of the set, and the inner-vs-outer safety question is resolved as inner), and **Marine Park** (106 m; confirmed to be Mother's Beach Long Beach). Three excluded by the owner: the Fiji Way ramp, plus Long Beach City Beach and Belmont Shore, which are "3 miles of frontage" rather than put-ins. Still open: Marine Stadium's coordinate (access confirmed, coordinate not given), the Alamitos Bay identity question (the owner's point is **1,388 m** from CCC's record, which sits at the San Gabriel River mouth, so they are two different places), and `tide_sensitive`, which no source publishes.

**NOW BLOCKED ON ITEM 92, not on the owner.** The app has no valid region for an LA spot: `REGIONS` in `lib/types.ts` is a closed enum ending at Central Coast, and the title, description, keywords, header tagline and the new `<h1>` all say Bay Area. Shipping LA records under that banner would make the site's own copy false and aim the SEO signal at the wrong region.

**FIRST FOUR SHIPPED 2026-07-22 (`764378a`), together with the California rebrand so the site never claimed coverage it lacked:** Mother's Beach (Marina del Rey), King Harbor (Redondo), Cabrillo Beach Launch Ramp (San Pedro, inner harbour), Marine Park / Mother's Beach (Long Beach). All four verified live with NWS conditions via LOX gridpoints.

**Two guards earned their keep during this ingest, record both:**
1. **Reserializing `spots.json` rewrote 580 lat/lng lines.** Exactly the failure CLAUDE.md documents. Reverted and redone as a text-level append: 72 insertions, 0 deletions, 0 coordinate lines touched. **Never `JSON.stringify` this file.**
2. **New spots have no NWS gridpoint until `scripts/precompute_gridpoints.py` is re-run**, so they would have shipped with no conditions, which is the app's differentiator. A test caught it. **Adding any spot requires re-running that script in the same change.**

**COMPLETE 2026-07-22 (`67d150a`).** Marine Stadium shipped at the owner's coordinate (547 m from CCC's pin but **121 m from a mapped OSM slipway**, which is the stronger signal), with paddling confirmed permitted outside sanctioned events. For Alamitos Bay the owner said to use their point, so **CCC's record at the San Gabriel River mouth did not ship**; theirs is 1,388 m away and is a different place, so it is named **"Alamitos Bay - Bayshore Beach"** per the existing water-then-launch convention rather than inheriting CCC's name for somewhere else. The owner also corrected CCC's fields there: fee No, parking Yes, restrooms Yes, against CCC's no-to-all-three.

**Final LA set: 6 spots** (Mother's Beach MdR, King Harbor, Cabrillo Beach Launch Ramp, Marine Park, Marine Stadium, Alamitos Bay - Bayshore Beach). 149 records total. **Next SoCal region: San Diego, 40 CCC candidates and the densest paddle water in the state.**

**Acceptance:** only the verified set is ingested; every record carries per-field provenance; `BT_FACIL_TYPE` is used verbatim and never upgraded into "ramp"; each coordinate is a put-in verified against a second source; each is cross-checked against DBW's `Open To` for public/private; no existing `lat`/`lng` changes; data guards and `npm test` pass.

## 88. [parked] Lake Tahoe Water Trail: a proven-model registry for one region (one input to item 45's statewide scope)

**CLASSIFICATION DONE, INGEST DEFERRED (2026-07-22). Report: `reports/item-88-tahoe-watertrail-classification.md`.** The item's cheap high-information first step is delivered: the LTWT IS field-complete like the Bay Water Trail (validates item 45's Sierra premise), and the gap is real and large, not mostly-MERGED (partial count: 3 CARRIED of 13 nameable, 10 genuine gaps, ~24 more sites locked in per-segment Google My Maps embeds). The **Sand Harbor pin lead is RESOLVED with no change**: our #11 pin is the swimming beach (a real paddle put-in); the OSM slipway 582m north is the separate trailered-boat ramp, not a correction. **Ingest deferred per the report's recommendation:** Tahoe is a 2-4hr drive from the Bay-Area-heavy user base, so ~30 imagery-verified records serve trip-planning, not the daily-decision use retention is built around; do the expensive half when statewide coverage or the trip planner (item 93) is the active priority. North Shore cluster is the highest-value narrow ingest if wanted sooner. Owner can promote back when Tahoe reach matters.

**Found 2026-07-22, answering the question item 45 actually asks.** Item 45 is `[blocked(no-source)]` because step 1 is "identify an authoritative, field-complete registry for the target region", and none had been found outside the Bay. The search that produced that block had mined exactly ONE registry (SF Bay Water Trail, now spent) and disqualified one (DBW). The Sierra, Delta, Valley and coast had not been searched at all.

**The [Lake Tahoe Water Trail](https://laketahoewatertrail.org/lake-tahoe-water-trail-map-guide/) is the same structural thing as the Bay Water Trail:** a designated route around the 72-mile shoreline publishing **37 public launch and landing sites** and **20 signed trailheads** with restrooms and parking, plus segment maps. That is the field-completeness the Bay registry provided, which is the only reason the item-40/45 rigor was possible.

**The gap is large and in a region already partly covered.** We carry **4 Tahoe records** (11 Sand Harbor, 14 Fallen Leaf, 15 Waterman's Landing, 103 Kings Beach) out of 14 Sierra Nevada records total, against 37 published sites.

**Do this the way the Bay was done, not the way spot 79 was done:**
- Classify every published site CARRIED / MERGED / GENUINE GAP first, as `reports/item-45-watertrail-gap.md` did. Publish the counts before adding anything. If the yield is mostly MERGED, that is item 40 work again, not new records.
- **The parking-vs-dock trap applies here too and is the known failure mode.** The Bay Water Trail publishes the parking coordinate, not the dock, which is how spots 127/130/132 got their pins. Assume Tahoe does the same until proven otherwise. Coordinates must be the put-in.
- Per-field provenance on every record. A guessed boolean is worse than an absent one: `tide_sensitive` is meaningless on Tahoe (set it `false` from the source, not by inference) but `has_fee`, `inspection_required` and `rentals_available` are all real and all commonly wrong. **TRPA requires an aquatic invasive species inspection before launching**, which is already reflected in records 14 and 103 and will apply broadly.
- Notes say what the source says. Do not upgrade a beach carry-in into a ramp.

**Weigh before building:** this is 37 candidate sites in a region that is a 2-4 hour drive from the Bay Area user base, and the app's traffic is overwhelmingly Bay Area. Coverage there may serve trip planning rather than daily use. Classify first (cheap, high information), then decide whether to ingest.

**Pin lead found 2026-07-22 by the OSM sweep (`reports/osm-discovery-sweep-2026-07-22.md`), handle it inside this item:** OSM carries a slipway named "Sand harbor" (`node/4320621468`) **582 m north** of our spot 11 pin, with a second unnamed node at 574 m. That is the parking-vs-dock fingerprint from spots 127/130/132. Do NOT move the coordinate on OSM's word alone; the Water Trail-equivalent Tahoe source should settle it, and a coordinate change is gated (D19/D23).

**Acceptance:** every published Lake Tahoe Water Trail site is classified with counts published in a report under `reports/`; any record added carries per-field provenance and a put-in coordinate verified against a second source (OSM slipway/beach node or the site's own map); `npm test` and the data guards pass; no existing `lat`/`lng` changes.

## 45. [blocked(no-source)] Expand coverage: ALL of California, SoCal first (RESCOPED AGAIN 2026-07-22 by owner directive; was Northern California)

**OWNER DIRECTIVE 2026-07-22: the target is now ALL of California, not Northern California, and Southern California is the priority because that is where many target customers are.** This changes the item's shape twice over. The 2026-07-16 rescope concluded "no registry exists for the rest of NorCal"; that conclusion was reached having searched exactly ONE registry (SF Bay Water Trail) and disqualified one (DBW), with the Sierra, Delta, Valley and coast never searched at all. It was an honest finding about the Bay registry being spent, but it was never a statewide search. Treat it as such.

**Two leads already verified 2026-07-22, and they show why per-site checking is not optional:**
- **Olde Port Beach, Avila Beach (owner lead): REAL.** Free drive-down beach launch, Port San Luis Harbor District, [DBW f/1082](https://dbw.parks.ca.gov/BoatingFacilities/f/1082). A genuine candidate.
- **461 Machi Rd, Whitethorn (owner lead): NOT A LAUNCH.** It is a private residence, a 3-bed house sold in 2023. (492 Machi Rd is the Shelter Cove RV Campground.) Ingesting it because it was named would be the spot-79 failure exactly. If the intent was Shelter Cove, that is a different, real place and needs sourcing on its own.

**THE STATEWIDE SOURCE INVENTORY IS DONE: `reports/ca-source-inventory-2026-07-22.md`.** Sources were measured, not taken at their word (full pulls of the CCC corpus, the DBW registry, the federal RIDB export, and a statewide Overpass sweep). This item is **no longer blocked on finding a source. It is blocked on a decision about coordinates.**

**The answer to "is there a registry":**
- **CCC YourCoast is the statewide field spine.** 1,575 records, **127 uncovered SoCal candidates** (LA 37, SD 40, OC 23, SB 17, Ventura 10), and the fields arrive populated: 126 of 127 have `FEE` answered, 121 have restrooms, 69 carry an explicit launch type, 59 ship a photo.
- **Its coordinates are not put-ins.** 20 of 20 SoCal records typed as a hand/kayak/beach launch reverse-geocode to a parking lot, a road, a private house, a playground, a cafe. **That is the 127/130/132 defect pre-loaded at 127x scale**, and it is the whole risk of this item.
- **There is no SoCal water trail.** SF Bay, Tahoe and Humboldt have one; nothing south of Santa Barbara. SoCal cannot reach Bay evidence quality from one source, so it needs a pairing: CCC for fields, OSM for the ramp geometry (235 SoCal slipways; 31 of the 127 are within 400 m of one), DBW plus the operator page for legality and freshness.

**Owner leads, answered:**
- **visitcadelta.com: NOT USABLE.** A tourism gateway with no per-site fields, no coordinates, and a 404 on its boat-launch URL. Real Delta value is DBW plus the county park operators.
- **DBW: re-evaluated and PROMOTED to candidate generator**, with two new reasons the sweep missed. It is the **only** source with an ownership field (`Open To`: public / private / club / guests), which is the direct control for the spot-92 private-dock failure, and the **only** source covering inland SoCal (Castaic, Pyramid, Perris, Silverwood, Big Bear, Salton Sea, Colorado River). It also types **47 statewide facilities as "Aquatic Center / BISC", DBW-funded non-motorized paddling centres**, which nobody has looked at. Unchanged: it publishes **no coordinates at all**, it registers motorized/trailered facilities, and a DBW type must never be grounds to hide a spot.
- **"Search boat ramp / state park / lake / beach": not viable as stated**, for three reasons with receipts. It has no access signal (it returns spot 92's private dock and Lake Arrowhead, a private lake with zero public launches, as confidently as Mother's Beach) and no freshness signal (Varner Harbor at the Salton Sea is closed to vessels and still ranks first). The defensible inversion: search **confirms** a record a registry produced, by reaching the operating agency's own page for a named site. It never produces records.
- **Morro Bay, Yosemite and NPS generally: operator pages, not registries.** Authoritative for restrictions, useless for discovery.

**What acceptance must now carry, from the inventory's own findings:**
- **Every CCC record is re-pinned before it ships.** Treat `LATITUDE`/`LONGITUDE` as a display locator, never as `lat`/`lng`.
- **Use `BT_FACIL_TYPE` verbatim.** The source already distinguishes `Hand Launch` from `Boat Ramp`; upgrading one into the other is defect 47/120 exactly.
- **`tide_sensitive` is published by NO source** (not CCC, DBW, OSM or RIDB). It gates the conditions engine and was already wrong on 36 bay spots. Ingesting 127 tidal SoCal sites without a rule for it scales that defect.
- **SoCal needs an operator confirmation per record, not just a registry ID.** The CCC lineage is the 2014 Coastal Access Guide, so records are 12-20 years old, and SoCal water is a patchwork of city, county, harbour district and private ownership that no dataset encodes.
- **Two legal-gate items before any ingest:** CA State Parks GIS is licensed "commercial uses must be approved by CSP in advance" (a blocker for PaddlePass), and OSM is ODbL with share-alike attaching to a derived database if its coordinates enter `spots.json`.

**On "just search boat ramp / state park / lake / beach":** that is a candidate generator, not a source, and on its own it IS the geocode-and-trust step that produced spot 79 and the parking-vs-dock pins. It is fine as a way to build a list to verify; it is not fine as a way to fill `spots.json`. Every record still needs per-field provenance and a put-in coordinate, whatever produced the lead.

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

## 44. [done] Optional sign-in to sync spots and alerts across devices (now REQUIRED for reviews per D24; ships before item 43)

**Email sign-in VERIFIED WORKING 2026-07-21 (`43996f8`).** Bringup took three wrong turns before the real cause: Supabase's **Email OTP Length is a server-side setting (6-10) and this project's is 8**, while `SignInSheet` hard-coded `maxLength=6`, so a real code `61452941` was truncated to `614529` and every verify legitimately failed with "Token has expired or is invalid". Fixed by accepting 6-10 digits (submit unlocks at 6) and dropping the "6-digit" copy. The two earlier fixes were harmless and remain: the callback now surfaces `?auth_error=` instead of failing silently, and `verifyOtp` tries email/magiclink/signup since Supabase issues a different type for existing vs new addresses. LESSON: never mirror a server-configurable value as a client constant, and diff what the screen displayed against what the code received before theorizing about the backend.

**EMAIL-FIRST REVISION SHIPPED + LIVE 2026-07-21 (`319de1e`).** Owner corrected the default: sign-in leads with an emailed 6-digit code, Google is secondary below an "or" divider, Apple slots in when Apple Dev enrollment lands. A TYPED CODE, not a magic link, because a link opens in whatever browser the mail app picks (an in-app webview on mobile), landing the session where the user is not, and half this audience is an installed PWA; a test asserts `emailRedirectTo` is never set so nobody turns it back into a link. New `SignInSheet` modal carries the item-70 dialog semantics (role=dialog, aria-modal, labelled, focus in, Escape, focus restored). Analytics: `account_sign_in_started`/`_completed` now carry `method: email|google` so the two paths are comparable (changelog entry with comparability note). Fixed a regression I introduced: the added header control pushed BOTH the wordmark and the button onto two lines at 375px, so the control is icon-only under `sm` and the wordmark is nowrap + `text-lg` on mobile; verified no wrap/overflow at 375 and 1280. Signed-in state no longer one ambiguous "name Sign out" pill. Owner config prerequisites, both done: Supabase custom SMTP -> Resend (sender `login@alerts.paddletowater.com`, the VERIFIED domain; the root `paddletowater.com` is receive-only via Cloudflare and would have been rejected by Resend) and the Magic-link/OTP template rewritten to `{{ .Token }}`. Verified live on prod: sheet opens, email field first and focused, "Email me a code" primary, Google secondary, no console errors, header intact. 447 tests (+7). PROCESS LEARNING (owner): read the item SPEC and question its baked-in assumptions, do not just follow DECISIONS; "Google" came from item 44's own spec line and email was never put on the option menu.

**Google/web half SHIPPED + LIVE 2026-07-21 (`6371df1`).** Sign-in is enabled in production and verified live: the Sign in control renders in the header, the Supabase project URL is inlined in the shipped bundle, and clicking Sign in reaches Google's real consent screen with NO redirect_uri_mismatch / invalid_client / access-blocked error, which confirms the OAuth client id and redirect URI are correct. Migration verified applied via PostgREST (`user_saved_spots`, plus `user_id` on `push_subscriptions` and `email_subscriptions`). `/auth/callback` responds 307 and `POST /api/account/link` correctly returns 401 to unauthenticated callers. FALSE START worth remembering: the first deploy shipped inert because the `NEXT_PUBLIC_SUPABASE_*` vars were scoped to Vercel Preview only, not Production; NEXT_PUBLIC_* are inlined at BUILD time, so fixing the scope required a REDEPLOY, not just a settings save. VERIFIED END TO END 2026-07-21: owner signed in with a real Google account, session created, header shows the account name + Sign out. Migrate-on-sign-in confirmed against Supabase: `user_saved_spots` gained the device's saved spot. Subscription claim correctly no-opped because that browser had no push/email row under its `anon_id` (3 push + 3 email rows remain anonymous, belonging to other devices); the claim is PER-DEVICE by design, so signing in on the phone is what links the phone's push subscription. TWO REAL BUGS FOUND AND FIXED DURING BRINGUP, both worth remembering: (1) the first deploy shipped inert because `NEXT_PUBLIC_SUPABASE_*` were scoped to Vercel Preview only, and NEXT_PUBLIC_* are inlined at BUILD time so a settings save alone does nothing, a REDEPLOY is required; (2) the OAuth callback originally discarded the error from `exchangeCodeForSession` and fell through silently on a missing code, making a FAILED sign-in indistinguishable from a successful one. Fixed to redirect with `?auth_error=` and log server-side, which is what then diagnosed the two real config faults in minutes: the Supabase Redirect URLs allow-list was missing `https://paddletowater.com/**` (so no code ever reached the callback), and then the Google client secret in Supabase was rejected at the token-exchange step. Env-gated + behind the `accounts` kill switch, so with no `NEXT_PUBLIC_SUPABASE_*` env the whole feature is inert and the app is byte-identical to today (verified live: no Sign in button, no console errors; and with fake public env the Sign in button renders). Contents: `supabase/migrations/20260721_accounts.sql` (`user_saved_spots` + `user_id` links on push/email subs, RLS; hand-applied, PROTECTED, NOT run); `@supabase/ssr` browser + server-auth clients; `/auth/callback`; `useAccount` hook + header `AccountButton`; `POST /api/account/link` migrate-not-reset (claims this device's still-anonymous push/email rows + uploads localStorage saves, idempotent, verifies caller, never steals another account's); analytics `account_sign_in_*` + `setPersona(signed_in)`, no `identify()`, changelog + privacy-policy updated. Google-only (Apple half deferred to Apple Dev enrollment). 440 tests (+11), lint + tsc + build clean. **Lawyer gate: `needs-changes` -> code items fixed** (privacy `LAST_UPDATED` bumped, Supabase processor bullet corrected, anon_id-from-body noted as a low-risk hardening follow-up). **NOT merged to main on purpose: the privacy-policy change must not go live before sign-in is actually active.**

**DEPLOY is blocked on the OWNER (not the loop):**
1. Create the Google Cloud OAuth client; put `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` (and the Google provider client id/secret in Supabase Auth) in the deploy env.
2. Two lawyer pre-enable actions: (a) account-deletion runbook, **DRAFTED 2026-07-21 at `docs/legal/account-deletion-runbook.md`**, still needs the owner's one end-to-end test on a throwaway account (that test is what makes the privacy-policy deletion promise true); (b) point the OAuth consent screen at `https://paddletowater.com/privacy` with scopes limited to email/profile.
3. Apply `supabase/migrations/20260721_accounts.sql` in the Supabase SQL editor (PROTECTED, owner-reviewed).
Then: merge `studio/item-44-google-auth` to main, set `LAST_UPDATED` to the real go-live date if it drifts from 2026-07-21, and deploy (that deploy activates sign-in + the privacy disclosure together). The Apple half (D28 Q2b) is a later follow-up once Apple Developer enrollment lands.

**D28 RESOLVED (2026-07-20).** Stack = Supabase Auth (Google provider + RLS). Providers = Google + Apple (Q2b), but the Apple half is gated on the still-pending Apple Developer Program enrollment (native runbook), so BUILD THE GOOGLE/WEB HALF FIRST and layer Apple when enrollment lands. Analytics: `anon_id` stays primary, never `identify()`, account via `setPersona` (mandated). Migration-not-reset: first sign-in links existing `push_subscriptions` (via `user_id` FK) + uploads localStorage saves to `user_saved_spots`; add a `users` table (Supabase schema = owner-reviewed at deploy). Deploy prerequisites: (1) owner-provided Google OAuth client id + secret in env, (2) auth lawyer-gate `clear` (privacy-policy update for the new PII), (3) Apple enrollment for the Apple half only. The loop may build the Google/web + Supabase-Auth + migration code now (mocked-auth tests) and escalate the DEPLOY for the real credentials + lawyer gate.


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

## 8. [done] "Go here instead": nearby calmer alternative when your spot is blown out (deployed 2026-07-23, 45954af)

Shipped the vision's signature moat promise as an in-drawer redirect: when the OPENED spot has no calm daytime window left today, the drawer surfaces up to 2 nearest spots that DO, each a tap-through. Answers the "Crissy is blown out, go to Richardson Bay instead" case for the ~half of conditions checks that land on a breezy/windy spot and used to dead-end. The pull-first, 2nd-visit move D34 prioritized; item 61 (cold-open list) was the first of the pair, this is the in-drawer second.

**Architecture (the item 61 machinery, anchored to the opened spot).** New pure logic reused: `evaluateGoodToday`/`selectGoodToday` over the shared `getHourlyPeriods` cache, with `evaluateGoodWindow` as the good-enough bar (the SAME calm-window definition as the cron, the drawer, and item 61, so a recommended alternative never contradicts its own drawer verdict). New `useGoodTodaySignal` gates on the OPENED spot being blown out (`!goodToday`); candidates are the nearest K=8 to THAT spot via `nearbySpots`, distances spot-anchored, fetched only when blown out (bounded fan-out). Renders between Today's-shape and Looking-ahead (the redirect outranks the come-back-later option), above the one foot disclaimer which co-renders (item 100/61 lawyer-gate placement, guarded by a source-order test). `SpotCard` rows with a "Calm {window}" caption when an alternative is calm later today rather than now, so a Breezy pill never reads as a broken promise. Hides entirely when the spot is fine or nothing nearby is calm. Tap-through swaps the drawer (source "related") and resets scroll to top.

**Legal: CLEAR** (no changes). The block sits above the panel's existing unconditional safety disclaimer, so the co-render requirement item 61 established is met by placement, no separate caveat; the lawyer noted a redirect toward calmer water, on the same bar, reduces liability rather than adding it. Behind the `go-here-instead` kill switch (default ON, no A/B, DAU<100). New dwell-gated INTENT `alt_suggested_shown` + `alt_clicked` (with `from_spot_id`) + changelog. Adversarial verifier PASS (707 tests, +9; protected files untouched, no coordinate changes). Design brief by design-lead; `/ship` PRD workflow skipped (its schema bug, see item 100). **Live-verified with real NWS data:** blown-out Calero County Park offered Coyote Lake (14.3 mi) + Hooper Beach (18.2 mi), both Calm; tap-through swapped the drawer to Coyote Lake; a spot with no calm neighbors (Aquatic Park Cove) correctly showed nothing, proving the honest-hide gate. Item confirmed live in the prod bundle.

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

## 82. [proposed] Social layer: profile headshot, leaderboard, adding friends (PLACEHOLDER)

**Owner-added 2026-07-21 as a placeholder.** Deliberately not specced yet. Capture the idea now, size it later.

The idea: turn the app from a solo tool into something with people in it. Profile **headshot**, a **leaderboard**, and **adding friends**.

**Gating (why it sits here, not in the active backlog).** The vision already sequences this: community "is deferred until there are retained users to seed it. Habit first; community is a consequence of habit." Retention is the current #1 goal and is not yet proven, and a leaderboard with nobody on it is worse than no leaderboard. Do not promote before the retention read. The one prerequisite that now exists is identity: optional Google sign-in shipped (item 44).

**Flags to respect when this is actually specced, so it does not get under-scoped:**
- **Headshot = user-uploaded images.** Storage, plus a real moderation path. Item 75 already established that moderation cannot depend on a bounceable email. Assume abuse (nudity, impersonation, other people's faces) and a lawyer gate: likeness, personal data, minors, and the privacy policy all move.
- **Leaderboard needs a metric that is real and hard to game.** Ranked on what? Paddles logged depends on trip logs, which are still a "Later" bullet above and do not exist. Also weigh the incentive: this is a safety-adjacent product, and a ranking that rewards going out more is a nudge toward paddling in worse conditions. That is a product-safety question, not just a design one.
- **Friends = a social graph on a location app.** Whom you paddle with, where, and when is sensitive. Needs privacy defaults (opt-in, not opt-out), consent, blocking and reporting from day one, and another lawyer gate.

**Next step when promoted:** a PRD from product-visionary that picks ONE of the three to prove the appetite (friends and leaderboard both fail without a base of active users; headshot is the cheapest and least useful alone), plus a lawyer gate before any build.
- **Tide-window refinement** in the cron's "good window" evaluator (it ships wind-only).
