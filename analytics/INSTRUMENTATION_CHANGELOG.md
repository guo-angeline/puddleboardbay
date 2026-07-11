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

## 2026-07-10 (item 24): Confirm-step resend control (added)

New INTENT event `email_confirm_resend_clicked` (`trackIntent`, props `{ platform, trigger, watched_count }`), fires when a user taps Resend confirm email in the post-submit pending card (`InstallPrompt.tsx`, `emailResult === "pending"`); the tap re-triggers `POST /api/email/subscribe` with the same email and watched spots (re-arms `confirm_token`, re-sends the confirm mail); resend has a client-side cooldown so one tap cannot spam it.

**Comparability:** brand-new event, no prior series. Resend volume from 2026-07-10 forward is a NEW signal prompted by UI copy that did not exist before, not organic behavior, and is not a direct proxy for how often mail lands in spam; the primary signal for this item is the guardrail in `analytics/queries/email_confirm_funnel.sql`, resend clicks are a secondary diagnostic.

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
