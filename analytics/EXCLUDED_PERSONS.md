# Excluded persons (internal / owner traffic)

Every analytics query MUST exclude these `person_id`s. They are the owner's own
devices, not users, and they dominate low-frequency signals (they were ~72% of
all `favorite_toggled` saves in the 14 days to 2026-07-09). Add
`AND person_id NOT IN (<ids below>)` to any query, or filter equivalently.

This is the analysis-side backstop. The ingestion-side backstop is
`localStorage['ptw-internal'] = "1"` on each device (dropped by `before_send`,
see `components/PostHogProvider.tsx`). Both are needed: the flag only stops
*future* events on a device where it's set; this list also removes *historical*
events and covers devices/partitions where the flag isn't set.

| person_id | device | why excluded | first seen |
|---|---|---|---|
| `11a83b86-4d73-565f-8b70-2f2847d865be` | iOS 18.7 / Mobile Safari / standalone PWA | Owner's phone: saved spots, opted in, clicked own push notifications. Identified 2026-07-09 by the owner. | 2026-06-15 |
| `0faaad14-aa87-5cda-a76c-a3f59e0fa4d1` | Mac OS X / Chrome / Desktop | Owner's dev/test machine: 2,281 events (largest single contaminant), 14 saves, 1 alert click. Presumed-internal; confirm if a real second user ever surfaces. | 2026-06-27 |
| `21e77b69-f479-5130-9696-e386ad7f9aa0` | Mac OS X / Chrome / Desktop (browser) | Owner's Mac Chrome, new person_id after the `0faaad14` id churned (storage cleared / new profile). Confirmed 2026-07-10 by the owner: granted geolocation while testing the auto-locate feature. | 2026-07-10 |
| `f38f6a31-bb18-525d-9d49-8e7194442d2b` | iOS 18.7 / Mobile Safari / browser | Owner's friend, test session on the owner's request (identified 2026-07-13 by the owner). One session 2026-07-14 00:32-00:54 UTC: 187 events, 17 spot opens incl. 65 + 58, 2 favorite_toggled, alert_optin_shown + dismissed. No email submitted, no push grant, so the email/push lists are unaffected. Note: owner reported the session as ~6:30-6:40 PM PT; events say 5:32-5:54 PM PT, same day, unambiguous match on device + spots. If he retests later, his events keep landing on this person_id (unless ITP purges storage; re-check then). | 2026-07-14 |

Note on the iOS PWA identity split: the owner's phone did **not** fan out into a
separate Safari-partition person_id (checked 2026-07-09); `11a83b86` carries both
its browser and standalone events. If a standalone-only twin appears later, add
it here.

## Excluded email addresses (email alert channel, from 2026-07-10)

The email channel is keyed to the email address in Supabase (`email_subscriptions`,
`email_sends`, `email_opens`), NOT a PostHog `person_id`, so the person_id list
above does not cover it. Every email-cohort query (reachable/active-subscriber
retention, the email funnel, alert CTR over `email_sends` / `email_opens`) MUST
also exclude these owner addresses, e.g. `AND lower(email) NOT IN (...)` or by
joining out the matching `email_subscription_id`s. They are the owner's own test
subscriptions, not users.

| email | why excluded | first seen |
|---|---|---|
| `qig6789@gmail.com` | Owner (confirmed 2026-07-10). Used to test the double-opt-in; landed in Gmail inbox. | 2026-07-10 |
| `qiguo1102@live.com` | Owner. Used for the first live subscribe/confirm spine test; confirmed subscriber watching spots 1 & 7. | 2026-07-10 |

These are also the owner's dogfood subscriptions, so they may generate real
`email_sends` / `email_opens` rows: filter them from metrics, do not treat as
signal. If the owner adds more addresses for testing, append them here.

## Excluded push subscriptions (PENDING, D9 resolved (a) 2026-07-11)

The PUSH Supabase tables (`push_subscriptions`, `alert_opens`, `alert_sends`) are
keyed by `anon_id` / `id` / `endpoint` / `token`, NONE of which is a PostHog
`person_id` or an email, so the two lists above do NOT cover them. The owner's own
iOS PWA push subscription therefore CANNOT be filtered from any Supabase push
metric yet, which contaminates `queries/enrollment_return_funnel.sql`,
`queries/reachable_audience_retention.sql`, and
`queries/active_subscriber_retention.sql` at single-digit N. Until this is filled,
read every push number as owner-inclusive.

**To complete (owner has Supabase access):** run in the Supabase SQL editor
```
select id, anon_id, user_agent, enabled, created_at, last_seen
from push_subscriptions order by created_at;
```
identify the owner's iOS-standalone row (user_agent mentions iPhone / Mobile
Safari, created ~2026-06-30), then add it below and wire the key into the three
push queries' owner-exclusion clause (the funnel query has a NO-OP placeholder
`'__no_owner_push_key_documented__'` ready to receive it). Prefer `anon_id` as the
key (it also joins across the push/email stores); fall back to the row `id` if
`anon_id` is null.

| anon_id (or id) | device | why excluded | first seen |
|---|---|---|---|
| _pending owner lookup_ | Owner iOS PWA (the granted push subscription) | Owner's own dogfood push subscription, not a user. | 2026-06-30 |
