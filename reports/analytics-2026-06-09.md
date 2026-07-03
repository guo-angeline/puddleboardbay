# Paddle to Water — Product Analytics Report

*Source: PostHog project 458289 (US). Window: 2026-06-07 to 2026-06-09 (~2 days). 457 events, 48 users. Generated 2026-06-09.*

---

## Read this first: the data is launch-week thin

Analytics went live ~2 days ago. 48 users is enough to see behavior shapes, not enough to trust rates to the decimal. Treat everything here as directional. Anything needing weeks (true retention curves, cohort LTV) is flagged as "not yet measurable." The structural findings, where users drop off and what they ignore, are already clear and worth acting on.

---

## TL;DR

1. **Browse-only product.** 39% of visitors open a spot, read the notes, then leave. Almost nobody acts: **0 saves, 1 "Get Directions" click, 3 "Photos"** across all 48 users.
2. **The retention hook is dead on arrival.** `favorite_toggled` fired **zero times**. The one feature meant to bring people back is unused.
3. **Mobile-first, iOS-heavy, direct traffic.** 76% mobile, iOS Safari the top browser, 32 of ~37 sessions land direct. The 140 SEO spot pages drive **no** organic or deep-link traffic yet.
4. **iOS install is a wall.** 33 iOS install prompts, **0 installs**. Android: 9 prompts, 1 install.
5. **Demand clusters on East Bay flatwater** (Lake Merritt, Shadow Cliffs). Beginners on calm water are the core audience.

---

## Adoption

| Day | Pageviews | Users |
|-----|-----------|-------|
| Jun 7 | 24 | 23 |
| Jun 8 | 20 | 19 |
| Jun 9 (partial) | 6 | 10 |

- **Device:** Mobile 28 users, Desktop 8, Tablet 1. ~76% mobile.
- **Browser/OS:** iOS Mobile Safari (17) leads, then Chrome on Linux/Android (5 each), Chrome iOS (4). Confirms a phone-in-hand, often-at-the-water use case.
- **Acquisition:** `$direct` 32. Trickle from facebook (2), instagram (1), bing (1). No Google organic.
- **Landing page:** Effectively everyone lands on `/` (35 users). The static `/spot/[id]` pages get **no** landing traffic, so SEO and shared links aren't working yet.
- **Geolocation opt-in:** 3 toggles, 1 grant, 1 user denied twice. Too small to read, but "Near me" is barely used.

**Takeaway:** acquisition is word-of-mouth and a bit of social. The biggest dormant channel is the 140 spot pages, which should be SEO and share magnets but currently pull nothing.

---

## Retention

