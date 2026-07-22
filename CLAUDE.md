# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repo layout (since 2026-07-19)

Two packages, intentionally NOT npm workspaces (hoisting would let the native app's Metro bundler resolve the web app's React copy):

- **`web/`**: the Next.js site (everything that used to live at the repo root: `web/app`, `web/components`, `web/lib`, `web/data`, `web/public`, `web/scripts`, its `package.json` + lockfile + `node_modules`, `vercel.json`, `.vercel` link, `.env.local`). Any repo-root-relative path in older notes/docs (`lib/...`, `app/...`, `data/spots.json`) now means `web/lib/...` etc.
- **`native/`**: the Expo iOS app. It imports the pure shared modules (`web/lib/conditions`, `web/lib/spots`, `web/lib/search`, types, alert evaluator, `web/data/*.json`) directly from `web/` via a Metro `@/` alias, so spot data and conditions logic have one source of truth. Keep shared `web/lib` modules free of DOM/Next imports at module scope.
- Root: studio state (ROADMAP/DECISIONS/BRIEFINGS), `analytics/`, `reports/`, `docs/`, `raw-data/`, `supabase/migrations/`, `.claude/`, hook scripts in `scripts/`, and a proxy `package.json` so `npm run dev` / `npm test` etc. still work from the root.

## Commands

```bash
npm run dev       # start web dev server at http://localhost:3000 (proxies into web/)
npm run build     # production build (run before every deploy)
npm run lint      # ESLint check
npm run ios       # run the Expo iOS app (proxies into native/)
vercel --prod --yes --cwd web  # deploy to production (https://sup-spots.vercel.app)
```

Unit tests run with `npm test` (vitest; covers the alert evaluator, selection, and subscribe validation). Playwright is installed (`@playwright/test`) for manual browser smoke tests when verifying UI changes.

## Architecture

This is a Next.js 16 app (App Router). All pages are static: spot data is bundled at build time from `data/spots.json`. The only server code is the conditions-alert loop: `app/api/alerts/subscribe` (stores push subscriptions in Supabase) and `app/api/cron/check-conditions` (Vercel Cron, sends web push), both `runtime = "nodejs"`. Server env vars: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `VAPID_PRIVATE_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `CRON_SECRET`.

### Data flow

```
raw-data/sup.xlsx
    └── raw-data/phase0_geocode.py   (one-time Python script)
            └── data/spots.json      (140 geocoded + enriched spots, committed)
                    └── app/page.tsx (imported directly as a module)
