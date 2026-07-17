# Instrumentation changelog

Append-only record of every analytics change. **Read this before any analysis.**
A metric can move because the logging changed, not because users did — this log
is how you tell the difference.

Each entry: date · event(s) · change type (`added` / `renamed` / `removed` /
`semantics-changed` / `props-changed`) · what & why · **Comparability** (which
metric is discontinuous, and from when).

The guard hook (`scripts/check-instrumentation-changelog.py`) reminds you to add
an entry whenever `lib/analytics.ts` or any `track`-bearing file is edited
without touching this file.

---

## 2026-07-17 (item 53 decouple): conditions panel renders wind/tide independently; conditions_viewed `had_data` semantics REFINED (props-values-changed)

**`conditions_loaded` UNCHANGED:** still fires once per spot when BOTH sources settle, same props. `has_tides` (`t.ok && t.tide !== null`), `has_wind` (`!!windInfo`), `failed` (both errored), and `latency_ms` (both-settled) all keep their prior meaning; only the internal plumbing changed (getConditionsRun exposes the two source promises the panel already waited on).

**`conditions_viewed` `had_data` REFINED.** Old value: `!!d && !d.failed`, i.e. "the combined result resolved and not BOTH sources errored". New value: `!!windInfo || !!tideInfo`, i.e. "at least one source actually returned data". The difference bites in one case: a spot where a source returned `ok` but empty (e.g. wind resolved with no forecast period, or a non-tidal spot) while the other errored counted as `had_data: true` before (not fully failed) but counts as `had_data: false` now (no real data to look at). The new reading is the intended one, whether the viewer saw actual conditions.

- **Comparability: `conditions_viewed`'s `had_data: true` rate may tick DOWN slightly from 2026-07-17, because the flag now requires real data, not merely "not fully failed".** This is a definition tightening, not a drop in views or engagement; `conditions_viewed` still fires on the same dwell-gated genuine view, same trigger. Do not read the shift as users looking at conditions less. The `paddleability` prop is unchanged (still wind-derived).

---

## 2026-07-17 (item 53 slice): tide fast-fail; conditions_loaded `latency_ms` tail SHRINKS on tidal spots (no event/props change, semantics-note)

**No event added, no props change, no `lib/analytics.ts` edit.** `conditions_loaded.latency_ms` measures the whole `getConditions` settle, which waits on the slower of tide/wind (`Promise.allSettled`). Before this change, a flaky NOAA could hang the `/api/tides` proxy for its full timeout + retry (~13s in prod), so `latency_ms` had a long tail on `tide_sensitive` spots even though wind resolved in ~100ms. The client now aborts the tide fetch at 4s and the proxy per-attempt timeout dropped 6s -> 2.5s, so the worst-case tide wait is bounded.

- **Comparability: `conditions_loaded.latency_ms` p95/p99 STEPS DOWN on tide_sensitive spots from 2026-07-17, because the upstream wait is capped, not because the app or user got faster in the happy path.** The healthy-NOAA median is unchanged (it was already fast). Do not read the tail improvement as a general speed win; it is specifically the removal of the multi-second tide-hang tail. A side effect: on tidal spots during a NOAA outage, `has_tides:false` now settles by ~4s instead of ~13s, so the `has_tides` false-rate timing shifts earlier (the rate itself is governed by NOAA uptime, unchanged). `has_wind` and the fire condition are untouched.

---

## 2026-07-17 (item 52): tide fetch moved to a same-origin proxy; conditions_loaded `has_tides` availability RISES (no event/props change, semantics-note)

**No event added, no props change, no `lib/analytics.ts` edit.** This is a reliability fix, recorded here because it moves a metric an analyst reads. The browser used to fetch NOAA tide predictions directly; NOAA sends the CORS header only intermittently, so on `tide_sensitive` spots the tide fetch was silently CORS-blocked roughly half the time and `fetchTides` rejected, making the `conditions_loaded` event carry `has_tides: false` even though a station existed. From this date tides go through `/api/tides` (server-side, no CORS, with a timeout + one retry), so the fetch succeeds whenever NOAA is up.

- **Comparability: `conditions_loaded`'s `has_tides: true` rate STEPS UP on tide_sensitive spots from 2026-07-17, and this is availability recovering, not users changing behavior or the tide data changing.** `has_wind` is unaffected (weather.gov always sent CORS). Any downstream cut of "conditions completeness", "% of opens with tides", or the `had_data`/`paddleability` mix on tidal spots is discontinuous at this date: do not read the rise as more/newer tide-having spots or more user interest. `failed` (both sources down) should also tick slightly lower since one whole failure mode is removed. The fix does not change WHEN `conditions_loaded` fires (still once per drawer fetch settle, SYSTEM), only how often tides are present in it.

---

## 2026-07-17 (item 7): filter_changed reused for the two new scoped empty-state clears (no new event, no props-change)

**No new event added, no props change.** Defect C's scoped clear buttons (`clearSearchOnly` in `components/HomeClient.tsx`, fired by the "Clear search" empty-state button, and `clearStructuredFilters`, fired by "Clear filters" when search is empty) both call `trackIntent("filter_changed", { cleared: true })`, the exact same event name and payload `handleClearAll` already emits for the full clear.

- **Comparability: `filter_changed` with `cleared: true` now fires from three call sites instead of one, same event, same props, no new field to segment by.** A row can no longer be read as "the user cleared everything": before this date it always meant a full clear (region + difficulty + freeOnly + search all reset), from this date it can also mean a search-only or filters-only scoped clear. This is a real ambiguity for anyone trying to measure "full reset" volume specifically, but it does not create a discontinuity in the raw `filter_changed`/`cleared:true` count, a search-only clear that previously would NOT have fired this event (the old single "Clear filters" button used to wipe search silently as part of one `handleClearAll` call) now generates its own event where before it was folded into whatever click preceded it. Net effect is a small, expected VOLUME INCREASE from this date, not a semantics break: do not read a `cleared:true` uptick after 2026-07-17 as more people resetting their whole search, it is finer-grained scope on the same underlying gesture.

---

## 2026-07-17 (item 7): near_me_toggled outcome path documented as the denied-message impression signal (semantics-note)

**No new event added. `lib/analytics.ts` was not touched.** This is a documentation-only entry: it records that the existing `near_me_toggled` event, with `outcome: "denied"` or `outcome: "unsupported"`, is now ALSO read as the impression signal for the new visible location-denied recovery banner added by the filterbar-denied-message task (Defect A).

`near_me_toggled` already fires at the exact two points that set the geolocation error state: `components/HomeClient.tsx` line 401 (`outcome: "unsupported"`, geolocation API missing) and line 418 (`outcome: "denied"`, permission denied). The banner renders directly off that same error state, so the two are 1:1: every `near_me_toggled` row with `outcome: "denied"` or `outcome: "unsupported"` corresponds to one render of the visible denied message, and there is no render of the message without one of these rows.

- **Comparability: the firing condition of `near_me_toggled` is byte-for-byte unchanged.** It still fires once per Near Me tap that resolves to `denied` or `unsupported`, at the same two call sites, with the same props. No series is discontinuous, no volume shift is expected from this entry, and historical rows already satisfy this reading, no backfill is needed. This entry only changes how an analyst interprets an already-existing outcome value, not what causes it to fire.

---

## 2026-07-16 (item 47): new SYSTEM event enrollment_prompt_suppressed; alert_optin_shown volume DROPS (added, semantics-changed)

**`enrollment_prompt_suppressed` ADDED, SYSTEM category** (`event_category: "system"`). Props: `trigger` (the trigger that would have fired: `first_save`/`standalone_relaunch`/`manual`/`return_session`/`conditions_interest`), `platform` (`standalone`/`ios`/`android`/`desktop`/`unknown`), `reconciled_this_session` (bool). It records the app declining to render an enrollment prompt because this device is a confirmed email subscriber. It is never engagement, no user action drives it. `reconciled_this_session` tells a fresh server-reconciled suppression (the confirmed flag was just read from `/api/email/opened` this pageload) from one read off an older cache, so it is possible to tell a correctness check from a stale flag later.

**`alert_optin_shown` SEMANTICS-CHANGED from this date.** The firing condition narrows: confirmed email subscribers no longer generate `alert_optin_shown` impressions on any of the four triggers, because item 47 suppresses the prompt for them instead of re-showing it.

