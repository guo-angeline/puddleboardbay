"use client";

import { useEffect, useState } from "react";
import { useAccount } from "@/lib/useAccount";
import { useKillSwitch } from "@/lib/experiments";
import { trackIntent } from "@/lib/analytics";
import { deriveLog } from "@/lib/marks";
import { exploredRegions } from "@/lib/exploredSpots";
import SignInSheet from "@/components/SignInSheet";
import AccountSheet from "@/components/AccountSheet";

// Item 44 / 78: header account control. Renders NOTHING unless (a) the
// `accounts` kill switch is on AND (b) auth is configured (env keys present),
// so with no credentials the header is byte-identical to the anonymous app.
//
// Signed out: opens the sign-in sheet (email code first, Google secondary).
// Signed in: the identity is a button that opens the account sheet (item 78:
// display name, your reviews, sign out, delete account).
// Item 77: the header is a deliberate set. Item 37 matched the search input
// and the Feedback button at 30px tall with an 8px radius; the account button
// shipped later (item 44) as a full pill at text-sm and never joined it, so
// three mismatches sat side by side: radius, text size, and border colour.
//
// Geometry is matched here (rounded-lg, text-xs, px-3 py-1.5, 16px icon =
// the same 30px box as Feedback). Colour is deliberately NOT matched: Feedback
// keeps the azure outline that marks it as the call to action, and this stays
// on the neutral hairline the mobile search button already uses, so the header
// has one accented control rather than two competing ones.
const HEADER_BUTTON =
  "flex shrink-0 items-center gap-1.5 rounded-lg border border-(--border) px-3 py-1.5 " +
  "text-xs font-medium text-(--dark) transition-colors hover:border-(--accent) " +
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-(--accent)";

export default function AccountButton() {
  const enabledSwitch = useKillSwitch("accounts");
  const { enabled, user, loading, displayName } = useAccount();
  const collectablesOn = useKillSwitch("collectables");

  // Item 89 half B, HEADER instance only. The legal gate cleared this half on
  // its own and escalated the other one: a mark here is visible ONLY to the
  // signed-in person it belongs to, so Contributor Terms s2.5 ("shown only to
  // the contributor and to nobody else") stays literally true and no version
  // bump or re-assent is needed. The byline instance, which readers would see,
  // is D32 and is NOT built here.
  //
  // A count is permitted because there is no second person on screen to compare
  // against. Item 83's bans still apply and are what this deliberately is not:
  // no denominator, no distance-to-next-mark, no tier, no rank.
  const [markCount, setMarkCount] = useState(0);
  useEffect(() => {
    if (!collectablesOn || !user) return;
    let active = true;
    void (async () => {
      try {
        const res = await fetch("/api/account");
        if (!res.ok) return;
        const summary: { reviews?: { status: string; body: string | null }[]; savedCount?: number } =
          await res.json();
        const log = deriveLog(summary.reviews ?? [], exploredRegions(), [], summary.savedCount ?? 0);
        if (active) setMarkCount(log.earned.length);
      } catch {
        /* a decoration must never break the header */
      }
    })();
    return () => {
      active = false;
    };
  }, [user, collectablesOn]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  if (!enabledSwitch || !enabled || loading) return null;

  if (!user) {
    return (
      <>
        {/* Icon-only on small screens: adding a text button to the header made
            the wordmark and the button itself wrap to two lines at 375px. */}
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          aria-label="Sign in"
          className={HEADER_BUTTON}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <span className="hidden sm:inline">Sign in</span>
        </button>
        {sheetOpen && <SignInSheet onClose={() => setSheetOpen(false)} />}
      </>
    );
  }

  // Prefer the chosen display name; fall back to the email local part, which is
  // only ever the owner's own eyes here (never published, unlike item 77).
  const label = displayName || user.email?.split("@")[0] || "Account";
  return (
    <>
      <button
        type="button"
        onClick={() => {
          trackIntent("account_sheet_opened", {});
          setAccountOpen(true);
        }}
        title={user.email ?? undefined}
        aria-label={`Your account${user.email ? ` (${user.email})` : ""}`}
        className={`${HEADER_BUTTON} whitespace-nowrap`}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
        <span className="hidden max-w-[7rem] truncate sm:inline">{label}</span>
        {/* Sits beside the ICON, not inside the label span, because that span is
            `hidden sm:inline` and most of this app's traffic is mobile: a mark
            rendered inside it would be invisible to the people most likely to
            have earned one. */}
        {markCount > 0 && (
          <span
            className="ml-0.5 rounded-full bg-(--accent) px-1.5 text-[11px] font-semibold leading-[18px] text-white"
            aria-label={`Your marks: ${markCount}`}
          >
            {markCount}
          </span>
        )}
      </button>
      {accountOpen && <AccountSheet onClose={() => setAccountOpen(false)} />}
    </>
  );
}
