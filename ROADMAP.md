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

- 2026-07-17 [done, DEPLOYED] Item 7: four mobile-polish fixes. (A) geolocation-denied recovery now a visible inline message with aria-live, not a touch-invisible title tooltip (+ near_me_toggled outcome prop); (B) Leaflet zoom controls enlarged to a 44px HIG tap target, verified 44x44 live; (C) empty-state names search vs filters vs both and scopes the Clear button ("No spots match X" / "Clear search"); (D) the dev reload/NaN loop does NOT reproduce in real dev (5 trials), no speculative fix shipped. 316 tests (17 new), verified live. Marker clustering carved to item 51.

- 2026-07-17 [done, DEPLOYED] Item 40: record-accuracy audit. 3 two-source pin moves (64 Del Valle, 65 Jack London Sq, 134 Eden Landing lng-only) + 7 notes-justified tide_sensitive flips (1,25,29,39,41,44,51). Merged (3f9b6a2), 299 tests. Coordinate+tide diff awaits owner review before vercel --prod, because spot data feeds both alert crons. Report: reports/item-40-record-accuracy-2026-07-17.md.

- 2026-07-17 [done] Item 48: desktop filter pills no longer stretch to a fifth of the viewport (1ca79a3, deployed). FilterBar row 2 was `grid grid-cols-5` + `w-full` at every width, with no breakpoint: 278px pills on a 1408px bar vs 119px content-sized region pills one row up. Below md unchanged; from md it is a flex of content-sized pills. Row-2 class was duplicated 3x, extracted to `pillSm`. Measured before and after at 1440px and 390px.

- 2026-07-17 [done] Item 47: email subscribers no longer re-prompted to subscribe (f8322ed, deployed). Suppresses the email enrollment prompt at all 5 gates once the server ledger confirms the subscription; also strips the subscription token from the URL (it was leaking to PostHog on every email arrival) and widens the privacy purpose sentence. D18 resolved: shipped 100% unflagged as a bugfix, button allowed to hide (push dead-end deferred to item 49). Eligible population is 1 (the owner); shipped for denominator integrity, not user impact.

