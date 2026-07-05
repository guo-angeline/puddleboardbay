# Briefings: the board log

CEO briefings after each shipped or parked item, newest first, 15 lines max each.

## 2026-07-04T07:40:00Z · Item 1 experiment instrumentation fixed (PR #6, open)
What: owner's question about the randomization unit surfaced a validity bug in the interstitial's already-deployed experiment. Randomization unit is the anonymous PostHog distinct_id (device/browser). Two defects fixed: (1) exposure logged only for treatment, so control had no cohort to compare; now symmetric trigger-based exposure for both arms. (2) card directions never hit the shared spot_action; now it does (source=alert_interstitial), making directions the arm-comparable primary metric. alert_interstitial_result demoted to treatment-only diagnostic. Query/doc/changelog updated.
Verification: 44 tests, lint clean, build clean; per-arm variant resolution + render confirmed live via Playwright. Live event capture not observable locally (no PostHog key in local env); wiring verified by type-checked EventPropMap + review.
Blocked on owner: merge + deploy PR #6 BEFORE creating the PostHog flag, else the first data collects against broken instrumentation. Caught pre-launch, so nothing lost yet.
Next up: item 2 (next-good-window in conditions).

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
