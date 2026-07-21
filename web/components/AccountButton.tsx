"use client";

import { useState } from "react";
import { useAccount } from "@/lib/useAccount";
import { useKillSwitch } from "@/lib/experiments";
import { trackIntent } from "@/lib/analytics";
import SignInSheet from "@/components/SignInSheet";
import AccountSheet from "@/components/AccountSheet";

// Item 44 / 78: header account control. Renders NOTHING unless (a) the
// `accounts` kill switch is on AND (b) auth is configured (env keys present),
// so with no credentials the header is byte-identical to the anonymous app.
//
// Signed out: opens the sign-in sheet (email code first, Google secondary).
// Signed in: the identity is a button that opens the account sheet (item 78:
// display name, your reviews, sign out, delete account).
export default function AccountButton() {
  const enabledSwitch = useKillSwitch("accounts");
  const { enabled, user, loading, displayName } = useAccount();
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
          className="flex shrink-0 items-center gap-1.5 rounded-full border border-(--border) px-2.5 py-1.5 text-sm font-medium text-(--dark) hover:bg-(--fill) focus:outline-none focus-visible:ring-2 focus-visible:ring-(--accent) sm:px-3"
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
        className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-(--border) px-2.5 py-1.5 text-sm font-medium text-(--dark) hover:bg-(--fill) focus:outline-none focus-visible:ring-2 focus-visible:ring-(--accent) sm:px-3"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
        <span className="hidden max-w-[7rem] truncate sm:inline">{label}</span>
      </button>
      {accountOpen && <AccountSheet onClose={() => setAccountOpen(false)} />}
    </>
  );
}
