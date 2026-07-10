# PRD: Email alert channel + channel-agnostic enrollment surface

Status: proposed. Owner sign-off required on the escalations before Phase 1 build.
Scope owner: product. Last updated 2026-07-10.
Related backlog: ROADMAP.md (retention epic; email was listed "considered and deferred", now promoted). Decisions: DECISIONS.md D3 (100% rollout exception), D4 (server-side send infra), D5/D6 (this PRD's blocking escalations).

## 1. Goal

Give the app a second, higher-converting way to re-reach a user who cares about conditions: anonymous email alerts that fire on the exact same calm-window logic as push, plus one enrollment surface that picks the right ask per platform instead of the install-only dead ends we ship today.

## 2. Users and evidence

Who: Bay Area paddlers who open the app to check conditions and leave. The retention loop is supposed to pull them back; today it barely enrolls anyone.

- Conditions-checking is the validated use case: `reports/analytics-2026-07-09.md`: 89 of 100 openers genuinely viewed the dwell-gated conditions panel (89 distinct persons / 720 views), 100% load reliability. That is the reason-to-return we are trying to channel into an alert.
- The retention loop is essentially unentered: `reports/analytics-2026-07-09.md`: 1 save, 1 opt-in shown, 0 alert clicks ex-owner in the window. The instrument is 1 day old so this is "unproven, not disproven," but there is not one ex-owner alert-loop success in the data.
- Install converts near zero: `ROADMAP.md`: 1 PWA install from 182 prompts. iOS web push requires installing the PWA first (Apple constraint, `components/InstallPrompt.tsx:299-322`).
- iOS is where the users are: `ROADMAP.md` and memory `excluded-persons-analytics.md`: iOS was ~72% of historical saves. The iOS Safari-to-PWA storage partition also censors device-based retention measurement (`supabase/migrations/0002_retention.sql:1-14`), which email identity fixes.
- Retention is the #1 problem: `ROADMAP.md`: 78% one-and-done, W1 13 to 17% (from `reports/analytics-2026-06-27.md`; the ex-owner recut reads ~84% one-and-done / ~16% two-day but is ITP-inflated, `reports/analytics-2026-07-09.md`).
- Traffic is thin: ~14 new users/day (`ROADMAP.md`). This is why every "A/B test" here is underpowered (DECISIONS.md D2).

Assumption (no evidence): that email converts materially higher than the ~1% install rate. This is the strategic bet stated in the brief, not something the repo has measured. The whole initiative is the experiment that tests it; the goal metric in section 12 is how we find out.

## 3. Strategic frame (already decided, not relitigated here)

Install is a proxy. The goal is a low-friction, reliable, identity-bearing channel to re-reach a user, maximizing (reach x conversion x retention-value) per build cost. Email is being elevated to the primary reach channel because it is a single field, works on desktop, is cross-device, and is identity-bearing where push on iOS is not. Email for app users is a fallback tier, shown one-ask-at-a-time by platform, never a competing second CTA next to install.

## 4. User stories

1. As an iOS paddler who just checked conditions on two spots, I am offered email alerts as the lead option (not a wall of Add-to-Home-Screen steps), enter my email once, and start getting a heads-up when my spots go calm.
2. As an installed user who tapped "No" on the OS notification prompt, I am offered email as a rescue instead of hitting a dead end.
3. As a desktop planner, I get an email signup where today there is a dead, button-less install prompt.
4. As any enrolled user, I get at most one email a day, only when a spot I watch has a real calm window, and I can unsubscribe in one tap.
5. As the studio, I can tell from server-side ledgers whether emailed users return more than the push-only baseline, without relying on ITP-censored device analytics.

## 5. The four agreed product decisions (incorporated)

1. Rename "Save this spot" to "Watch this spot"; saved section header to "Watching (N)". Copy tweak, ships to 100%, no flag. Favorites = watch list = alert set are one array (CLAUDE.md; `components/InstallPrompt.tsx:67` reads `ptw-favorites`).
2. Desktop: replace the dead install prompt (`components/InstallPrompt.tsx` renders no button for desktop-unknown) with an email signup.
3. Email is a fallback tier, one ask at a time. The push-denied dead end (`DENIED_KEY` set at `components/InstallPrompt.tsx:239-240`) surfaces email as rescue. iOS Safari leads with email, demotes install to secondary.
4. Broaden the enrollment trigger from save-only to conditions-interest: fire when a user genuinely viewed conditions (dwell-gated `conditions_viewed`) on 2+ distinct spots in a session, OR saved/watched a spot, OR returned for a 2nd session with a prior conditions view. Anchor trigger = 2+ distinct conditions views. Respect the existing 14-day snooze (`SNOOZE_KEY`, `components/InstallPrompt.tsx:28`).

## 6. Email provider: recommend Resend

Evaluated for a solo founder on Next.js 16 + Supabase + Vercel, low volume (dozens of subscribers, 1 email/day/subscriber cap), React email templating wanted.

| Provider | Free tier | DX / Next.js | React templating | Deliverability | Verdict |
|---|---|---|---|---|---|
| **Resend** | 3,000/mo, 100/day (ample here) | Best; built for this stack, tiny SDK | Native: same team maintains `react-email` | SPF/DKIM/DMARC wizard, List-Unsubscribe + one-click supported, webhooks for bounces/complaints | **Recommend** |
| Postmark | 100/mo then $15/mo | Good API, transactional focus | No first-party React lib | Excellent, strong on transactional | Great but paid from day one, weaker templating fit |
| AWS SES | $0.10/1k (cheapest at scale) | Worst; you build unsub, templates, bounce/complaint via SNS, warmup yourself | None | Strong once you build the plumbing | Pure toil for a solo founder at this scale |
| Loops | Limited free | Founder-friendly UI, campaign-oriented | Visual builder, less code-native | Good | Marketing-campaign shaped, less control over per-alert transactional sends |
| Mailgun | Trial only now | Dated vs Resend | None first-party | Fine | No compelling edge here |

Recommendation: **Resend.** It is the only candidate whose React Email templating, Next.js DX, and free tier all line up with a solo founder at this volume, and it ships the deliverability primitives (DKIM setup, List-Unsubscribe one-click, complaint webhooks) without custom plumbing. No spend at current scale (free tier covers it many times over). Cost only appears if subscribers x 30 days exceeds 3,000 sends/month, which is far away.

Assumption: Resend's free-tier limits above are as of the brief's stated numbers; verify current limits at setup.

## 7. Deliverability plan

- **Sending domain:** a dedicated subdomain, `alerts.paddletowater.com` (recommend), so alert-sender reputation is isolated from the root domain and any future mail from it. DNS lives with the `paddletowater.com` domain already used by the app (`lib/structured-data.ts` SITE_URL).
- **SPF:** TXT with the provider include on the subdomain.
- **DKIM:** the CNAME records Resend generates for the subdomain.
- **DMARC:** start `p=none; rua=...` (monitor), tighten to `p=quarantine` after a clean two-week read. Never launch straight to reject.
- **List-Unsubscribe (RFC 8058, one-click):** every alert carries
  `List-Unsubscribe: <mailto:unsub@alerts.paddletowater.com>, <https://paddletowater.com/api/email/unsubscribe?t=TOKEN>`
  and `List-Unsubscribe-Post: List-Unsubscribe=One-Click`. Gmail/Yahoo one-click hits the URL as a POST and we honor it instantly.
- **CAN-SPAM footer:** every email carries a physical postal address (legal requirement, see Escalation E1) and a working unsubscribe honored immediately (we do it on click, well inside the 10-day rule).
- **GDPR-lite posture:** consent is captured by double opt-in (the confirm click is the consent record, section 8), we store only email + watched spot ids + timestamps, and unsubscribe disables the row and stops all sends. A delete-on-request path is trivial (drop the row). Audience is Bay Area but we stay clean anyway.
- **Warmup / volume reality:** at this scale (dozens of confirmed emails, capped 1/day, only when relevant) volume is tiny and self-warms; there is no ramp to manage. The real reputation risks at low volume are spam complaints and bounces, not throughput. Double opt-in kills both (no typos, no spam traps, no unconsented recipients).
- **Spam avoidance:** frequency mirrors push exactly: max 1 email per subscriber per UTC day, sent only when a watched spot has a calm window (same evaluator as push, section 9). Plain, useful, per-spot content, no marketing blasts.

## 8. Anonymous email-identity model

Email is just email + watched spots, not an account (no login/password, owner principle, CLAUDE.md). Email becomes the **server-side, cross-partition identity** that push cannot be on iOS: the same address ties together Safari, the installed PWA, and desktop, so return measurement no longer dies to ITP eviction (`supabase/migrations/0002_retention.sql:1-14`). We never call `posthog.identify()` (forbidden, CLAUDE.md); the identity lives in Supabase and return is measured from a server ledger, exactly like `alert_opens`.

**Single vs double opt-in: recommend double (confirmed) opt-in.** Rationale: the sending domain is brand new with no reputation, and email is being made the *primary* channel, so one spam-trap or typo bounce is disproportionately damaging. Double opt-in guarantees every stored address is real and consented, gives a clean GDPR consent record, and the confirmation email doubles as low-volume warmup. Cost: one extra click, some capture-to-confirm drop. We mitigate by putting the payoff in the confirm email so the click-through is high, and we instrument the confirm step so the drop is visible (section 11).

### Schema sketch (new migration, isolated from the protected push tables)

Kept as parallel tables so the daily email job never touches `push_subscriptions` / `watched_spots` / `alert_sends` (the PROTECTED push path, `.claude/studio.md`). Email and push agree because they share the *evaluator*, not the tables.

```sql
-- supabase/migrations/0003_email_alerts.sql  (service-role only, RLS on, no policies)

create table if not exists email_subscriptions (
  id           uuid primary key default gen_random_uuid(),
  email        text not null,
  anon_id      text,                       -- best-effort join to the device
  token        text not null unique        -- unsub + open-ledger key, ITP-proof
               default replace(gen_random_uuid()::text,'-',''),
  confirm_token text unique,               -- single-use, cleared on confirm
  confirmed_at timestamptz,                -- null = pending double opt-in
  enabled      boolean not null default true,
  unsub_at     timestamptz,                -- churn stamp, mirrors disabled_at
  created_at   timestamptz not null default now(),
  last_seen    timestamptz not null default now()
);
-- Only one active row per address.
create unique index if not exists email_subs_email_idx
  on email_subscriptions (lower(email)) where enabled = true;

create table if not exists email_watched_spots (
  email_subscription_id uuid not null references email_subscriptions(id) on delete cascade,
  spot_id  integer not null,
  created_at timestamptz not null default now(),
  primary key (email_subscription_id, spot_id)
);
create index if not exists email_watched_spot_idx on email_watched_spots (spot_id);

-- Dedup ledger, exact analog of alert_sends.
create table if not exists email_sends (
  id  bigint generated always as identity primary key,
  email_subscription_id uuid not null references email_subscriptions(id) on delete cascade,
  spot_id integer not null,
  window_key text not null,                -- YYYY-MM-DD spot-local, same key as push
  sent_at timestamptz not null default now()
);
create unique index if not exists email_sends_dedupe_idx
  on email_sends (email_subscription_id, spot_id, window_key);

-- Return ledger, exact analog of alert_opens.
create table if not exists email_opens (
  id bigint generated always as identity primary key,
  email_subscription_id uuid not null references email_subscriptions(id) on delete cascade,
  spot_id integer,
  opened_at timestamptz not null default now()
);

alter table email_subscriptions  enable row level security;
alter table email_watched_spots  enable row level security;
alter table email_sends          enable row level security;
alter table email_opens          enable row level security;
```

Watched spots attach to the email subscription via `email_watched_spots`, mirroring how `watched_spots` attaches to `push_subscriptions` (`supabase/migrations/0001_alerts.sql:17-23`). At capture we copy the client's `ptw-favorites` set (plus the spot that triggered enrollment) into `email_watched_spots`, keyed to the new row. `anon_id` (from `getAnonId()`, `lib/push.ts:102`) is stored best-effort so a device that later also installs can be loosely correlated.

### Daily send reuses the evaluator + dedup

A new route `app/api/cron/send-email-alerts` (runtime nodejs, CRON_SECRET bearer, `?dry=1` support) mirrors `app/api/cron/check-conditions/route.ts` but over the email tables:
1. Load `enabled = true AND confirmed_at IS NOT NULL` email subs + their `email_watched_spots` + recent `email_sends`.
2. Fetch conditions once per unique watched spot with the **same `findGoodWindow` / `evaluateGoodWindow`** (`lib/alerts/conditions-window.ts`). Email and push can never disagree because the calm definition (>=2 consecutive calm daytime hours, wind <=8mph) is literally the same function.
3. Per sub: cap 1/UTC-day, per-(spot,window_key) dedup via `email_sends` (unique index + ON CONFLICT), pick the soonest window, send one email, insert the ledger row.
4. Hard bounce / complaint webhook from Resend sets `enabled=false, unsub_at=now()` (mirrors the push "gone -> disable" at `check-conditions/route.ts:89-98`).

**Scheduling:** a daily send fits a daily Vercel Hobby cron. Add `/api/cron/send-email-alerts` as the second cron in `vercel.json` at `0 2 * * *` (mirrors the push send time, chosen for plan-ahead lead). If Hobby's cron count blocks a second entry (verify at build; assumption), reuse the Supabase pg_cron + pg_net scheduler already being stood up for launch reminders (DECISIONS.md D4) to hit the route. This is a new isolated route, not a change to the protected push cron.

## 9. Unsubscribe + privacy copy (exact strings, house style)

**One-click unsubscribe flow:** the `t=TOKEN` in every footer link and List-Unsubscribe header hits `GET/POST /api/email/unsubscribe?t=TOKEN`, which sets `enabled=false, unsub_at=now()` on the matching `email_subscriptions` row and renders a tiny confirmation page. One tap, no login, no confirm step.

**Confirmation page copy:**
> You're unsubscribed. No more alerts. Changed your mind? Watch a spot again anytime.

**CAN-SPAM footer (every alert):**
> You're getting this because you signed up for calm-window alerts at paddletowater.com.
> [Unsubscribe] · Paddle to Water, 500 Folsom St, San Francisco, CA 94105

**Consent microcopy at capture (under the field):**
> One email a day, max. Only when a spot you watch looks good. Unsubscribe in one tap.

**Double opt-in confirmation email:**
> Subject: Confirm your Paddle to Water alerts
> Body: Tap to confirm and we'll watch your spots for calm windows.
> [Confirm alerts]
> Didn't sign up? Ignore this email, nothing happens.

**Alert email:**
> Subject: [Spot name] looks calm [Saturday morning]
> Body: [Spot name] has a calm window [Saturday 7 to 10am]. [put-in notes from the spot]. [Open in the app]
> (footer above)

## 10. Per-platform enrollment matrix (core UX spec)

One ask at a time, chosen by platform and by what the user just declined. The surface is a redesign of `components/InstallPrompt.tsx` into a channel-agnostic enrollment card (email field is the new primitive; install stays only where it is the better option).

| State | Detection | Primary ask | Fallback | Trigger that fires it |
|---|---|---|---|---|
| Installed + push granted | `standalone` + `readStashedSubscription()` set | None (already reachable) | Optional email-as-backup: out of scope | n/a |
| Installed + push denied | `standalone` + `DENIED_KEY==="1"` (`InstallPrompt.tsx:239`) | **Email rescue** | none | standalone_relaunch / manual |
| iOS Safari (not installed) | `platform==="ios"` | **Email (lead)** | Demoted link: add to Home Screen for push too | conditions_interest (2+ views) / first_save / return_session |
| Android browser (not installed) | `platform==="android"` (`beforeinstallprompt`) | Install + push (existing button) | Email offered if install declined | conditions_interest / first_save / return_session |
| Desktop (unknown) | not iOS, not standalone, no `beforeinstallprompt` | **Email (lead)** | none | conditions_interest / first_save |

**Copy strings:**

- Email lead (iOS / desktop) headline: `Get pinged when your spots are calm.`
  sub: `One email when a spot you're watching has a calm window.`
  field placeholder: `you@email.com` · button: `Email me alerts`
- iOS secondary (demoted, small): `Prefer push? Add to Home Screen.`
- Push-denied rescue (installed) headline: `Notifications are off. Get alerts by email instead.`
  sub: `We'll email you when a watched spot looks good.` · button: `Email me alerts`
- Desktop headline: `Get calm-window alerts by email.`
  sub: `Watch a spot, we'll email you when it's good to paddle.`
- Android: existing install copy stays primary; on decline show the email lead card.
- Post-submit (pre-confirm) state: `Check your inbox. Tap the link to confirm and you're set.`

All strings: no em dashes, one fact each, per house style.

## 11. Instrumentation plan

Split per the SYSTEM vs INTENT rule (`lib/analytics.ts`), every event added to the right union, and an `analytics/INSTRUMENTATION_CHANGELOG.md` entry is mandatory.

**Broaden the existing surface (props-changed):**
- `alert_optin_shown` / `alert_optin_dismissed`: add `channel: "push" | "email"`; add `trigger: "conditions_interest"` value (anchor: 2+ distinct dwell-gated `conditions_viewed` in a session). Existing values `first_save | standalone_relaunch | manual | return_session` stay. Extend the `EventPropMap` unions at `lib/analytics.ts:133-145`.

**New INTENT events (`trackIntent`):**
- `email_capture_submitted` — user typed an address and hit the button. Props: `platform`, `trigger`, `watched_count`.
- `email_capture_confirmed` — fired client-side on the confirm landing page (deliberate click). Props: `watched_count` (no PII).
- `email_alert_opened` — app opened from an email deep link (token in URL, ITP-proof), also written server-side to `email_opens`. Props: `spot_id`.
- `email_unsub` — deliberate unsubscribe act. Props: `source: "footer" | "one_click"`.

**New SYSTEM events (`trackSystem`, server-truth):**
- `email_alert_sent` — recorded in the `email_sends` ledger (source of truth, like `alert_sends`); mirror to PostHog via posthog-node if used. Availability/volume, not intent. (Naming note: `_sent` not `_loaded`; document the exception in the union comment.)
- `email_send_failed` — send/bounce/complaint from the provider webhook. Analog of `alert_subscribe_failed` (`lib/analytics.ts:42`).

**Changelog entry (required):** email channel added 2026-07-XX; `alert_optin_shown/_dismissed` gain `channel` + `conditions_interest` trigger (shown-volume rises as a broadening + a new channel, segment by `channel` and `trigger` to keep push-first-save comparable); the email funnel (`email_capture_submitted -> _confirmed -> email_alert_sent -> email_alert_opened -> email_unsub`) has no history before this date.

## 12. Success metric + guardrails

**Goal metric:** does email lift return vs the push-only baseline. Measured server-side (ITP-proof), not from device analytics:
- Reachable audience = enabled confirmed emails + enabled push subs (existing `reachable_audience_retention.sql`, extended for the email table).
- Enrolled-return rate = distinct subs with an `email_opens` / `alert_opens` row within W1/W4 of confirming, email cohort vs push cohort.
- Because traffic is ~14/day, this is a monitored read over months, not a powered A/B (DECISIONS.md D2). First honest read tracks the early-August server-side retention read already planned (memory `retention-measurement-shipped.md`).

**Guardrails (kill the channel if breached):**
- Unsubscribe rate = `email_unsub` / `email_alert_sent`. Watch for spikes.
- Spam-complaint rate < 0.1% (Gmail/Yahoo threshold) via Resend webhook.
- Hard-bounce rate low (double opt-in should keep it near zero).
- Capture-to-confirm rate (the double opt-in cost): if it craters, revisit single opt-in.

## 13. Acceptance criteria (phased)

**Phase 0 — cheap, independent, ship first (copy + trigger).**
- [ ] "Save this spot" reads "Watch this spot"; saved header reads "Watching (N)". 100%, no flag (decision 1). Verify live DOM on `/?spot=1`.
- [ ] Enrollment prompt fires on `conditions_interest` (2+ distinct dwell-gated `conditions_viewed` in a session), in addition to save/return-session. Respects the 14-day snooze. `alert_optin_shown.trigger="conditions_interest"` observed in the built bundle (`grep -rho conditions_interest .next/static`). Changelog entry present.

**Phase 1 — the load-bearing build (email channel).**
- [ ] `alerts.paddletowater.com` sends with passing SPF, DKIM, and a DMARC record (verify with a mail tester; all three pass).
- [ ] `0003_email_alerts.sql` applied (owner-run, service-role); RLS on, no policies.
- [ ] Capture -> double opt-in works end to end: submit email, receive confirm email, click, row flips `confirmed_at`. Verify one real address arrives in `email_subscriptions` confirmed, with the trigger spot in `email_watched_spots`.
- [ ] `/api/cron/send-email-alerts?dry=1` returns planned sends computed by the shared `evaluateGoodWindow`, and a real run sends one email, writes `email_sends`, respects the 1/UTC-day cap and per-(spot,window) dedup. Verify a live email lands.
- [ ] One-click unsubscribe: footer link and List-Unsubscribe POST both set `enabled=false, unsub_at`. Verify the row flips and no further send goes out.
- [ ] Footer carries the postal address (E1) and List-Unsubscribe headers (RFC 8058) present on the sent message (inspect raw headers).
- [ ] New events land in the bundle and the changelog entry exists.

**Phase 2 — dependent placements (enrollment matrix).**
- [ ] Desktop: the dead install prompt is replaced by the email lead card (verify no button-less prompt renders on desktop).
- [ ] Push-denied installed user sees the email rescue card, not a dead end (verify with `DENIED_KEY` set).
- [ ] iOS Safari leads with email, install demoted to the secondary link (verify render on iOS UA).
- [ ] Matrix behavior: exactly one ask shows per state, gated by snooze/denial.

## 14. Scope fence (explicitly OUT)

- **Native app** — the whole point is to avoid the app-store install wall; email is the anti-native move.
- **Login / accounts / password** — owner anonymous-first principle (CLAUDE.md). Email is identity-bearing without being an account.
- **SMS** — higher cost, carrier compliance overhead, no free tier, worse fit than email for a planning surface. Later, if ever.
- **"Nothing calm this week" digest** — folds into ROADMAP item 8 ("go here instead"), not this channel. Deferred there.
- **Cold-open "Calm near you today" home** — the 7am-oracle default view; sequence after the loop is proven.
- **Cross-channel dedup** (a user with both push and email getting two pings for one window) — channels are independent and capped separately for MVP; the enrollment matrix shows one ask at a time so dual-enrollment is rare. Revisit if it happens.
- **Bounded-concurrency / shared NWS fetch across push and email crons** — duplicate per-spot fetches are fine at this scale; fold into ROADMAP item 5 when the watched set grows.

## 15. A/B flag guidance (per surface)

Board directive: every new user-facing surface behind an A/B flag (`.claude/studio.md`). Reality: ~14 users/day cannot power a test (DECISIONS.md D2, D3). Recommendation per part:
- Rename Save->Watch: copy tweak, exempt, 100%.
- Broadened `conditions_interest` trigger: monitored 100% rollout with guardrails (`alert_optin_shown` volume by trigger, dismiss rate), D3-style. Not a powered arm.
- Email channel + enrollment redesign: this is a new user-facing surface, so the directive says flag it. At this traffic a powered arm is impossible, so recommend a **monitored 100% rollout behind a kill-switch flag** (flag defaults on, exists to instantly disable email if deliverability or complaint guardrails breach), not a control/treatment split. This needs owner sign-off (Escalation E2).

## 16. Escalations

- **E1 (RESOLVED 2026-07-10, DECISIONS D5): CAN-SPAM postal address.** Owner supplied `500 Folsom St, San Francisco, CA 94105` (secure building, no unit number) for the footer. Baked into section 9.
- **E2 (RESOLVED 2026-07-10, DECISIONS D6): rollout mechanism.** Monitored 100% rollout behind a kill-switch flag (defaults on, flips off if deliverability/complaint guardrails breach). Not a control/treatment split.
- **E3 (advisory, consent): single vs double opt-in.** Recommend double opt-in for deliverability and a clean consent record, accepting a capture-to-confirm drop. Flagging because it is a materially different UX (an extra click) and directly affects the conversion the whole bet rests on. Board should know we chose safety over raw capture.
- **E4 (advisory, new PII): storing email addresses.** This is the first PII the app stores (today it is anonymous device ids only, `lib/push.ts`). Posture: minimal storage, double-opt-in consent record, instant unsubscribe, trivial delete-on-request. No further action needed unless the owner wants a fuller privacy policy page.
- **E5 (advisory, infra): sending subdomain + scheduler.** Recommend `alerts.paddletowater.com` and a second daily Vercel cron (fall back to the D4 Supabase pg_cron if Hobby blocks a second cron). Cosmetic DNS + scheduler choice, resolved here, noting for the board.

## 17. Open assumptions to verify at build

- Email converts materially higher than ~1% install (the core bet; unmeasured, section 2).
- Resend free-tier limits (3,000/mo, 100/day) current at setup.
- Vercel Hobby allows a second daily cron; if not, use Supabase pg_cron (D4).
- No cross-channel double-send in practice given one-ask-at-a-time enrollment.
