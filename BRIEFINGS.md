# Briefings: the board log

CEO briefings after each shipped or parked item, newest first, 15 lines max each.

## 2026-07-07 · Both experiments LIVE; spot #148 deployed; studio resumed
What: owner created both PostHog flags (`alert-interstitial`, `next-good-window`, control/treatment 50/50), so both A/B experiments are now running on the already-deployed code. Separately deployed main (`vercel --prod --yes`) so the owner-merged spot #148 (Lakeshore Park Lake, Newark, PR #10) is live (verified /spot/148 = 200). Flipped the studio marker back to studio:v1 (it was only ever paused in the working tree, never in git).
Verification: homepage 200, /spot/148 200. Flag creation not independently verifiable by the manager (no read key); taken on owner confirmation ("done").
State: no open PRs, no [ready] items (item 5 blocked on D1, items 7/8/9 proposed). D1 still open, non-blocking. Do not read the experiments before ~2026-07-21 (14 days) AND 30 exposed users per arm.

## 2026-07-05 · DEPLOYED to production (owner authorized)
What: ran `vercel --prod --yes` on main (49cb2bd). Verified live: homepage 200, and BOTH flag keys (`alert-interstitial`, `next-good-window`) confirmed present in the production JS bundle. Items 1 and 2 (with the corrected instrumentation) are now live. Both features remain DARK by default: no PostHog flag exists yet, so everyone gets control (nothing renders / today's behavior).
Remaining to fully activate: create the two 50/50 flags in PostHog project 458289. Manager cannot do this (needs the owner's phx_ personal API key, which the app does not expose); handed the owner a one-command script that reads the key from env. Deploy-before-flag order was deliberate: the corrected instrumentation is live before any experiment turns on.
Still open: D1 (defer vs approve item-5 cron work).

## 2026-07-05 · Owner said "merge them for me": queue drained, state reconciled
What: merged PR #6 (interstitial exposure fix), #7 (next-good-window), #8 (npm audit) into main, resolving the #6/#7 overlap in experiments.ts/analytics.ts/changelog/ROADMAP/BRIEFINGS by hand (both experiments + both events kept; 55 tests + build green after each merge). Closed #5 as redundant. Restored the studio state that lived only in the working tree: D1 (open), items 8 + 9 (proposed), item 5 blocked(D1).
NOT deployed: main is current but production is unchanged until the owner runs `vercel --prod --yes`. After deploy, create the `alert-interstitial` and `next-good-window` PostHog flags to start both experiments; until then both features are dark.
Open on owner: deploy; create 2 flags; answer D1 (rec: defer). No open PRs, no [ready] items.

## 2026-07-04T16:20:00Z · Item 5 sub-task: npm audit fix (PR #8, open)
What: took the smallest, safe sub-item of item 5 directly rather than launch another heavy pipeline right after the session-limit failure. `npm audit fix` (non-breaking) cleared 2 advisories, lockfile-only. 3 moderate prod advisories remain that need --force (breaking major bumps); deliberately NOT forced, left for owner review. Verified: 44 tests, build clean, lint unaffected (no source changed).
Judgment: reordered within item 5 (audit before the cron/schema sub-items) because the other three touch the protected cron or need a schema migration and warrant careful, non-rushed passes. Item 5 stays [ready] with the remaining three sub-items.
Loop status: FOUR studio PRs now await you (#5 doc, #6 fix, #7 feature, #8 audit). Stopping the loop; the queue needs draining more than it needs a fifth PR. Recommend pausing (ROADMAP marker to studio:paused) or merging before the next cron fire.

## 2026-07-04T16:05:00Z · Item 2 (next good window) built + verified; PR #7 open
What: "Looking ahead / Next calm window: Sat 7 to 10am" block in the drawer conditions area, behind the next-good-window A/B flag. Reuses the shared evaluateGoodWindow (extended with start/end hour, cron behavior unchanged) via a client-side lib/nextWindow.ts that mirrors getConditions caching and fails quietly. Symmetric both-arms exposure (corrected pattern), shared spot_action primary metric, dwell-gated next_window_viewed diagnostic.
Interruption handled: the ship pipeline's whole-branch verify agent died on the account session limit (resets 2pm PT) with the panel work uncommitted. Manager preserved it (pushed), then finished verification by hand: 55 unit tests, lint clean, build clean, Playwright drawer smoke green across treatment/no-window/fetch-fail/control/flag-absent, no JS errors. Live event capture not observable locally (no key); wiring verified by review.
Blocked on owner: merge + deploy PR #7, and create the next-good-window PostHog flag before starting the experiment. Same standing hold on PR #6 (fix) / the alert-interstitial flag.
Loop stopped after this item: three studio PRs (#5 doc, #6 fix, #7 feature) now await your merge; not going to pile on a fourth.

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