- **Not yet measurable** as a curve. Only 2 days of data.
- Early proxy: **44 users active 1 day, 4 active on 2 days.** ~8% came back the next day. Low, but launch-week numbers with no return-trigger in place.
- The intended retention mechanism (saved spots) has **zero usage**, so there is currently no built-in reason to return. A paddler gets the info once and is done.
- **What would predict return** (per the instrumentation's own hypothesis) is saving spots or installing the PWA. Both are near-zero, so neither is doing its job yet.

**Takeaway:** the product is a one-shot reference, not a habit. Recurring value (conditions, trip lists, fresh content) is the gap. This is exactly what planned V1/V2 features address.

---

## Click-through & engagement

The core funnel (unique users):

```
Pageview            36   ████████████████████  100%
Opened a spot       14   ████████               39%
Changed a filter     9   █████                  25%
Searched             2   █                        6%
Saved a spot         0                            0%
```

Inside the spot drawer (autocapture clicks):

| Action | Clicks | Users |
|--------|--------|-------|
| Close (×) | 47 | 10 |
| Read more (notes) | 18 | 7 |
| Photos | 3 | 3 |
| Get Directions | **1** | 1 |
| Share | 0 | 0 |
| Save | **0** | 0 |

- People **open spots and read** (55 `spot_viewed`, 18 "Read more"). The content is the draw.
- They **don't convert**. "Get Directions," the real job-to-be-done ("can I paddle here, how do I get there"), got **one click**. The primary CTA is buried in a row of four equal-weight buttons.
- **Mobile users prefer the list:** 8 switches to List vs 2 to Map. The map may be hard to use on a phone.
- **Search** is tiny (2 users) and the events are noisy: the 500ms debounce captures mid-typing fragments ("Co", "Conu", "Jenk") that show as zero-result searches. Real searches ("Napa" → 5, "Jenkinson lake" → 1) found results. **No genuine content gaps surfaced.**

**Takeaway:** engagement dies at the moment of intent. The drawer is a reading pane, not an action surface.

---

## Personas & segmentation

Person-properties exist for the 10 users who took a persona-setting action. Small sample, directional only:

- **Skill level:** preferred difficulty = flatwater (4), river (1). Plus most-viewed spots are flatwater. **The core user is a beginner/calm-water paddler.**
- **Budget-conscious:** 3 of 10 set `prefers_free` (used the "Free only" filter). A real, sizable segment.
- **Local vs planner:** only 1 used geolocation, 1 installed the PWA. Region preferences spread evenly (East Bay, SF, Peninsula, Sacramento, Central Valley), suggesting **trip-planners browsing regions**, not locals checking one home spot.
- **Committed users:** essentially none. 0 savers, 1 PWA install.

Three working personas from the data:

1. **The Beginner Browser (largest).** On mobile, opens a few flatwater spots near a city, reads the notes, leaves. Wants reassurance a spot is calm and easy. Doesn't save or install.
2. **The Budget Planner.** Filters to free spots, compares a few regions. Price-sensitive, planning an outing.
3. **The Would-Be Regular (aspirational, near-zero today).** The user the save/PWA features were built for. Not materializing because those features give no payoff yet.

**Takeaway:** build for the beginner-on-mobile-planning-an-outing. The "regular" only appears once there's a reason to come back.

---

## How to improve the product

Ranked by impact-to-effort. Each tagged with rough effort.

### A. Fix what the data can't currently see (instrumentation)

1. **Verify and elevate "Save."** Zero saves in 2 days is suspicious. First confirm `favorite_toggled` actually fires (the heart may be hard to find or broken on mobile). *(S)*
2. **Track the intent buttons explicitly.** Share, Get Directions, and Photos are the real conversion signals and are only visible via autocapture. Add `track()` calls so you can build a proper "intent" funnel. *(S)*
3. **Clean up search tracking.** Fire `spot_search` only on a settled query (or longer debounce / min length) and add a `no_results` boolean. Right now mid-typing fragments pollute the data. *(S)*

### B. Product / UX

1. **Make "Get Directions" the dominant CTA.** It's the job-to-be-done and got 1 click because it's one of four equal buttons. Promote it to a full-width primary action; demote Share/Photos. **Highest-leverage UX fix.** *(S)*
2. **Give "Save" a reason to exist, or cut it.** A bare bookmark with no payoff is ignored. Reframe as a "trip list" (plan a day, multiple spots) or tie it to offline access. If it stays low after that, remove it and reclaim the UI. *(M)*
3. **Fix the iOS install flow.** 33 prompts, 0 installs. iOS can't auto-install, so a generic banner just annoys. Either show a precise "tap Share → Add to Home Screen" animation, or cap the prompt to once per user. Re-prompting every session is hurting more than helping. *(S)*
4. **Treat the list as the mobile primary.** Mobile users keep switching to List. Consider defaulting mobile to List, and invest in card quality (distance, beginner-friendliness, key tags at a glance). *(M)*
5. **Lean into beginners and calm water.** Demand concentrates on East Bay flatwater (Lake Merritt, Shadow Cliffs). Add a "good for beginners" signal and make calm-water spots easy to find first. *(M)*
6. **Notes are your best asset, so show more.** 18 "Read more" clicks from 7 users means the 150-char mobile truncation forces a tap on nearly every spot. Show more by default and keep enriching notes (put-in, parking, conditions). *(S)*

### C. Growth / retention

1. **Turn on the SEO/share channel.** All traffic lands on `/`; the 140 spot pages pull nothing. Add `og:image` (still unset per CLAUDE.md) so shared links render, submit the sitemap, and make each spot page share-worthy. This is the single biggest untapped acquisition lever. *(M)*
2. **Ship a reason to return.** Retention is ~8% because the app is a one-time lookup. The planned **tide/wind overlay (V2) is the strongest hook**: conditions change daily, paddlers check repeatedly. Prioritize it over ratings/trip-reports for habit formation. *(L)*
3. **Seed the communities already sending traffic.** FB/IG referrals exist; local SUP and paddling groups are the natural acquisition pool while SEO ramps. *(S)*

---

## Appendix: key queries (HogQL, project 458289)

```sql
-- Overall window & volume
SELECT count(), count(DISTINCT person_id), min(timestamp), max(timestamp) FROM events;

-- Event breakdown
SELECT event, count(), count(DISTINCT person_id) FROM events GROUP BY event ORDER BY 2 DESC;

-- Core funnel
SELECT count(DISTINCT if(event='$pageview',person_id,NULL)) AS pv,
       count(DISTINCT if(event='spot_viewed',person_id,NULL)) AS viewed,
       count(DISTINCT if(event='filter_changed',person_id,NULL)) AS filtered,
       count(DISTINCT if(event='favorite_toggled',person_id,NULL)) AS saved
FROM events;

-- Drawer button clicks (autocapture)
SELECT properties.$el_text, count(), count(DISTINCT person_id)
FROM events WHERE event='$autocapture' AND properties.$event_type='click'
GROUP BY 1 ORDER BY 2 DESC;

-- Top spots
SELECT properties.spot_name, properties.region, count()
FROM events WHERE event='spot_viewed' GROUP BY 1,2 ORDER BY 3 DESC;

-- PWA funnel
SELECT properties.platform, countIf(event='pwa_prompt_shown'), countIf(event='pwa_installed')
FROM events WHERE event LIKE 'pwa_%' GROUP BY 1;

-- Personas
SELECT count(),
  countIf(properties.prefers_free=true), countIf(properties.uses_geolocation=true),
  countIf(properties.installed_pwa=true), countIf(properties.saves_spots=true)
FROM persons;
```