- **Comparability: the email enrollment funnel denominator is wrong for the ENTIRE life of the bug**, from the email channel shipping (2026-07-10, per this file's item 34-adjacent history and `reports/analytics-2026-07-11.md`) through this deploy. Until this date every enrollment gate read push state only (`readStashedSubscription`, `lib/push.ts`), so a confirmed EMAIL subscriber was re-prompted on every trigger and every one of those impressions fired `alert_optin_shown`. Those are phantom impressions that should never have existed. Do not compare enrollment rates across this deploy date; the pre-date denominator in `queries/alert_optin_funnel.sql` includes them and the post-date one does not.
- **Comparability, two-cohort statement, both readings.** OWNER-INCLUSIVE: `alert_optin_shown` drops, and the drop is the fix working, not a regression, because the owner is a confirmed subscriber and stops being re-prompted. EX-OWNER: the predicted drop is ZERO, because there are zero confirmed subscribers ex-owner. `reports/analytics-2026-07-11.md` records 2 `email_capture_submitted` and 0 `email_capture_confirmed` in 14 days, and `analytics/EXCLUDED_PERSONS.md` lists both confirmed addresses (`qig6789@gmail.com`, `qiguo1102@live.com`) as the owner's. Standard queries exclude the owner, so the ex-owner reading is the one an analyst will actually see: **a material ex-owner drop after this deploy is OVER-SUPPRESSION, i.e. a bug, not the fix landing.**
- **The eligible cohort is N=1 (the owner), so the post-deploy read is a correctness check, not a statistical result.** Baseline for `alert_optin_shown` is a range, not a point: use ~15/week as the conservative figure and carry the range up to ~36/week (the 2026-07-11 report's own funnel table, 13 shown in roughly one day after the 07-10 surface changes, implies the higher number; that report attributes the volume to those surface changes, so neither end is a settled organic baseline).
- **Guardrails to watch: `alert_optin_shown` segmented by `trigger`, and `enrollment_prompt_suppressed` volume.** `trigger:"manual"` goes to ZERO for this cohort BY DESIGN, the "Turn on alerts" entry point hides once alerts read as on (D18 Q2(c)), which is exactly why `enrollment_prompt_suppressed` volume is the only signal that would catch an over-suppression once the manual trigger is gone.
- **The `t` (subscription token) param strip did NOT land with this entry's deploy.** As of this entry's original writing, `$current_url` still carried a live `t=` value on every email arrival. The strip landed 2026-07-17; see that entry below for the actual cutover date. Do not read a `$current_url` discontinuity for `t=` as starting on this (2026-07-16) date.
- **Correction: the `alert_optin_shown` narrowing described above also did NOT take effect on 2026-07-16, for the same root cause as the token-strip gap.** `cacheEmailSubscriptionState` (`lib/email/subscriptionState.ts`) had zero production callers until the 2026-07-17 entry's `HomeClient.tsx` wiring landed, so `isEmailConfirmed()` could never return true, `enrollment_prompt_suppressed` could never fire, and a confirmed email subscriber kept generating `alert_optin_shown` impressions on every trigger through 2026-07-16. Read the narrowing as taking effect 2026-07-17, not this date. The Comparability readings above (ENTIRE life of the bug, both cohort readings, the N=1 correctness-check framing) all still hold, they just anchor to the 2026-07-17 cutover, not this one.
- **No other event was added, removed, renamed, or had its firing condition moved.** `email_alert_opened`, `email_capture_confirmed`, and the server-side `email_opens` ledger keep their exact firing conditions, so those series are continuous across this date.

## 2026-07-17 (item 47 follow-up): `t` param strip ships; enrollment_prompt_suppressed ordering fix; alert_optin_dismissed no longer fires for the youreSet card (props-changed, semantics-changed)

**The `t` (subscription token) strip now actually ships.** `components/HomeClient.tsx`'s `from === "email"` deep-link branch now calls `params.delete("t")` and `window.history.replaceState(...)` synchronously, right after firing the `/api/email/opened` ping and before `PostHogProvider`'s mount effect runs (it renders after `{children}` in `app/layout.tsx`, so it fires later in the same commit). **`$current_url` stops carrying a live `t=` value on email arrivals from this date.** This is the actual cutover referenced by the 2026-07-16 entry above and by `queries/token_leak_check.sql` (D18 legal gate action 2); do not read pre-2026-07-17 `$current_url` rows as clean.

**Same deep-link branch now also caches the resolved `{known, confirmed}` state client-side** (`cacheEmailSubscriptionState`, `lib/email/subscriptionState.ts`), and the `?email_confirmed=1` landing caches `confirmed:true` directly. This is what makes `isEmailConfirmed()` (and therefore `enrollment_prompt_suppressed` and the `alertsOn` indicator in `SpotList.tsx`) actually reachable in production; before this date the cache had zero production writers, so the item-47 suppression logic could never fire outside a test with hand-seeded `localStorage`.

**`enrollment_prompt_suppressed`: semantics-changed (firing condition narrowed for `return_session` and `conditions_interest`).** Those two gates previously called the suppression check BEFORE the opt-out/eligibility check (snooze, hard-denial, saved-spot count), so a confirmed subscriber emitted `enrollment_prompt_suppressed{trigger:"return_session"}` or `{trigger:"conditions_interest"}` on every qualifying pageload/event, including ones where no prompt would ever have shown (e.g. fewer than 2 saved spots, or already snoozed). The check now runs after eligibility, matching the `standalone_relaunch` gate's existing pattern. **Comparability: `enrollment_prompt_suppressed` volume for these two triggers drops from this date, and the drop is the fix working** (removing phantom no-op suppressions), not fewer real suppressions. Because D18 made this event's volume the only guardrail once `trigger:"manual"` goes to zero, a pre-2026-07-17 volume read for these two triggers overstates true suppression activity and must not be compared directly to post-2026-07-17 volume.

**`alert_optin_dismissed`: semantics-changed (no longer fires for the youreSet terminal card).** The manual entry point's defensive "You're set." card (a confirmed subscriber somehow still reaching `ptw:enablealerts`) never calls `setTrigger`, so its dismiss previously fired `alert_optin_dismissed` carrying whatever `trigger` value was last set (in practice the initial `"first_save"` default), with no matching `alert_optin_shown` impression. That fabricated row is gone from this date. **Comparability: this path is expected to be near-zero volume** (D18 Q2(c) means the manual entry point normally hides for confirmed subscribers before this card can ever render), so no visible step-change is expected in `alert_optin_dismissed` totals; recorded for completeness so a future analyst does not need to re-derive why a `trigger:"first_save"` dismiss with no matching shown ever existed.

- **Correction, same date: the `t` strip above was itself incomplete for one arrival shape.** `components/HomeClient.tsx` nested the entire `from === "email"` handler, including the `params.delete("t")` / `history.replaceState` strip, inside `if (found)` (`found = ALL_SPOTS.find(...)`), and `lib/spots.ts` filters `hidden` spots out of `ALL_SPOTS`. An email link to a spot hidden AFTER the alert send therefore still left a live `t=` in `window.location` for `PostHogProvider` to capture into `$current_url`, and no `$current_url` discontinuity happened for that arrival shape at all. Not hypothetical: spots 76 and 79 were hidden 2026-07-16, one day before the strip landed. Fixed later the same day (2026-07-17) by hoisting the token-strip block above the `if (found)` guard, so it now runs on every `from=email` arrival with a token regardless of whether the spot resolves; `reportEmailOpen` is called without a `spot_id` when the spot does not resolve. **Comparability: the "`$current_url` stops carrying a live `t=` value on email arrivals from this date" claim above is only fully true from this correction's deploy, not from the strip's initial deploy earlier the same date.** `queries/token_leak_check.sql`'s `leaked_events must be 0` check should be read as verifying this later commit, not the first one. This correction touches only the hidden-spot-arrival path; the confirmed-spot path this entry already describes was correct from its original deploy.

---

## 2026-07-17 (item 39, D20): owner-rating experiment removed; ratings render at 100% (semantics-changed)

**No event added or removed.** The `owner-rating` feature flag and its `owner_rating` entry in `lib/experiments.ts` are gone; `SpotDrawer` renders the owner rating unconditionally whenever a spot has one.

Why: the owner directed item 39 to 100% (D20). A flag pinned at 100% is vestigial, and worse, it gated an editorial content surface on PostHog resolving a feature flag, so ratings would silently not render for anyone who blocks analytics.

- **`experiment_exposed` with `experiment="owner_rating"`: this never fired in production** (the flag was never created, so the gate never resolved to treatment and the feature never rendered live). No historical series is lost. From 2026-07-17 the feature renders for everyone and there is no exposure event for it.
- **`spot_action.owner_rating` and `spot_action.owner_rating_shown` are unchanged and still emitted.** `owner_rating_shown` is now simply "does this spot have a rating" (true whenever the rating renders), since there is no arm to distinguish. Comparability: before 2026-07-17 `owner_rating_shown` could in principle have been false-in-treatment for an unrated spot; in practice, since the feature never rendered live before today, the field is only meaningful from 2026-07-17 forward.
- **Comparability: item 39 has no A/B readout.** There is no control arm. Analyse engagement with rated vs unrated spots via the `owner_rating` prop, segmented by region (North Bay discriminates, East Bay does not; see docs/experiments/owner-rating.md).

---

## 2026-07-16 (item 39): `spot_action` gains `owner_rating` + `owner_rating_shown`; new `owner-rating` experiment (props-changed)

**No event added, removed, or renamed.** `spot_action` gains two props, and a new experiment arm starts logging `experiment_exposed` with `experiment: "owner_rating"`.

Why: item 39 ships the owner's 117 hand-entered 1-5 spot ratings into the spot drawer behind the `owner-rating` flag. `spot_action` now carries `owner_rating` (the value, or `null` when the spot is unrated) and `owner_rating_shown` (bool: did the rating actually render for this user). Both are on `spotEventProps` in `components/SpotDrawer.tsx`, so every `spot_action` carries them, in both arms. This lets the readout ask the real hypothesis (do people act more on higher-rated spots?) without joining back to `spots.json`, and segment by region, which is where this field's signal lives or dies.

- **Comparability: `spot_action` counts are unaffected.** Props were added, not changed; no firing condition moved. Pre-2026-07-16 `spot_action` remains directly comparable. The two new props are simply absent before this date, so filter on presence, not on value, when windowing.
- **`owner_rating: null` is not "unrated arm", it is "unrated spot".** 25 of 142 spots carry no rating: 24 are deliberately blank because the owner has not paddled them, and spot 92's was removed by the legal gate (private business dock). Use `owner_rating_shown` to tell arm/render from data absence. Never coerce a null rating to 0: it would read as a 0-of-5 verdict on a spot we simply have no opinion about.
- **This field is a population of ONE.** It is the owner's personal rating, not an aggregate, and there is no review count behind it. Any report phrasing it as "average rating", "user rating", or "site rating" is wrong. `lib/spots.test.ts` guards the rendered tree against aggregate framing.
- **It is NOT the item 39 weighted score, and the two must never be blended.** The rubric (D15) scored the PUT-IN; this rates THE PADDLE. They correlate at 0.04 (researcher A) and -0.10 (B), while A and B correlate 0.52 with each other. They are answers to different questions, not two estimates of one quantity. The computed rubric stays cut per D16.

**Read `reports/paddle-score-owner-ratings-2026-07-16.md` before reporting this experiment.** The ratings only discriminate in the North Bay (n=45, spread 1.9 vs. the pre-committed 1.5 threshold). All 29 East Bay ratings sit inside a 0.4-wide band, making treatment there close to a null. **A flat pooled result is the predicted outcome, not a finding.** Segment by region, and report the North-Bay-only read alongside the pooled one. The owner directed the full-scope ship on 2026-07-16 with this analysis in hand; the flat East Bay was known before launch, so do not later report it as a discovery.

---

## 2026-07-16 (item 34): all 7 alert-email variants rewritten; push + interstitial copy reframed (semantics-changed, no event touched)

**No event was added, removed, or renamed. Every event keeps its schema.** What moved is the MEANING of an existing dimension: `email_alert_opened.v` (0-6) and the `v=` deep-link tag segment by copy variant, and all seven variants were rewritten on 2026-07-16. **The variant index means different copy before and after this date.**

Why: item 34 (legal gate). The alerts are the site's one affirmative "conditions are good" representation, and the copy shipped until today included "Time to launch" / "{spot} looks good right now. Go while it lasts." on the push that fires at window open. That is a time-pressured directive to get on the water at the moment of the decision. All directive and urgency language is gone across the launch-reminder push, the evening alert push, the interstitial, and all seven email variants; the canonical safety line ("Guidance only, not a safety guarantee. Conditions shift fast on the water.", quoted verbatim from `ConditionsPanel.tsx`, never a second wording) now renders on the email footer, the interstitial, and the enrollment card. Pushes carry only its second sentence, last, because the full line would push the window hours out of the ~120 visible characters and losing the hours is worse for safety than losing half the caveat.

- **Comparability: per-variant reads do not cross 2026-07-16.** Treat pre-2026-07-16 per-variant data as a closed series. Variant index 4 changed angle entirely (`window-scarcity` became `your-watchlist`, because manufactured scarcity is the exact thing item 34 removes), so index 4 is not the same experiment arm before and after. Every other index changed wording materially. Any `email_alert_opened` read segmented by `v` must be windowed to one side of this date or the other.
- **Comparability: alert open/click rates may move as a copy effect, not a behavior change.** Removing urgency from a notification plausibly LOWERS tap-through, and that is the intended trade, not a regression. Do not read a dip in `alert_clicked` or `email_alert_opened` after 2026-07-16 as disengagement without accounting for this entry. The guardrail that matters is whether people still return, not whether they tap faster.
- **`alert_interstitial_shown` is unchanged in both count and trigger.** The launch-reminder deep link still omits the `window` param, so the interstitial still does not render on a reminder tap (see the known gap below). Nothing about its firing moved.
- **`launch_tip_shown` unchanged in trigger and count** (item 36's gating logic is untouched: still omitted below 5 mph or when direction is variable/absent). Its TEXT changed: "Head out toward the {direction} so the wind helps push you back." became "Wind is from the {direction}. An upwind start leaves the downwind leg for the way back." The legal gate caught the old wording after item 34's first pass had already declared the inducement dead: it is an imperative, it rendered one line ABOVE the safety disclaimer on both the email and the interstitial, and "so the wind helps push you back" is an affirmative representation that the paddler will be able to RETURN, derived from one peak-wind number. It also broke this repo's own stated rule ("tips teach skill, they never instruct action"), which item 41's tips were held to and this one was not, in the same email. No event moved, but a tip-effectiveness read does not cross 2026-07-16.
- **Email `text/plain` gained the safety line, the postal address, and a visible unsubscribe.** `shell()` renders HTML only, so every text MIME alternative previously shipped with none of the three (the RFC 8058 `List-Unsubscribe` header in `sender.ts` was set, but a header is not a visible opt-out). No event; recorded because a plain-text recipient's experience changed materially on this date.

**Known gap, not closed by this item, filed as item 46.** The launch-reminder push deep-links without a `window` param, so `HomeClient` does not set the alert banner and the interstitial does not render. That makes the reminder the one alert whose journey shows no full safety line: its tap lands on a peek-height sheet with `ConditionsPanel`'s line below the fold. Closing it needs a human window label ("Sat 7 to 10am") that no layer stores today (`launch_reminders` has `window_key`, a date for dedup, and `fire_at`; `/api/alerts/remind` is never sent one), so it is a client -> API -> schema -> cron change, not copy, and would itself raise `alert_interstitial_shown`. The reminder body carries the safety half-line so the no-tap path (lock screen, swipe away) is covered in the meantime, which is the majority path for a notification.

## 2026-07-16 (item 42): Mobile spot sheet now opens FULL HEIGHT for every open, at 100%, no flag (behavior-changed)

**This is a live behavior change on the primary surface, not dormant instrumentation.** An earlier draft of this entry described it as shipping behind a `spot_sheet_full_height` flag with control live. That is superseded: the owner directed it to 100% with no A/B on 2026-07-16 (**D13**), following the D3/D6/D11 precedent that a single-digit daily audience cannot power a test. The flag, its registry entry, and its experiment doc were removed before deploy. **No `experiment_exposed` value was ever emitted for `spot_sheet_full_height`; do not look for one.**

`components/HomeClient.tsx`: the mobile bottom sheet now opens at full height (0.92vh) for every mobile spot open (list, map, related, plain deeplink), where it previously opened at the 0.58vh peek. Reuses item 9's one-shot `startExpanded` prop; no new prop on `SpotDrawer`. Unchanged: shared-link arrivals (item 9 already forced full height unconditionally), alert (`from=alert`) and email (`from=email`) arrivals (still peek, because they carry the alert interstitial and a force-expanded sheet layers badly under it), and desktop (persistent sidebar).

No event was added, removed, or renamed. Every event on this surface keeps its schema.

- **Comparability: several existing series step on 2026-07-16 as a LAYOUT effect, not organic behavior.** From this date, mobile users see the conditions view and the whole CTA row without dragging. Expect `spot_action` (directions/share/photos), `favorite_toggled`, and dwell-gated `conditions_viewed` to **rise** on mobile, and `spot_sheet_dismissed` to move in either direction (more content visible can mean faster satisfaction or faster bail). **None of that is users changing behavior; it is the same behavior against a taller sheet.** There is no control arm to compare against, by design, so do not attribute any mobile step-change on or after 2026-07-16 to anything else without ruling this out first. The nearest available counterfactual is the pre-2026-07-16 mobile baseline, and the `source: "share"` cohort, which has been opening full height since 2026-07-11 (item 9) and is therefore NOT part of the step.

## 2026-07-16 (item 41): `email_alert_opened` gains `tip_index`; alert email now carries a rotating pro-tip (props-changed)

The daily alert email now includes one rotating, one-sentence paddleboard
technique tip (`TECHNIQUE_TIPS` in `lib/email/templates.ts`, 7 editor-written
sentences, deterministic rotation via `techniqueTipForDay`). Owner request
2026-07-16: cheapest item on the backlog, reuses the exact copy-rotation
mechanism shipped 2026-07-13 (`alertVariantForDay`) rather than building a
second one, offset by a fixed number of days so the tip pool does not always
pair with the same wording variant. Tips teach skill only, never instruct
action (no "head out now" / launch urgency / safety guarantee), per item 34's
inducement-language guardrail on this exact surface; two of the seven tips
carry a `// VERIFY` code comment flagging a claim that needs owner/source
confirmation before it should be trusted as accurate.

The email deep link now also carries `pt=<0-6>` (the tip index), and
`HomeClient` forwards it as an optional `tip_index` prop on the existing
`email_alert_opened` INTENT event, so opens can be segmented by which tip rode
along, the same pattern as the existing `variant` prop. No new event.

**A/B exempt** (D11 precedent): copy-only addition to an existing surface,
single-digit daily audience cannot power a test.

**Comparability:** `email_alert_opened` totals are continuous; only the new
optional `tip_index` dimension starts 2026-07-16 (opens on emails sent before
this date, or on links without `pt`, have no `tip_index`). Same caveat as the
2026-07-13 `variant` rotation: at current send volume (single-digit/day),
per-tip reads need weeks of accumulation, and this is copy freshness, not a
powered test.

---

## 2026-07-15 (item 37 part 3, ROADMAP item 12): Viewport diagnostic added, no PostHog event

**No event added.** Shipped `components/ViewportDiagnostic.tsx`, a device-only
overlay gated behind the `?vh` URL param that prints `screen.height`,
`window.innerHeight`, `visualViewport.height`, computed
`env(safe-area-inset-bottom)`, and standalone-vs-Safari, so the owner can
screenshot real iOS numbers before picking a fix for the item-12 dead band.
It renders nothing without the param and is mounted unconditionally in
`HomeClient.tsx`, but there is no user-facing interaction to log: nobody
chooses to open it (it requires manually editing the URL), it is not a
control or a flow, and it is intended to be looked at once on one device, not
used repeatedly. Logging a "diagnostic opened" event would just tell us the
owner loaded their own debug page, which is not a metric.
- **Comparability:** N/A, no series created or changed.

## 2026-07-15 (item 37, both parts): Visual polish pass adds no analytics event

**No event added.** The item 37 pass is two changes and neither warrants a new
event. Part 1 swapped the header search control's hardcoded `border-gray-200`
for the existing `--border` design token in `components/HomeClient.tsx`, so it
reads as one matched pair with the Feedback button. It is a passive style
change, same markup, same control, same interaction, no new state to log. Part
3 is the `?vh` viewport diagnostic documented in the entry directly above: a
device-only debug overlay nobody opens as a feature, not a user flow. Neither
part adds a new control, gesture, filter, or navigation path, so no INTENT
(`_clicked` / `_toggled` / `_viewed`) or SYSTEM (`_loaded` / `_failed`) event
applies to this pass.

- **Comparability:** no PostHog metric series is affected by this pass, no
  behavior-change interpretation applies. This entry exists so a later analyst
  does not read the absence of a new event here as a gap.

---

## 2026-07-15 (item 36): `alert_interstitial_shown` gains `launch_tip_shown`; emit moved off the mount effect (props-changed, semantics-changed)

`alert_interstitial_shown` (`lib/analytics.ts` `EventPropMap`) gains a required
`launch_tip_shown: boolean`, set from whether the interstitial actually
rendered the new launch-direction tip line (`launchDirectionTip(windDirection,
maxWindMph) !== null`). No new event name, `spot_id` is unchanged.

**Semantics-changed timing nuance:** the event used to fire synchronously on
mount, before the `getNextWindow` call had resolved. `launch_tip_shown` cannot
be known until that window resolves, so the fire had to defer: it now fires
once (guarded by a ref) inside the window-resolving effect, after the
`getNextWindow` promise settles, on both the window-found and
no-window/failed branches. To keep volume equal to the old mount-fire, the
effect cleanup fires the same event once with `launch_tip_shown: false` if the
interstitial unmounts (e.g. a fast dismiss) before `getNextWindow` settles, so
every mounted interstitial still emits exactly one `alert_interstitial_shown`
and never leaves a dismissed `result` without a matching `shown`. This mirrors
the `dualCta.ready` gating in the 2026-07-14 item 32 entry above, the same
pattern of deferring an emit until a value it depends on is actually known,
rather than firing blind at mount.

- **Comparability:** `launch_tip_shown` exists only from 2026-07-15 forward;
  pre-deploy rows have no such prop, treat missing as false/unknown, not as
  "no tip". Separately, the emit now waits on one NWS fetch instead of firing
  at mount, so `alert_interstitial_shown` timestamps from 2026-07-15 land
  later relative to component mount than before, roughly one network round
  trip. Any later latency- or volume-sensitive read of `alert_interstitial_shown`
  must not read this timing shift as a behavior change: the event still fires
  exactly once per interstitial render regardless of whether a window or tip
  was found, so volume itself is unaffected. Per measurement-spec guardrail 2,
  watch the `alert_interstitial_shown` / `alert_clicked` ratio for a
  fetch-fail or slow-resolve drop and attribute any dip there to the
  `getNextWindow` dependency, not to fewer people clicking through.

## 2026-07-14 (item 32): Dual-CTA enrollment card behind `enrollment_dual_cta`; `alert_optin_shown`/`_dismissed` can emit `channel: "both"` (semantics-changed)

`components/InstallPrompt.tsx` gained a treatment branch for the `enrollment_dual_cta`
experiment (`lib/experiments.ts`, `flag: "enrollment-dual-cta"`, `variants:
["control", "treatment"]`, live control-default so the mid-July retention read
is undisturbed). CONTROL is the exact current single-lead card (email-led on
desktop/iOS, push-led on Android/standalone); byte-identical logic, only the
`emailForm`/`emailRow` internals were refactored (no visible or DOM-order
change). TREATMENT renders, on the three mobile surfaces (standalone-not-denied,
ios, android) only, an equal-weight push button + "or" divider + the existing
inline email row; desktop stays the control card in both arms.

`alert_optin_shown` and `alert_optin_dismissed` (`channel` prop, type widened to
`"push" | "email" | "both"` in the prep commit `264cae6`) now actually emit
`channel: "both"` when the treatment card renders, in place of the existing
`leadChannel(platform, result)` value. Exposure (`experiment_exposed`,
`experiment: "enrollment_dual_cta"`) is logged for BOTH arms from a single
`useEffect` gated on the shared `dualEligible` computation (mirrors the
`next_good_window` symmetric-exposure pattern, not the retired
`alert_interstitial` bug), once `dualCta.ready` and the card would actually
render a channel choice (excludes desktop, the granted success state, and the
email-pending state either way). The `alert_optin_shown`/`_dismissed` shown
effect additionally gates on `dualCta.ready` so it does not fire once with the
flash-of-control channel value and again with the resolved variant's.

- **Comparability:** `channel: "both"` is only possible from 2026-07-14 forward
  and only for sessions bucketed into the `enrollment_dual_cta` treatment arm;
  every session before this date, and every control-arm session after it, keeps
  emitting the existing `"push"` / `"email"` values with unchanged semantics. Any
  funnel or channel-mix read spanning this date must segment by
  `experiment_exposed` (`experiment: "enrollment_dual_cta"`) variant rather than
  treating `channel` as a single undifferentiated series, the same way the
  `next_good_window` and `alert_interstitial` experiments require exposure-cohort
  segmentation. The card-layout change itself (push+email equal weight vs.
  single-lead) is scoped to the treatment arm only; the production default
  (control, flag unset or resolved control) is the byte-identical existing card,
  so `alert_optin_shown`/`_result`/`email_capture_submitted` volumes for the
  control cohort are unaffected. See `docs/experiments/enrollment-dual-cta.md`
  for the full hypothesis, primary metric, and decision rule.

## 2026-07-13: email_alert_opened gains `variant`; alert email copy now rotates daily (props-changed)

The daily alert email rotates through 7 editor-written wording sets (`ALERT_VARIANTS` in `lib/email/templates.ts`, deterministic rotation via `alertVariantForDay`: UTC day plus week number, mod 7, so the weekday->variant mapping shifts by one each week instead of pinning each weekday to one wording; variant 0 is the original copy). Owner request 2026-07-13: the same paragraph every day was boring. The email deep link now carries `v=<0-6>`, and `HomeClient` forwards it as an optional `variant` prop on the existing `email_alert_opened` INTENT event so clicks can be segmented by wording. No new event; the server `email_opens` ledger is unchanged and remains the durable return signal.

**Comparability:** `email_alert_opened` totals are continuous; only the new optional `variant` dimension starts 2026-07-13 (clicks on emails sent before then, or on links without `v`, have no `variant`). The bigger caveat is behavioral, not instrumentation: from 2026-07-13 the email CREATIVE varies by day, so any open/click-rate trend across this date compares different copy. Weekday and variant decorrelate only across weeks (the mapping shifts weekly), so short-window per-variant reads are still weekday-confounded; at current volume (single-digit sends/day) per-variant comparisons need several weeks of accumulation. This is a rotation for freshness, not a powered A/B test.

The `Share` button's deep link now carries `from=share` (`/spot/<id>?from=share`), and `HomeClient` maps that arrival's `spot_viewed` to `source: "share"` instead of `source: "deeplink"`. `SpotViewedSource` in `lib/analytics.ts` gained the `"share"` value. This lets share-originated arrivals be counted separately from other direct-URL ("deeplink") arrivals, so we can see whether the item-9 expanded-sheet landing drives conditions views / saves. No new event; only the source value of the existing `spot_viewed`. The item-9 UI behavior (open the mobile sheet at full height for `from=share` arrivals) ships flagless: a client-side mount-time kill switch would fail open for first-time share recipients (flags load after first paint), so rollback is revert + redeploy, and monitoring is this `source: "share"` count plus the existing `spot_sheet_dismissed` / `conditions_loaded` guardrails.

**Comparability:** from 2026-07-11, `spot_viewed` `source: "deeplink"` DROPS the share-originated arrivals it previously absorbed (they now read `source: "share"`); the two together equal the old deeplink total. Any deeplink-source trend across this date must sum `deeplink + share` to stay continuous. Brand-new `"share"` value, no prior series. Share volume is tiny today (1 user / 3 events in the last window), so expect near-zero share counts until sharing grows.

On a successful email capture submit, `handleEmailSubmit` in `InstallPrompt.tsx` now also calls `setPersona({ email_submit_platform: platform, email_submit_trigger: submitTrigger })` right after the existing `setPersona({ email_captured: true })`. `email_capture_confirmed` itself still carries only `{ watched_count }` (no event prop change), but these durable person properties survive the confirm redirect on the same device, so the confirm event can now be split by `email_submit_platform` (desktop / standalone / etc.) and `email_submit_trigger` (including the `push_denied` rescue) in PostHog without any cross-request plumbing.

**Comparability:** brand-new person properties, no prior series. Rows/persons created before 2026-07-10 have neither property set; only `email_capture_confirmed` events tied to a person who submitted on or after this date carry the platform/trigger split. Confirm rate totals across the date boundary are unaffected, this only adds a segmentation dimension.

## 2026-07-10 (item 24): Confirm-step resend control (added)

New INTENT event `email_confirm_resend_clicked` (`trackIntent`, props `{ platform, trigger, watched_count }`), fires when a user taps Resend confirm email in the post-submit pending card (`InstallPrompt.tsx`, `emailResult === "pending"`); the tap re-triggers `POST /api/email/subscribe` with the same email and watched spots (re-arms `confirm_token`, re-sends the confirm mail); resend has a client-side cooldown so one tap cannot spam it.

**Comparability:** brand-new event, no prior series. Resend volume from 2026-07-10 forward is a NEW signal prompted by UI copy that did not exist before, not organic behavior, and is not a direct proxy for how often mail lands in spam; the primary signal for this item is the guardrail in `analytics/queries/email_confirm_funnel.sql`, resend clicks are a secondary diagnostic.

## 2026-07-10 (item 24): email_capture_failed gains a `source` discriminator (props-changed)

`email_capture_failed` (SYSTEM) now carries `source: "submit" | "resend"`. It previously fired only when the initial submit POST failed; the item-24 Resend control reuses the same endpoint, so a failed Resend now also fires it with `source: "resend"`. Only `source: "submit"` means "no `email_subscriptions` row was created". The Gap C submitter-correction in `analytics/queries/email_confirm_funnel.sql` was updated to subtract `source='submit'` failures only.

**Comparability:** `email_capture_failed` total volume is discontinuous upward from 2026-07-10, because resend failures now also count under this event. Any analysis of this event from 2026-07-10 forward MUST filter on `source` (submit vs resend); pre-2026-07-10 rows have no `source` prop and are all submit failures. The Supabase PRIMARY funnel query is unaffected (it reads rows, not events).

## 2026-07-10 (item 24): Stale confirm-link loss (added)

New SYSTEM event `email_confirm_failed` (`trackSystem`, props `{ reason: "stale_token" | "no_token" }`). SYSTEM, not intent, per the `_failed`-suffix convention: it fires on the redirect landing (server-side confirm-link failure), not on an in-app action, so it measures confirm-link availability, never engagement. The confirm route (`app/api/email/confirm/route.ts`) used to bounce a missing, too-long, unknown, or already-consumed token straight to `/` with no signal. It now redirects to `/?email_confirmed=0&reason=stale|no_token`, and the client fires the event on that landing before stripping both params (no toast is shown; the successful `/?email_confirmed=1` path is unchanged).

**Why:** resending the confirm email (item 24) re-arms `confirm_token` in `/api/email/subscribe`, which invalidates any earlier mailed link. A user who finally digs the first, now-stale mail out of spam and taps it lands on a dead-looking bounce with no way to tell "expected, please use the newer link" apart from a real bug. This closes guardrail G3.

**Comparability:** brand-new event, no prior series. It exists only from 2026-07-10 and counts the confirm-route not-found branch (a link click that failed server-side), not user behavior on its own; do not read its volume as engagement, only as "how often a confirm link arrived stale or malformed."

## 2026-07-10 — Auto-locate home map on load for granted-permission users (added)

New SYSTEM event `location_auto_applied` (`trackSystem`, props `{ source: "permission_granted" }`). On home load, if the browser reports geolocation permission is already `granted` (Permissions API, no prompt), the map auto-centers on the user at zoom 11 and the list sorts by distance — the Near Me result, applied without a click (the map tab stays visible; unlike the click path it does not force the List tab). The event fires once per session when that auto-apply happens.

**Why SYSTEM, not intent:** the app acts, the user does not toggle Near Me this session. It measures how often we auto-centered, NOT engagement. Do not merge it into `near_me_toggled` (deliberate toggles) or a report will overstate Near Me usage — the exact anti-pattern this split exists to prevent.

**No A/B flag (monitored 100% rollout).** Only users who previously granted permanent geolocation are eligible (~8 external users all-time as of 2026-07-10), so an arm comparison could never reach significance. Same reasoning and precedent as the `alert_interstitial` retirement (2026-07-08, D2(a)): ship at 100%, watch guardrails (`spot_viewed`, `conditions_loaded`, `spot_sheet_dismissed`) for regressions instead of running a powerless test.

**Comparability:** brand-new event, no prior series. `near_me_toggled` semantics are unchanged (auto-locate deliberately does NOT fire it), so the Near Me intent series stays continuous across this date. From 2026-07-10, some sessions reach a located state with no `near_me_toggled(granted)` — attribute those to `location_auto_applied`, not a drop in Near Me clicks.

## 2026-07-10 — Internal-device flag now settable via `?internal=1` (traffic filter)

No event change. Added a URL setter: visiting `/?internal=1` once writes the
`ptw-internal` localStorage flag (already read by `PostHogProvider.before_send`),
so the device's traffic is filtered from analytics from then on. This is the
easy way to flag owner/test devices (setting localStorage by hand is painful on
iOS Safari). Comparability: no series changes; it just makes an existing filter
easier to apply. Historical events from a device flagged this way still need the
analysis-side `EXCLUDED_PERSONS.md` list (the flag only stops FUTURE events).

## 2026-07-10 (item 23) — Channel-agnostic enrollment matrix (props-changed)

The install-only opt-in card became a per-platform enrollment card: desktop and iOS Safari lead with email, a push-denied installed user gets an email rescue, Android keeps one-tap install with an email fallback, and the email capture form now calls `/api/email/subscribe`.

**`alert_optin_shown` / `alert_optin_dismissed` — props-changed.** Added `channel: "push" | "email"` (which channel the card LED with) and `platform: "desktop"`. From 2026-07-10, `alert_optin_shown` volume rises because desktop users are now offered enrollment at all (they previously saw a dead, button-less card and no event); segment by `channel` and `platform` to keep the pre-existing push/mobile funnel comparable. Pre-2026-07-10 rows have no `channel`.

**`email_capture_submitted` — `trigger` value added.** Now also `"push_denied"` (the installed-but-notifications-off rescue), alongside the shared enrollment triggers.

**Comparability:** treat desktop as a brand-new enrollment surface from 2026-07-10 (no prior series). Do not read total `alert_optin_shown` across that date without splitting by `channel`/`platform`.

## 2026-07-10 (item 22) — Email alert channel (added)

The email alert channel (PRD `docs/superpowers/specs/2026-07-10-email-alert-channel-and-enrollment.md`). A second, no-install reach channel that fires on the SAME calm-window evaluator as push. All events are new; there is no prior series for any of them.

**New INTENT events (`trackIntent`):**
- `email_capture_submitted` (`platform`, `trigger`, `watched_count`) — the capture form was submitted. Top of the email enrollment funnel; `trigger`/`platform` mirror `alert_optin_shown` so email and push funnels segment the same way. (Caller ships with the Phase 2 enrollment UI, item 23.)
- `email_capture_confirmed` (`watched_count`) — the double-opt-in confirm link was clicked (fires on the `/?email_confirmed=1` landing). The activation step.
- `email_alert_opened` (`spot_id`) — app opened from an alert email deep link (`from=email`). Email twin of `alert_clicked`.

**New SYSTEM event (`trackSystem`):**
- `email_capture_failed` (`status`) — the POST to `/api/email/subscribe` failed. Availability signal, like `alert_subscribe_failed`.

**Server-side ledgers (not PostHog events):** email SENDS are recorded in the `email_sends` table and email OPENS in `email_opens` (via `/api/email/opened`, token-keyed, ITP-proof), exactly analogous to `alert_sends` / `alert_opens`. Email-cohort retention is read from these, not from device analytics.

- **Comparability:** all five names are new as of 2026-07-10, no discontinuity in any existing series. `spot_viewed{source:"deeplink"}` volume may rise slightly as email opens land on it (email opens keep `source:"deeplink"`, a new `source` value was deliberately NOT added). Do not read the email funnel against the push funnel as a like-for-like conversion: different channels, different friction.

## 2026-07-10 (item 20) — next_good_window A/B retired, panel to 100% (semantics-changed)

The `NextGoodWindowPanel` no longer gates on the `next_good_window` treatment
arm; it renders for all users. Underpowered test on a surface worth shipping
(see docs/experiments/next-good-window.md).

**`experiment_exposed` (`experiment: "next_good_window"`) — removed.** No longer
emitted (there is no experiment). Its series ends 2026-07-10.

**`next_window_viewed` — semantics-changed (audience widened).** Was
treatment-only; now fires for every user who dwell-views the panel. From
2026-07-10 its volume rises as a 100% rollout effect, NOT an organic behavior
change; do not compare the count across that date.

## 2026-07-10 (latest++) — Conditions-interest enrollment trigger + Save→Watch rename (props-changed, copy)

Item 21 (Phase 0 of the email-first retention epic). The alerts prompt used to
fire only on a save (or the item-14/15/16 re-offers). It now also fires on
**conditions interest**: the user dwell-viewed conditions (`conditions_viewed`,
IntersectionObserver + 1s dwell) on **2+ distinct spots** in a session, dispatched
once from `ConditionsPanel`. This is the core paddle-decision behavior and a
bigger, better-qualified pool than savers. Respects the 14-day snooze / hard-denial.

**`alert_optin_shown.trigger` / `alert_optin_dismissed.trigger` — props-changed
(value added).** New value `"conditions_interest"`. `alert_optin_shown` volume
rises again from 2026-07-10 as conditions-checkers who never saved are now
offered alerts; segment by `trigger` to keep the earlier save-only cohorts
comparable. No change to `conditions_viewed` itself (same event, same dwell gate);
it merely now also increments a client-side distinct-spot counter.

**Save→Watch rename — copy only, no events.** "Save this spot" → "Watch this
spot", section header "Your saved spots" → "Watching (N)", plus aria labels.
`favorite_toggled` and the `ptw:spotsaved` internal event are unchanged, so save
metrics stay fully comparable across the rename; only the visible verb changed.

## 2026-07-10 (latest+) — Return-session re-offer trigger (props-changed)

Item 16. A non-installed user with 2+ saved spots and no subscription is now
re-offered alerts on a later visit (not only at the first save), gated by the
item-15 snooze so it never nags.

**`alert_optin_shown.trigger` / `alert_optin_dismissed.trigger` — props-changed
(value added).** New value `"return_session"`. `alert_optin_shown` volume rises
again from 2026-07-10 as returning engaged-but-unsubscribed users are re-offered;
segment by `trigger` to keep first-save comparable. (Item 17, iOS enable copy, is
a copy/layout change only, no events.)

## 2026-07-10 (latest) — Dismiss is a snooze; always-on entry point; dismiss event (added + props-changed)

Item 15. Dismissing the alerts prompt used to write a permanent `ptw-install-dismissed`
flag that killed the funnel forever with no way back. Now dismiss is a 14-day
snooze (`ptw-alerts-snoozed-until`), and a "Turn on alerts" affordance in the
saved-spots header (SpotList) lets an unsubscribed user re-open the prompt any
time (bypassing the snooze).

**`alert_optin_shown.trigger` — props-changed (value added).** Now also
`"manual"` (the saved-spots-header entry point), alongside `first_save` and
`standalone_relaunch`.

**`alert_optin_dismissed` — added (intent).** Fires when the prompt is dismissed,
with `platform` and `trigger`. Dismiss was previously silent, so there is no
prior series.
- **Comparability:** `alert_optin_shown` volume rises further as dismissed users
  are re-offered after the snooze and via the manual entry point (was: dismissed
  once = gone forever). Segment by `trigger` to keep first-save comparable. The
  old `ptw-install-dismissed` localStorage flag is no longer read; devices that
  had it set will be re-offered once (intended, that was the permanent-kill bug).

## 2026-07-10 (later) — alert_optin_shown gains a `trigger` prop; iOS relaunch re-offer (props-changed)

Item 14 fix. Installed iOS users dead-ended: the enable-alerts step only fired
on a fresh `ptw:spotsaved`, so a user who saved then installed never saw it on
relaunch. Now a standalone relaunch auto-surfaces the enable step when there are
saved spots, no subscription, and no opt-out/hard-denial.

**`alert_optin_shown` — props-changed (added `trigger`).** Now carries
`trigger: "first_save" | "standalone_relaunch"`. `first_save` is the prior
behavior (prompt on the first save); `standalone_relaunch` is the new
re-surface. Pre-2026-07-10 rows have no `trigger`; treat missing as `first_save`.
- **Comparability:** total `alert_optin_shown` volume rises from 2026-07-10 as
  installed-but-unsubscribed iOS users finally get re-offered. Segment by
  `trigger` to keep the first-save funnel comparable to history. Also note
  `alert_optin_result{result:"denied"}` is now persisted (localStorage
  `ptw-alerts-denied`) so a hard denial is not re-prompted on relaunch.

## 2026-07-10 — Install/alerts prompt no longer suppressed by an open drawer (rate shift, no event change)

Item 13 fix. `InstallPrompt` used to `return null` while a spot drawer was open,
but item 11 moved the primary "Save this spot" button INTO the drawer, so saves
via the primary CTA fired `ptw:spotsaved` and set the prompt visible while it
rendered nothing. The prompt now renders even with the drawer open (anchored to
the top so it clears the drawer's bottom actions).

**`alert_optin_shown` — no event/prop change; RATE will rise.** The event is
identical; it will simply fire at save time as intended instead of only when the
user later closes the drawer (or never, on the desktop persistent sidebar). Read
any increase in `alert_optin_shown` from 2026-07-10 as this fix surfacing the
prompt, NOT a change in user behavior. Downstream `alert_optin_result` volume
should rise proportionally.

## 2026-07-09 (latest) — Launch reminder is now a scheduled push, not a calendar add (semantics nuance)

Same-day follow-up to the entry below. The interstitial's "Remind me at launch
time" CTA now schedules a SERVER-SENT push reminder (`/api/alerts/remind` ->
`/api/cron/send-reminders`) instead of adding a calendar event; the owner wanted
a real notification. No event or prop change.

**`alert_interstitial_result{outcome:"reminder"}` — semantics nuance.** Still
the same event and value, but from 2026-07-09 it means "a launch-time push
reminder was scheduled", where earlier the same day (PR #14) it briefly meant "a
calendar reminder was added". No data window of consequence spans the two (both
shipped 2026-07-09, pre any read). Success of the feature is now measurable
downstream as the reminder push landing (a `check-conditions`-style send) and an
`alert_clicked` when the reminder is opened.

## 2026-07-09 (later) — Alert interstitial reframed: reminder replaces directions (props-changed)

The interstitial was reframed to a saved-spot update with a calendar "Remind me
at launch time" CTA; the "Get Directions" control was removed (the alert is
about a future window, so directions were the wrong action).

**`alert_interstitial_result` — props-changed.** Its `outcome` union changed
from `"dismissed" | "directions"` to `"dismissed" | "reminder"`. `directions`
is no longer emitted from the card (the drawer's own Get Directions still fires
`spot_action`/`directions` as before, unaffected). `reminder` fires when the
user taps the calendar-reminder CTA.
- **Comparability:** from 2026-07-09 forward, `alert_interstitial_result` has no
  `outcome:"directions"` rows (by design, not a behavior drop). The card's prior
  contribution to `spot_action`/`directions` (`source:"alert_interstitial"`)
  also stops from this date. The new success signal for the card is
  `alert_interstitial_result{outcome:"reminder"}` / `alert_interstitial_shown`;
  it has no prior series. `alert_interstitial_shown` is unchanged.

## 2026-07-09 — Spot-sheet CTA hierarchy re-weighted (no event change, rates shift)

**`favorite_toggled`, `spot_action` (`action: "directions" | "photos"`) — no schema change; emphasis/layout changed.**
The spot sheet's action buttons were re-ordered and re-weighted (item 11): Save
is now the full-width filled primary CTA, Share the outlined secondary, and Get
Directions + Photos are demoted to a smaller neutral row (previously Get
Directions was the filled primary and Save/Share/Photos were an equal secondary
row). No events were added, removed, or renamed, and no props changed. Shipped
to 100% (no A/B flag) per owner direction 2026-07-09.
- **Comparability:** expect a **layout-driven** shift from 2026-07-09: `favorite_toggled`
  (save) and `spot_action`/`share` rates should rise, `spot_action`/`directions`
  should fall, purely because the buttons changed prominence. Do NOT read a
  post-07-09 rise in saves/shares as an organic behavior change. Because this went
  straight to 100% with no control arm, there is no clean counterfactual; compare
  against the pre-07-09 baseline as a before/after, not a causal A/B.

---

## 2026-07-09 — Wordmark home link

**`nav_home_clicked` — added (intent).**
The header "Paddle to Water" wordmark became a clickable link to `/` (full
navigation, resets filters/selection). Fires on click, no props beyond the
standard super-properties (`display_mode`, etc.). Lets us see whether the new
home affordance gets used and as a reset path.
- **Comparability:** New event; no prior series. First data from 2026-07-09.
  Because it precedes a full page navigation, a small fraction of clicks may not
  flush before unload; treat the count as a floor, not exact.

---

## 2026-06-29 — Grounded analytics foundation

**`conditions_viewed` — semantics-changed (split).**
Was: auto-fired inside `getConditions().then()` on every spot open, i.e. when the
fetch settled. It measured fetch success rate and spots-opened-per-user, not
attention. Now: split in two —
- `conditions_loaded` (**added**, system) carries the old availability meaning
  (`failed`, `latency_ms`, `paddleability`, `has_tides`, `has_wind`, `surface`).
- `conditions_viewed` (intent) now fires only when the conditions panel is
  genuinely viewed (on screen ≥1s, via `lib/useGenuineView`), with `had_data`.
- **Comparability:** Do NOT compare `conditions_viewed` counts across 2026-06-29.
  Pre-date = fetch settles; post-date = dwell-gated views (far fewer, by design).
  For a continuous reliability series use `conditions_loaded`. The prior report's
  "96 saw live conditions / 1,157 views / ~12 each" was availability, not
  engagement.

**`saved_conditions_viewed` — semantics-changed (split).**
Was: auto-fired once per session when the saved-spots conditions batch resolved
on app load (user need not see the section). Now: split —
- `saved_conditions_loaded` (**added**, system) carries the on-load meaning
  (`count`, `calm_count`, `latency_ms`).
- `saved_conditions_viewed` (intent) now fires only when the "Your saved spots"
  section is genuinely scrolled into view.
- **Comparability:** Do NOT compare `saved_conditions_viewed` across 2026-06-29;
  use `saved_conditions_loaded` for the continuous on-load series.

**`event_category` — props-changed (added to system/intent events).**
Events emitted via `trackSystem` / `trackIntent` now carry
`event_category: "system" | "intent"`. Filter on it so an availability event is
never read as engagement. Legacy human-action events on the bare `track` are
intent by construction and may lack the property until migrated.

**`experiment_exposed` — added (intent).**
Fires once per session when a variant-dependent UI renders (`lib/experiments.ts`).
Exposure = the treatment was seen, not merely bucketed. No experiments are live
yet; metric is dormant until a flag + treatment ship.

---

## 2026-07-02 — Alert-loop instrumentation fixes (and a deploy correction)

**Deploy correction for the 2026-06-29 entry above.** The grounded split was
written on 2026-06-29 but sat uncommitted and **only reached production on
2026-07-02**. Until then, production kept emitting the OLD fetch-settle
`conditions_viewed` / `saved_conditions_viewed` and no `event_category`.
- **Comparability:** the discontinuity documented above happens at
  **2026-07-02**, not 2026-06-29. `conditions_viewed` counts from 06-29 to
  07-02 are still fetch-settle semantics. `conditions_loaded` /
  `saved_conditions_loaded` start existing 2026-07-02.

**`pwa_prompt_shown` — removed (retroactive: ~2026-06-27).**
The auto-shown install banner was replaced in Stage B by a save-triggered
alerts prompt; the event's emit site was deleted with it but never logged here.
- **Comparability:** the series ends ~2026-06-27 (259 events / 186 users
  lifetime). Its successor for prompt exposure is `alert_optin_shown`; the two
  are not comparable (auto-shown on load vs shown after a deliberate save).

**`alert_optin_shown`, `alert_optin_result`, `alert_clicked` — added (intent, retroactive: 2026-06-27 to 06-29).**
Stage B/D of the retention loop: prompt exposure after first save, opt-in
outcome (`result: granted | denied | unsupported`), and app opens from a push
(`from=alert` deep link). Shipped without entries; recorded now.

**`pwa_installed` — semantics-changed.**
Was: fired only from the in-app Android Install button with the native dialog
outcome (`accepted` / `dismissed`). iOS Add-to-Home-Screen and Chromium
menu installs were invisible (this is why a real 2026-06-30 iOS install shows
no event). Now: fires on actual installs via the Chromium `appinstalled` event
(`outcome: "appinstalled"`) or first standalone launch (`outcome:
"detected_standalone"`, catches iOS, once per device), plus the declined
dialog (`outcome: "dismissed"`).
- **Comparability:** counts jump at 2026-07-02 because installs are now
  observable at all, and existing installed devices fire `detected_standalone`
  once on their next open. Treat `outcome != "dismissed"` as an install.

**`alert_subscribe_failed` — added (system).**
Fires when the POST persisting a push subscription to `/api/alerts/subscribe`
fails (`status` prop; null = network error). Success stays silent. Before
this, a granted opt-in that never reached the backend was indistinguishable
from a working subscription.

**All events — semantics-changed (pre-init drop fixed, same day).**
Events fired before PostHog finished initializing were silently dropped.
React runs effects child-first, so anything emitted in a component's mount
effect (e.g. `pwa_installed` `detected_standalone`, mount-time `setPersona`)
lost this race every time; events that fire after a fetch settles won it. The
wrapper now queues pre-init calls and flushes them once PostHog loads.
- **Comparability:** mount-time events were systematically undercounted before
  2026-07-02. `detected_standalone` in particular could not arrive at all from
  the first build that day; its device-dedup key was bumped (`v1` -> `v2`) so
  the few devices that hit the broken window (~30 min, likely 1 device) log
  once for real. Expect no visible shift in fetch-gated events.

## 2026-07-04 — Alert deep-link interstitial (ROADMAP item 1)

**`alert_interstitial_shown`, `alert_interstitial_result` — added (intent).**
New floating card over the deep-linked spot's drawer, shown only in the
`alert_interstitial` experiment's `treatment` variant (see
`docs/experiments/alert-interstitial.md`), repeating the push's calm-window
label and the spot's put-in notes. `shown` fires when the card actually
renders for an alert-originated open with a window label; `result` fires once
on dismiss or on tapping through to directions (`outcome`).
- **Comparability:** brand new events, no prior series. Exposure for the
  experiment itself is the existing `experiment_exposed` event
  (`experiment: "alert_interstitial"`), not these two — restrict any
  before/after read to the exposed cohort.