```

`spots.json` is the source of truth for the app. If spot data changes, re-run `phase0_geocode.py` (requires `openpyxl` and `requests`), manually fix any geocoding failures, then commit the new JSON.

### Key data shape

Defined in `lib/types.ts`. Each `Spot` has:
- `difficulty`: `"flatwater" | "bay" | "river" | "unknown"` — drives map pin color and filter
- `has_fee`: `true` (confirmed fee) | `false` (confirmed free) | `null` (unknown) — tri-state, not boolean
- `lat` / `lng`: required for map rendering; all 140 spots are geocoded

### Layout

`app/page.tsx` owns all state (filters, selected spot, active tab) and composes the full UI. Layout is:
- **Desktop**: 320px list panel (left) + map (flex-1) + optional drawer (right sidebar)
- **Mobile**: Map/List tab switcher; drawer renders as a fixed bottom sheet at `z-index: 1200` (must stay above Leaflet's internal z-index of 1000)

### Leaflet SSR

`MapView` uses `react-leaflet` which requires `window`. It is always loaded with `dynamic(..., { ssr: false })`. Never import `MapView` directly in a server component or remove the dynamic wrapper.

**One canvas renderer for every marker.** The map runs `preferCanvas` and the spot pins share a single `L.canvas()` renderer (`useMemo` in `MapView`). Any `CircleMarker` you add (e.g. the user-location halo/dot) MUST be passed that same `renderer` prop. A marker without it makes Leaflet spin up its own default canvas; because layers like the location dot mount asynchronously, that second canvas stacks on top of the overlay pane and its per-canvas hit-testing swallows every click over the map (pins go dead, cursor stuck on grab) for anyone with location on. Symptom is desktop-looking but is really "location granted". One renderer, one canvas, one hit-test surface.

### Theme

The palette is the **Meltwater** design system (glacial-pale base, deep-azure ink, water-type color coding), applied 2026-07-08 from the claude.ai/design "Style Directions" doc. CSS custom properties in `app/globals.css` are the source of truth; the full token set (base / ink / brand / waterType / status) lives there.
- Core vars: `--bg` `#EEF5FB` (canvas), `--accent` `#0E6FD1` (azure), `--dark` `#0B2A47` (ink primary), `--muted` `#6E8598` (ink tertiary), `--border` `#DCE7F0` (hairline). Extended tokens (`--flatwater`/`--ocean`/`--river` + `-ink`/`-fill`, `--calm`/`--free`/`--wind-alert` + `-fill`, `--saved`, `--ink-2`, etc.) are also defined.
- Map pin colors and difficulty badge colors are **not** CSS variables — they are hardcoded in `lib/types.ts` (`DIFFICULTY_COLOR`: flatwater teal `#12A5B0`, bay/open-water azure `#0E6FD1`, river rust `#E06636`) and inlined in the legend in `components/HomeClient.tsx`. Update both if changing difficulty colors. Several components also carry inline tint maps (FilterBar `DIFF_PALETTE`, SpotDrawer `DIFF_STYLES`, ConditionsBadge/Panel status colors) that must be kept in sync with the tokens.
- The PWA `theme_color`/`background_color` (`app/manifest.ts`) and `themeColor` meta (`app/layout.tsx`) are azure `#0E6FD1` / ink `#0B2A47`. The favicon, app icons, header wordmark badge, email masthead badge, and OG share images all render the **paddle mark**: a white single-blade paddle + waves on a navy `#0B2A47` rounded tile. `asset/icon.png` is the master artwork; every raster is derived from it by `scripts/gen-icons.mjs` (favicon `app/icon.png`, `app/apple-icon.png`, `public/icon-192.png`, `public/icon-512.png`, `public/email-logo.png`, and `public/og-mark.png` which is corner-transparent for compositing on the navy OG canvas). Re-run that script if the master changes. The header badge (`components/HomeClient.tsx`) and email badge clip the tile corners with border-radius; PWA/Apple icons stay full-tile for the OS mask.
- Tailwind v4 is used. CSS variable syntax in class names: `bg-(--accent)`, `text-(--muted)`, `border-(--border)`, etc. Note: the bracket form (`bg-[--accent]`) compiles to invalid CSS in Tailwind v4.3.0, use the parens form.

### Fonts

Loaded via Google Fonts `@import` in `globals.css`. The `@import url(...)` must appear **before** `@import "tailwindcss"` or the build emits a CSS warning.
- Display/serif (wordmark, drawer & sheet titles, `h1`): `font-['Newsreader']`
- Body / UI: `Hanken Grotesk` set on `body` in globals (inherited everywhere)

## Analytics

PostHog is wired up in `components/PostHogProvider.tsx` (US cloud, gated on `NEXT_PUBLIC_POSTHOG_KEY`) behind a thin typed wrapper in `lib/analytics.ts`. Autocapture and pageviews are on; everything else is explicit.

**Always add simple logging for material UX changes.** Whenever you ship a new interaction or meaningfully change an existing one (a new control, gesture, filter, navigation path, or conversion action), add a lightweight event in the same change. The data is how we tell whether the change worked, shipping UX without it is a miss.

