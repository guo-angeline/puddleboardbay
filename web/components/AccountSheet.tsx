"use client";

import { useEffect, useRef, useState } from "react";
import { useAccount } from "@/lib/useAccount";
import { MAX_DISPLAY_NAME } from "@/lib/account/displayName";
import { trackIntent } from "@/lib/analytics";
import { useKillSwitch } from "@/lib/experiments";
import YourLog from "@/components/YourLog";

// Item 78: account management. Everything the account holds, in one sheet
// opened from the header identity: your display name (editable, and it
// propagates to your existing reviews), your reviews with their moderation
// status, what else the account holds, sign out, and an in-product account
// deletion that follows docs/legal/account-deletion-runbook.md.
//
// Dialog semantics follow the item-70 / SignInSheet pattern: role=dialog +
// aria-modal, focus moved in on open, Escape closes, focus restored to opener.

interface OwnReview {
  id: string;
  spotId: number;
  spotName: string;
  rating: number;
  body: string | null;
  status: string;
  createdAt: string;
}
interface Summary {
  email: string | null;
  displayName: string;
  reviews: OwnReview[];
  savedCount: number;
  emailAlerts: boolean;
  pushAlerts: boolean;
}

// Contributor-facing wording for each moderation state. "removed" never reaches
// here (the summary filters it out).
const STATUS_LABEL: Record<string, { text: string; className: string }> = {
  pending: { text: "Pending review", className: "bg-(--calm-fill) text-(--calm)" },
  published: { text: "Published", className: "bg-(--free-fill) text-(--free)" },
  rejected: { text: "Not approved", className: "bg-(--fill) text-(--muted)" },
};

