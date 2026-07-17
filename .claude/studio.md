# Studio config: paddlePuddleboardBay (sup-spots / paddletowater.com)

backlog: ROADMAP.md
test: npm test
lint: npm run lint
build: npm run build (must pass before every deploy)
deploy: vercel --prod --yes (CLI is the ONLY path to production; there is no git integration, a commit without a deploy changes nothing live). After a verified deploy, move the pointer: git tag -f deployed-prod HEAD. The predeploy-gate.py hook diffs deployed-prod against the tree and stops a deploy that touches gated paths (a CHANGE to an existing spot's lat/lng per D19/D23, push/cron/subscription code, or any path on a Gates: line of an OPEN decision).
previewDeploy: vercel (non-prod preview URL for verifier checks)
liveUrl: https://paddletowater.com
protectedBranches: [main]
autonomy: standard

notes: |
  - Read CLAUDE.md before any work; it is dense with load-bearing constraints.
  - PROTECTED (always escalate): changes to push-notification/cron send behavior (real users get woken up; the 6am-alert incident is why the cron moved to 7pm), Supabase subscription rows, destructive migrations.
  - Never alter lat/lng in data/spots.json unless explicitly correcting coordinates with a verified source; verify unchanged before deploy.
  - Every material UX change ships with an analytics event (trackIntent/trackSystem discipline per CLAUDE.md) and an analytics/INSTRUMENTATION_CHANGELOG.md entry.
  - BOARD DIRECTIVE (2026-07-02): every major product update (new user-facing surface, changed core flow) ships behind an A/B experiment via lib/experiments.ts, declared in docs/experiments/ before shipping. Never straight to 100%. Low traffic means a longer read window, not a reason to skip the flag. Small fixes and copy tweaks are exempt.
  - This project has its OWN palette (indigo accent #3730A3, Libre Baskerville + Nunito). Do not apply the Moss & Stone house palette here.
  - Deploy timing pollutes analytics windows: deploy promptly after verified merges, and note the deploy time in the briefing.
  - Spot notes stay general and evergreen, never phrased as replies to a specific person.
  - PostHog project 458289; analytics reports live in reports/; read analytics/INSTRUMENTATION_CHANGELOG.md before citing any metric.
  - OWNER DIRECTIVE (2026-07-02): ROADMAP.md is the ONLY vision/strategy/roadmap doc. Never create a new plan/roadmap/strategy file; fold everything into ROADMAP.md. docs/superpowers/ specs are historical execution artifacts for shipped work only.
  - Building in a worktree needs a REAL node_modules: Turbopack rejects a symlink that points outside the project root (npm run build dies with "Symlink node_modules is invalid"). Cross-device (/tmp worktree) so hardlinks fail too: `cp -a <root>/node_modules <worktree>/node_modules` (~12s, 563M) before `npm run build`. Tests + lint work fine over the symlink; only the build needs the copy.
  - The D19/D23 coordinate gate fires ONLY on a CHANGE to an existing spot's lat/lng (a removed `-` lat/lng line vs deployed-prod), the "pin moves under live users and the crons" risk. Adding a NEW spot does not gate and needs no owner deploy approval (D23, owner directive 2026-07-17): ship it like any reversible content change. If you ever DO move an existing coordinate, that still gates: merge to main so the diff is the review artifact, escalate the DEPLOY, and note that an un-reviewed coordinate change left on main freezes later deploys too (it diffs the whole tree), so clear it promptly or sequence such items last. Never bypass the gate when it fires.
  - The sandboxed dev server has NO outbound network: a server-side fetch to an external API (a new /api route, a proxy) fails with HTTP 000 locally, so you CANNOT exercise the real upstream round-trip in local verification. Verify such routes three ways instead: (1) mocked-fetch unit tests for the route logic (retry/cache/error/passthrough); (2) the NOAA-independent paths live after deploy (e.g. a 400 on bad params proves the handler is wired); (3) the real upstream round-trip only post-deploy on Vercel, which has network, and even then the upstream itself may be down (NOAA was 5xx across all stations on 2026-07-17). Do not read a local HTTP 000 or a prod 502-during-upstream-outage as a bug in your route. New vitest test files under app/ need `app/**/*.test.ts` in vitest.config.ts include (added item 52).
  - Owner steering IS editing ROADMAP.md, so an uncommitted edit there is usually the owner steering, not a collision. Discriminate by staticness across a fire: a FRESH uncommitted edit to a [ready] item's own spec might be a human mid-keystroke, so hold that one fire (park + report, per the hard rules). If the SAME edit is still there unchanged on the next fire, it is settled steering: preserve it as its own labeled standalone commit (`git commit <file> -m "Owner steering: ..."`) to clean the tree, then proceed on that item. Never stash/revert it, never absorb it into an unrelated commit, never edit the owner's lines. Reserve the indefinite hold for uncommitted changes to CODE files or to an item OTHER than the one you're shipping.
