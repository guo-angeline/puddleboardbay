# Briefings: the board log

CEO briefings after each shipped or parked item, newest first, 15 lines max each.

## 2026-07-04T16:05:00Z · Item 2 (next good window) built + verified; PR #7 open
What: "Looking ahead / Next calm window: Sat 7 to 10am" block in the drawer conditions area, behind the next-good-window A/B flag. Reuses the shared evaluateGoodWindow (extended with start/end hour, cron behavior unchanged) via a client-side lib/nextWindow.ts that mirrors getConditions caching and fails quietly. Symmetric both-arms exposure (corrected pattern), shared spot_action primary metric, dwell-gated next_window_viewed diagnostic.
Interruption handled: the ship pipeline's whole-branch verify agent died on the account session limit (resets 2pm PT) with the panel work uncommitted. Manager preserved it (pushed), then finished verification by hand: 55 unit tests, lint clean, build clean, Playwright drawer smoke green across treatment/no-window/fetch-fail/control/flag-absent, no JS errors. Live event capture not observable locally (no key); wiring verified by review.
Blocked on owner: merge + deploy PR #7, and create the next-good-window PostHog flag before starting the experiment. Same standing hold on PR #6 (fix) / the alert-interstitial flag.
Loop stopped after this item: three studio PRs (#5 doc, #6 fix, #7 feature) now await your merge; not going to pile on a fourth.

## 2026-07-04T07:25:00Z · Item 1 verified by studio manager; PR #4 ready for owner merge
What: independently re-verified the interstitial branch locally. Evidence: 44 tests pass; lint clean on PR files (3 pre-existing errors are in untracked local .feedback-auto/, not the PR); build clean; Playwright against the prod build: deep link opens drawer, control renders nothing, forced treatment shows the card with decoded window label over the drawer, coords-based directions URL, dismiss works.
Fixes added: missing experiment readout query (analytics/queries/experiment_alert_interstitial.sql, referenced by the experiment doc but never created); item 3 (bounce fix) marked parked stale.
Blocked on owner: merge PR #4, then the studio deploys. Production behavior stays unchanged after deploy until the alert-interstitial flag is created in PostHog.
Next up: item 2 (next-good-window in conditions) next iteration.

## 2026-07-04T03:18:00Z · Alert deep-link interstitial shipped (item 1)
What: composeAlert now embeds the calm-window label in the push's deep-link URL; a new AlertInterstitial card shows it plus the spot's put-in notes and a Get Directions shortcut over the drawer, behind the `alert_interstitial` A/B flag (control = no change). New events alert_interstitial_shown/result.
Verification: npm test (44 passed), npm run lint (clean), npm run build (clean; new event strings confirmed in .next/static).
Not deployed: this PR only merges code. Production is unchanged until the owner runs `vercel --prod --yes`.
Next up: item 2 (next-good-window in the conditions panel) is top of the ready queue.

## 2026-07-02 · Studio enabled on this project
What: ROADMAP.md is now the studio backlog (items 1, 2, 4 ready; 3, 5 parked; Later section proposed). DECISIONS.md and .claude/studio.md created.
Next up: item 1, fix the 58% landing bounce.