## 2026-07-04 (later) — Alert interstitial: exposure symmetry + shared lift metric (semantics-changed)

Fixes a validity bug in the same-day interstitial instrumentation before the
`alert-interstitial` flag was turned on (no data collected against the broken
version, so nothing to discard).

**`experiment_exposed` (`experiment: "alert_interstitial"`) — semantics-changed.**
Was logged only when the treatment card rendered, so the control arm had zero
exposed users and no counterfactual. Now logged for BOTH arms at the alert-open
trigger (component mounts in both arms; `logExposure()` moved out of the
treatment-only branch to a `ready`-gated effect). From now on `experiment_exposed`
for this experiment means "reached the alert-open where the arms diverge",
control included.

**`spot_action` (`action: "directions"`) — props-changed (additive).** The
card's Get Directions now also emits `spot_action` (previously only the
treatment-only `alert_interstitial_result`), carrying `source: "alert_interstitial"`
alongside the usual `spot_id`/`spot_name`/`region`/`has_fee`. This makes
directions the shared, arm-comparable success metric (control converts via the
drawer button, treatment via the card). The `source` prop is new and absent on
drawer-originated directions taps.

- **Primary metric moved:** `alert_interstitial` primary is now `spot_action`
  /`directions` rate among exposed users per arm (was `alert_interstitial_result`,
  which is treatment-only and cannot measure lift; kept as a diagnostic).
