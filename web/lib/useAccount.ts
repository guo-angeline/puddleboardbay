"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { authEnabled } from "@/lib/supabase/config";
import { getAnonId } from "@/lib/push";
import { trackIntent, setPersona } from "@/lib/analytics";

// Item 44: optional Google accounts. This hook is the single entry point for
// auth UI. When auth is not configured it reports `enabled: false` and no-ops,
// so the anonymous app is unchanged.

// Module-scoped so the migrate-on-sign-in link fires at most once per user per
// page load even if onAuthStateChange re-emits SIGNED_IN (e.g. token refresh).
// The server route is idempotent anyway; this just avoids redundant calls.
const linkedUsers = new Set<string>();

function readSavedSpotIds(): number[] {
  try {
    const raw = localStorage.getItem("ptw-favorites");
    const arr = raw ? (JSON.parse(raw) as unknown[]) : [];
    return arr.filter((n): n is number => typeof n === "number");
  } catch {
    return [];
  }
}

// Fire-and-forget: claim this device's anonymous data for the account.
async function linkDeviceToAccount(userId: string) {
  if (linkedUsers.has(userId)) return;
  linkedUsers.add(userId);
  try {
    await fetch("/api/account/link", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ anonId: getAnonId(), savedSpotIds: readSavedSpotIds() }),
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

  return { enabled, user, loading, sendEmailCode, verifyEmailCode, signInWithGoogle, signOut };
}
