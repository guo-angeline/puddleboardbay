"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { authEnabled } from "@/lib/supabase/config";
import { getAnonId } from "@/lib/push";
import { trackIntent, setPersona } from "@/lib/analytics";
import { validateDisplayName } from "@/lib/account/displayName";

// Item 44: optional Google accounts. This hook is the single entry point for
// auth UI. When auth is not configured it reports `enabled: false` and no-ops,
// so the anonymous app is unchanged.

// Module-scoped so the migrate-on-sign-in link fires at most once per user per
// page load even if onAuthStateChange re-emits SIGNED_IN (e.g. token refresh).
// The server route is idempotent anyway; this just avoids redundant calls.
const linkedUsers = new Set<string>();

// Fire-and-forget: claim this device's still-anonymous SUBSCRIPTIONS for the
// account.
//
// Item 76: this no longer uploads saved spots. It ran on every page load, so
// re-sending localStorage each time would resurrect a spot the user had deleted
// on another device. Saved-spot reconciliation now happens exactly once per
// account per device, owned by the sync in `lib/account/savedSync.ts`, after
// which the server is the source of truth.
async function linkDeviceToAccount(userId: string) {
  if (linkedUsers.has(userId)) return;
  linkedUsers.add(userId);
  try {
    await fetch("/api/account/link", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ anonId: getAnonId(), savedSpotIds: [] }),
    });
  } catch {
    // Best-effort; a failed link just means the next sign-in retries. Do not
    // block or surface an error to the user.
    linkedUsers.delete(userId);
  }
}

export interface AccountState {
  enabled: boolean;
  user: User | null;
  loading: boolean;
  /**
   * Item 77: the public byline the user chose, or "" if they never set one.
   * Deliberately NOT derived from the email address, which is what it used to
   * be. "" means "publish as A paddler", never "fall back to the address".
   */
  displayName: string;
  /** Persist a chosen display name. Resolves to an error string, or null. */
  saveDisplayName: (name: string) => Promise<string | null>;
  /**
   * Item 78: delete this account and its data (the runbook's "everything"
   * scope), then sign out locally. Resolves to an error string, or null.
   */
  deleteAccount: () => Promise<string | null>;
  /** Primary path: email a 6-digit code. Resolves to an error string, or null on success. */
  sendEmailCode: (email: string) => Promise<string | null>;
  /** Second step of the email path. Resolves to an error string, or null on success. */
  verifyEmailCode: (email: string, code: string) => Promise<string | null>;
  /** Secondary path, kept alongside email. */
  signInWithGoogle: () => void;
  signOut: () => void;
}

export function useAccount(): AccountState {
  const enabled = authEnabled();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(enabled);

  useEffect(() => {
    const supabase = getBrowserSupabase();
    // !supabase <=> !authEnabled() <=> `loading` already initialized to false,
    // so just bail (no setState in the effect body, per react-hooks lint).
    if (!supabase) return;

    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setUser(data.user ?? null);
      setLoading(false);
      if (data.user) {
        setPersona({ signed_in: true });
        void linkDeviceToAccount(data.user.id);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      setLoading(false);
      if (event === "SIGNED_IN" && nextUser) {
        setPersona({ signed_in: true });
        trackIntent("account_sign_in_completed", {});
        void linkDeviceToAccount(nextUser.id);
      }
      if (event === "SIGNED_OUT") {
        setPersona({ signed_in: false });
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // PRIMARY path: email a 6-digit code. Chosen over a magic link deliberately.
  // A link opens in whatever browser the mail app decides, which on mobile is
  // usually an in-app webview, so the session lands somewhere the user is not.
  // A typed code works in every context, including the installed PWA.
  async function sendEmailCode(email: string): Promise<string | null> {
    const supabase = getBrowserSupabase();
    if (!supabase) return "Sign-in is unavailable right now.";
    trackIntent("account_sign_in_started", { method: "email" });
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    return error ? error.message : null;
  }

  async function verifyEmailCode(email: string, code: string): Promise<string | null> {
    const supabase = getBrowserSupabase();
    if (!supabase) return "Sign-in is unavailable right now.";
    // Supabase issues a DIFFERENT OTP type depending on whether the address
    // already has an account: "magiclink" for an existing user, "signup" for a
    // brand-new one. The generic "email" type does not reliably verify both,
    // and the mismatch surfaces as the maximally unhelpful "Token has expired
    // or is invalid" even when the code is fresh and correct. That bit a real
    // account which already existed from Google sign-in. So try each type in
    // turn and only report failure once every one is rejected; a wrong-type
    // attempt does not consume the token.
    const types = ["email", "magiclink", "signup"] as const;
    let lastError = "That code did not work. Request a new one and try again.";
    for (const type of types) {
      const { error } = await supabase.auth.verifyOtp({ email, token: code, type });
      if (!error) {
        // onAuthStateChange fires SIGNED_IN, which sets the persona and runs
        // the migrate-on-sign-in link, so nothing else to do here.
        trackIntent("account_sign_in_completed", { method: "email" });
        return null;
      }
      lastError = error.message;
    }
    return lastError;
  }

  // SECONDARY path, kept alongside email.
  function signInWithGoogle() {
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    trackIntent("account_sign_in_started", { method: "google" });
    const origin = window.location.href;
    void supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(new URL(origin).pathname)}` },
    });
  }

  function signOut() {
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    trackIntent("account_sign_out", {});
    void supabase.auth.signOut();
  }

  // Item 77. Stored in Supabase user metadata rather than a new table, so it
  // needs no migration. It is user-writable by design (it is their own name),
  // and it is re-validated server-side at review submit, where it matters.
  // Abuse is covered by the fact that no review publishes without a human
  // approving it, byline included.
  const rawName = user?.user_metadata?.display_name;
  const parsedName = validateDisplayName(rawName);
  const displayName = parsedName.ok ? parsedName.value : "";

  async function saveDisplayName(name: string): Promise<string | null> {
    const supabase = getBrowserSupabase();
    if (!supabase) return "Sign-in is unavailable right now.";
    const checked = validateDisplayName(name);
    if (!checked.ok) return checked.error;
    // Server-authoritative: PATCH writes the account metadata AND propagates the
    // byline to existing reviews in one place (item 78). Doing the metadata
    // write on the client would leave those review rows stale.
    let res: Response;
    try {
      res = await fetch("/api/account", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ displayName: checked.value }),
      });
    } catch {
      return "Could not reach the server. Try again.";
    }
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      return j.error ?? "Could not save that name.";
    }
    // Refresh the local session so `user.user_metadata.display_name` reflects
    // the admin-side change (the JWT is reissued with the new metadata).
    const { data } = await supabase.auth.refreshSession();
    if (data.user) setUser(data.user);
    return null;
  }

  async function deleteAccount(): Promise<string | null> {
    const supabase = getBrowserSupabase();
    if (!supabase) return "Sign-in is unavailable right now.";
    let res: Response;
    try {
      res = await fetch("/api/account", { method: "DELETE" });
    } catch {
      return "Could not reach the server. Try again.";
    }
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      return j.error ?? "Could not delete the account.";
    }
    trackIntent("account_deleted", {});
    // The server already removed the auth user; clear the local session so the
    // UI returns to the anonymous state.
    await supabase.auth.signOut();
    setUser(null);
    return null;
  }

  return {
    enabled,
    user,
    loading,
    displayName,
    saveDisplayName,
    deleteAccount,
    sendEmailCode,
    verifyEmailCode,
    signInWithGoogle,
    signOut,
  };
}
