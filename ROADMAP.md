# Roadmap

**The single home for vision, strategy, and the backlog.** Do not create separate plan/roadmap/strategy docs; fold new product thinking into this file. (IMPROVEMENT-PLAN.md, ux-mobile-findings.md, and docs/strategy/ were consolidated here 2026-07-02 and deleted; full text in git history.) Implementation specs under `docs/superpowers/` are historical execution artifacts for shipped work, not roadmaps. This file is also the studio backlog.
<!-- studio:v1  (resumed 2026-07-07: deployed, both PostHog flags created, both experiments live. Only D1 still open, non-blocking.)  statuses: proposed | ready | in-progress | blocked(D<n>) | parked | done -->
<!-- The studio loop works the top-most [ready] item. Steer by editing statuses: promote [proposed] to [ready], demote to [parked], reorder. Shipped items move to the Shipped section with date + commit + deploy refs. -->
<!-- Pause everything by changing the marker above to studio:paused -->


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

- **Retention epic: conditions alerts (Stages A to D), shipped + live 2026-06-29.** Save a spot, install the app, get a capped daily web push when a watched spot has a calm window in the next 1 to 3 days. Stage A (Your Spots ranked by conditions), B (install/opt-in + service worker + push subscription), C (Supabase store + `/api/alerts/subscribe`), D (Vercel Cron watcher that sends). Spec: `docs/superpowers/specs/2026-06-27-retention-hook-design.md`; plans under `docs/superpowers/plans/2026-06-27-retention-hook-stage-{a,b,c,d}.md`.
  - **Unproven, watch the data before building more retention/premium:** opt-in grant rate (`alert_optin_result`), `alert_clicked`, and whether alerted users beat the 13 to 17% W1 baseline. As of 2026-07-01: 1 granted subscription (iOS standalone, 2026-06-30). **Re-check the save -> opt-in -> push -> return funnel around 2026-07-15 to 2026-07-22**; if saves are still ~2 users/week, fix the landing bounce (item 3) before iterating on alerts.
  - **Evaluator redesigned 2026-07-02:** the original day-period evaluator required the whole 6am to 6pm forecast max wind <= 8 mph, which never happens in SF Bay summer, so alerts could never fire. It now uses the NWS hourly forecast and alerts on >= 2 consecutive calm daytime hours (calm mornings count).
  - **Real-device test: complete.** Install + opt-in verified on a real iOS device 2026-06-30; subscription row confirmed in Supabase 2026-07-02; push confirmed landing and deep-linking to the spot on iOS 2026-07-03 (owner verified; copy well received). The full save -> install -> push -> return loop is now proven end to end for n=1. Cron moved 2026-07-02 from 13:00 UTC (6am PDT, woke sleeping users with a same-morning alert) to 02:00 UTC (7pm PDT / 6pm PST): with the hourly evaluator an evening send advertises tomorrow's window, which gives lead time to plan. Dry-run check: `curl -H "Authorization: Bearer $CRON_SECRET" "https://paddletowater.com/api/cron/check-conditions?dry=1"`.
