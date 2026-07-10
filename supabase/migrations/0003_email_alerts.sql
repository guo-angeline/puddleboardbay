-- Email alert channel (PRD docs/superpowers/specs/2026-07-10-email-alert-channel-and-enrollment.md).
-- Run in the Supabase SQL editor after 0002_retention.sql.
--
-- Why: PWA install converts near zero (~1/182) and iOS web push requires an
-- install first, so the push loop can never reach most users. Email is a single
-- field, works on desktop, is cross-device, and is an identity the iOS Safari/PWA
-- storage partition cannot split, so it is both a higher-converting reach channel
-- AND a durable, ITP-proof retention identity.
--
-- These tables are deliberately PARALLEL to the push tables (push_subscriptions /
-- watched_spots / alert_sends / alert_opens) so the daily email job never touches
-- the protected push send path. Email and push agree because they share the
-- calm-window EVALUATOR (lib/alerts/conditions-window.ts), not these tables.
--
-- Consent: double opt-in. A row is only sent to once confirmed_at is set (the
-- confirm click is the consent record). Unsubscribe flips enabled=false + stamps
-- unsub_at. token rides every email deep link (ITP-proof return ledger, like the
-- push token); confirm_token is single-use and cleared on confirm.

create table if not exists email_subscriptions (
  id            uuid primary key default gen_random_uuid(),
  email         text not null,
  anon_id       text,                        -- best-effort join to the device
  token         text not null unique         -- unsub + open-ledger key, ITP-proof
                default replace(gen_random_uuid()::text, '-', ''),
  confirm_token text unique,                  -- single-use; cleared on confirm
  confirmed_at  timestamptz,                  -- null = pending double opt-in
  enabled       boolean not null default true,
  unsub_at      timestamptz,                  -- churn stamp, mirrors disabled_at
  created_at    timestamptz not null default now(),
  last_seen     timestamptz not null default now()
);
-- At most one active row per address (case-insensitive).
create unique index if not exists email_subs_email_idx
  on email_subscriptions (lower(email)) where enabled = true;

create table if not exists email_watched_spots (
  email_subscription_id uuid not null references email_subscriptions(id) on delete cascade,
  spot_id    integer not null,
  created_at timestamptz not null default now(),
  primary key (email_subscription_id, spot_id)
);
create index if not exists email_watched_spot_idx on email_watched_spots (spot_id);

-- Dedup ledger + daily-cap source of truth, the exact analog of alert_sends.
create table if not exists email_sends (
  id  bigint generated always as identity primary key,
  email_subscription_id uuid not null references email_subscriptions(id) on delete cascade,
  spot_id    integer not null,
  window_key text not null,                   -- YYYY-MM-DD spot-local, same key as push
  sent_at    timestamptz not null default now()
);
create unique index if not exists email_sends_dedupe_idx
  on email_sends (email_subscription_id, spot_id, window_key);
create index if not exists email_sends_sub_sent_idx
  on email_sends (email_subscription_id, sent_at);

-- Return ledger, the exact analog of alert_opens. Written by /api/email/opened
-- from the token in the email deep link. ITP-proof (server-held identity).
create table if not exists email_opens (
  id bigint generated always as identity primary key,
  email_subscription_id uuid not null references email_subscriptions(id) on delete cascade,
  spot_id   integer,
  opened_at timestamptz not null default now()
);
create index if not exists email_opens_sub_opened_idx
  on email_opens (email_subscription_id, opened_at);

-- Service-role only, same posture as 0001/0002: RLS on, no policies, so only the
-- API routes (getSupabaseAdmin) can read or write. No anon/public access to PII.
alter table email_subscriptions enable row level security;
alter table email_watched_spots enable row level security;
alter table email_sends         enable row level security;
alter table email_opens         enable row level security;
