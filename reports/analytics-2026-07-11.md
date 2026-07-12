<!-- analytics-report -->
# SUP Spots: growth readout, why users don't grow

**Window:** 2026-06-27 to 2026-07-11 (14 days), prior window 2026-06-13 to 2026-06-27 for comparison · **Source:** PostHog project 458289 (US), live pull via HogQL · **Excludes:** 3 owner person_ids per `analytics/EXCLUDED_PERSONS.md` in every query · **Generated:** 2026-07-11 by the data-lead agent

> **Confidence: LOW overall, directional only.** The bot filter (`before_send`) went live 2026-07-09, so 12 of 14 days are bot-contaminated. The clean slice is ~2.5 days / ~48 new users. Supabase-side numbers (email subscriptions, alert_opens) were not queryable this session; PostHog client events stand in with that caveat named where it matters.

## TL;DR: why don't your users grow

Users don't grow because **almost everyone churns after one visit and nothing brings them back yet**: 213 of 260 active persons this window (82%) were one-and-done, W1 retention is 21 of 140 (15%), and the alert loop built to fix it has zero completed enrollments ex-owner (0 push grants of 13 prompts shown, 2 email submits, 0 confirmed). Meanwhile the top of funnel is a fixed drip, not a channel: 186 of 230 new users (81%) arrive direct, zero campaigns have ever run (0 UTM-tagged visitors all-window), the 140 per-spot SEO pages took **zero measured landings in 14 days**, and only 3 people shared anything. New users arrive at roughly 13 to 16 per day and leak out at ~85%, so WAU stays flat (125, 104, 154, 111 across the last four weeks, bot-noisy). The bucket leaks as fast as it fills, and no one is turning up the tap.

## Data quality gate

- [x] **Events fire:** all cited events returned live rows; enrollment events verified live post-07-10 ship.
- [x] **Internal/bot excluded:** 3 owner ids filtered everywhere. **Residual bot contamination on all pre-07-09 rows** (12 of 14 days); flagged per metric. Supabase push rows remain owner-contaminated (D9 open, key added but wiring pending).
- [x] **Availability vs intent separate:** no `_loaded` event is cited as usage anywhere below. `conditions_viewed` pre-07-02 had fetch-settle semantics, so conditions engagement uses the clean slice only.
- [x] **Concentration:** top 6 persons = ~1,691 of 7,880 events (21%); no single person dominates. Savers are 6 distinct persons, flagged as low-n.
- [x] **Sparsity:** every rate carries its n. Everything downstream of the enrollment card is single-digit and marked unusable for trend.

## Instrumentation changes affecting this window (required)

From `analytics/INSTRUMENTATION_CHANGELOG.md`, every entry that touches this window:

1. **Bot/automation drop live only from 2026-07-09.** All traffic, DAU, WAU, cohort and retention numbers before 07-09 are bot-inflated in the denominator and retention-depressed. The window-over-window comparison below is contaminated on both sides and is **not interpretable as growth**.
2. **Grounded conditions split reached prod 2026-07-02.** `conditions_viewed` rows 06-27 to 07-02 are fetch-settle availability, not engagement. Conditions engagement is read from the 07-09+ clean slice only.
3. **`alert_optin_shown` volume is not comparable across 2026-07-10.** Items 13 to 23 shipped that day (prompt no longer suppressed by open drawer, re-offers, snooze instead of permanent dismiss, manual entry point, desktop card for the first time). The jump from ~1 shown to 13 persons shown is **surface changes, not user behavior**.
4. **Spot-sheet CTA re-weight to Save-first, 2026-07-09, 100%, no control arm.** The savers uptick (1 then, 6 now) is at least partly layout-driven; no causal read possible.
5. **First-touch props (`first_referrer`, `first_utm_*`) exist only from 2026-07-09**; acquisition uses `$referring_domain` on each person's first event instead (inline HogQL).
6. **`event_category` stamp completed 2026-07-09**; all queries filter by event name, not category, per the changelog's guidance for spanning windows.
7. **Email channel events all new 2026-07-10** (no prior series). **`next_window_viewed` widened to 100% 2026-07-10** (not cited here). **Experiment retirements 07-08/07-10**: no live A/B readouts remain.

## Growth accounting

