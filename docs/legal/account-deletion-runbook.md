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
```

Then reply to the requester confirming what was deleted and what (if anything) was intentionally kept. Record the request date, completion date, and scope in your own log.

---

## Pre-enable test (required, do this once)

Before turning the `accounts` kill switch on:
1. Sign in with a throwaway Google account on the live site.
2. Save a spot and subscribe to email alerts so all three tables have rows.
3. Run this runbook against it end to end.
4. Confirm Step 6 returns all zeros, and that no further alert email arrives.

Record the date you did this. That is what makes the privacy-policy deletion promise true rather than aspirational.
