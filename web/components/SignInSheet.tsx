"use client";

import { useEffect, useRef, useState } from "react";
import { useAccount } from "@/lib/useAccount";

// Item 44 (email-first revision): the sign-in surface. An emailed code is
// the PRIMARY path; Google is secondary. Email is the default because the whole
// retention loop is already email (alerts, double opt-in, verified sender), so
// users have already given us this address, and it collects less personal data
// than a Google profile.
//
// A typed code beats a magic link here: a link opens in whatever browser the
// mail client picks, usually an in-app webview on mobile, so the session lands
// somewhere the user is not. Half this audience is in an installed PWA.
//
// Dialog semantics follow the item-70 pattern: role=dialog + aria-modal,
// focus moved in on open, Escape closes, focus restored to the opener.

// Supabase's Email OTP Length is a SERVER-SIDE setting (6 to 10 digits), not a
// constant we get to pick. Hard-coding 6 truncated a real 8-digit code to its
// first 6 characters, so every verification failed with "Token has expired or
// is invalid" while the code on screen looked right. Accept the whole range and
// let the server decide.
const MIN_CODE_LENGTH = 6;
const MAX_CODE_LENGTH = 10;

// The sheet is opened from more than one place, so the subhead says why THIS
// tap needs an account. Defaults to the header's reason.
export default function SignInSheet({
  onClose,
  reason = "Sync your saved spots and alerts across devices.",
}: {
  onClose: () => void;
  reason?: string;
}) {
  const { sendEmailCode, verifyEmailCode, signInWithGoogle } = useAccount();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const codeRef = useRef<HTMLInputElement>(null);

  // Open: remember the opener, move focus in. Close: restore focus. Escape closes.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    emailRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      if (opener && document.contains(opener)) opener.focus({ preventScroll: true });
    };
  }, [onClose]);

  // Focus the code field when we advance, so the flow is keyboard-continuous.
  useEffect(() => {
    if (step === "code") codeRef.current?.focus();
  }, [step]);

  async function onSendCode(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    const err = await sendEmailCode(email.trim());
    setBusy(false);
    if (err) setError(err);
    else setStep("code");
  }

  async function onVerify(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    const err = await verifyEmailCode(email.trim(), code.trim());
    setBusy(false);
    if (err) setError(err);
    else onClose(); // signed in; the header updates from onAuthStateChange
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/30" style={{ zIndex: 1300 }} onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="signin-title"
        tabIndex={-1}
        className="fixed left-1/2 top-1/2 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-2xl focus:outline-none"
        style={{ zIndex: 1301 }}
      >
        <h2
          id="signin-title"
          className="font-['Newsreader'] text-xl font-bold text-(--dark)"
        >
          {step === "email" ? "Sign in" : "Check your email"}
        </h2>

        {step === "email" ? (
          <>
            <p className="mt-1 text-sm text-(--muted)">{reason}</p>

            <form onSubmit={onSendCode} className="mt-4">
              <label htmlFor="signin-email" className="block text-sm font-medium text-(--dark)">
                Email
              </label>
              <input
                id="signin-email"
                ref={emailRef}
                type="email"
                required
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="mt-1 w-full rounded-lg border border-(--border) px-3 py-2.5 text-base text-(--dark) focus:outline-none focus-visible:ring-2 focus-visible:ring-(--accent)"
              />
              <button
                type="submit"
                disabled={busy || !email.trim()}
                className="mt-3 w-full rounded-lg bg-(--accent) px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {busy ? "Sending…" : "Email me a code"}
              </button>
            </form>

            <div className="my-4 flex items-center gap-3">
              <span className="h-px flex-1 bg-(--border)" />
              <span className="text-xs text-(--muted)">or</span>
              <span className="h-px flex-1 bg-(--border)" />
            </div>

            <button
              type="button"
              onClick={signInWithGoogle}
              className="w-full rounded-lg border border-(--border) px-4 py-2.5 text-sm font-medium text-(--dark) hover:bg-(--fill) focus:outline-none focus-visible:ring-2 focus-visible:ring-(--accent)"
            >
              Continue with Google
            </button>
          </>
        ) : (
          <>
            <p className="mt-1 text-sm text-(--muted)">
              We sent a code to <span className="text-(--dark)">{email}</span>.
            </p>

            <form onSubmit={onVerify} className="mt-4">
              <label htmlFor="signin-code" className="block text-sm font-medium text-(--dark)">
                Code
              </label>
              <input
                id="signin-code"
                ref={codeRef}
                type="text"
                required
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={MAX_CODE_LENGTH}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
                className="mt-1 w-full rounded-lg border border-(--border) px-3 py-2.5 text-center text-lg tracking-[0.3em] text-(--dark) focus:outline-none focus-visible:ring-2 focus-visible:ring-(--accent)"
              />
              <button
                type="submit"
                disabled={busy || code.length < MIN_CODE_LENGTH}
                className="mt-3 w-full rounded-lg bg-(--accent) px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {busy ? "Checking…" : "Sign in"}
              </button>
            </form>

            <button
              type="button"
              onClick={() => {
                setStep("email");
                setCode("");
                setError(null);
              }}
              className="mt-3 w-full text-sm text-(--accent) underline"
            >
              Use a different email
            </button>
          </>
        )}

        {error && (
          <p role="alert" className="mt-3 text-sm text-(--river)">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={onClose}
          aria-label="Close sign in"
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full text-(--muted) hover:bg-(--fill) focus:outline-none focus-visible:ring-2 focus-visible:ring-(--accent)"
        >
          ×
        </button>
      </div>
    </>
  );
}
