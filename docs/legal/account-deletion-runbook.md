# Account deletion runbook (item 44 accounts)

**Why this exists.** The privacy policy tells users they can email `hello@paddletowater.com` and have their account and its data deleted. The lawyer gate on item 44 flagged that a deletion promise you cannot reliably perform is itself a problem (FTC Act Section 5), and this policy has been burned before by delete claims that were not operable. So: this procedure must be **tested once on a throwaway account before the `accounts` kill switch is enabled**, per the item-44 pre-enable requirements.

**Target turnaround: 7 days.** CCPA/CPRA allows 45; do not use the full window. Log the request date and the completion date.

---

## THE TRAP: deleting the account does NOT stop their alerts

Read this before running anything. From `supabase/migrations/20260721_accounts.sql`:

| Table | On `auth.users` delete | Result |
|---|---|---|
| `user_saved_spots` | `on delete cascade` | Saved spots are deleted. Good. |
| `push_subscriptions.user_id` | `on delete set null` | **Row survives.** Push alerts keep sending, now "anonymous". |
| `email_subscriptions.user_id` | `on delete set null` | **Row survives, including their email address.** Email alerts keep sending. |
| `spot_reviews.user_id` | `on delete set null` | **Row survives and STAYS PUBLISHED**, still showing their display name. Deliberate: the Contributor Terms retain a moderation record for three years. But the same terms promise the review is unpublished and dissociated, so step 4c is mandatory. |

Deleting only the `auth.users` row therefore leaves their email address in your database and keeps mailing them. That would make the deletion promise false. **Always do Step 4 as well.**

---

## Procedure

### 1. Verify the requester
The request must come **from the email address on the account**. If it arrives from a different address, reply asking them to send it from the account address (do not delete on an unverified request; deleting the wrong person's data is worse than a slow response). No other ID check is needed or appropriate.

### 2. Find the account
Supabase dashboard → **Authentication → Users** → search the email. Copy the **User UID** (a uuid). If there is no such user, they never signed in; skip to Step 4 (they may still have an anonymous email/push subscription).

### 3. Ask what they actually want (one short reply)
Two different things are commonly meant. Ask which, it takes one line:
- **"Delete my account"** = the account + synced saved spots, but they may want to keep getting alerts anonymously.
- **"Delete everything / all my data"** = the above **plus** their email + push subscriptions.

Default to the broader reading if they do not answer within a few days, and say so in your reply. Over-deleting their own data on their own request is the safe error.

### 4. Delete (Supabase SQL editor)

Run with the user's uuid and email substituted. Do the subscriptions **first** so nothing is orphaned.

```sql
-- Substitute both:
--   :uid   the auth.users UID from step 2
--   :email the requester's email address

-- 4a. Alert subscriptions (ONLY if they asked for "everything"; see step 3).
--     This is the part the auth.users delete does NOT do for you.
--     Everything hanging off a subscription (watched_spots, alert_sends,
--     alert_opens, launch_reminders, email_watched_spots, email_sends,
--     email_opens) is `on delete cascade`, so deleting these two parent rows
--     removes the whole trail. Do not delete the child tables by hand.
delete from email_subscriptions
  where user_id = ':uid' or lower(email) = lower(':email');

delete from push_subscriptions where user_id = ':uid';

-- 4c. Reviews (ALWAYS run this, for either scope in step 3).
--     The Contributor Terms promise two things at once: the review is removed
--     from public display and dissociated from the person, AND a moderation
--     record survives for up to three years for legal defence. So do NOT delete
--     the row: unpublish it and strip the byline. The auth.users delete in 4b
--     then nulls user_id via the FK, completing the dissociation.
update spot_reviews
   set status = 'removed', display_name = null
 where user_id = ':uid';

-- 4b. The account itself. Cascades user_saved_spots.
--     (Or use Authentication -> Users -> "Delete user" in the dashboard.)
delete from auth.users where id = ':uid';
```

If they asked only to delete the **account** (not alerts), skip 4a entirely and run only 4b, then tell them their alert subscription is still active and how to unsubscribe (the link in any alert email).

### 5. Analytics (usually nothing to do, but be accurate)
Analytics are keyed on a random `anon_id`, never on the account (we deliberately never call `posthog.identify()`), so there is normally no account-identifiable analytics record to delete. If they explicitly ask for analytics deletion too:
- Get their `anon_id` from their subscription row **before** step 4 (`select anon_id from email_subscriptions where lower(email) = lower(':email')`).
- PostHog → Persons → search that distinct id → **Delete person**.
If the `anon_id` is null or gone, say so honestly: the analytics are pseudonymous and cannot be tied back to them.

### 6. Verify, then confirm
Re-run these; all must return zero rows:

```sql
select count(*) from auth.users            where id = ':uid';
select count(*) from user_saved_spots      where user_id = ':uid';
select count(*) from email_subscriptions   where user_id = ':uid' or lower(email) = lower(':email');
select count(*) from push_subscriptions    where user_id = ':uid';
select count(*) from spot_reviews          where user_id = ':uid';
-- And confirm nothing of theirs is still public or still bylined:
select count(*) from spot_reviews          where user_id = ':uid' and status = 'published';
```

The moderation records are *supposed* to survive. Confirm they did, and that they
carry no byline, by checking that this returns rows all reading `removed` with a
null `display_name` (run it BEFORE the `auth.users` delete, while `:uid` still
matches, or search by the review ids you noted):

```sql
select id, status, display_name from spot_reviews where user_id = ':uid';
```

Then reply to the requester confirming what was deleted and what (if anything) was intentionally kept. Record the request date, completion date, and scope in your own log.

---

## Pre-enable test (required, do this once)

Before turning the `accounts` kill switch on:
1. Sign in with a throwaway Google account on the live site.
2. Save a spot, subscribe to email alerts, and submit a review and approve it, so every table has rows.
3. Run this runbook against it end to end.
4. Confirm Step 6 returns zero for everything except `spot_reviews`, where the row must survive as `status='removed'` with a null `display_name`, and confirm the review is gone from the spot page. Confirm no further alert email arrives.

Record the date you did this. That is what makes the privacy-policy deletion promise true rather than aspirational.

### Done: 2026-07-21 (item 78, in-product self-service deletion)

Exercised end to end against the real `DELETE /api/account` handler (not the manual SQL), with a seeded account holding rows in every table: two reviews (one published, one pending), a saved spot, and a confirmed email subscription. Result matched Step 6 exactly: `auth.users` gone, `user_saved_spots` / `email_subscriptions` / `push_subscriptions` all zero, and both reviews retained as `status='removed'` with `display_name=null` and `user_id` nulled via the FK. No row of theirs left public or bylined. The self-service DELETE now also checks each write and aborts on the first failure, so a partial deletion cannot leave a bylined public review pointing at a half-deleted account; every step is idempotent, so a client retry after an abort completes cleanly. Legal gate (lawyer agent) returned `needs-changes` with this pre-enable test as the gating action; run once more with a hand-clicked Google sign-in before relying on it for a real request.