| Metric | Current 14d (06-27 to 07-11) | Prior 14d (06-13 to 06-27) | Clean slice (07-09 to 07-11, ~2.5d) | Query |
|---|---|---|---|---|
| New users (first-touch) | 230 | 185 | ~48 (9 + 23 + 16) | inline HogQL (first_seen min-timestamp), no repo query exists |
| Active persons | 260 | 206 | ~55 | inline HogQL |
| WAU by week | 125 → 104 → 154 → 111 | (first two are prior window) | n/a | inline HogQL, `toStartOfWeek` |
| Returning share of DAU | ~6 to 12/day pre-07-09; 1 to 11/day post | n/a | 6, 1, 11 on the 3 clean days | inline HogQL |
| One-and-done | 213/260 = **82%** | n/a | window too short | inline active-days histogram (pattern of `retention_w1.sql`) |
| W1 retention (cohorts 06-27 to 07-04, full follow-up) | 21/140 = **15%** | Jun baseline was 13 to 17% | n/a | `analytics/queries/retention_w1.sql` |

**Read:** the apparent +24% new users window-over-window (185 → 230) cannot be claimed as growth: both windows are bot-inflated and the filter landed mid-window. The honest statement is that clean daily new users run ~13 to 16/day and WAU is flat within noise. W1 at 15% (n=140, bot-depressed denominator, Safari-ITP-censored numerator) sits exactly on the June 13 to 17% baseline: **retention has not moved yet**, which is expected since the enrollment redesign is 1 day old.

The 07-10 spike (23 new, 19 of them `$direct`, only 1 returning user that day) is unexplained: no UTM, no referrer, post-bot-filter. 5 of those 23 have returned since. Possibly a word-of-mouth share burst; not enough data to conclude.

## Acquisition: where new users come from

`$referring_domain` on each new user's first event (inline HogQL; `first_referrer` person props only exist from 07-09):

| Channel | New users, current 14d (n=230) | Prior 14d (n=185) | Notes |
|---|---|---|---|
| Direct | 186 (**81%**) | n/a | bookmarks, typed, word-of-mouth, messaging apps |
| Organic search (Google/DDG/Bing/Yahoo/Ecosia) | 37 (**16%**) | 17 (9%) | search referrals are unlikely to be bots, so this pair is the one semi-clean trend: roughly doubled, but n is small |
| Social (Facebook/Instagram) | 7 (3%) | 16 (9%) | tiny both windows |
| UTM-tagged (any campaign, ever) | **0** | 0 | no campaign has ever been run |

Repo-side acquisition evidence:
- **SEO surface is fully built but earning nothing measurable.** 140 static per-spot pages, sitemap with per-spot URLs, robots, canonical, per-spot OG images, JSON-LD. Yet pageview pathnames ex-owner this window: `/` 384 views / 231 persons, `/disclaimer` 1, **`/spot/*` zero**. Search users who do arrive land on `/`. ROADMAP item 4 (SEO indexing investigation) is parked with a recheck date of ~2026-07-20.
- **No referral loop.** 3 sharers / 6 share events in 14 days (`spot_action` action=share). Deep-link spot entries: 50 persons full window, only 14 post-bot-filter. ROADMAP item 9 (conditions-first share) is still `[proposed]`.
- **No paid, no content, no distribution work shipped.** Deliberate: ROADMAP says acquisition waits behind retention proof.

## Funnel: where users leak

Clean slice (2026-07-09 to 07-11) unless noted, distinct persons:

| Stage | n | Rate | Caveat |
|---|---|---|---|
| Landed (`$pageview`) | 46 | | |
| Opened a spot (`spot_viewed`) | 34 | 74% of landed | `queries/spot_open_rate.sql` |
| Genuinely viewed conditions (dwell-gated INTENT) | 30 | 88% of openers | `queries/conditions_engagement.sql` |
| Saved/watched a spot (`favorite_toggled`) | 3 (6 full window) | 9% of openers | Save-first CTA re-weight 07-09, partly layout-driven |
| Enrollment card shown (`alert_optin_shown`) | 13 | | volume jump is instrumentation (see above) |
| Dismissed the card | 12 | ~85% of shown | 14-day snooze, not permanent |
| Push granted | **0** | 0 of 13 | |
| Email submitted (`email_capture_submitted`) | 2 | 15% of shown | n=2, unusable for trend |
| Email confirmed | **0** | 0 of 2 | Supabase is rate of record, not queryable this session. Known deliverability problem: first send hit Outlook spam, DMARC still p=none |
| Returned via an alert (`alert_clicked` / server `alert_opens`) | **0** ex-owner, entire 14d | | server-side `alert_opens` owner-contaminated until D9 wiring lands |