**Grounded events only: never log "data loaded" as if a human acted.** Events are split into two categories in `lib/analytics.ts`, and the distinction is load-bearing (the old `conditions_viewed` fired on every fetch settle and got reported as "conditions is used heavily" — it wasn't):
- **SYSTEM** events auto-fire when data settles. Name them `_loaded` / `_failed` and emit via `trackSystem`. They measure availability/latency, never intent.
- **INTENT** events fire only on a deliberate act (click, toggle, typed query) or a dwell-gated genuine view. Name them `_viewed` / `_clicked` / `_toggled` and emit via `trackIntent`. For "did the user actually look at X", gate on `lib/useGenuineView` (IntersectionObserver + dwell) — do NOT fire on mount or inside a fetch `.then()`.

How to do it:
- Add the event to the right sub-union (`SystemEventName` or `IntentEventName`) in `lib/analytics.ts`; for metrics a report depends on, add a typed entry to `EventPropMap` so call sites can't omit a needed prop. The unions are the allowlist, unknown names won't compile. Both wrappers stamp `event_category`.
- `trackSystem`/`trackIntent` are the only emitters (the bare `track()` was removed 2026-07-09; every event carries `event_category` from that date).
- Every event also carries a `display_mode` (`standalone` | `browser`) super property, and `before_send` drops automation/bot traffic; set `localStorage.ptw-internal = "1"` on a device to exclude it. First-touch acquisition (`first_referrer`, `first_utm_*`, ...) is stamped `$set_once` at init. All in `components/PostHogProvider.tsx`.
- Include `spot_id` / `region` whenever a spot is involved, so events segment consistently with `spot_viewed`.
- Group variants of one action under a single event with an `action` prop (e.g. `spot_action` with `action: "directions" | "share" | "photos"`) instead of many near-duplicate names.
- Use `setPersona(...)` (person properties) for durable traits that define a segment (saver, budget, local), not for one-off events.
- Keep it cheap and signal-rich: one event per real interaction. Don't log high-frequency noise (map pan/zoom, per-keystroke), debounce or skip it.
- **Any logging change MUST get an entry in `analytics/INSTRUMENTATION_CHANGELOG.md`** (event, change type, why, and a Comparability note). A PostToolUse hook (`scripts/check-instrumentation-changelog.py`) reminds you. This is what stops a later analyst from reading a logging change as a behavior change.

Experiments: read flags via `lib/experiments.ts` (`useExperiment` / `getVariant`); exposure is logged only when the treatment renders. Never call `posthog.identify()` / `reset()` (no login; it reshuffles buckets). Declare every experiment in `docs/experiments/` from `TEMPLATE.md` before shipping. **No A/B tests until DAU passes 100** (owner directive, 2026-07-17, supersedes the 2026-07-02 "ship every major update behind an A/B flag" rule). At current traffic (~1 enrollment card / 8 days) no arm comparison can reach significance in a useful window, so a flag adds gating risk and read complexity for a result we can never call. Until DAU > 100: ship major user-facing changes at 100% behind a **kill-switch** flag (`useKillSwitch`, default ON, hides only on an explicit PostHog disable) for reversibility, not an A/B, and watch guardrails for regressions instead of reading a lift. Existing experiments that were parked at control for this reason should be retired to 100% (the pattern used for alert_interstitial D2a, owner_rating D20, enrollment_dual_cta item 32). Revisit the A/B gate once DAU clears 100. Small fixes and copy tweaks remain flag-exempt.

`trackSystem()`, `trackIntent()` and `setPersona()` no-op when PostHog isn't initialized, so they're safe to call unconditionally. Confirm a new event by checking its string lands in the built bundle: `grep -rho "<event>" .next/static`.

### Analytics reports

When you produce an analytics report (user counts, retention, funnels, adoption), begin the message with the line `<!-- analytics-report -->`. A project Stop hook (`scripts/save-analytics-report.py`, wired in `.claude/settings.json`) archives any message containing that marker to `reports/analytics-<date>.md`. No marker, no archive. Reading PostHog data needs a Personal API key (`phx_…`) + project id `458289` (US); the app only ships the write-only ingestion key.

**Before reporting any metric, read `analytics/INSTRUMENTATION_CHANGELOG.md`** and account for every entry in or near the window — never attribute a metric jump to user behavior before ruling out an instrumentation change. Use `analytics/REPORT_TEMPLATE.md` (its "Instrumentation changes affecting this window" section is required) and cite a query from `analytics/queries/*.sql` for every number; definitions are in `analytics/GLOSSARY.md`. Keep the availability-vs-engagement line sharp: a SYSTEM `_loaded` event is reliability, not "people use this".

**The alert-loop funnel tail's source of truth is Supabase, NOT PostHog.** Enrollment (email submit / confirm), sends, opens, and the reachable-subscriber base are backend records; the matching PostHog events (`email_capture_submitted`, `alert_clicked`, `email_alert_opened`) are client-side proxies keyed by `person_id`, which **cannot exclude the owner's email/push identities** (those are keyed by email address and push `anon_id`, per `analytics/EXCLUDED_PERSONS.md`), so a PostHog-only loop read silently counts the owner. Proven 2026-07-18: PostHog reported 3 ex-owner email submits when Supabase held 1 real (the other 2 were owner sessions on non-excluded `person_id`s). Rule: report the loop tail (submits, confirms, sends, opens, active subscribers) from Supabase and reconcile any PostHog proxy against it. **Exception:** prompt exposure (`alert_optin_shown`, its `trigger` and `channel` props) is a pure UI impression with no backend row, so it IS a PostHog metric and IS owner-excludable by `person_id` — use PostHog for the top of the funnel. To query Supabase read-only there is no `psql`/`supabase` CLI here; load `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` from `.env.local` in a `node` script and hit the PostgREST REST endpoint (`${SUPABASE_URL}/rest/v1/<table>`, tables `email_subscriptions`, `push_subscriptions`, `alert_sends`/`alert_opens`, `email_sends`/`email_opens`), excluding owner rows per `EXCLUDED_PERSONS.md`.

## Deployment

Vercel project is linked via `web/.vercel/project.json` (gitignored). Run `vercel --prod --yes --cwd web` from the repo root (the CLI uploads `web/` as the project root; `web/vercel.json` carries the crons). Pages build static (`○` in the build output); the two `/api` routes are server functions (`ƒ`). Deploying is the only way changes go live: there is no git integration, so a commit without a `vercel --prod` deploy changes nothing in production (this bit us once: instrumentation sat undeployed for 3 days and the analytics window was polluted).

### Scheduled jobs (two schedulers, do not lose the second one)

Two cron paths run on schedules, but they are triggered by **different** schedulers:

1. **`/api/cron/check-conditions`** (daily calm-window push) is a Vercel Cron, declared in `vercel.json` (`0 2 * * *`). Vercel runs it.
2. **`/api/cron/send-reminders`** (drains launch-time push reminders) is **NOT in `vercel.json`**: this account is on Vercel **Hobby**, which rejects sub-daily crons at deploy time. It is instead driven by a **Supabase pg_cron** job named `send-launch-reminders` (`*/15 * * * *`, set up 2026-07-09) that `net.http_get`s the endpoint with the `CRON_SECRET` bearer. If you ever migrate schedulers or the reminder loop goes silent, check `select * from cron.job;` in Supabase, not `vercel.json`. (Email alerts `/api/cron/send-email-alerts`, if daily, can live in `vercel.json`.)

`og:image` is set via the Next.js file convention: `app/opengraph-image.tsx` (site-wide) and `app/spot/[id]/opengraph-image.tsx` (per-spot, 1200x630). No `openGraph.images` array is needed in `app/layout.tsx`. Absolute URLs (canonical, OG, sitemap, robots, per-spot JSON-LD) all resolve from a single `SITE_URL` constant in `lib/structured-data.ts` (`https://paddletowater.com`), so update that one place if the production domain ever changes.

## Editing spot data

### Adding spots in a new geography: the records are the smallest part

A region is not just rows in `spots.json`. Two per-coordinate lookup tables are keyed to the Bay Area's geography, and **when a spot falls outside them the feature does not error, it silently renders nothing**:

1. **NWS gridpoints.** Re-run `cd web && python3 scripts/precompute_gridpoints.py` in the same change. A test catches this one.
2. **`TIDE_STATIONS` in `lib/conditions.ts`.** Nothing caught this one until it was live. The LA and San Diego batches shipped `tide_sensitive: true` on 20 spots while the nearest listed station was past `MAX_STATION_MI`, so the conditions engine, the differentiator, ran blind across two whole regions with lint, 582 tests, the build and a production deploy all green. Pull stations from NOAA's `mdapi .../stations.json?type=tidepredictions`, and **confirm each id returns hi/lo from the datagetter before adding it**: `/api/tides` allowlists against this list, and subordinate station ids are not numeric (`TWC0413` serves Mission Bay). `conditions.test.ts` now fails if a `tide_sensitive` spot has no station in range. **But that test is a floor, not a definition of correct:** Orange County had no station of its own and still passed it, because a station 9 to 12 miles away in a different harbor is "in range". Check the distance the spot page actually prints, not just that the test is green.

Also extend `REGIONS` in `lib/types.ts` (**ADD a value, never rename one**: existing records and analytics are keyed to the strings) and check the site's own framing still tells the truth, since the title, description and `h1` name the covered area.

**The generalizable rule: a boolean that gates a feature is a claim, and something must test that we can honour it.** When coverage expands, ask what silently degrades, not just what fails.

### Read spots through `lib/spots.ts`, never from `data/spots.json`

`lib/spots.ts` is the single chokepoint. Import `ALL_SPOTS` from it; do **not** `import spotsData from "@/data/spots.json"` in a feature file. Nine files consume spot data and **two of them are the alert crons**, so a filter applied only to the UI would leave push and email still sending people to a spot that has been deliberately withheld. `lib/spots.test.ts` fails the build if any feature file imports the JSON directly. `ALL_SPOTS_INCLUDING_HIDDEN` exists for data tooling and audits only, never for a user-facing surface or an alert send.

### The `hidden` flag

`Spot.hidden` withholds a record from every surface at once: list, map, `/spot/[id]` (including `generateStaticParams`, so no page is built), sitemap, OG images, JSON-LD, and both crons. `hidden_reason` is required alongside it and must say what would un-hide the spot. Records are kept, not deleted, so notes survive for later repair. Set this when a record cannot be **trusted**, not merely when it needs a fix. Un-hiding is an owner decision (see DECISIONS.md D14).

### Coordinates: precision is not accuracy, and provenance is the real problem

When updating any spot, do not alter `lat`/`lng` unless you are explicitly correcting coordinates with a verified source. A wrong pin is hard to notice until someone checks the map. Always verify `lat`/`lng` are unchanged before deploying, **and verify it at the git-diff level, not numerically**: a JSON round-trip (`json.load` then `json.dump`) silently reformats values like `-121.1729010` to `-121.172901`. Those are the same number, so a float comparison reports "nothing changed" while the file churns. Prefer text-level edits to `spots.json` over reserialization; `git diff data/spots.json | grep '"lat"\|"lng"'` should come back empty.

Do not screen coordinate quality by counting decimal places. The 2026-07-16 audit (`reports/coord-audit-2026-07-16.md`) tried it: ~36% false-positive rate (JSON drops trailing zeros, so a "coarse-looking" value is often exact), it understated the two real worst cases, and it missed the worst defect entirely.

**Use the SF Bay Water Trail as the registry, not DBW.** The 127-spot sweep (`reports/data-quality-sweep-2026-07-16.md`) corrected the audit's own method, so read that correction before reusing either screen:

1. **Reverse-geocode screen.** Does the coordinate resolve to a road, trail, freeway, building, or polygon centroid rather than a put-in? Real, but **not** zero-false-positive: at least 20% at scale. The pipeline ingested SF Bay Water Trail trailhead coordinates, **and the Water Trail publishes the parking, not the dock**. Three spots (127, 130, 132) match a published trailhead coord to 6+ decimals, reverse-geocode to a car park, and are correct as stored. Fingerprint for that batch: exactly 6 decimal places on both lat and lng, on a contiguous high-id block (62, 66, 67, 126, 127, 129-133, 136-138, 140, 141, 144-146). Check the notes: these records already disclose the walk.
2. **Registry screen. DBW is the WRONG registry and this was a category error.** CA DBW registers **motorized/trailered boating facilities**. It is not an inventory of places you can put a paddleboard in the water. It lists "Devils Nose Put-in" as `NoFacility`, and **McNears Beach is `NoFacility` while simultaneously being an official Water Trail launch**. On a 38-spot run the DBW screen fired 4 times and was right once: a **75% false-positive rate**. A DBW hit disproves a **ramp claim** and nothing else. **It must never be grounds to hide a spot.** Use the **SF Bay Water Trail** (BCDC / State Coastal Conservancy) as the primary registry for Bay Area spots: it publishes dock type, gangways, parking counts, fees, and hazards, which is every field this app needs. Keep DBW only as a narrow ramp-claim check.

**The real failure mode is not invention, it is ingesting a good source and losing what it meant.** The sweep found **no second spot 79**: every launch it verified exists and is legal. Spot 79 remains the one fabrication. What it found instead was records that took a real source and dropped its meaning: a Water Trail parking coordinate stored as a put-in; a beach launch written up as a "paved ramp" (47, and the same pattern at 120); a private shop's dock sold as a public put-in (92); published seasonal closure dates omitted (134). Treat `phase0_geocode.py` output as a candidate, not a fact, and confirm the launch exists **and that the record still says what the source said** before adding spots.

**Coordinates are not the main defect.** The worst findings are in `notes` and the boolean fields, and those fields are load-bearing: `tide_sensitive` feeds the conditions engine (`lib/savedConditions.ts`), which is the app's differentiator, and it is systematically wrong (36 of 68 bay spots say false; 14 records describe tides in their own notes while the flag says false). An audit scoped to pin position would leave every one of those in production.

When user feedback comes in as a question or personal comment (e.g. "I didn't know SUPs were allowed, where do you put in?"), extract the underlying facts and fold them into the spot's `notes` as general, evergreen description. Never phrase notes as a reply to that person ("Yes, SUPs are allowed", "You put in at..."). The notes are read by every visitor, not the one who sent the feedback. Write what's true about the spot, not an answer to whoever asked.

## Vision & roadmap

`ROADMAP.md` is the **only** place for vision, strategy, and the roadmap (it is also the studio backlog). Never create a separate plan, roadmap, or strategy doc; fold new product thinking into `ROADMAP.md` directly. The old standalone docs (IMPROVEMENT-PLAN.md, ux-mobile-findings.md, docs/strategy/) were consolidated into it and deleted on 2026-07-02 (full text in git history). Implementation specs/plans under `docs/superpowers/` are historical execution artifacts for already-shipped work, not roadmaps; analytics reports live in `reports/`.

In short: the Jun 2026 analytics showed retention is the bottleneck (78% one-and-done) and conditions is the differentiator (loads reliably for ~91% of opens; genuine engagement now being measured, not the old fetch-settle count), so the roadmap now leads with the **conditions-alert retention loop** (save -> install -> anonymous web push when a spot is good; Stage A shipped) ahead of ratings/trip-reports/photos. The UGC content flywheel and a PaddlePass premium tier come after retention is proven.
