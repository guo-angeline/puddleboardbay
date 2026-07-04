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
treatment render. This is the corrected pattern versus `alert_interstitial`,
whose exposure only fires when the treatment card renders, so its control arm
has no `experiment_exposed` rows and no counterfactual exposed cohort.
`next_good_window`'s control is directly comparable to treatment.
- **Comparability:** new events, no prior series; they exist only from
  2026-07-04.
