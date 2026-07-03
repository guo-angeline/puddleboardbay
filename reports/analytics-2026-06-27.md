<!-- analytics-report -->
# SUP Spots: analytics readout

> **Correction (2026-06-29):** the "conditions" claims below ("96 saw live conditions", "1,157 views ~12 each", "91% of openers") conflated fetch-success and spots-per-user with engagement — `conditions_viewed` fired on every spot open when the fetch settled, not when a user looked. The defensible finding is conditions **availability** (~91% of opens load without failure), a reliability metric. True engagement is now measured by a dwell-gated `conditions_viewed`; the two are not comparable across this date. See `analytics/INSTRUMENTATION_CHANGELOG.md` and `analytics/GLOSSARY.md`. Body left unedited as a historical record.

**Window:** Jun 7–27, 2026 (20 days) · **Source:** PostHog project 458289 (US) · **Generated:** 2026-06-27

## How many users
- **286 people**, 6,174 events. Steady **~18 DAU** (range 10–28), no growth trend, flat.
- **~14 brand-new users/day**, every day. Almost all traffic is first-timers.
- **77% mobile** (219), 21% desktop (64), 2% tablet. Mobile-first is correct.
- **Traffic is 82% direct** (203/247 pageview users). Google sent **10 users**, social ~25. The 140 SEO pages from C1 aren't ranking yet (too recent). Growth today is word-of-mouth / shares, not search.

## Retention: the core problem
- **78% are one-and-done** (223/286 active on a single day).
- Only **63 users (22%)** ever returned on a 2nd day. 22 came 3+ times.
- **Next-day return: 7%** (20/286). **W1 retention: 13–17%** (Jun 7 cohort 16/95; Jun 14 cohort 14/111; Jun 21 cohort censored).
- People find a spot, look once, and don't come back. No reason to return yet.

## The funnel (where people fall out)
```
247 landed (pageview)
 → 105 opened a spot        (42%)   ← 142 bounce without opening anything
 →  96 saw live conditions  (91% of openers — this part works great)
 →  15 took a real action   (6% of landers, 14% of openers)
```
- **spot_action is tiny:** photos 20 (11 users), **directions 6 (5 users)**, share 3 (1 user).
- "Get Directions" is the true "I'm actually going" signal, and **5 people in 20 days** clicked it. That's the conversion to fix.

## What's working
- **Conditions is the star.** 1,157 views across 96 users (~12 spots' conditions per engaged user). Nearly everyone who opens a spot checks it. This is the differentiator and it's used heavily.
- Paddle-ability read: **breezy 569 / calm 524 / windy 62**. ~Half of checks show breezy-or-windy. Worth testing whether wind readings suppress directions clicks.

## Underused features
- **Favorites: 6 users** (23 toggles). Near-dead.
- **Near-me: 10 users** (11 granted, 5 denied permission, 3 disabled).
- **PWA install is broken/untracked: 182 prompted, 1 installed.** On iOS (most of the mobile base) there's no `beforeinstallprompt` and "Add to Home Screen" is manual, so installs basically aren't captured.
- **Feedback opened: 3 users** (4 times).

## Top spots viewed
Shadow Cliffs (34) · Foster City Lagoons (31) · Quarry Lakes (30) · Schoonmaker Beach (27) · Lake Elizabeth (27) · Stevens Creek (25) · Lexington Reservoir (24) · Del Valle (24) · Vasona Lake (24) · Elkhorn Slough (21) · Lake Merritt (20).

## Gaps & opportunities (ranked by leverage)

**1. Retention has no hook yet — build the return reason.** Conditions is what people love but they check once and leave. The play: **favorites + "notify me when it's calm here"** (push via PWA). Turns a one-time lookup into a recurring reason to open the app. Favorites used by 6 people = the save loop isn't surfaced.

**2. Fix the 58% landing bounce.** 142 of 247 never open a single spot. On mobile, consider auto-opening the nearest spot or a "spots near you" prompt on load (near-me works when asked, just nobody asks).

**3. Directions is the conversion and it's invisible.** 5 users in 20 days. Either the button is buried in the drawer or wind is deterring. A/B placement + cross-tab directions-clicks against calm-vs-breezy conditions.

**4. PWA install tracking is blind on iOS.** Add an iOS "Add to Home Screen" instruction step and track that flow explicitly. Right now you can't tell if the install play works at all.

**5. SEO is planted but not sprouted.** 10 Google users. Expected this soon after C1. Recheck organic in 4–6 weeks; if still flat, the spot pages aren't indexing.

## Instrumentation gaps
- `spot_viewed` fires from two call sites (list vs map pin) with no `source` prop — can't tell which surface drives opens. Add `source: "list" | "map" | "url"`.
- No outbound event when a directions/share click actually leaves the app.
- `conditions_viewed` already carries `failed` and `paddleability` as props — good, no gap there.