- **Instrumentation pass, shipped + live 2026-06-29.** `spot_viewed` now carries `source: "list" | "map" | "deeplink" | "alert" | "related"` (canonical `SpotViewedSource` in `lib/analytics.ts`), and `alert_clicked` fires when the app opens from a push (the service worker tags the deep link `from=alert`). Outbound on Get Directions / Share was deferred (the `spot_action` click already captures intent; true "the link left" detection is fuzzy and low value).
- **Mobile UX conversion pass, shipped 2026-06 (branch `mobile-ux-fixes`, PRs #1 and #2).** Fixed the blockers from the 4-agent mobile audit: install banner no longer covers the drawer and dismissal persists in localStorage, Bay-default map with non-destructive pin selection, 44px save heart with first-run nudge, favorites hydration fix, map-tab empty state, place-name-first short search, partial-height draggable sheet, region-pill peek hint. Source docs (ux-mobile-findings.md, IMPROVEMENT-PLAN.md) retired 2026-07-02; still-open leftovers are backlog item 7.
- 2026-07-09 [done] Spot sheet: removed the "Report an issue" button (item 10). Dropped the low-traffic report link + its FeedbackModal wiring from the spot sheet; issue reports still route through the header Feedback button. Also fixed the disclaimer copy that pointed at the removed link and cleaned two em dashes there (house style). Verified live (sheet DOM + disclaimer). Merge `322b43b` (+ follow-ups `1a35fe8`, `05e3796`), deployed.
- 2026-07-09 [done] Spot sheet: re-weighted the CTAs for Save-first, Share-second (item 11). Save is now the full-width filled-azure primary (retention target), Share the outlined secondary (virality target), Get Directions + Photos demoted to a neutral row; saved state stays the soft-pink confirmed treatment. Shipped straight to 100%, NO A/B flag, per owner direction (DECISIONS.md D3, explicit exception to the flag policy: ~14 users/day can't power a test). Existing `favorite_toggled` / `spot_action` events unchanged; comparability note added (save/share rates rise, directions fall, as a layout effect from 2026-07-09, not organic). Verified live on prod (`/?spot=1`): Save filled primary, Share outlined secondary, Get Directions + Photos demoted. Deployed.

---

## Epic: repair the save -> install -> alerts funnel (2026-07-09 journey audit)

The retention loop (save a spot, install, enable web push) is discoverable at the top but breaks in the middle. Five findings from auditing the live flow, sequenced by impact-to-effort. Items 13 and 14 sit on the main path and are the priority; 15 and 16 overlap (re-ask cadence) and may be built together; 17 is OS-constrained polish. These repair an existing, already-shipped flow, so per the flag policy small fixes are exempt; where an item changes the core flow (13, 14) a flag is the data-lead's call, but instrumentation + a changelog entry is required for any event change regardless.

## 13. [done] 2026-07-10 Prompt is suppressed by the very Save button that should trigger it

**Shipped 2026-07-10.** `InstallPrompt` no longer returns null when a drawer is open; it renders even with the drawer open and anchors to the TOP so it clears the drawer's bottom Save/Share actions (the old "cover Get Directions" concern is moot, item 11 demoted it). So a save via the in-drawer primary CTA now surfaces the enable-alerts step at save time on both mobile (bottom sheet) and desktop (persistent sidebar). `alert_optin_shown`/`_result` unchanged; changelog notes the shown-rate rises as a fix, not behavior. Verified: 64 tests, lint, build clean; Playwright confirms the prompt is visible + top-anchored with a drawer open, and still bottom-anchored with none.

Highest-leverage fix. `InstallPrompt` returns `null` whenever a spot drawer is open (`drawerOpen`, `components/InstallPrompt.tsx:165`), a rule added so the banner never covered the drawer's Get Directions. But since the 2026-07-09 CTA reweight (Shipped item 11), the full-width primary "Save this spot" button lives inside that drawer (`components/SpotDrawer.tsx:310`). So a user who saves via the primary CTA sees nothing at save time: the banner appears only later, when they happen to close the drawer, its alert framing now detached from the save that earned it. On desktop the drawer is a persistent sidebar that may never close, so the prompt can sit invisible indefinitely. Net effect: the reweight quietly routed most saves into the one place the prompt refuses to render.

Acceptance: after a save, the enable-alerts step is visible at save time even with the drawer open (surface it inline in the drawer post-save, or allow the banner to render above the drawer without covering the primary actions). The old "hide over Get Directions" concern is now moot since Get Directions was demoted to a secondary row. Verify on both desktop (persistent sidebar) and mobile (bottom sheet). Existing `alert_optin_shown` / `alert_optin_result` events unchanged; changelog note that shown-rate will rise as a fix, not a behavior change.

## 14. [ready] iOS silently dead-ends after install

On iOS the banner gives manual Add-to-Home-Screen instructions ending "Open it from there to turn on alerts" (`components/InstallPrompt.tsx:214`). But on the next standalone launch `visible` starts `false` and only flips on a fresh `ptw:spotsaved` event (`components/InstallPrompt.tsx:64,111`), so the installed iOS user lands in the app and is never shown the enable-alerts step. They must save another spot to resurface it, with no hint that's required. iOS is the bulk of saves (owner's iOS PWA drove ~72% per the excluded-persons analytics), so this dead-end sits on the main path.

Acceptance: on a standalone launch, if there are saved spots and no active push subscription (`readStashedSubscription()` is null) and the user has not permanently opted out, auto-surface the "Enable alerts" step without requiring a new save. Do not re-prompt once granted or hard-denied. Reuse `alert_optin_shown` with a `trigger: "standalone_relaunch"` prop so the resurfaced prompt is distinguishable in the funnel; changelog entry for the new prop.

## 15. [ready] One dismiss kills the entire funnel forever, with no fallback entry point

`handleDismiss` writes `ptw-install-dismissed=1` (`components/InstallPrompt.tsx:131`) and `onSaved` early-returns on that key (`components/InstallPrompt.tsx:113`), and there is no other entry to alerts anywhere in the app (no bell, no settings, no re-ask). Dismiss the banner once, before understanding it, and alerts can never be enabled again on that device short of clearing storage. A single shared flag also gates both the install step and the separate enable-alerts step.

Acceptance: dismissal becomes a snooze, not a permanent kill (re-offer after N further saves or after a cooldown); decouple the install-dismiss flag from the enable-alerts flag so declining one does not silence the other; add a low-friction always-available entry point to enable alerts for users with saved spots (candidate: a small bell/"Alerts off" affordance on the "Your saved spots" section header in `components/SpotList.tsx:77`). Instrument the new entry point (`alert_optin_shown` with a `trigger` prop) and log dismissals with the snooze reason; changelog entry.

## 16. [ready] The alerts offer only ever fires on the first save

The prompt is triggered solely by the first `ptw:spotsaved` (`components/HomeClient.tsx:147` -> `components/InstallPrompt.tsx:111`). Someone who saves several spots on day one, dismisses, and returns engaged on day three is never re-asked, yet re-engaging returning users is the entire point of the loop. The offer fires exactly once, at the least-committed moment. Overlaps item 15's re-ask cadence; likely built together.

Acceptance: broaden the trigger so an engaged-but-not-subscribed user is re-offered alerts at a natural later moment (e.g. on a subsequent save once they hold 2+ saved spots, or on a return session with saved spots and no subscription), respecting the item-15 snooze/cooldown so it never nags. Cap frequency to avoid noise. Reuse `alert_optin_shown` with a `trigger` prop identifying the occasion; changelog entry. Decision to settle with item 15: the single re-ask cadence both items share, define it once.

## 17. [ready] iOS enable step is a wall of instructions with no tap target

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

## 9. [proposed] Conditions-first share: make the one working acquisition channel demo the wedge

*(Proposed by the studio 2026-07-05. Advisory: acquisition, not retention; sequence BELOW proving the alert loop, do not pull ahead.)*

Growth is 82% direct/word-of-mouth; Google sent 10 users and the 140 SEO pages are not ranking yet (`reports/analytics-2026-06-27.md`). Shares are the real distribution, but Share was used by 1 user / 3 events, and a shared link lands on a generic view that buries the differentiator. Per-spot OG images already exist (`app/spot/[id]/opengraph-image.tsx`). Make a shared deep-link open the recipient straight onto that spot's conditions view, so every share demos the one thing only we do.

Acceptance: Share produces a deep link that opens directly on the spot's conditions section; recipient arrivals attributable via `spot_viewed` `source: "deeplink"`; A/B flag (control keeps today's share); changelog entry for any prop change. Note: OG images are build-time static and can't cheaply embed live conditions, so the value is the landing behavior, not a live-conditions card. Advisory: sequence after the ~2026-07-15 retention read.

