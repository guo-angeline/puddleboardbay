---
name: verify
description: Drive paddletowater.com locally to verify UI changes at the rendered surface (dev server + Playwright, desktop 1280px and mobile 390px)
---

# Verify: Paddle to Water

Build/launch: `npm run dev` (background, ~8s to ready; `curl -s -o /dev/null -w "%{http_code}"` to confirm). The Next.js app lives in `web/` since 2026-07-19 (root `npm run dev` proxies into it). Never assume an existing localhost server belongs to the checkout under test: in a worktree, start that worktree on a dedicated unused port and print the target URL before driving it. A stale root server can make working code look broken. Playwright is a devDependency; scripts outside the repo must import `/Users/qg/Paddle-to-water/web/node_modules/playwright/index.mjs` (bare `@playwright/test` fails to resolve from a scratchpad path).

Flows worth driving:
- Desktop list panel: rows render name, city/region, difficulty badge, heart toggle. 142 spots at default filters.
- Mobile (390px): Map tab is default; click the "List" tab button to see rows. Seed `localStorage.setItem("ptw-favorites","[1,7]")` via addInitScript to render the WATCHING section, conditions badges, and the "Turn on alerts" header button (needs unsubscribed state).
- Empty state: type an impossible query in the search box; expect "No spots match your filters" + "Clear filters" recovery. The map tab has a twin overlay of the same element.
- The email/push enrollment card (InstallPrompt) mounts as a fixed body-level card on mobile when favorites exist; it legitimately contains a rowing-emoji illustration, do not count it as a spot-list glyph.

Gotchas: pages are prerendered, so most list markup is greppable in served HTML too; the drawer conditions need network (NWS) and can be slow locally; kill the dev server after (`pkill -f "next dev"`).

Analytics hygiene: verify against LOCAL dev (this skill) or WebFetch, both of which fire zero PostHog events (no key locally + `navigator.webdriver` filtered; WebFetch runs no client JS). If you ever load the PROD site or a Vercel preview in a **real browser** (Codex-in-Chrome, e.g. to read console errors or confirm a live style), navigate to `<url>/?internal=1` FIRST so `ptw-internal=1` is set and your visit is dropped at ingestion. A real Chrome is otherwise indistinguishable from a user and will pollute pageviews/retention. See AGENTS.md Analytics.
