-- Conditions-alert retention loop: anonymous push subscriptions + watched spots.
-- Run in the Supabase SQL editor. RLS is on with no policies, so only the
-- service role (used by the /api/alerts/subscribe route) can access these tables.

create table if not exists push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  anon_id     text,
  endpoint    text unique not null,
  p256dh      text not null,
  auth        text not null,
  enabled     boolean not null default true,
  user_agent  text,
  created_at  timestamptz not null default now(),
  last_seen   timestamptz not null default now()
);

create table if not exists watched_spots (
  subscription_id uuid not null references push_subscriptions(id) on delete cascade,
  spot_id         integer not null,
  created_at      timestamptz not null default now(),
  primary key (subscription_id, spot_id)
);
create index if not exists watched_spots_spot_idx on watched_spots (spot_id);

create table if not exists alert_sends (
  id              bigint generated always as identity primary key,
  subscription_id uuid not null references push_subscriptions(id) on delete cascade,
  spot_id         integer not null,
  window_key      text not null,
  sent_at         timestamptz not null default now()
);
create index if not exists alert_sends_dedupe_idx on alert_sends (subscription_id, spot_id, window_key);

alter table push_subscriptions enable row level security;
alter table watched_spots      enable row level security;
alter table alert_sends        enable row level security;
-- Intentionally no policies: anon/authenticated get zero access; service role bypasses RLS.