*(A third idea considered, inline paddleability dots on the list/pins, overlaps parked item 3 and should be folded there, not opened separately.)*

## 12. [proposed] (lower priority) Persistent bottom "dead band" on iOS mobile web / installed PWA

*(Owner-reported 2026-07-09; three fix attempts that day did not clear it. Lower priority, cosmetic.)*

A permanent sage strip (the `--bg` body background) sits along the very bottom of the screen on iOS, in the home-indicator zone, showing below the map, the list, and the open spot sheet. It is an installed-PWA / iOS-mobile-web artifact and does NOT reproduce in desktop Chrome (the shell fills correctly there), which is why it resisted blind fixes.

Attempts 2026-07-09 in the `app/globals.css` shell, none cleared it on-device: (1) the original `html,body { height:100% }` on a `position:fixed` body; (2) `100dvh`; (3) dropping the explicit height so `position:fixed; inset:0` defines the box (current prod state, commit 4cd984b). Known-good facts to build on: `viewport-fit=cover` IS in the rendered viewport meta; `public/sw.js` has no fetch/cache handler so deploys DO reach the device, BUT iOS keeps an installed PWA's page alive in memory, so a full force-quit is required to load new code (may have masked whether an attempt worked). Do NOT attempt a 4th blind CSS change. Next step: ship a device-only diagnostic (gate behind `?vh`) printing `screen.height`, `window.innerHeight`, computed `env(safe-area-inset-bottom)`, and standalone-vs-Safari; get one screenshot; THEN pick the fix (candidates: `-webkit-fill-available`, or a JS-set `--app-height` from `window.innerHeight`). No functional impact.

---

## Later (after retention is proven) — all [proposed], do not promote before the ~2026-07-15 funnel re-check

- **UGC content flywheel:** ratings, photos, trip logs, user conditions reports. The long-term moat and SEO-acquisition engine, but it needs retained users to generate content first.
- **Optional Google sign-in** to sync push subscriptions and saved spots across devices (the engine ships anonymous; this is the upgrade path).
- **PaddlePass premium tier:** alerts + multi-day forecast windows + offline, as the freemium paywall.
- **Community spot submissions** with admin approval.
- **Tide-window refinement** in the cron's "good window" evaluator (it ships wind-only).
