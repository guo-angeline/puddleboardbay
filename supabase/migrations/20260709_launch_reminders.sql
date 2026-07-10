-- Launch reminders: a user can ask, from the alert interstitial, to be pushed
-- again ~30 min before a calm window opens ("remind me at launch time").
-- Stores one pending reminder per (subscription, spot, window) and is drained
-- by /api/cron/send-reminders, which sends the push once fire_at has passed.
--
-- Apply this in the Supabase SQL editor (service-role) before deploying the
-- server push reminder. Idempotent.

create table if not exists public.launch_reminders (
  id              uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.push_subscriptions(id) on delete cascade,
  spot_id         integer not null,
  spot_name       text,
  window_key      text not null,           -- YYYY-MM-DD, spot-local, for dedup
  fire_at         timestamptz not null,    -- window start minus the lead time
  sent_at         timestamptz,             -- null = still pending
  created_at      timestamptz not null default now(),
  unique (subscription_id, spot_id, window_key)
);

-- Fast lookup of due, unsent reminders for the cron.
create index if not exists launch_reminders_due_idx
  on public.launch_reminders (fire_at)
  where sent_at is null;
