# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # start dev server at http://localhost:3000
npm run build     # production build (run before every deploy)
npm run lint      # ESLint check
vercel --prod --yes  # deploy to production (https://sup-spots.vercel.app)
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
- Map pin colors and difficulty badge colors are **not** CSS variables — they are hardcoded in `lib/types.ts` (`DIFFICULTY_COLOR`: flatwater teal `#12A5B0`, bay/ocean azure `#0E6FD1`, river rust `#E06636`) and inlined in the legend in `components/HomeClient.tsx`. Update both if changing difficulty colors. Several components also carry inline tint maps (FilterBar `DIFF_PALETTE`, SpotDrawer `DIFF_STYLES`, ConditionsBadge/Panel status colors) that must be kept in sync with the tokens.
- The PWA `theme_color`/`background_color` (`app/manifest.ts`) and `themeColor` meta (`app/layout.tsx`) are azure `#0E6FD1` / ink `#0B2A47`. The favicon, app icons, and OG share images were intentionally left on the prior art in this pass.
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

Experiments: read flags via `lib/experiments.ts` (`useExperiment` / `getVariant`); exposure is logged only when the treatment renders. Never call `posthog.identify()` / `reset()` (no login; it reshuffles buckets). Declare every experiment in `docs/experiments/` from `TEMPLATE.md` before shipping. **Every major product update (a new user-facing surface or a changed core flow) ships behind an A/B experiment flag, never straight to 100%** (owner directive, 2026-07-02). Low traffic means a longer read window, not a reason to skip the flag; small fixes and copy tweaks are exempt.

`trackSystem()`, `trackIntent()` and `setPersona()` no-op when PostHog isn't initialized, so they're safe to call unconditionally. Confirm a new event by checking its string lands in the built bundle: `grep -rho "<event>" .next/static`.

### Analytics reports

When you produce an analytics report (user counts, retention, funnels, adoption), begin the message with the line `<!-- analytics-report -->`. A project Stop hook (`scripts/save-analytics-report.py`, wired in `.claude/settings.json`) archives any message containing that marker to `reports/analytics-<date>.md`. No marker, no archive. Reading PostHog data needs a Personal API key (`phx_…`) + project id `458289` (US); the app only ships the write-only ingestion key.

**Before reporting any metric, read `analytics/INSTRUMENTATION_CHANGELOG.md`** and account for every entry in or near the window — never attribute a metric jump to user behavior before ruling out an instrumentation change. Use `analytics/REPORT_TEMPLATE.md` (its "Instrumentation changes affecting this window" section is required) and cite a query from `analytics/queries/*.sql` for every number; definitions are in `analytics/GLOSSARY.md`. Keep the availability-vs-engagement line sharp: a SYSTEM `_loaded` event is reliability, not "people use this".

## Deployment

Vercel project is linked via `.vercel/project.json` (gitignored). Run `vercel --prod --yes` from the project root. Pages build static (`○` in the build output); the two `/api` routes are server functions (`ƒ`). Deploying is the only way changes go live: there is no git integration, so a commit without a `vercel --prod` deploy changes nothing in production (this bit us once: instrumentation sat undeployed for 3 days and the analytics window was polluted).

### Scheduled jobs (two schedulers, do not lose the second one)

Two cron paths run on schedules, but they are triggered by **different** schedulers:

1. **`/api/cron/check-conditions`** (daily calm-window push) is a Vercel Cron, declared in `vercel.json` (`0 2 * * *`). Vercel runs it.
2. **`/api/cron/send-reminders`** (drains launch-time push reminders) is **NOT in `vercel.json`**: this account is on Vercel **Hobby**, which rejects sub-daily crons at deploy time. It is instead driven by a **Supabase pg_cron** job named `send-launch-reminders` (`*/15 * * * *`, set up 2026-07-09) that `net.http_get`s the endpoint with the `CRON_SECRET` bearer. If you ever migrate schedulers or the reminder loop goes silent, check `select * from cron.job;` in Supabase, not `vercel.json`. (Email alerts `/api/cron/send-email-alerts`, if daily, can live in `vercel.json`.)

`og:image` is set via the Next.js file convention: `app/opengraph-image.tsx` (site-wide) and `app/spot/[id]/opengraph-image.tsx` (per-spot, 1200x630). No `openGraph.images` array is needed in `app/layout.tsx`. Absolute URLs (canonical, OG, sitemap, robots, per-spot JSON-LD) all resolve from a single `SITE_URL` constant in `lib/structured-data.ts` (`https://paddletowater.com`), so update that one place if the production domain ever changes.

## Editing spot data

When updating any spot in `data/spots.json`, be careful not to alter the `lat`/`lng` fields unless you are explicitly correcting coordinates. Coordinates are easy to accidentally overwrite during text edits, and a wrong pin location is hard to notice until someone checks the map. Always verify `lat`/`lng` are unchanged (or intentionally corrected with a verified source) before deploying.

When user feedback comes in as a question or personal comment (e.g. "I didn't know SUPs were allowed, where do you put in?"), extract the underlying facts and fold them into the spot's `notes` as general, evergreen description. Never phrase notes as a reply to that person ("Yes, SUPs are allowed", "You put in at..."). The notes are read by every visitor, not the one who sent the feedback. Write what's true about the spot, not an answer to whoever asked.

## Vision & roadmap

`ROADMAP.md` is the **only** place for vision, strategy, and the roadmap (it is also the studio backlog). Never create a separate plan, roadmap, or strategy doc; fold new product thinking into `ROADMAP.md` directly. The old standalone docs (IMPROVEMENT-PLAN.md, ux-mobile-findings.md, docs/strategy/) were consolidated into it and deleted on 2026-07-02 (full text in git history). Implementation specs/plans under `docs/superpowers/` are historical execution artifacts for already-shipped work, not roadmaps; analytics reports live in `reports/`.

In short: the Jun 2026 analytics showed retention is the bottleneck (78% one-and-done) and conditions is the differentiator (loads reliably for ~91% of opens; genuine engagement now being measured, not the old fetch-settle count), so the roadmap now leads with the **conditions-alert retention loop** (save -> install -> anonymous web push when a spot is good; Stage A shipped) ahead of ratings/trip-reports/photos. The UGC content flywheel and a PaddlePass premium tier come after retention is proven.
