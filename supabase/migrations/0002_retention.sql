-- Long-horizon retention measurement for the conditions-alert loop.
-- Run in the Supabase SQL editor after 0001_alerts.sql.
--
-- Why: person-based retention in PostHog is censored on iOS (Safari ITP purges
-- script storage after ~7 days; the installed PWA lives in a separate storage
-- partition). The push-subscription table is a durable, server-held identity
-- ITP cannot touch, so retention for the subscribed cohort is measured here.
-- Two additions make it computable:
--   1. disabled_at  — when a subscription churned (was previously only a boolean,
--      so a survival curve could not be dated).
--   2. token        — an opaque per-subscription id embedded in the push deep
--      link. It rides the notification payload, NOT client storage, so the
--      open-ping that records a return works even after ITP wipes localStorage.
-- Plus alert_opens: the server-side ledger of app-opens-from-a-push.

-- 1. Churn timestamp. Backfill already-disabled rows from last_seen as a
--    best-effort approximation (their true disable time was not recorded).
alter table push_subscriptions add column if not exists disabled_at timestamptz;
update push_subscriptions
  set disabled_at = last_seen
  where enabled = false and disabled_at is null;

-- 2. Durable opaque token. 32 hex chars, unique, defaulted so new inserts get
--    one automatically and the subscribe upsert never has to set it.
alter table push_subscriptions
  add column if not exists token text default replace(gen_random_uuid()::text, '-', '');
update push_subscriptions
  set token = replace(gen_random_uuid()::text, '-', '')
  where token is null;
alter table push_subscriptions alter column token set not null;
create unique index if not exists push_subscriptions_token_idx on push_subscriptions (token);

-- 3. Server-side open ledger: one row per app-open from a push. Keyed on the
--    durable subscription id, so returns are attributable regardless of what
--    Safari does to the client. spot_id is best-effort (the deep-linked spot).
create table if not exists alert_opens (
  id              bigint generated always as identity primary key,
  subscription_id uuid not null references push_subscriptions(id) on delete cascade,
  spot_id         integer,
  opened_at       timestamptz not null default now()
);
create index if not exists alert_opens_sub_idx on alert_opens (subscription_id, opened_at);

alter table alert_opens enable row level security;
-- Intentionally no policies: only the service role (API routes) may read/write.