- **Comparability:** only read the experiment from 2026-07-04 (post-fix) forward;
  the shared metric and control exposure did not exist before then. A small,
  expected uptick in total `spot_action`/`directions` volume comes from the card
  now emitting it; segment on `source` to separate card taps from drawer taps.

## 2026-07-04: Next good window experiment (ROADMAP retention loop)

**`next_window_viewed`: added (intent, dwell-gated).**
Dwell-gated genuine view of the "Next good window" block in the spot drawer
(see `lib/useGenuineView`), fired only in the `next_good_window` experiment's
`treatment` variant (see `docs/experiments/next-good-window.md`). `had_window`
distinguishes a block that rendered a real calm window from the quiet
no-window line, so it can never be misread as "the block was seen and the
user got nothing".

**`experiment_exposed`: now also fires for `experiment: "next_good_window"`.**
Logged for BOTH arms, once the next-window evaluation resolves (`ok: true`)
and flags are ready, at that single trigger point, not gated behind the
treatment render. This is the corrected pattern (matching the alert-interstitial
fix above): control is directly comparable to treatment.
- **Comparability:** new events, no prior series; they exist only from
  2026-07-04.

## 2026-07-08: Experiment method recalibration (D2(a))

Both live A/B tests were underpowered at ~14 users/day (power analysis: ~430-680
exposed/arm needed for a 5pp lift vs the docs' "30/arm"). D2(a) recalibrates the
method. No new events; the changes are to exposure logging and metric definitions.

**`experiment_exposed` (`experiment: "alert_interstitial"`): removed.**
`alert_interstitial` was retired as an A/B test and converted to a monitored
100% rollout (the card now renders on every alert-open; `lib/experiments.ts` no
longer declares the experiment and `AlertInterstitial` no longer reads the flag
or calls `logExposure`). The `alert-interstitial` variant of `experiment_exposed`
stops appearing after 2026-07-08.
- **Comparability:** the `alert_interstitial` A/B readout is discontinued from
  2026-07-08; do not attempt a treatment-vs-control lift after that date (there
  is no control arm). `alert_interstitial_shown` / `alert_interstitial_result`
  are unchanged but are now absolute rollout diagnostics, not arm comparisons.

**`spot_action`/`directions` (`source: "alert_interstitial"`): semantics-changed (volume).**
The interstitial card now fires for 100% of alert-opens (was ~50%), so the
count of directions taps carrying `source: "alert_interstitial"` roughly doubles
from 2026-07-08 with no change in user behavior. Drawer taps (source empty/null)
are unaffected.

**`next_good_window` primary metric: semantics-changed (definition, decontaminated).**
Because the interstitial card is now always on, its `source: "alert_interstitial"`
directions taps would leak into the `next_good_window` exposed-cohort directions
rate. The primary now **excludes** `source = "alert_interstitial"`, counting drawer
directions only (`analytics/queries/experiment_next_good_window.sql`). The
decision rule is also recalibrated to the realistic MDE (~430-680 exposed/arm;
months-long read window; early reads directional only).
- **Comparability:** the `next_good_window` primary (`directions_rate_pct`) is
  discontinuous at 2026-07-08. Read the recalibrated, interstitial-excluded
  definition only from 2026-07-08 forward; windows spanning the date mix the two
  definitions. No event schema changed, so `spot_action` itself is continuous.

## 2026-07-09 — Measurement audit fixes: identity visibility, traffic hygiene, acquisition, alert-loop contract

Implements the 2026-07-09 instrumentation audit. No event was added, renamed,
or removed and no trigger semantics changed; every change below is
props/plumbing, but several move counts.

**All events — props-changed (`display_mode` super property added).**
Every event now carries `display_mode: "standalone" | "browser"`, registered at
PostHog init. Why: the iOS PWA runs in a storage partition separate from
Safari, so installing splits one human into two person_ids; this property is
how reports see and caveat that split (segment retention and DAU by it).
- **Comparability:** property exists only from 2026-07-09. Queries filtering on
  it silently exclude all earlier events.

**All events — semantics-changed (bot/automation traffic dropped via `before_send`).**
Events are dropped client-side when `navigator.webdriver` is true (includes our
own Playwright smoke tests), the UA matches bot/headless patterns, or the
device is flagged internal (`localStorage.ptw-internal = "1"`). Why: bots are
100% one-and-done, inflating `$pageview` denominators and depressing every
retention cohort (the "78% one-and-done" baseline includes them).
- **Comparability:** `$pageview` volume, DAU, cohort sizes, and spot-open-rate
  denominators dip at 2026-07-09 with no change in human behavior. W1 retention
  may tick UP at the same date because bot "cohorts" vanish. Do not read either
  move as users.

**Person properties — props-changed (first-touch acquisition, all visitors).**
On first visit, `$set_once` stamps `first_referrer`, `first_utm_source` /
`_medium` / `_campaign` (when present), `first_landing_path`,
`first_display_mode`, `first_device_type`, `first_seen_at`. Why: "who are the
users / where do they come from" was unanswerable per person; the `setOnce`
path existed but was never called. Side effect: this creates a person profile
for EVERY visitor (posthog-js `identified_only` default previously created one
only when an engaged-user `setPersona` fired).
- **Comparability:** person-property cohorts are population-complete only from
  2026-07-09; earlier profiles exist for the engaged subset only. PostHog
  billable "identified events" volume rises at this date; event counts are
  unaffected.

**All legacy intent events — props-changed (`event_category` stamp completed).**
`spot_viewed`, `spot_action`, `filter_changed`, `spot_search`,
`near_me_toggled`, `favorite_toggled`, `feedback_opened`, `view_switched`,
`spot_sheet_resized`, `spot_sheet_dismissed`, `pwa_installed`,
`alert_optin_shown`, `alert_optin_result`, `alert_clicked` migrated from the
bare `track()` (no category) to `trackIntent`, which stamps
`event_category: "intent"`. The bare `track()` was removed from
`lib/analytics.ts`; `alert_optin_shown` / `alert_optin_result` gained typed
prop contracts (`platform`, `result`) since the new funnel query depends on
them. Trigger conditions and prop values are unchanged.
- **Comparability:** any query filtering `event_category = 'intent'` includes
  these events only from 2026-07-09; before that it silently drops them. Filter
  by event name for windows spanning the date.

**Measurement contract added (no code change): alert-loop queries + glossary.**
New `queries/alert_optin_funnel.sql`, `queries/alert_ctr.sql` (cross-store:
Supabase `alert_sends` ÷ PostHog `alert_clicked`, aggregate only),
`queries/alert_driven_returns.sql`, plus GLOSSARY sections "Alert loop" and
"Identity" (PWA partition, Safari ITP ~7-day purge, person-profile coverage).
Retention reads must use these definitions and caveats from now on.

## 2026-07-09 (later) — Durable long-horizon retention (server-side, ITP-proof)

Adds a server-side retention path so retention beyond ~1 week is measurable for
the subscribed cohort despite the identity limits above (Safari ITP purge, iOS
PWA partition). No PostHog event added/renamed/removed; this is a new **data
source** in Supabase plus one PostHog event gaining an upstream twin. Migration:
`supabase/migrations/0002_retention.sql` (must be applied in Supabase).

**`alert_opens` — added (Supabase table, server-side "return" ledger).**
`/api/alerts/opened` writes one row per app-open from a push, keyed on the
durable per-subscription `token` that now rides the notification deep link (`t`
param, see `composeAlert`). Because the token travels in the payload, not client
storage, the signal survives an ITP storage wipe. This is the server-side twin
of PostHog `alert_clicked` and more complete (same-origin POST, not ad-blocked).
- **Comparability:** exists only from 2026-07-09. `alert_opens` counts run
  HIGHER than `alert_clicked` for the same period (ad blockers drop the PostHog
  event but not the same-origin ping); do not treat the two as interchangeable
  series. Alert CTR switches to the clean Supabase `alert_opens` ÷ `alert_sends`
  join from this date (`queries/alert_ctr.sql`); the old cross-store fallback is
  retained for pre-2026-07-09 windows only.

**`push_subscriptions.disabled_at`, `push_subscriptions.token` — added (schema).**
`disabled_at` is stamped by the cron when a subscription returns 410 Gone (was a
bare `enabled` boolean with no timestamp), and cleared by the subscribe route on
resurrection. `token` is a durable opaque per-subscription id.
- **Comparability:** reachable-audience retention is exact only for churn from
  2026-07-09 forward; rows disabled before then were backfilled `disabled_at =
  last_seen` (approximate). No PostHog series affected.

**Two durable retention metrics defined (Supabase):**
`queries/reachable_audience_retention.sql` (share of a signup-week cohort still
accepting pushes k weeks on) and `queries/active_subscriber_retention.sql`
(share that opened a push in week W+k). These are the reliable long-horizon
retention numbers; PostHog `retention_w1.sql` remains device-based and
Safari-censored past ~7 days and must be labelled as such. GLOSSARY gains a
"Long-horizon retention" subsection.
