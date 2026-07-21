-- Item 43: crowd reviews (star rating + optional comment). Run in the Supabase
-- SQL editor (same hand-applied pattern as prior migrations). PROTECTED: owner
-- reviews before it is applied.
--
-- Shape settled by D24: required sign-in, binary publish/reject PRE-moderation,
-- email-on-submit, no auto-publish ever, all spots.

create table if not exists spot_reviews (
  id            uuid primary key default gen_random_uuid(),
  spot_id       integer not null,

  -- ON DELETE SET NULL, deliberately NOT cascade. The live Contributor Terms
  -- make two promises that pull in opposite directions: section 9.3 says a
  -- deleted account's reviews are "removed from public display and dissociated
  -- from your account and display name", while section 3.3 retains a
  -- moderation-decision record for up to three years for legal defence. A
  -- cascade would destroy that record. Set-null keeps the row, and the deletion
  -- runbook additionally sets status='removed' and clears display_name, which
  -- satisfies both promises.
  user_id       uuid references auth.users (id) on delete set null,

  rating        smallint not null check (rating between 1 and 5),
  body          text,                    -- optional; length capped in validation
  status        text not null default 'pending'
                  check (status in ('pending', 'published', 'rejected', 'removed')),

  -- Denormalised at submit so a published review keeps its byline even after the
  -- account is deleted and user_id goes null. Cleared by the deletion runbook.
  display_name  text,

  -- One-click approve/reject from the moderation email. Same durable-token idiom
  -- as email_subscriptions.token (see app/api/email/unsubscribe/route.ts).
  moderation_token text not null unique
                  default replace(gen_random_uuid()::text, '-', ''),

  -- Proof of assent. The liability cap and class-action waiver bind only the
  -- version the contributor actually saw and checked, so store which one.
  terms_version text not null,
  terms_hash    text not null,
  assented_at   timestamptz not null,

  created_at    timestamptz not null default now(),
  decided_at    timestamptz
);

-- ToS section 2.3: one review per launch spot per account. Partial, so the
-- constraint does not block once user_id goes null on account deletion.
create unique index if not exists spot_reviews_one_per_spot
  on spot_reviews (user_id, spot_id) where user_id is not null;

-- The read path: published reviews for one spot, and the aggregate sweep.
create index if not exists spot_reviews_spot_status_idx on spot_reviews (spot_id, status);
create index if not exists spot_reviews_user_idx on spot_reviews (user_id);

alter table spot_reviews enable row level security;

-- Anyone may read PUBLISHED reviews. Nothing else is publicly readable: a
-- pending review must never be visible before a human approves it, and a
-- rejected one must never be visible at all.
do $$
begin
  if not exists (
    select 1 from pg_policies where tablename = 'spot_reviews' and policyname = 'published_readable'
  ) then
    create policy published_readable on spot_reviews
      for select using (status = 'published');
  end if;

  if not exists (
    select 1 from pg_policies where tablename = 'spot_reviews' and policyname = 'own_reviews_readable'
  ) then
    create policy own_reviews_readable on spot_reviews
      for select using (auth.uid() = user_id);
  end if;
end $$;

-- Writes go exclusively through the server routes using the service-role key,
-- which bypasses RLS. No insert/update/delete policy is defined on purpose:
-- a client holding the anon key cannot publish, edit, or moderate anything.