**Activation is not the problem.** Three quarters of landers open a spot and nearly 9 in 10 openers genuinely read conditions. The leak is entirely between "engaged conditions-checker" and "re-reachable subscriber": 30 conditions viewers → 0 completed enrollments.

## Diagnosis, ranked by evidence strength

1. **Retention: users don't grow because they don't come back** (strong evidence, n=260 persons / n=140 W1 cohort). 82% one-and-done, W1 15%, flat against the June baseline. Growth in a flat-acquisition product is compounding returners, and there are almost none. Both numbers are floors (ITP purge and PWA partition make returners look new), but even a generous correction leaves most users gone after day one.
2. **The retention fix has zero completed enrollments so far** (strong evidence of state, weak evidence of cause: 1 day live). 13 shown → 0 push grants, 2 email submits → 0 confirms. The confirm step failing 2 of 2 alongside the known spam issue is the single most concrete broken link in the growth chain right now.
3. **Acquisition is a passive drip with no channel behind it** (strong repo evidence, moderate data evidence). 81% direct, zero campaigns ever, zero measured landings on 140 SEO pages, 3 sharers. This is a chosen strategy (retention first), so it explains flat top-of-funnel rather than indicting execution.
4. **Referral loop absent** (moderate, low n). Share is 3 persons/14 days and shared links land on a generic view. Word-of-mouth is already 81% of acquisition, entirely unassisted by the product.
5. **Search is the one organically improving channel** (weak, n=17 → 37). Directionally up, all landing on `/`. If the per-spot pages ever index, this is the cheapest volume available.

## Recommendations, ranked by expected impact

1. **Fix email confirm deliverability before anything else.** 0 of 2 ex-owner submits confirmed, and the owner's own test hit Outlook spam. Every enrollment the new card wins is currently lost at the last step. Verify SPF/DKIM alignment now, keep the DMARC bump to quarantine on the ~07-24 schedule, check Supabase `email_subscriptions` for unconfirmed rows and watch `email_confirm_failed` reasons.
2. **Wire the D9 push owner key and get the Supabase read working for the next report.** Push metrics and both durable retention queries are unreadable or owner-contaminated. The early-August retention read the whole strategy hangs on cannot happen without it.
3. **Ship ROADMAP item 9, conditions-first share.** Word-of-mouth is 81% of acquisition and the product does nothing to help it. The only acquisition work that does not violate the retention-first directive.
4. **Run the parked SEO indexing investigation on schedule (~07-20).** Zero `/spot/*` landings despite full SEO plumbing suggests the pages are not indexed at all (check Search Console coverage, sitemap submission). Cheap to diagnose, and search is the only channel trending up.
5. **Do not touch the enrollment card copy yet.** 13 shown / 12 dismissed is 2.5 days of data on a 1-day-old surface. At current traffic (~15 shown/week) a redesign decision needs 3 to 4 weeks of accumulation.

## Corrections to prior claims

- The 07-09 report's "1 save, 1 opt-in shown" is superseded, not contradicted: 3 more savers and 12 more opt-in exposures arrived after items 13 to 23 shipped 07-10. The increase is instrumentation and surface changes, not organic behavior.
- The "78% one-and-done" June baseline remains bot-inclusive; the ex-owner figure this window is 82% (n=260), itself churn-overstated by ITP/PWA censoring. Neither is a clean churn rate; both say the same thing directionally.

**Next real read:** early-to-mid August 2026, when 30 bot-clean days, the server-side retention cohorts, and a working email confirm path exist.

One advisory judgment call the data lead flagged: the raw 185 → 230 new-user jump was deliberately reported as non-interpretable rather than "+24% growth" because the bot filter landed mid-window; only the search-referred subseries (17 → 37) is trend-worthy. I agree with that call.