- 2026-07-16 [done] Item 38: fixed the app-wide Tailwind v4 bracket CSS-variable bug. Converted every `{prop}-[--token]` to the working parens form `{prop}-(--token)` across 10 component files (0 bracket forms remain in `.tsx`); legitimate arbitrary values like `z-[1200]` left untouched. Corrected the CLAUDE.md Theme section (it documented the broken bracket syntax as canonical) and a matching globals.css comment. Result: `text-(--muted)` now renders `#6E8598` (was dark `#0B2A47`), accent borders/text/backgrounds render azure `#0E6FD1`. Verified live: home 200, subtitle muted-gray and Feedback border azure on prod, 186 tests, build green, no layout shift (color tokens only). Shipped ISOLATED via cherry-pick onto a clean branch off main, because the working branch was entangled with a concurrent session's unrelated commits (see BRIEFINGS 2026-07-16). Deployed. A follow-up `--muted` body-text contrast question was raised (see below).
- 2026-07-15 [done, PART 3 FIX DEFERRED] Item 37: visual polish pass. **Part 1 (shipped):** the header search input and Feedback button now read as a deliberate pair, matched height (30px) and radius (8px), search border moved onto the `--border` token; and the Feedback button's azure CTA border was fixed to actually render (it used the broken Tailwind v4 bracket form and was rendering dark). **Part 2 (no-op, D12):** `theme_color`/`themeColor` were already azure `#0E6FD1`; owner chose to keep azure chrome + the pale header, so no change. **Part 3 (diagnostic only, D12):** added a `?vh`-gated device diagnostic (`components/ViewportDiagnostic.tsx`) printing screen.height / window.innerHeight / visualViewport height / computed `env(safe-area-inset-bottom)` / standalone-vs-Safari; absent without the param, z-9999 when present. The actual iOS dead-band FIX is deferred pending an owner installed-PWA `/?vh` screenshot (item 12, now folded into this item). Verified: 174 tests, build green, live-checked at desktop + 390px with no console errors, Feedback azure confirmed on prod, `?vh` overlay confirmed on prod. Branch `studio/visual-polish-pass`, deployed. Follow-up filed: item 38 (the bracket-syntax bug is app-wide, ~77 occurrences). Recorded in DECISIONS D12.
- 2026-07-15 [done] Item 36: launch-direction tip ("Head out toward the {expanded compass words} so the wind helps push you back") on the alert interstitial and the alert email body. Threads NWS wind direction (sampled at the calm run's peak-wind hour, matching `maxWindMph`) through the shared `evaluateGoodWindow` so both surfaces agree; pure `launchDirectionTip` helper with a 16-point abbreviation-to-words lookup, omitting the tip below 5 mph or when direction is variable/absent. Informational tip, not a safety instruction (item-34 framing intact). Shipped experiment-EXEMPT at 100% per **D11** (additive copy on existing surfaces; single-digit audience can't power an A/B); guardrail is `launch_tip_shown` on `alert_interstitial_shown` (now fires once after the window resolves, with an unmount-fallback so a fast dismiss can't drop the impression). Live-verified: interstitial rendered "Head out toward the northwest..." on real NWS data, 156 unit tests, no console errors desktop/mobile. Branch `studio/launch-direction-suggestion`, deployed. NOTE: the same deploy also carried the owner's pre-existing uncommitted WIP (FilterBar spot-count removed; Leaflet attribution collapsed to an info toggle in globals.css), now live and revertible.
- 2026-07-14 [done, FLAG OFF] Item 32: dual-CTA enrollment card (push + email at equal weight on installed/Android/iOS; iOS push = "Add to Home Screen"; desktop unchanged). Owner-approved Option B. Shipped behind the `enrollment-dual-cta` experiment flag, CONTROL is the live default so the retention read is undisturbed; OWNER FLIPS to treatment (100% or a bucket) in PostHog after the read. (PR #40, merge e95fc2c, deployed; treatment verified in-browser iOS+Android)
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

## Owner item, added 2026-07-17 (queued top-most on purpose)

## 54. [ready] Add the spot "Guerneville River Park" (Russian River, owner-rated, custom photos link)

**Owner item, 2026-07-17.** Add a new put-in on the Russian River at Guerneville. This is distinct from the existing spot 33 (Russian River - Johnson's Beach, also Guerneville); it is a separate launch with a dedicated boat ramp. Next free spot id is **150** (current max is 149).

**What the owner supplied (facts, do not embellish beyond them):**
- Location: `38.5001973, -122.9957117` (this is a verified owner-provided coordinate, so it is a valid `lat`/`lng` source per the coordinate-provenance rule).
- Owner rating: **4.8** (`owner_rating`, the item-39 hand-entered field, population of one; never render it with a review count or as an average).
- Owner's experienced description: high water through summer with lake-like tranquility, and a dedicated concrete boat ramp right beside the parking lot.

The "See photos" CTA uses the regular derived Google Maps search URL (`SpotDrawer.tsx:132`), same as every other spot. No custom per-spot photos link.

**Draft notes (evergreen, third-person, per the notes rule; owner to sanity-check):**
> A dedicated concrete boat ramp drops straight from the parking lot to the water, so the carry is short and easy. Through summer the Russian River here runs high and settles into a lake-like calm, one of the mellower flatwater stretches around Guerneville.

**Field values to confirm at build:** `region: "North Bay"`, `city: "Guerneville"`, `water:` follow the sibling naming convention (`"Russian River - Guerneville River Park"`), `difficulty: "flatwater"` (owner describes lake-like calm, not moving river), `tide_sensitive: false` (upstream freshwater, not tidal), `has_fee`/`power_boats`/`dog_friendly`/`inspection_required`/`rentals_available` left `null`/`false` unless a source confirms otherwise (do not guess).

**Acceptance:**
- Spot 150 added to `data/spots.json` via a **text-level edit** (do not `json.load`/`json.dump` the file, it reformats every coordinate and churns the diff; verify `git diff data/spots.json | grep '"lat"\|"lng"'` shows only the two new lines). Read through `lib/spots.ts`, never import the JSON directly.
- `owner_rating: 4.8` renders inline as the bare star+number in list and drawer (matches item 39's D21 treatment).
- The drawer's Photos CTA is the regular derived Google Maps search URL (no new field, no custom link). Confirm the `spot_action` `action: "photos"` event still fires.
- A new spot enters the sitemap, OG image builder, `generateStaticParams` (`/spot/150`), JSON-LD, and **both alert crons** (same surface list as item 50). Confirm the spot builds a page and is reachable, and that nothing about it is untrustworthy enough to warrant `hidden`.
- New user-facing content (a single additive record, not a flagged surface): keep it small; no schema change needed.
- Verify live after deploy: `/spot/150` renders, rating shows, Photos opens the derived Maps search.

---

## Verify-loop findings, added 2026-07-17 (end-to-end quality pass)

## 55. [ready] P0 mobile: tapping a list spot throws `Invalid LatLng (NaN, NaN)` and the conditions panel intermittently fails to render

**Found by the 2026-07-17 verify loop (mobile-priority pass).** On mobile, the Map panel is CSS-hidden (`display:none` via class `hidden`) while the List tab is active, but `MapView` stays mounted (`components/HomeClient.tsx:664`). Tapping a spot in the list changes `selected`, which fires `map.flyTo([spot.lat, spot.lng], ...)` in the `FlyTo` effect (`components/MapView.tsx:21`). Leaflet's `flyTo` derives the target center from the container's pixel size; on a zero-sized (hidden) map that math divides by zero and produces `(NaN, NaN)`, which Leaflet throws as an uncaught exception.

**Measured (390px, fast interaction that mirrors a real tapping user: load, tap List, tap a spot):**
- `Invalid LatLng object: (NaN, NaN)` uncaught pageerror in **6 of 6** trials.
- The "Conditions today" panel failed to render in **5 of those 6**. When the error did not fire (deliberate slow interaction with settle delays), conditions rendered fine.
- Desktop is unaffected (the map is never hidden), 0 errors across all trials.
- One fast trial left the page wedged (the List control never became tappable again within 30s), so the throw can also brick the view.

**Why it matters (P0):** mobile is the priority surface, and this intermittently blanks the conditions panel, the exact feature retention is betting on, on the primary "browse the list, tap a spot" path. It is timing-dependent, so it does not show in a slow manual click-through. This is almost certainly why item 7D's 5-trial "NaN loop" check came back clean: that check used deliberate (slow) interaction and a different reload-loop hypothesis. This is a distinct, now-reproduced defect, not a re-litigation of 7D.

**Acceptance:**
- No `Invalid LatLng` / NaN error when opening a spot from the mobile List tab (map hidden), across fast repeated taps.
- The conditions panel renders reliably on the mobile list-to-spot path (target: not 5/6 failures; verify the same 6-fast-trial harness comes back clean).
- Likely fix: guard the `FlyTo` / `FitBounds` / `FlyToUser` effects in `MapView.tsx` to no-op when the map has zero size (e.g. `if (!map.getSize().x) return;`), and/or call `map.invalidateSize()` when the Map tab becomes visible. Do NOT unmount the map on tab switch (it would re-init Leaflet and reintroduce the single-canvas-renderer risk documented in CLAUDE.md).
- Keep the existing non-destructive-selection behaviour (zoom floor 11, no refit on close) intact.

## 52. [ready] Proxy the NOAA tides fetch: it fails intermittently in the browser and silently drops conditions

**Found by the 2026-07-17 end-to-end verify loop.** Tide conditions fetch NOAA CO-OPS directly from the browser (`lib/conditions.ts:164`, fully client-side per the file header). The header comment (`lib/conditions.ts:5`) claims NOAA sends `access-control-allow-origin: *`; it does not do so reliably.

**Evidence (measured live 2026-07-17, `Origin: https://paddletowater.com`):** four back-to-back GETs to the predictions datagetter returned HTTP 200 every time but sent the CORS header on only 2 of 4 (`*`, none, `*`, none). A separate call returned a 504 with no CORS header. When the header is absent the browser blocks the response and `fetch` throws, so `fetchTides` fails and the tide half of the conditions panel silently drops. Reproduced in the local dev run: the browser console logged `Access to fetch at 'api.tidesandcurrents.noaa.gov/...' blocked by CORS policy`. Wind (weather.gov) is unaffected: it sends `access-control-allow-origin: *` on every call.

**Why it matters:** conditions is the retention differentiator and `tide_sensitive` spots depend on this exact call. The failure is intermittent (~half of cold fetches in this sample) and silent, so it does not show up in a normal spot-check and would not have surfaced without the header-level test. It degrades the one feature the roadmap is betting retention on.

**Acceptance:**
- Tide data reaches the client through a same-origin path so a missing NOAA CORS header can never block it (e.g. a Node route handler `app/api/tides` that fetches NOAA server-side and returns JSON; the app already runs Node server routes, so this composes with the static-page architecture).
- Add a short timeout + one retry to absorb NOAA's intermittent 504s.
- Cache server-side (tide predictions for a station+day are stable) to avoid hammering NOAA and to keep the panel fast.
- Update the stale `lib/conditions.ts:5` comment: NOAA CORS is not dependable; only weather.gov is.
- Confirm the alert crons (`lib/alerts/conditions-window.ts`) are unaffected (they run server-side already, so no CORS exposure there) and are not accidentally rerouted.

## 53. [ready] Cut "conditions today" loading latency (make it less live)

**Owner item, added 2026-07-17.** The conditions panel is the retention differentiator, and today it is slow to fill because everything is fetched live in the browser on every open. Per `lib/conditions.ts:1`, the app is static with no backend for this path, so each spot open triggers, at runtime: a NOAA CO-OPS tide predictions call, plus a National Weather Service **two-hop** wind lookup (`/points/{lat},{lng}` to resolve a gridpoint, then the gridpoint `/forecast`). That is three sequential external round trips (four counting the NWS redirect) before the panel can show "good to paddle", each subject to a cold third-party API, and the tide hop also intermittently fails on CORS (item 52). Results are cached only per session (module-level Map), so a cold open, the exact case that decides whether a returning user stays, pays full latency every time.

**The lever the owner named: make it less live/real-time.** Conditions do not need per-second freshness. Tide predictions for a station+day are fixed and computable in advance; wind forecasts update a few times an hour, not continuously. So precompute or cache instead of fetching from scratch on every open.

**Acceptance (size before building; overlaps item 52, sequence them together):**
- A cold "conditions today" open renders tide + wind materially faster than today (set a target, e.g. first paint of the paddleability verdict under ~1s on a warm cache), measured, not asserted.
- Collapse the NWS two-hop: the `/points` -> gridpoint resolution is stable per spot and can be precomputed at build time (all 140 spots have fixed lat/lng), so runtime does at most one wind call instead of two.
- Serve conditions through a cached same-origin path (a Node route + short server-side cache), which also fixes the item 52 CORS drop; a single spot's tide/wind payload is tiny and shareable across all users of that spot for the cache window.
- Keep it honest about freshness: show when the reading was last updated so "less live" never reads as "stale/wrong". Conditions is the trust-critical surface.
- Add a `conditions_loaded` SYSTEM latency event (or extend the existing one) so the before/after is provable in PostHog, per the analytics rules; changelog entry required.
- Do not regress the alert crons, which already run server-side, and reuse the same fetch/caching layer if it makes sense rather than forking a second copy.

## Owner items, added 2026-07-16 (evening; both [ready], queued top-most on purpose)

## 51. [proposed] Marker clustering for dense areas (carved out of item 7, 2026-07-17)

**Why:** at statewide zoom the audit measured 67 markers within a 24px radius, a blob of overlapping pins nobody can tap. Clustering is the standard fix.

**Why it is its own item, not polish:** it needs a new dependency (`leaflet.markercluster`) and it collides head-on with a documented architecture invariant. CLAUDE.md line 48: the map runs `preferCanvas` with a SINGLE shared `L.canvas()` renderer, and any layer that spins up a second canvas makes per-canvas hit-testing swallow every click ("pins go dead, cursor stuck on grab"). `leaflet.markercluster` brings its own marker layer and rendering path, so the integration must be proven to compose with the shared canvas renderer before it ships, or it reproduces exactly that catastrophic click-death bug.

**Acceptance (size before promoting):**
- Clustering at low zoom that de-clusters on zoom-in, with NO regression to click handling at any zoom (test the "location granted" path specifically, since that is where the second-canvas bug bites).
- Confirm `leaflet.markercluster` composes with `preferCanvas` + the shared `L.canvas()` renderer, or document the alternative (a canvas-native clustering approach).
- Pins keep the difficulty colours (`DIFFICULTY_COLOR`, `lib/types.ts`); cluster bubbles need their own count styling.

## 50. [proposed] Split the multi-launch records the item 40 audit could not pin

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

---

## Owner items, added 2026-07-13 (board-directed; the two [ready] items are queued top-most on purpose)

(Item 36 launch-direction tip shipped 2026-07-15, see Shipped. Item 37 visual-polish pass is the next [ready], below.)

(Item 38 shipped 2026-07-16, see Shipped.)

---

## Owner items, added 2026-07-16 (eight ideas; 7 and 8 merged into item 40)

**Strategy note.** Items 43 and 44 (reviews, accounts) are the "UGC content flywheel" and "optional sign-in" entries from the **Later** section at the bottom of this file, which says do not promote before retention is proven. The mid-July retention read is due now and unblocked (D9 closed 2026-07-15). Promoting 43/44 ahead of that read is a deliberate bet against this roadmap's own thesis (retention is the bottleneck, UGC needs retained users to generate content).

**Owner promoted both to `[ready]` on 2026-07-17, with the tension above understood.** This is the owner exercising the call the note reserves, not a default. Recorded so a later reader does not mistake it for the thesis changing: retention is still the bottleneck; the retention read is still the number that matters. Both items carry a lawyer gate before deploy (43: FTC fake-review rule + UGC moderation + Section 230; 44: personal data + OAuth + privacy-policy update). Items 39, 40, 41, 42, 45 never carried this tension.

## 43. [ready] Real user reviews on a spot (the crowd-sourced half of ratings)

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

## 44. [ready] Optional sign-in to sync spots and alerts across devices

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

## 26. [ready] Cold-open return surface: your recently-checked spots, with conditions now

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

- **UGC content flywheel:** ratings, photos, trip logs, user conditions reports. The long-term moat and SEO-acquisition engine, but it needs retained users to generate content first. *(Ratings/reviews half is now item 43, promoted to `[ready]` by the owner 2026-07-17. Trip logs + user conditions reports remain here.)*
- **Optional Google sign-in** to sync push subscriptions and saved spots across devices (the engine ships anonymous; this is the upgrade path). *(Now item 44, promoted to `[ready]` by the owner 2026-07-17.)*
- **PaddlePass premium tier:** alerts + multi-day forecast windows + offline, as the freemium paywall.
- **Community spot submissions** with admin approval.
- **Tide-window refinement** in the cron's "good window" evaluator (it ships wind-only).
