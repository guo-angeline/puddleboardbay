# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # start dev server at http://localhost:3000
npm run build     # production build (run before every deploy)
npm run lint      # ESLint check
vercel --prod --yes  # deploy to production (https://sup-spots.vercel.app)
```

No test suite exists yet. Playwright is installed (`@playwright/test`) — use it for manual browser smoke tests when verifying UI changes.

## Architecture

This is a fully static Next.js 16 app (App Router). All spot data is bundled at build time from `data/spots.json` — there is no backend, no database, and no API routes.

### Data flow

```
raw-data/sup.xlsx
    └── raw-data/phase0_geocode.py   (one-time Python script)
            └── data/spots.json      (73 geocoded + enriched spots, committed)
                    └── app/page.tsx (imported directly as a module)
```

`spots.json` is the source of truth for the app. If spot data changes, re-run `phase0_geocode.py` (requires `openpyxl` and `requests`), manually fix any geocoding failures, then commit the new JSON.

### Key data shape

Defined in `lib/types.ts`. Each `Spot` has:
- `difficulty`: `"flatwater" | "bay" | "river" | "unknown"` — drives map pin color and filter
- `has_fee`: `true` (confirmed fee) | `false` (confirmed free) | `null` (unknown) — tri-state, not boolean
- `lat` / `lng`: required for map rendering; all 73 spots are geocoded

### Layout

`app/page.tsx` owns all state (filters, selected spot, active tab) and composes the full UI. Layout is:
- **Desktop**: 320px list panel (left) + map (flex-1) + optional drawer (right sidebar)
- **Mobile**: Map/List tab switcher; drawer renders as a fixed bottom sheet at `z-index: 1200` (must stay above Leaflet's internal z-index of 1000)

### Leaflet SSR

`MapView` uses `react-leaflet` which requires `window`. It is always loaded with `dynamic(..., { ssr: false })`. Never import `MapView` directly in a server component or remove the dynamic wrapper.

### Theme

CSS custom properties in `app/globals.css` control the palette:
- `--bg` `#EDEAE3`, `--accent` `#3730A3` (indigo), `--dark` `#1C1917`, `--muted` `#78716C`
- Map pin colors and difficulty badge colors are **not** CSS variables — they are hardcoded in `lib/types.ts` (`DIFFICULTY_COLOR`) and inlined in `app/page.tsx` (legend). Update both if changing difficulty colors.
- Tailwind v4 is used. CSS variable syntax in class names: `bg-[--accent]`, `text-[--muted]`, etc.

### Fonts

Loaded via Google Fonts `@import` in `globals.css`. The `@import url(...)` must appear **before** `@import "tailwindcss"` or the build emits a CSS warning.
- Headings (`h1`, drawer titles): `font-['Libre_Baskerville']`
- Body: `Nunito` set on `body` in globals

## Deployment

Vercel project is linked via `.vercel/project.json` (gitignored). Run `vercel --prod --yes` from the project root. The app builds as fully static (`○` in the build output) — no server functions.

`og:image` is not yet set. Add it in `app/layout.tsx` under `openGraph.images` when a hosted photo URL is available.

## Planned next phases

- **V1**: Supabase auth (Google OAuth) + ratings + trip reports + photo uploads
- **V2**: Community spot submissions with admin approval, tide/wind API overlay
