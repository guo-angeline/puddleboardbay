# Briefings: the board log

CEO briefings after each shipped or parked item, newest first, 15 lines max each.

## 2026-07-04T16:20:00Z · Item 5 sub-task: npm audit fix (PR #8, open)
What: took the smallest, safe sub-item of item 5 directly rather than launch another heavy pipeline right after the session-limit failure. `npm audit fix` (non-breaking) cleared 2 advisories, lockfile-only. 3 moderate prod advisories remain that need --force (breaking major bumps); deliberately NOT forced, left for owner review. Verified: 44 tests, build clean, lint unaffected (no source changed).
Judgment: reordered within item 5 (audit before the cron/schema sub-items) because the other three touch the protected cron or need a schema migration and warrant careful, non-rushed passes. Item 5 stays [ready] with the remaining three sub-items.
Loop status: FOUR studio PRs now await you (#5 doc, #6 fix, #7 feature, #8 audit). Stopping the loop; the queue needs draining more than it needs a fifth PR. Recommend pausing (ROADMAP marker to studio:paused) or merging before the next cron fire.

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