export default function AccountSheet({ onClose }: { onClose: () => void }) {
  const { user, displayName, saveDisplayName, deleteAccount, signOut } = useAccount();
  // Ship at 100% behind a kill switch, per the no-A/B-until-DAU-100 directive.
  const collectablesOn = useKillSwitch("collectables");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [name, setName] = useState(displayName);
  const [savingName, setSavingName] = useState(false);
  const [nameMsg, setNameMsg] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    panelRef.current?.focus({ preventScroll: true });
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      if (opener && document.contains(opener)) opener.focus({ preventScroll: true });
    };
  }, [onClose]);

  useEffect(() => {
    let active = true;
    fetch("/api/account")
      .then((r) => (r.ok ? r.json() : null))
      .then((j: Summary | null) => {
        if (active && j) setSummary(j);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  async function onSaveName(e: React.FormEvent) {
    e.preventDefault();
    if (savingName) return;
    setSavingName(true);
    setNameMsg(null);
    const err = await saveDisplayName(name);
    setSavingName(false);
    if (err) {
      setNameMsg(err);
    } else {
      trackIntent("account_name_saved", {});
      setNameMsg("Saved.");
    }
  }

  async function onDelete() {
    if (deleting) return;
    setDeleting(true);
    setError(null);
    const err = await deleteAccount();
    if (err) {
      setError(err);
      setDeleting(false);
      return;
    }
    onClose(); // account gone; header returns to the signed-out state
  }

  const nameChanged = name.trim() !== displayName;

  return (
    <>
      <div className="fixed inset-0 bg-black/30" style={{ zIndex: 1300 }} onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-title"
        tabIndex={-1}
        className="fixed left-1/2 top-1/2 max-h-[85vh] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl focus:outline-none"
        style={{ zIndex: 1301 }}
      >
        <h2 id="account-title" className="font-['Newsreader'] text-xl font-bold text-(--dark)">
          Your account
        </h2>
        {user?.email && <p className="mt-1 text-sm text-(--muted)">{user.email}</p>}

        {/* Display name */}
        <form onSubmit={onSaveName} className="mt-5">
          <label htmlFor="account-name" className="block text-sm font-medium text-(--dark)">
            Display name
          </label>
          <p className="mt-0.5 text-xs text-(--muted)">
            Public, shown on your reviews. Leave blank to post as &ldquo;A paddler&rdquo;.
          </p>
          <div className="mt-1.5 flex gap-2">
            <input
              id="account-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, MAX_DISPLAY_NAME))}
              maxLength={MAX_DISPLAY_NAME}
              autoComplete="nickname"
              placeholder="Not set"
              className="min-w-0 flex-1 rounded-lg border border-(--border) px-3 py-2 text-base md:text-sm text-(--dark) focus:outline-none focus-visible:ring-2 focus-visible:ring-(--accent)"
            />
            <button
              type="submit"
              disabled={savingName || !nameChanged}
              className="shrink-0 rounded-lg bg-(--accent) px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {savingName ? "Saving…" : "Save"}
            </button>
          </div>
          {nameMsg && <p className="mt-1.5 text-xs text-(--muted)">{nameMsg}</p>}
        </form>

        {/* Item 83: the personal collection, above the reviews it draws from. */}
        {collectablesOn && summary && (
          <YourLog reviews={summary.reviews} savedCount={summary.savedCount} />
        )}

        {/* Your reviews */}
        <div className="mt-6 border-t border-(--border) pt-4">
          <h3 className="text-sm font-semibold text-(--dark)">Your reviews</h3>
          {summary === null ? (
            <p className="mt-2 text-sm text-(--muted)">Loading…</p>
          ) : summary.reviews.length === 0 ? (
            <p className="mt-2 text-sm text-(--muted)">You haven&rsquo;t reviewed a spot yet.</p>
          ) : (
            <ul className="mt-2 flex flex-col gap-3">
              {summary.reviews.map((r) => {
                const badge = STATUS_LABEL[r.status] ?? STATUS_LABEL.pending;
                return (
                  <li key={r.id} className="text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-(--dark)">{r.spotName}</span>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${badge.className}`}>
                        {badge.text}
                      </span>
                    </div>
                    <div className="mt-0.5 text-(--accent)" aria-hidden>
                      {"★".repeat(r.rating)}
                      <span className="text-(--border)">{"★".repeat(5 - r.rating)}</span>
                    </div>
                    <span className="sr-only">{r.rating} out of 5</span>
                    {r.body && <p className="mt-0.5 leading-relaxed text-(--dark)">{r.body}</p>}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* What else the account holds */}
        {summary && (
          <div className="mt-6 border-t border-(--border) pt-4 text-sm text-(--muted)">
            <p>
              {summary.savedCount} {summary.savedCount === 1 ? "spot" : "spots"} saved
              {summary.emailAlerts || summary.pushAlerts
                ? ` · alerts on (${[summary.emailAlerts && "email", summary.pushAlerts && "push"].filter(Boolean).join(" + ")})`
                : ""}
            </p>
          </div>
        )}

        {/* Sign out */}
        <div className="mt-6 border-t border-(--border) pt-4">
          <button
            type="button"
            onClick={() => {
              signOut();
              onClose();
            }}
            className="w-full rounded-lg border border-(--border) px-4 py-2.5 text-sm font-medium text-(--dark) hover:bg-(--fill) focus:outline-none focus-visible:ring-2 focus-visible:ring-(--accent)"
          >
            Sign out
          </button>
        </div>

        {/* Delete account: two-step, exact about what happens */}
        <div className="mt-4">
          {!confirmingDelete ? (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="w-full rounded-lg px-4 py-2.5 text-sm font-medium text-(--wind-alert) hover:bg-(--wind-alert-fill) focus:outline-none focus-visible:ring-2 focus-visible:ring-(--wind-alert)"
            >
              Delete account
            </button>
          ) : (
            <div className="rounded-lg border border-(--wind-alert) p-3">
              <p className="text-sm font-medium text-(--dark)">Delete your account?</p>
              <p className="mt-1 text-xs leading-relaxed text-(--muted)">
                This deletes your account and saved spots and stops your alerts. Your
                reviews are removed from public view. A moderation record is kept for up
                to three years, as the Contributor Terms describe. This cannot be undone.
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={onDelete}
                  disabled={deleting}
                  className="flex-1 rounded-lg bg-(--wind-alert) px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {deleting ? "Deleting…" : "Delete everything"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(false)}
                  disabled={deleting}
                  className="rounded-lg border border-(--border) px-4 py-2 text-sm font-medium text-(--dark)"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {error && (
          <p role="alert" className="mt-3 text-sm text-(--wind-alert)">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={onClose}
          aria-label="Close account"
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full text-(--muted) hover:bg-(--fill) focus:outline-none focus-visible:ring-2 focus-visible:ring-(--accent)"
        >
          ×
        </button>
      </div>
    </>
  );
}
