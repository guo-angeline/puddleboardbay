"use client";

// Dependency-free client module: caches and reads the two-boolean email
// subscription state so enrollment gates can decide whether to re-prompt.
// Do not import from lib/push, lib/analytics, or any server module: the
// caller passes in whatever server answer it already fetched.

export interface EmailSubscriptionState {
  known: boolean;
  confirmed: boolean;
}

export const EMAIL_STATE_KEY = "ptw-email-state";

// Module-level flag: true only once cacheEmailSubscriptionState has run this
// pageload from a live server answer. Reset every pageload (not storage) so
// a suppression can be told apart as fresh vs. possibly-stale cached state.
let reconciled = false;

export function cacheEmailSubscriptionState(state: EmailSubscriptionState): void {
  try {
    if (state.known === false) {
      // Cross-device unsubscribe reconciliation: drop any cached confirmed state.
      localStorage.removeItem(EMAIL_STATE_KEY);
    } else {
      localStorage.setItem(EMAIL_STATE_KEY, JSON.stringify({ known: state.known, confirmed: state.confirmed }));
    }
  } catch {
    /* private mode / quota: a missing cache just means the prompt may re-show */
  }
  reconciled = true;
}

export function readEmailSubscriptionState(): EmailSubscriptionState | null {
  try {
    const raw = localStorage.getItem(EMAIL_STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { known?: unknown; confirmed?: unknown };
    return { known: Boolean(parsed.known), confirmed: Boolean(parsed.confirmed) };
  } catch {
    return null;
  }
}

export function isEmailConfirmed(): boolean {
  const s = readEmailSubscriptionState();
  return !!s && s.known && s.confirmed;
}

export function wasReconciledThisSession(): boolean {
  return reconciled;
}

export function __resetReconciledForTest(): void {
  reconciled = false;
}
