# PaddleToWater

Find a place to put your board in the water around the SF Bay Area, then get told when it's actually good.

**Live:** [paddletowater.com](https://paddletowater.com) (web) + a native iOS app (Expo)

## What it does

- 139 geocoded SUP launch spots across the Bay Area
- Filter by region, water type (flatwater / bay / river), and free-only access
- Interactive map with color-coded pins plus a detail sheet for each spot
- Live conditions per spot: NWS wind and NOAA tides, with a calm-window read
- Save spots you're watching, then get an alert (web push, email, or native push) when a saved spot hits a good window
- Feedback form for suggestions and corrections

## Repo layout

Two packages, intentionally **not** npm workspaces (hoisting would let the native Metro bundler resolve the web app's React copy):

- **`web/`**: the Next.js 16 site. Everything user-facing on the web, plus the shared pure modules (spot data, conditions logic, search, alert evaluator) that are the single source of truth.
- **`native/`**: the Expo iOS app. Imports the shared `web/lib` modules and `web/data` directly via a Metro `@/` alias, so spot data and conditions logic have one home. It's a pure HTTP consumer of the production API.

Root holds studio state (ROADMAP/DECISIONS/BRIEFINGS), analytics, reports, docs, Supabase migrations, and a proxy `package.json` so commands run from the root.

## Stack

- **Web:** Next.js 16 (App Router, static pages), Tailwind CSS v4, React Leaflet
- **Native:** Expo (SDK 57), React Native, react-native-maps, expo-notifications
- **Backend:** Supabase (push/email subscriptions), Resend (email), web-push, Vercel Cron
- **Analytics:** PostHog
- **Design:** Meltwater design system (glacial-pale base, deep-azure ink, water-type color coding)
- Deployed on Vercel

## Data

139 visible spots live in `web/data/spots.json` (143 records, 4 withheld behind a `hidden` flag). The source is `raw-data/sup.xlsx`, geocoded via `raw-data/phase0_geocode.py`. Read spots through `web/lib/spots.ts`, never from the JSON directly: it's the one chokepoint that also feeds the alert crons. To refresh, re-run the script, fix any geocoding failures, and commit the updated JSON.

## Dev

```bash
npm run dev       # web dev server at http://localhost:3000
npm run build     # web production build (run before every deploy)
npm run lint      # ESLint
npm test          # vitest (alert evaluator, selection, subscribe validation)
npm run ios       # run the Expo iOS app (needs Xcode + CocoaPods)
npm run test:native

vercel --prod --yes --cwd web   # deploy web to production
```

## Roadmap

Full vision, strategy, and backlog live in [ROADMAP.md](ROADMAP.md). In short: retention is the bottleneck and conditions is the differentiator, so the roadmap leads with the **conditions-alert retention loop** (save, install, get pinged when a spot is good). Ratings, trip reports, photos, and a PaddlePass premium tier come after retention is proven.
